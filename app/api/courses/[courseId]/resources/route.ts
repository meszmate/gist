import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  courses,
  courseEnrollments,
  courseResources,
  studyMaterials,
} from "@/lib/db/schema";
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
        contributorId: studyMaterials.userId,
      })
      .from(courseResources)
      .innerJoin(
        studyMaterials,
        eq(courseResources.resourceId, studyMaterials.id)
      )
      .where(eq(courseResources.courseId, courseId))
      .orderBy(courseResources.order);

    return NextResponse.json({
      resources: resources.map((r) => ({
        ...r,
        isMine: r.contributorId === session.user!.id,
      })),
    });
  } catch (error) {
    console.error("Error listing course resources:", error);
    return NextResponse.json({ error: "Failed to list resources" }, { status: 500 });
  }
}

// Add a resource to a course. Both the course owner and any enrolled
// member can contribute — the latter can only share resources they own
// themselves (no re-sharing someone else's material).
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

    const [course] = await db
      .select({ id: courses.id, ownerId: courses.ownerId })
      .from(courses)
      .where(eq(courses.id, courseId));

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const isOwner = course.ownerId === session.user.id;

    let isEnrolled = false;
    if (!isOwner) {
      const [enrollment] = await db
        .select({ id: courseEnrollments.id })
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.courseId, courseId),
            eq(courseEnrollments.userId, session.user.id)
          )
        );
      isEnrolled = !!enrollment;
    }

    if (!isOwner && !isEnrolled) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = addResourceSchema.parse(body);

    // The caller must own the resource they're contributing. Owners of the
    // course get the same restriction — they can only attach their own
    // resources (not resources shared with them by third parties).
    const [resource] = await db
      .select({ id: studyMaterials.id, userId: studyMaterials.userId })
      .from(studyMaterials)
      .where(eq(studyMaterials.id, data.resourceId));

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    if (resource.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only add resources you own." },
        { status: 403 }
      );
    }

    // Guard against duplicates — one (course, resource) pair only.
    const [existing] = await db
      .select({ id: courseResources.id })
      .from(courseResources)
      .where(
        and(
          eq(courseResources.courseId, courseId),
          eq(courseResources.resourceId, data.resourceId)
        )
      );
    if (existing) {
      return NextResponse.json(
        { error: "Resource already attached to this course" },
        { status: 409 }
      );
    }

    const [added] = await db
      .insert(courseResources)
      .values({
        courseId,
        resourceId: data.resourceId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      })
      .returning();

    return NextResponse.json({ resource: added });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error adding resource:", error);
    return NextResponse.json({ error: "Failed to add resource" }, { status: 500 });
  }
}

// Remove a resource from a course. Course owner can remove anything;
// contributors can remove only their own contributions.
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
    const { searchParams } = new URL(req.url);
    const resourceEntryId = searchParams.get("id");

    if (!resourceEntryId) {
      return NextResponse.json(
        { error: "Resource entry ID required" },
        { status: 400 }
      );
    }

    const [course] = await db
      .select({ id: courses.id, ownerId: courses.ownerId })
      .from(courses)
      .where(eq(courses.id, courseId));

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const [entry] = await db
      .select({
        id: courseResources.id,
        resourceOwnerId: studyMaterials.userId,
      })
      .from(courseResources)
      .innerJoin(
        studyMaterials,
        eq(courseResources.resourceId, studyMaterials.id)
      )
      .where(
        and(
          eq(courseResources.id, resourceEntryId),
          eq(courseResources.courseId, courseId)
        )
      );

    if (!entry) {
      return NextResponse.json(
        { error: "Resource entry not found" },
        { status: 404 }
      );
    }

    const isOwner = course.ownerId === session.user.id;
    const isContributor = entry.resourceOwnerId === session.user.id;

    if (!isOwner && !isContributor) {
      return NextResponse.json(
        { error: "You can't remove this resource." },
        { status: 403 }
      );
    }

    await db
      .delete(courseResources)
      .where(
        and(
          eq(courseResources.id, resourceEntryId),
          eq(courseResources.courseId, courseId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing resource:", error);
    return NextResponse.json(
      { error: "Failed to remove resource" },
      { status: 500 }
    );
  }
}
