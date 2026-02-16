import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessonSteps, studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { improveLessonStep, MODEL } from "@/lib/ai/openai";
import { checkTokenLimit, logTokenUsage } from "@/lib/ai/token-usage";
import { normalizeLessonStepPayload } from "@/lib/lesson/step-normalizer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string; lessonId: string; stepId: string }> }
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

  const { resourceId, lessonId, stepId } = await params;
  const body = await req.json().catch(() => ({}));
  const locale = body.locale || "en";

  const [resource] = await db
    .select({ id: studyMaterials.id, sourceContent: studyMaterials.sourceContent })
    .from(studyMaterials)
    .where(
      and(eq(studyMaterials.id, resourceId), eq(studyMaterials.userId, session.user.id))
    );

  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [step] = await db
    .select()
    .from(lessonSteps)
    .where(and(eq(lessonSteps.id, stepId), eq(lessonSteps.lessonId, lessonId)));

  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  const { result: improved, usage } = await improveLessonStep(
    {
      stepType: step.stepType,
      content: step.content,
      answerData: step.answerData,
      explanation: step.explanation,
      hint: step.hint,
    },
    resource.sourceContent || undefined,
    locale
  );

  await logTokenUsage(session.user.id, usage, "improve_lesson_step", MODEL);
  const normalized = normalizeLessonStepPayload({
    stepType: step.stepType,
    content: improved.content,
    answerData: improved.answerData,
  });

  const [updated] = await db
    .update(lessonSteps)
    .set({
      content: normalized.content,
      answerData: normalized.answerData,
      explanation: improved.explanation,
      hint: improved.hint,
      updatedAt: new Date(),
    })
    .where(and(eq(lessonSteps.id, stepId), eq(lessonSteps.lessonId, lessonId)))
    .returning();

  return NextResponse.json(updated);
}
