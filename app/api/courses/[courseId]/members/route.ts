import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { courses, courseEnrollments, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const enrollSchema = z.object({
  email: z.string().email(),
  role: z.enum(["instructor", "ta", "student"]).optional(),
});

// List members
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

    const members = await db
      .select({
        id: courseEnrollments.id,
        role: courseEnrollments.role,
        enrolledAt: courseEnrollments.enrolledAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(courseEnrollments)
      .innerJoin(users, eq(courseEnrollments.userId, users.id))
      .where(eq(courseEnrollments.courseId, courseId));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error listing members:", error);
    return NextResponse.json({ error: "Failed to list members" }, { status: 500 });
  }
}

// Enroll member
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
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.ownerId, session.user.id)));

    if (!course) {
      return NextResponse.json({ error: "Course not found or not owner" }, { status: 404 });
    }

    const body = await req.json();
    const data = enrollSchema.parse(body);

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check not already enrolled
    const [existing] = await db
      .select({ id: courseEnrollments.id })
      .from(courseEnrollments)
      .where(
        and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, user.id))
      );

    if (existing) {
      return NextResponse.json({ error: "User already enrolled" }, { status: 409 });
    }

    await db.insert(courseEnrollments).values({
      courseId,
      userId: user.id,
      role: data.role || "student",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error enrolling member:", error);
    return NextResponse.json({ error: "Failed to enroll member" }, { status: 500 });
  }
}

// Remove member
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
      return NextResponse.json({ error: "Course not found or not owner" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const enrollmentId = searchParams.get("id");

    if (!enrollmentId) {
      return NextResponse.json({ error: "Enrollment ID required" }, { status: 400 });
    }

    await db
      .delete(courseEnrollments)
      .where(and(eq(courseEnrollments.id, enrollmentId), eq(courseEnrollments.courseId, courseId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
