import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessonAttempts, lessonSteps, lessons, studyMaterials } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { isInteractiveStep } from "@/lib/types/lesson";
import type { StepType } from "@/lib/types/lesson";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; lessonId: string }> }
) {
  const { token, lessonId } = await params;
  const session = await auth();

  const [resource] = await db
    .select({
      id: studyMaterials.id,
      isPublic: studyMaterials.isPublic,
      requireAuthToInteract: studyMaterials.requireAuthToInteract,
    })
    .from(studyMaterials)
    .where(eq(studyMaterials.shareToken, token));

  if (!resource || !resource.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (resource.requireAuthToInteract && !session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const [lesson] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(
      and(
        eq(lessons.id, lessonId),
        eq(lessons.studyMaterialId, resource.id),
        eq(lessons.status, "published")
      )
    );

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const steps = await db
    .select({ stepType: lessonSteps.stepType })
    .from(lessonSteps)
    .where(eq(lessonSteps.lessonId, lessonId))
    .orderBy(asc(lessonSteps.order));

  const totalSteps = steps.length;
  const interactiveSteps = steps.filter((s) => isInteractiveStep(s.stepType as StepType)).length;

  const body = await req.json().catch(() => ({}));

  const [attempt] = await db
    .insert(lessonAttempts)
    .values({
      lessonId,
      userId: session?.user?.id || null,
      guestIdentifier: body.guestIdentifier || uuidv4(),
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
