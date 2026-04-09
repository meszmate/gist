import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { courses, courseResources, studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const addResourceSchema = z.object({
  resourceId: z.string().uuid(),
  dueDate: z.string().datetime().optional(),
});

// List resources in course
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    const resources = await db
      .select({
        id: courseResources.id,
        resourceId: courseResources.resourceId,
        order: courseResources.order,
        dueDate: courseResources.dueDate,
        title: studyMaterials.title,
        description: studyMaterials.description,
      })
      .from(courseResources)
      .innerJoin(studyMaterials, eq(courseResources.resourceId, studyMaterials.id))
      .where(eq(courseResources.courseId, courseId))
      .orderBy(courseResources.order);

    return NextResponse.json({ resources });
  } catch (error) {
    console.error("Error listing course resources:", error);
    return NextResponse.json({ error: "Failed to list resources" }, { status: 500 });
  }
}

// Add resource to course
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    // Verify course ownership
    const [course] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.ownerId, session.user.id)));

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = addResourceSchema.parse(body);

    const [added] = await db.insert(courseResources).values({
      courseId,
      resourceId: data.resourceId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    }).returning();

    return NextResponse.json({ resource: added });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error adding resource:", error);
    return NextResponse.json({ error: "Failed to add resource" }, { status: 500 });
  }
}

// Remove resource from course
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    const [course] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.ownerId, session.user.id)));

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const resourceEntryId = searchParams.get("id");

    if (!resourceEntryId) {
      return NextResponse.json({ error: "Resource entry ID required" }, { status: 400 });
    }

    await db
      .delete(courseResources)
      .where(and(eq(courseResources.id, resourceEntryId), eq(courseResources.courseId, courseId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing resource:", error);
    return NextResponse.json({ error: "Failed to remove resource" }, { status: 500 });
  }
}
