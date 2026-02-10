import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessonAttempts, lessonSteps, lessons } from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { isInteractiveStep } from "@/lib/types/lesson";
import type { StepType } from "@/lib/types/lesson";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resourceId: string; lessonId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;

  const attempts = await db
    .select()
    .from(lessonAttempts)
    .where(
      and(
        eq(lessonAttempts.lessonId, lessonId),
        eq(lessonAttempts.userId, session.user.id)
      )
    )
    .orderBy(desc(lessonAttempts.startedAt));

  return NextResponse.json(attempts);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ resourceId: string; lessonId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resourceId, lessonId } = await params;

  const [lesson] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.studyMaterialId, resourceId)));

  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const steps = await db
    .select({ stepType: lessonSteps.stepType })
    .from(lessonSteps)
    .where(eq(lessonSteps.lessonId, lessonId))
    .orderBy(asc(lessonSteps.order));

  const totalSteps = steps.length;
  const interactiveSteps = steps.filter((s) => isInteractiveStep(s.stepType as StepType)).length;

  const [attempt] = await db
    .insert(lessonAttempts)
    .values({
      lessonId,
      userId: session.user.id,
      currentStepIndex: 0,
      completedStepIds: [],
      answers: {},
      stepResults: {},
      totalSteps,
      interactiveSteps,
      correctCount: 0,
    })
    .returning();

  return NextResponse.json(attempt, { status: 201 });
}
