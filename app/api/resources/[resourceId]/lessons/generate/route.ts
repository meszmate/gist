import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, flashcards, quizQuestions, lessons, lessonSteps } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateLesson, MODEL } from "@/lib/ai/openai";
import { checkTokenLimit, logTokenUsage } from "@/lib/ai/token-usage";
import { normalizeLessonStepPayload } from "@/lib/lesson/step-normalizer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check token limit
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
    return NextResponse.json(
      { error: "No source content available" },
      { status: 400 }
    );
  }

  const existingFlashcards = await db
    .select({ front: flashcards.front, back: flashcards.back })
    .from(flashcards)
    .where(eq(flashcards.studyMaterialId, resourceId));

  const existingQuestions = await db
    .select({ question: quizQuestions.question, options: quizQuestions.options })
    .from(quizQuestions)
    .where(eq(quizQuestions.studyMaterialId, resourceId));

  const body = await req.json().catch(() => ({}));
  const locale = body.locale || "en";

  const { result: generated, usage } = await generateLesson(
    content,
    existingFlashcards,
    existingQuestions.map((q) => ({ question: q.question, options: q.options || undefined })),
    { stepCount: body.stepCount, title: body.title },
    locale
  );

  await logTokenUsage(session.user.id, usage, "generate_lesson", MODEL);

  // Create the lesson
  const [lesson] = await db
    .insert(lessons)
    .values({
      studyMaterialId: resourceId,
      title: generated.title,
      description: generated.description,
      order: 0,
      settings: { allowSkip: true, showProgressBar: true, transitionStyle: "slide" },
      status: "draft",
      isPublic: false,
    })
    .returning();

  // Create the steps
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

  // Fetch back with steps
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
    { ...lesson, steps: normalizedFetchedSteps },
    { status: 201 }
  );
}
