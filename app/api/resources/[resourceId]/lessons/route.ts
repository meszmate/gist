import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessons, studyMaterials } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resourceId } = await params;

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

  const result = await db
    .select()
    .from(lessons)
    .where(eq(lessons.studyMaterialId, resourceId))
    .orderBy(asc(lessons.order));

  return NextResponse.json(result);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resourceId } = await params;

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

  const body = await req.json();

  const [lesson] = await db
    .insert(lessons)
    .values({
      studyMaterialId: resourceId,
      title: body.title || "Untitled Lesson",
      description: body.description || null,
      order: body.order ?? 0,
      settings: body.settings || null,
      status: body.status || "draft",
      isPublic: body.isPublic || false,
    })
    .returning();

  return NextResponse.json(lesson, { status: 201 });
}
