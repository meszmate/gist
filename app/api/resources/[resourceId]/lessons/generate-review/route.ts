import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  studyMaterials,
  flashcards,
  quizQuestions,
  lessons,
  lessonSteps,
  lessonAttempts,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { generateLesson, MODEL } from "@/lib/ai/openai";
import { checkTokenLimit, logTokenUsage } from "@/lib/ai/token-usage";
import { normalizeLessonStepPayload } from "@/lib/lesson/step-normalizer";
import { inferUserLevel } from "@/lib/user/skill-inferencer";

/**
 * Generate a review lesson focused on the specific steps the user got wrong
 * in their past lesson attempts for this resource.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, tokensUsed, tokenLimit } = await checkTokenLimit(session.user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Token usage limit exceeded", code: "TOKEN_LIMIT_EXCEEDED", tokensUsed, tokenLimit },
      { status: 429 }
    );
  }

  const { resourceId } = await params;

  const [resource] = await db
    .select({
      id: studyMaterials.id,
      sourceContent: studyMaterials.sourceContent,
      summary: studyMaterials.summary,
      title: studyMaterials.title,
    })
    .from(studyMaterials)
    .where(
      and(
        eq(studyMaterials.id, resourceId),
        eq(studyMaterials.userId, session.user.id)
      )
    );

  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const content = resource.sourceContent || resource.summary || "";
  if (!content) {
    return NextResponse.json({ error: "No source content available" }, { status: 400 });
  }

  // Find all lessons for this resource
  const resourceLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.studyMaterialId, resourceId));

  if (resourceLessons.length === 0) {
    return NextResponse.json(
      { error: "No lessons to review yet", code: "NO_LESSONS" },
      { status: 400 }
    );
  }

  const lessonIds = resourceLessons.map((l) => l.id);

  // Collect recent attempts for those lessons by this user
  const recentAttempts = await db
    .select({
      stepResults: lessonAttempts.stepResults,
    })
    .from(lessonAttempts)
    .where(
      and(
        eq(lessonAttempts.userId, session.user.id),
        inArray(lessonAttempts.lessonId, lessonIds)
      )
    )
    .orderBy(desc(lessonAttempts.completedAt))
    .limit(20);

  if (recentAttempts.length === 0) {
    return NextResponse.json(
      { error: "No lesson attempts yet — finish a lesson first", code: "NO_ATTEMPTS" },
      { status: 400 }
    );
  }

  // Find step IDs the user got wrong on their first attempt
  const wrongStepIds = new Set<string>();
  for (const attempt of recentAttempts) {
    const results = attempt.stepResults || {};
    for (const [stepId, result] of Object.entries(results)) {
      if (result && typeof result === "object" && !result.firstAttemptCorrect) {
        wrongStepIds.add(stepId);
      }
    }
  }

  if (wrongStepIds.size === 0) {
    return NextResponse.json(
      {
        error: "No mistakes to review — you're doing great!",
        code: "NO_MISTAKES",
      },
      { status: 400 }
    );
  }

  // Fetch the wrong steps' content so we can extract focus topics
  const wrongSteps = await db
    .select({
      stepType: lessonSteps.stepType,
      content: lessonSteps.content,
    })
    .from(lessonSteps)
    .where(inArray(lessonSteps.id, Array.from(wrongStepIds)));

  // Extract a short topic descriptor from each step's content.
  // StepContent is a discriminated union; different variants expose different
  // field names, so read through an unknown-typed record lookup.
  const focusTopics: string[] = [];
  for (const step of wrongSteps) {
    if (!step.content) continue;
    const c = step.content as unknown as Record<string, unknown>;
    const topic =
      (typeof c.question === "string" && c.question) ||
      (typeof c.statement === "string" && c.statement) ||
      (typeof c.title === "string" && c.title) ||
      (typeof c.instruction === "string" && c.instruction) ||
      null;
    if (topic) focusTopics.push(topic);
  }

  if (focusTopics.length === 0) {
    return NextResponse.json(
      { error: "Could not extract focus topics from past mistakes" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const locale = body.locale || "en";

  const targetLevel = await inferUserLevel(session.user.id, resourceId);

  const existingFlashcards = await db
    .select({ front: flashcards.front, back: flashcards.back })
    .from(flashcards)
    .where(eq(flashcards.studyMaterialId, resourceId));

  const existingQuestions = await db
    .select({ question: quizQuestions.question, options: quizQuestions.options })
    .from(quizQuestions)
    .where(eq(quizQuestions.studyMaterialId, resourceId));

  const { result: generated, usage } = await generateLesson(
    content,
    existingFlashcards,
    existingQuestions.map((q) => ({
      question: q.question,
      options: q.options || undefined,
    })),
    {
      stepCount: Math.min(12, Math.max(6, focusTopics.length + 2)),
      title: `Review: ${resource.title}`,
      targetLevel,
      focusTopics,
    },
    locale
  );

  await logTokenUsage(session.user.id, usage, "generate_review_lesson", MODEL);

  const [lesson] = await db
    .insert(lessons)
    .values({
      studyMaterialId: resourceId,
      title: generated.title || `Review: ${resource.title}`,
      description: generated.description,
      order: 0,
      settings: { allowSkip: true, showProgressBar: true, transitionStyle: "slide" },
      status: "draft",
      isPublic: false,
      targetLevel: "review",
    })
    .returning();

  if (generated.steps.length > 0) {
    const normalizedSteps = generated.steps.map((step) => {
      const normalized = normalizeLessonStepPayload({
        stepType: step.stepType,
        content: step.content,
        answerData: step.answerData,
      });
      return {
        ...step,
        stepType: normalized.stepType as typeof step.stepType,
        content: normalized.content,
        answerData: normalized.answerData,
      };
    });

    await db.insert(lessonSteps).values(
      normalizedSteps.map((step, index) => ({
        lessonId: lesson.id,
        order: index,
        stepType: step.stepType,
        content: step.content,
        answerData: step.answerData,
        explanation: step.explanation,
        hint: step.hint,
      }))
    );
  }

  const steps = await db
    .select()
    .from(lessonSteps)
    .where(eq(lessonSteps.lessonId, lesson.id))
    .orderBy(lessonSteps.order);

  const normalizedFetchedSteps = steps.map((step) => {
    const normalized = normalizeLessonStepPayload({
      stepType: step.stepType,
      content: step.content,
      answerData: step.answerData,
    });
    return {
      ...step,
      stepType: normalized.stepType,
      content: normalized.content,
      answerData: normalized.answerData,
    };
  });

  return NextResponse.json(
    {
      ...lesson,
      steps: normalizedFetchedSteps,
      focusTopicCount: focusTopics.length,
    },
    { status: 201 }
  );
}
