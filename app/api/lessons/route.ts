import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessons, lessonSteps, studyMaterials } from "@/lib/db/schema";
import { eq, count, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userLessons = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        description: lessons.description,
        status: lessons.status,
        isPublic: lessons.isPublic,
        order: lessons.order,
        resourceId: studyMaterials.id,
        resourceTitle: studyMaterials.title,
        stepsCount: count(lessonSteps.id),
        createdAt: lessons.createdAt,
        updatedAt: lessons.updatedAt,
      })
      .from(lessons)
      .innerJoin(studyMaterials, eq(lessons.studyMaterialId, studyMaterials.id))
      .leftJoin(lessonSteps, eq(lessonSteps.lessonId, lessons.id))
      .where(eq(studyMaterials.userId, session.user.id))
      .groupBy(lessons.id, studyMaterials.id, studyMaterials.title)
      .orderBy(desc(lessons.updatedAt));

    return NextResponse.json(userLessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}
