import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessonSteps, lessons, studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
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

  const { stepOrders } = await req.json();

  // Update each step's order
  for (const { id, order } of stepOrders as { id: string; order: number }[]) {
    await db
      .update(lessonSteps)
      .set({ order, updatedAt: new Date() })
      .where(and(eq(lessonSteps.id, id), eq(lessonSteps.lessonId, lessonId)));
  }

  return NextResponse.json({ success: true });
}
