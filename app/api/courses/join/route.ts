import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { courses, courseEnrollments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const joinSchema = z.object({
  code: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = joinSchema.parse(body);

    const normalizedCode = data.code.trim().toUpperCase();

    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.code, normalizedCode), eq(courses.isActive, true)));

    if (!course) {
      return NextResponse.json({ error: "Course not found or inactive" }, { status: 404 });
    }

    if (course.ownerId === session.user.id) {
      return NextResponse.json({ error: "You own this course" }, { status: 400 });
    }

    // Check if already enrolled
    const [existing] = await db
      .select({ id: courseEnrollments.id })
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, course.id),
          eq(courseEnrollments.userId, session.user.id)
        )
      );

    if (existing) {
      return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
    }

    await db.insert(courseEnrollments).values({
      courseId: course.id,
      userId: session.user.id,
      role: "student",
    });

    return NextResponse.json({ course: { id: course.id, title: course.title } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error joining course:", error);
    return NextResponse.json({ error: "Failed to join course" }, { status: 500 });
  }
}
