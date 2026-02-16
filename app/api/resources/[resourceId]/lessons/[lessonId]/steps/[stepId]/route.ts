import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessonSteps, studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { normalizeLessonStepPayload } from "@/lib/lesson/step-normalizer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string; lessonId: string; stepId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resourceId, lessonId, stepId } = await params;

  const [resource] = await db
    .select({ id: studyMaterials.id })
    .from(studyMaterials)
    .where(
      and(eq(studyMaterials.id, resourceId), eq(studyMaterials.userId, session.user.id))
    );

  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [existingStep] = await db
    .select({
      stepType: lessonSteps.stepType,
      content: lessonSteps.content,
      answerData: lessonSteps.answerData,
    })
    .from(lessonSteps)
    .where(and(eq(lessonSteps.id, stepId), eq(lessonSteps.lessonId, lessonId)));

  if (!existingStep) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  const body = await req.json();
  const normalized = normalizeLessonStepPayload({
    stepType: body.stepType ?? existingStep.stepType,
    content: body.content ?? existingStep.content,
    answerData: body.answerData ?? existingStep.answerData,
  });

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.stepType !== undefined || body.content !== undefined || body.answerData !== undefined) {
    updateData.stepType = normalized.stepType;
    updateData.content = normalized.content;
    updateData.answerData = normalized.answerData;
  }
  if (body.explanation !== undefined) updateData.explanation = body.explanation;
  if (body.hint !== undefined) updateData.hint = body.hint;
  if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
  if (body.order !== undefined) updateData.order = body.order;

  const [updated] = await db
    .update(lessonSteps)
    .set(updateData)
    .where(and(eq(lessonSteps.id, stepId), eq(lessonSteps.lessonId, lessonId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ resourceId: string; lessonId: string; stepId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resourceId, lessonId, stepId } = await params;

  const [resource] = await db
    .select({ id: studyMaterials.id })
    .from(studyMaterials)
    .where(
      and(eq(studyMaterials.id, resourceId), eq(studyMaterials.userId, session.user.id))
    );

  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(lessonSteps)
    .where(and(eq(lessonSteps.id, stepId), eq(lessonSteps.lessonId, lessonId)));

  return NextResponse.json({ success: true });
}
