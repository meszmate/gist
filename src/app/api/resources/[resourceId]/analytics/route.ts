import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  studyMaterials,
  resourceAccessLogs,
  quizAttempts,
  flashcardStudyLogs,
  quizQuestions,
} from "@/lib/db/schema";
import { eq, and, count, avg, sql, desc } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;
    const url = new URL(req.url);
    const section = url.searchParams.get("section") || "overview";

    // Verify ownership
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
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    if (section === "overview") {
      // Total views
      const [viewCount] = await db
        .select({ count: count() })
        .from(resourceAccessLogs)
        .where(eq(resourceAccessLogs.resourceId, resourceId));

      // Unique viewers
      const uniqueViewers = await db
        .select({ email: resourceAccessLogs.email })
        .from(resourceAccessLogs)
        .where(
          and(
            eq(resourceAccessLogs.resourceId, resourceId),
            sql`${resourceAccessLogs.email} IS NOT NULL`
          )
        )
        .groupBy(resourceAccessLogs.email);

      // Quiz attempts
      const attempts = await db
        .select({
          id: quizAttempts.id,
          score: quizAttempts.score,
          completedAt: quizAttempts.completedAt,
          timeSpentSeconds: quizAttempts.timeSpentSeconds,
        })
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.studyMaterialId, resourceId),
            sql`${quizAttempts.completedAt} IS NOT NULL`
          )
        );

      const avgScore =
        attempts.length > 0
          ? attempts.reduce((sum, a) => sum + parseFloat(a.score || "0"), 0) /
            attempts.length
          : 0;

      const avgTime =
        attempts.length > 0
          ? attempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) /
            attempts.length
          : 0;

      // Flashcard study logs
      const [studyLogCount] = await db
        .select({ count: count() })
        .from(flashcardStudyLogs)
        .where(eq(flashcardStudyLogs.resourceId, resourceId));

      return NextResponse.json({
        totalViews: viewCount?.count || 0,
        uniqueViewers: uniqueViewers.length,
        totalAttempts: attempts.length,
        averageScore: Math.round(avgScore * 10) / 10,
        averageTimeSeconds: Math.round(avgTime),
        flashcardStudySessions: studyLogCount?.count || 0,
      });
    }

    if (section === "viewers") {
      const viewers = await db
        .select({
          email: resourceAccessLogs.email,
          accessType: resourceAccessLogs.accessType,
          createdAt: resourceAccessLogs.createdAt,
        })
        .from(resourceAccessLogs)
        .where(
          and(
            eq(resourceAccessLogs.resourceId, resourceId),
            sql`${resourceAccessLogs.email} IS NOT NULL`
          )
        )
        .orderBy(desc(resourceAccessLogs.createdAt))
        .limit(100);

      // Group by email
      const viewerMap = new Map<
        string,
        { email: string; lastViewed: Date; viewCount: number; types: Set<string> }
      >();
      for (const v of viewers) {
        if (!v.email) continue;
        const existing = viewerMap.get(v.email);
        if (existing) {
          existing.viewCount++;
          existing.types.add(v.accessType);
          if (v.createdAt > existing.lastViewed) {
            existing.lastViewed = v.createdAt;
          }
        } else {
          viewerMap.set(v.email, {
            email: v.email,
            lastViewed: v.createdAt,
            viewCount: 1,
            types: new Set([v.accessType]),
          });
        }
      }

      // Get quiz scores for each viewer
      const viewerList = await Promise.all(
        Array.from(viewerMap.values()).map(async (viewer) => {
          const [attempt] = await db
            .select({
              score: quizAttempts.score,
              timeSpentSeconds: quizAttempts.timeSpentSeconds,
            })
            .from(quizAttempts)
            .where(
              and(
                eq(quizAttempts.studyMaterialId, resourceId),
                eq(quizAttempts.guestEmail, viewer.email)
              )
            )
            .orderBy(desc(quizAttempts.completedAt))
            .limit(1);

          return {
            email: viewer.email,
            lastViewed: viewer.lastViewed,
            viewCount: viewer.viewCount,
            quizScore: attempt ? parseFloat(attempt.score || "0") : null,
            timeSpent: attempt?.timeSpentSeconds || null,
          };
        })
      );

      return NextResponse.json({ viewers: viewerList });
    }

    if (section === "questions") {
      const questions = await db
        .select({
          id: quizQuestions.id,
          question: quizQuestions.question,
          questionType: quizQuestions.questionType,
        })
        .from(quizQuestions)
        .where(eq(quizQuestions.studyMaterialId, resourceId));

      // Get all completed attempts with results
      const allAttempts = await db
        .select({
          questionResults: quizAttempts.questionResults,
        })
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.studyMaterialId, resourceId),
            sql`${quizAttempts.completedAt} IS NOT NULL`
          )
        );

      // Calculate per-question stats
      const questionStats = questions.map((q) => {
        let totalAnswered = 0;
        let correctCount = 0;

        for (const attempt of allAttempts) {
          const results = attempt.questionResults;
          if (!results) continue;
          const qResult = results.find((r) => r.questionId === q.id);
          if (qResult) {
            totalAnswered++;
            if (qResult.isCorrect) correctCount++;
          }
        }

        return {
          id: q.id,
          question: q.question,
          questionType: q.questionType,
          totalAnswered,
          correctCount,
          successRate:
            totalAnswered > 0
              ? Math.round((correctCount / totalAnswered) * 100)
              : 0,
        };
      });

      return NextResponse.json({ questions: questionStats });
    }

    if (section === "timeline") {
      // Get access logs grouped by day for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      const logs = await db
        .select({
          date: sql<string>`DATE(${resourceAccessLogs.createdAt})`.as("date"),
          count: count(),
        })
        .from(resourceAccessLogs)
        .where(
          and(
            eq(resourceAccessLogs.resourceId, resourceId),
            sql`${resourceAccessLogs.createdAt} >= ${thirtyDaysAgoISO}::timestamp`
          )
        )
        .groupBy(sql`DATE(${resourceAccessLogs.createdAt})`)
        .orderBy(sql`DATE(${resourceAccessLogs.createdAt})`);

      const attemptsByDay = await db
        .select({
          date: sql<string>`DATE(${quizAttempts.completedAt})`.as("date"),
          count: count(),
        })
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.studyMaterialId, resourceId),
            sql`${quizAttempts.completedAt} >= ${thirtyDaysAgoISO}::timestamp`,
            sql`${quizAttempts.completedAt} IS NOT NULL`
          )
        )
        .groupBy(sql`DATE(${quizAttempts.completedAt})`)
        .orderBy(sql`DATE(${quizAttempts.completedAt})`);

      return NextResponse.json({
        views: logs,
        attempts: attemptsByDay,
      });
    }

    if (section === "scores") {
      const attempts = await db
        .select({ score: quizAttempts.score })
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.studyMaterialId, resourceId),
            sql`${quizAttempts.completedAt} IS NOT NULL`
          )
        );

      // Build score distribution
      const ranges = [
        { range: "0-20%", min: 0, max: 20, count: 0 },
        { range: "21-40%", min: 21, max: 40, count: 0 },
        { range: "41-60%", min: 41, max: 60, count: 0 },
        { range: "61-80%", min: 61, max: 80, count: 0 },
        { range: "81-100%", min: 81, max: 100, count: 0 },
      ];

      for (const a of attempts) {
        const score = parseFloat(a.score || "0");
        for (const range of ranges) {
          if (score >= range.min && score <= range.max) {
            range.count++;
            break;
          }
        }
      }

      return NextResponse.json({
        distribution: ranges.map((r) => ({
          range: r.range,
          count: r.count,
        })),
      });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
