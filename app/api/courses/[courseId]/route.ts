import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { courses, courseEnrollments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateCourseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// Return course meta + caller's access context (isOwner, enrollmentRole).
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

    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId));

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const isOwner = course.ownerId === session.user.id;

    let enrollmentRole: string | null = null;
    if (!isOwner) {
      const [enrollment] = await db
        .select({ role: courseEnrollments.role })
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.courseId, courseId),
            eq(courseEnrollments.userId, session.user.id)
          )
        );
      enrollmentRole = enrollment?.role ?? null;
    }

    if (!isOwner && !enrollmentRole) {
      // Don't leak existence of courses the caller can't see.
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({
      course: {
        ...course,
        isOwner,
        enrollmentRole,
      },
    });
  } catch (error) {
    console.error("Error loading course:", error);
    return NextResponse.json({ error: "Failed to load course" }, { status: 500 });
  }
}

// Update course metadata (owner only).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    const [existing] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.ownerId, session.user.id)));

    if (!existing) {
      return NextResponse.json(
        { error: "Course not found or not owner" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data = updateCourseSchema.parse(body);

    const [updated] = await db
      .update(courses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(courses.id, courseId))
      .returning();

    return NextResponse.json({ course: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating course:", error);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

// Delete course (owner only). Cascades to enrollments + courseResources via FKs.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    const [existing] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.ownerId, session.user.id)));

    if (!existing) {
      return NextResponse.json(
        { error: "Course not found or not owner" },
        { status: 404 }
      );
    }

    await db.delete(courses).where(eq(courses.id, courseId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
