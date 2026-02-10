import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessonAttempts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string; lessonId: string; attemptId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { attemptId } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.currentStepIndex !== undefined) updateData.currentStepIndex = body.currentStepIndex;
  if (body.completedStepIds !== undefined) updateData.completedStepIds = body.completedStepIds;
  if (body.answers !== undefined) updateData.answers = body.answers;
  if (body.stepResults !== undefined) updateData.stepResults = body.stepResults;
  if (body.correctCount !== undefined) updateData.correctCount = body.correctCount;
  if (body.score !== undefined) updateData.score = String(body.score);
  if (body.completedAt !== undefined) updateData.completedAt = body.completedAt ? new Date(body.completedAt) : new Date();
  if (body.timeSpentSeconds !== undefined) updateData.timeSpentSeconds = body.timeSpentSeconds;

  const [updated] = await db
    .update(lessonAttempts)
    .set(updateData)
    .where(
      and(
        eq(lessonAttempts.id, attemptId),
        eq(lessonAttempts.userId, session.user.id)
      )
    )
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}
