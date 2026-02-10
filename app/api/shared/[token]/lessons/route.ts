import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studyMaterials, lessons } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const [resource] = await db
    .select({
      id: studyMaterials.id,
      isPublic: studyMaterials.isPublic,
      visibleSections: studyMaterials.visibleSections,
    })
    .from(studyMaterials)
    .where(eq(studyMaterials.shareToken, token));

  if (!resource || !resource.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const showLessons = resource.visibleSections?.lessons ?? true;
  if (!showLessons) {
    return NextResponse.json([]);
  }

  const result = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      description: lessons.description,
      order: lessons.order,
      status: lessons.status,
    })
    .from(lessons)
    .where(
      and(
        eq(lessons.studyMaterialId, resource.id),
        eq(lessons.status, "published"),
        eq(lessons.isPublic, true)
      )
    )
    .orderBy(asc(lessons.order));

  return NextResponse.json(result);
}
