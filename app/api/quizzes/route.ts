import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  studyMaterials,
  quizQuestions,
  quizSettings,
  quizAttempts,
} from "@/lib/db/schema";
import { eq, count, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all resources that have quiz questions
    const resourcesWithQuizzes = await db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        description: studyMaterials.description,
        questionCount: count(quizQuestions.id),
      })
      .from(studyMaterials)
      .innerJoin(quizQuestions, eq(quizQuestions.studyMaterialId, studyMaterials.id))
      .where(eq(studyMaterials.userId, session.user.id))
      .groupBy(studyMaterials.id)
      .orderBy(desc(studyMaterials.createdAt));

    // Get additional info for each quiz
    const quizzesWithInfo = await Promise.all(
      resourcesWithQuizzes.map(async (resource) => {
        const [settings] = await db
          .select()
          .from(quizSettings)
          .where(eq(quizSettings.studyMaterialId, resource.id));

        const [attemptCount] = await db
          .select({ count: count() })
          .from(quizAttempts)
          .where(eq(quizAttempts.studyMaterialId, resource.id));

        const [lastAttempt] = await db
          .select({ completedAt: quizAttempts.completedAt })
          .from(quizAttempts)
          .where(eq(quizAttempts.studyMaterialId, resource.id))
          .orderBy(desc(quizAttempts.completedAt))
          .limit(1);

        return {
          ...resource,
          hasSettings: !!settings,
          attemptCount: attemptCount?.count ?? 0,
          lastAttempt: lastAttempt?.completedAt?.toISOString() ?? null,
        };
      })
    );

    return NextResponse.json(quizzesWithInfo);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}
