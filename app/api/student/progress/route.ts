import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  quizAttempts,
  lessonAttempts,
  flashcardStudyLogs,
  savedResources,
  studyMaterials,
  courseEnrollments,
  courseResources,
  courses,
  flashcards,
} from "@/lib/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Recent quiz attempts with resource titles
    const recentQuizAttempts = await db
      .select({
        id: quizAttempts.id,
        score: quizAttempts.score,
        grade: quizAttempts.grade,
        completedAt: quizAttempts.completedAt,
        pointsEarned: quizAttempts.pointsEarned,
        pointsPossible: quizAttempts.pointsPossible,
        resourceTitle: studyMaterials.title,
        resourceId: studyMaterials.id,
      })
      .from(quizAttempts)
      .innerJoin(studyMaterials, eq(quizAttempts.studyMaterialId, studyMaterials.id))
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.completedAt))
      .limit(10);

    // Recent lesson attempts
    const recentLessonAttempts = await db
      .select({
        id: lessonAttempts.id,
        score: lessonAttempts.score,
        completedAt: lessonAttempts.completedAt,
        totalSteps: lessonAttempts.totalSteps,
        correctCount: lessonAttempts.correctCount,
        lessonId: lessonAttempts.lessonId,
      })
      .from(lessonAttempts)
      .where(eq(lessonAttempts.userId, userId))
      .orderBy(desc(lessonAttempts.completedAt))
      .limit(10);

    // Flashcard study stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const flashcardStats = await db
      .select({
        totalStudied: sql<number>`coalesce(sum(${flashcardStudyLogs.cardsStudied}), 0)`,
        totalCorrect: sql<number>`coalesce(sum(${flashcardStudyLogs.cardsCorrect}), 0)`,
        sessions: sql<number>`count(*)`,
      })
      .from(flashcardStudyLogs)
      .where(
        and(
          eq(flashcardStudyLogs.userId, userId),
          gte(flashcardStudyLogs.createdAt, thirtyDaysAgo)
        )
      );

    // Due flashcards count
    const [dueCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(flashcards)
      .innerJoin(studyMaterials, eq(flashcards.studyMaterialId, studyMaterials.id))
      .where(
        and(
          eq(studyMaterials.userId, userId),
          sql`${flashcards.nextReview} <= now()`
        )
      );

    // Saved resources count
    const [savedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(savedResources)
      .where(eq(savedResources.userId, userId));

    // Enrolled courses with progress
    const enrollments = await db
      .select({
        courseId: courseEnrollments.courseId,
        role: courseEnrollments.role,
        courseTitle: courses.title,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.userId, userId));

    const courseProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const resources = await db
          .select({ resourceId: courseResources.resourceId, dueDate: courseResources.dueDate })
          .from(courseResources)
          .where(eq(courseResources.courseId, enrollment.courseId));

        // Check completion for each resource
        let completed = 0;
        for (const resource of resources) {
          const [attempt] = await db
            .select({ id: quizAttempts.id })
            .from(quizAttempts)
            .where(
              and(
                eq(quizAttempts.studyMaterialId, resource.resourceId),
                eq(quizAttempts.userId, userId)
              )
            )
            .limit(1);
          if (attempt) completed++;
        }

        return {
          courseId: enrollment.courseId,
          courseTitle: enrollment.courseTitle,
          role: enrollment.role,
          totalResources: resources.length,
          completedResources: completed,
        };
      })
    );

    // Calculate overall stats
    const totalQuizAttempts = recentQuizAttempts.length;
    const avgQuizScore = totalQuizAttempts > 0
      ? recentQuizAttempts.reduce((sum, a) => sum + Number(a.score || 0), 0) / totalQuizAttempts
      : 0;

    // Per-question-type analytics: aggregate questionResults over recent attempts
    const attemptsForTypeStats = await db
      .select({ questionResults: quizAttempts.questionResults })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.completedAt))
      .limit(50);

    const typeAgg: Record<string, { correct: number; total: number }> = {};
    for (const row of attemptsForTypeStats) {
      const results = row.questionResults || [];
      for (const r of results) {
        if (!r || typeof r !== "object" || !r.questionType) continue;
        const t = String(r.questionType);
        if (!typeAgg[t]) typeAgg[t] = { correct: 0, total: 0 };
        typeAgg[t].total += 1;
        if (r.isCorrect) typeAgg[t].correct += 1;
      }
    }

    const questionTypeStats = Object.entries(typeAgg)
      .map(([type, stats]) => ({
        type,
        total: stats.total,
        correct: stats.correct,
        accuracy:
          stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      quizAttempts: recentQuizAttempts,
      lessonAttempts: recentLessonAttempts,
      flashcardStats: flashcardStats[0] || { totalStudied: 0, totalCorrect: 0, sessions: 0 },
      flashcardsDue: Number(dueCount?.count || 0),
      savedResourcesCount: Number(savedCount?.count || 0),
      courseProgress,
      questionTypeStats,
      summary: {
        avgQuizScore: Math.round(avgQuizScore * 10) / 10,
        totalQuizAttempts,
        totalLessonAttempts: recentLessonAttempts.length,
        totalFlashcardSessions: Number(flashcardStats[0]?.sessions || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching student progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
