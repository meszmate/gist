import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  studyMaterials,
  flashcards,
  quizQuestions,
  quizSettings,
  gradingConfigs,
  lessons,
  lessonSteps,
  savedResources,
  resourceAccessLogs,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Fork a resource you have access to into a fully-owned copy in your library.
 *
 * Clones: content (source, summary, difficulty), visibility flags, flashcards
 * (content only — SRS state resets), quiz questions, quiz settings, grading
 * config, lessons + their steps.
 *
 * Does NOT clone: user-specific state (attempts, study logs, access logs,
 * saved-by links, share token, public flag, scheduling windows, allowlists).
 *
 * Access rules: the caller must be the owner, have saved the resource, be in
 * the email allowlist, or the resource must be public.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;

    const [source] = await db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.id, resourceId));

    if (!source) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const isOwner = source.userId === session.user.id;
    const sessionEmail = session.user.email?.toLowerCase() ?? null;
    const hasEmailAccess =
      !!sessionEmail &&
      (source.allowedViewerEmails || []).some(
        (email) => email.toLowerCase() === sessionEmail
      );

    let isSaved = false;
    if (!isOwner) {
      const [saved] = await db
        .select({ id: savedResources.id })
        .from(savedResources)
        .where(
          and(
            eq(savedResources.userId, session.user.id),
            eq(savedResources.resourceId, resourceId)
          )
        );
      isSaved = !!saved;
    }

    const canAccess =
      isOwner || isSaved || hasEmailAccess || Boolean(source.isPublic);

    if (!canAccess) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Fetch all children in parallel
    const [
      sourceFlashcards,
      sourceQuizQuestions,
      sourceQuizSettings,
      sourceGradingConfig,
      sourceLessons,
    ] = await Promise.all([
      db
        .select()
        .from(flashcards)
        .where(eq(flashcards.studyMaterialId, resourceId)),
      db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.studyMaterialId, resourceId)),
      db
        .select()
        .from(quizSettings)
        .where(eq(quizSettings.studyMaterialId, resourceId)),
      db
        .select()
        .from(gradingConfigs)
        .where(eq(gradingConfigs.studyMaterialId, resourceId)),
      db
        .select()
        .from(lessons)
        .where(eq(lessons.studyMaterialId, resourceId))
        .orderBy(lessons.order),
    ]);

    const newResource = await db.transaction(async (tx) => {
      // 1. Clone the resource row
      const [cloned] = await tx
        .insert(studyMaterials)
        .values({
          userId: session.user!.id!,
          folderId: null,
          title: `${source.title} (Copy)`.slice(0, 255),
          description: source.description,
          sourceContent: source.sourceContent,
          summary: source.summary,
          difficulty: source.difficulty,
          // Private by default — the fork belongs to the new owner alone.
          shareToken: null,
          isPublic: false,
          availableFrom: null,
          availableTo: null,
          visibleSections: source.visibleSections,
          requireAuthToInteract: false,
          allowedViewerEmails: null,
          completedAt: null,
          forkedFromId: source.id,
        })
        .returning();

      // 2. Clone flashcards with reset SRS state
      if (sourceFlashcards.length > 0) {
        await tx.insert(flashcards).values(
          sourceFlashcards.map((f) => ({
            studyMaterialId: cloned.id,
            front: f.front,
            back: f.back,
            interval: 0,
            repetitions: 0,
            easeFactor: "2.50",
            nextReview: new Date(),
          }))
        );
      }

      // 3. Clone quiz questions
      if (sourceQuizQuestions.length > 0) {
        await tx.insert(quizQuestions).values(
          sourceQuizQuestions.map((q) => ({
            studyMaterialId: cloned.id,
            question: q.question,
            questionType: q.questionType,
            questionConfig: q.questionConfig,
            correctAnswerData: q.correctAnswerData,
            points: q.points,
            order: q.order,
            explanation: q.explanation,
            options: q.options,
            correctAnswer: q.correctAnswer,
          }))
        );
      }

      // 4. Clone quiz settings (max one)
      if (sourceQuizSettings[0]) {
        const s = sourceQuizSettings[0];
        await tx.insert(quizSettings).values({
          studyMaterialId: cloned.id,
          timeLimitSeconds: s.timeLimitSeconds,
          // Fork is private to new owner — don't carry over access-control fields.
          requireSignin: false,
          allowedEmails: null,
          maxAttempts: s.maxAttempts,
          shuffleQuestions: s.shuffleQuestions,
          showCorrectAnswers: s.showCorrectAnswers,
        });
      }

      // 5. Clone grading config (max one)
      if (sourceGradingConfig[0]) {
        const g = sourceGradingConfig[0];
        await tx.insert(gradingConfigs).values({
          studyMaterialId: cloned.id,
          gradingType: g.gradingType,
          passThreshold: g.passThreshold,
          letterGrades: g.letterGrades,
          showGradeOnCompletion: g.showGradeOnCompletion,
          showPointValues: g.showPointValues,
          partialCreditEnabled: g.partialCreditEnabled,
        });
      }

      // 6. Clone lessons + steps
      for (const lesson of sourceLessons) {
        const [newLesson] = await tx
          .insert(lessons)
          .values({
            studyMaterialId: cloned.id,
            title: lesson.title,
            description: lesson.description,
            order: lesson.order,
            settings: lesson.settings,
            // Forked lessons start as drafts — the new owner publishes on their terms.
            status: "draft",
            isPublic: false,
            targetLevel: lesson.targetLevel,
          })
          .returning();

        const stepsForLesson = await tx
          .select()
          .from(lessonSteps)
          .where(eq(lessonSteps.lessonId, lesson.id))
          .orderBy(lessonSteps.order);

        if (stepsForLesson.length > 0) {
          await tx.insert(lessonSteps).values(
            stepsForLesson.map((step) => ({
              lessonId: newLesson.id,
              order: step.order,
              stepType: step.stepType,
              content: step.content,
              answerData: step.answerData,
              explanation: step.explanation,
              hint: step.hint,
              imageUrl: step.imageUrl,
            }))
          );
        }
      }

      return cloned;
    });

    // Best-effort audit — not critical if it fails.
    try {
      await db.insert(resourceAccessLogs).values({
        resourceId,
        email: session.user.email,
        userId: session.user.id,
        accessType: "resource_forked",
      });
    } catch (err) {
      console.warn("Failed to log fork:", err);
    }

    return NextResponse.json(
      {
        id: newResource.id,
        title: newResource.title,
        forkedFromId: newResource.forkedFromId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error forking resource:", error);
    return NextResponse.json(
      { error: "Failed to fork resource" },
      { status: 500 }
    );
  }
}
