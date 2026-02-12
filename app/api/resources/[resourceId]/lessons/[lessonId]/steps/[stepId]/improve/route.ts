import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessonSteps, studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { improveLessonStep } from "@/lib/ai/openai";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string; lessonId: string; stepId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const improved = await improveLessonStep(
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

  const [updated] = await db
    .update(lessonSteps)
    .set({
      content: improved.content,
      answerData: improved.answerData,
      explanation: improved.explanation,
      hint: improved.hint,
      updatedAt: new Date(),
    })
    .where(and(eq(lessonSteps.id, stepId), eq(lessonSteps.lessonId, lessonId)))
    .returning();

  return NextResponse.json(updated);
}
