import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { courses, courseEnrollments } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { z } from "zod";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 2) code += "-";
  }
  return code;
}

const createCourseSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

// List courses (owned + enrolled)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownedCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.ownerId, session.user.id));

    const enrolledRows = await db
      .select({ courseId: courseEnrollments.courseId, role: courseEnrollments.role })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.userId, session.user.id));

    const enrolledCourseIds = enrolledRows.map((e) => e.courseId);
    let enrolledCourses: typeof ownedCourses = [];

    if (enrolledCourseIds.length > 0) {
      enrolledCourses = await db
        .select()
        .from(courses)
        .where(or(...enrolledCourseIds.map((id) => eq(courses.id, id))));
    }

    return NextResponse.json({
      owned: ownedCourses,
      enrolled: enrolledCourses.map((c) => ({
        ...c,
        enrollmentRole: enrolledRows.find((e) => e.courseId === c.id)?.role,
      })),
    });
  } catch (error) {
    console.error("Error listing courses:", error);
    return NextResponse.json({ error: "Failed to list courses" }, { status: 500 });
  }
}

// Create course
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createCourseSchema.parse(body);

    const [course] = await db.insert(courses).values({
      ownerId: session.user.id,
      title: data.title,
      description: data.description,
      code: generateCode(),
    }).returning();

    return NextResponse.json({ course });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error creating course:", error);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
