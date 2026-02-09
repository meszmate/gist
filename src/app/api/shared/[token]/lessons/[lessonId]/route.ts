import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studyMaterials, lessons, lessonSteps } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; lessonId: string }> }
) {
  const { token, lessonId } = await params;

  const [resource] = await db
    .select({
      id: studyMaterials.id,
      isPublic: studyMaterials.isPublic,
    })
    .from(studyMaterials)
    .where(eq(studyMaterials.shareToken, token));

  if (!resource || !resource.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [lesson] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.id, lessonId),
        eq(lessons.studyMaterialId, resource.id),
        eq(lessons.status, "published"),
        eq(lessons.isPublic, true)
      )
    );

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const steps = await db
    .select()
    .from(lessonSteps)
    .where(eq(lessonSteps.lessonId, lessonId))
    .orderBy(asc(lessonSteps.order));

  return NextResponse.json({ ...lesson, steps });
}
