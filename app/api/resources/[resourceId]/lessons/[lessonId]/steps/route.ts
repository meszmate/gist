import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessonSteps, lessons, studyMaterials } from "@/lib/db/schema";
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
      and(eq(studyMaterials.id, resourceId), eq(studyMaterials.userId, session.user.id))
    );

  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  return NextResponse.json(normalizedSteps);
}

export async function POST(
  req: NextRequest,
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
      and(eq(studyMaterials.id, resourceId), eq(studyMaterials.userId, session.user.id))
    );

  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [lesson] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.studyMaterialId, resourceId)));

  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const body = await req.json();
  const normalized = normalizeLessonStepPayload({
    stepType: body.stepType,
    content: body.content,
    answerData: body.answerData,
  });

  const [step] = await db
    .insert(lessonSteps)
    .values({
      lessonId,
      order: body.order ?? 0,
      stepType: normalized.stepType,
      content: normalized.content,
      answerData: normalized.answerData,
      explanation: body.explanation || null,
      hint: body.hint || null,
      imageUrl: body.imageUrl || null,
    })
    .returning();

  return NextResponse.json(step, { status: 201 });
}
