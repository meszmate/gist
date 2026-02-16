import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessons, lessonSteps, studyMaterials } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { normalizeLessonStepPayload } from "@/lib/lesson/step-normalizer";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resourceId: string; lessonId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resourceId, lessonId } = await params;

  const [resource] = await db
    .select({ id: studyMaterials.id })
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

  const [lesson] = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.studyMaterialId, resourceId)));

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const steps = await db
    .select()
    .from(lessonSteps)
    .where(eq(lessonSteps.lessonId, lessonId))
    .orderBy(asc(lessonSteps.order));

  const normalizedSteps = steps.map((step) => {
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

  return NextResponse.json({ ...lesson, steps: normalizedSteps });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string; lessonId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resourceId, lessonId } = await params;
  const body = await req.json();

  const [resource] = await db
    .select({ id: studyMaterials.id })
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

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.order !== undefined) updateData.order = body.order;
  if (body.settings !== undefined) updateData.settings = body.settings;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;

  const [updated] = await db
    .update(lessons)
    .set(updateData)
    .where(and(eq(lessons.id, lessonId), eq(lessons.studyMaterialId, resourceId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ resourceId: string; lessonId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resourceId, lessonId } = await params;

  const [resource] = await db
    .select({ id: studyMaterials.id })
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

  await db
    .delete(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.studyMaterialId, resourceId)));

  return NextResponse.json({ success: true });
}
