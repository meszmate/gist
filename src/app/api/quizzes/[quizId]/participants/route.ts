import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, quizAttempts, quizQuestions, users } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql, asc, like, or, type SQL } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  scoreMin: z.coerce.number().optional(),
  scoreMax: z.coerce.number().optional(),
  grade: z.string().optional(),
  sortBy: z.enum(["name", "score", "date", "time"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  format: z.enum(["json", "csv"]).optional(),
});

// GET - Fetch participants for a quiz
export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const query = querySchema.parse(queryParams);

    // Verify ownership
    const [resource] = await db
      .select()
      .from(studyMaterials)
      .where(
        and(
          eq(studyMaterials.id, quizId),
          eq(studyMaterials.userId, session.user.id)
        )
      );

    if (!resource) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Get total question count
    const [questionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizQuestions)
      .where(eq(quizQuestions.studyMaterialId, quizId));

    // Build query conditions
    const conditions: SQL[] = [eq(quizAttempts.studyMaterialId, quizId)];

    if (query.dateFrom) {
      conditions.push(gte(quizAttempts.completedAt, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      conditions.push(lte(quizAttempts.completedAt, new Date(query.dateTo)));
    }
    if (query.scoreMin !== undefined) {
      conditions.push(gte(quizAttempts.score, query.scoreMin.toString()));
    }
    if (query.scoreMax !== undefined) {
      conditions.push(lte(quizAttempts.score, query.scoreMax.toString()));
    }
    if (query.grade) {
      conditions.push(eq(quizAttempts.grade, query.grade));
    }

    // Apply sorting
    const sortBy = query.sortBy || "date";
    const sortOrder = query.sortOrder || "desc";
    const orderFn = sortOrder === "asc" ? asc : desc;

    let orderByCol;
    switch (sortBy) {
      case "name":
        orderByCol = orderFn(quizAttempts.participantName);
        break;
      case "score":
        orderByCol = orderFn(quizAttempts.score);
        break;
      case "time":
        orderByCol = orderFn(quizAttempts.timeSpentSeconds);
        break;
      case "date":
      default:
        orderByCol = orderFn(quizAttempts.completedAt);
        break;
    }

    // Apply pagination
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const offset = (page - 1) * pageSize;

    // Build the search filter for use with OR
    let searchCondition: SQL | undefined;
    if (query.search) {
      const searchTerm = `%${query.search}%`;
      searchCondition = or(
        like(quizAttempts.participantName, searchTerm),
        like(quizAttempts.guestEmail, searchTerm),
        like(users.name, searchTerm),
        like(users.email, searchTerm)
      );
    }

    // Get attempts with user info
    const attemptsQuery = db
      .select({
        id: quizAttempts.id,
        participantName: quizAttempts.participantName,
        guestEmail: quizAttempts.guestEmail,
        userId: quizAttempts.userId,
        score: quizAttempts.score,
        pointsEarned: quizAttempts.pointsEarned,
        pointsPossible: quizAttempts.pointsPossible,
        grade: quizAttempts.grade,
        completedAt: quizAttempts.completedAt,
        timeSpentSeconds: quizAttempts.timeSpentSeconds,
        attemptNumber: quizAttempts.attemptNumber,
        questionResults: quizAttempts.questionResults,
        userName: users.name,
        userEmail: users.email,
      })
      .from(quizAttempts)
      .leftJoin(users, eq(quizAttempts.userId, users.id))
      .where(searchCondition ? and(...conditions, searchCondition) : and(...conditions))
      .orderBy(orderByCol)
      .limit(pageSize)
      .offset(offset);

    const attempts = await attemptsQuery;

    // Get total count for pagination
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizAttempts)
      .where(and(...conditions));

    // Calculate statistics
    const allAttempts = await db
      .select({
        score: quizAttempts.score,
        grade: quizAttempts.grade,
        timeSpentSeconds: quizAttempts.timeSpentSeconds,
        completedAt: quizAttempts.completedAt,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.studyMaterialId, quizId));

    const scores = allAttempts
      .filter(a => a.score !== null)
      .map(a => parseFloat(a.score!));

    const completedAttempts = allAttempts.filter(a => a.completedAt !== null);
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const timesSpent = allAttempts
      .filter(a => a.timeSpentSeconds !== null)
      .map(a => a.timeSpentSeconds!);
    const averageTimeSeconds = timesSpent.length > 0
      ? timesSpent.reduce((a, b) => a + b, 0) / timesSpent.length
      : 0;

    // Grade distribution
    const gradeDistribution: Record<string, number> = {};
    for (const attempt of allAttempts) {
      if (attempt.grade) {
        gradeDistribution[attempt.grade] = (gradeDistribution[attempt.grade] || 0) + 1;
      }
    }

    // Score distribution (in 10% buckets)
    const scoreDistribution = [
      { range: "0-10%", count: 0 },
      { range: "10-20%", count: 0 },
      { range: "20-30%", count: 0 },
      { range: "30-40%", count: 0 },
      { range: "40-50%", count: 0 },
      { range: "50-60%", count: 0 },
      { range: "60-70%", count: 0 },
      { range: "70-80%", count: 0 },
      { range: "80-90%", count: 0 },
      { range: "90-100%", count: 0 },
    ];
    for (const score of scores) {
      const bucket = Math.min(Math.floor(score / 10), 9);
      scoreDistribution[bucket].count++;
    }

    // Transform attempts for response
    const participants = attempts.map((a) => {
      const questionResults = a.questionResults || [];
      const correctCount = questionResults.filter((r: { isCorrect: boolean }) => r.isCorrect).length;

      return {
        id: a.id,
        attemptId: a.id,
        name: a.participantName || a.userName || null,
        email: a.guestEmail || a.userEmail || null,
        userId: a.userId,
        score: parseFloat(a.score || "0"),
        grade: a.grade,
        pointsEarned: parseFloat(a.pointsEarned || "0"),
        pointsPossible: parseFloat(a.pointsPossible || "0"),
        timeSpentSeconds: a.timeSpentSeconds,
        completedAt: a.completedAt,
        attemptNumber: a.attemptNumber || 1,
        questionCount: Number(questionCount.count),
        correctCount,
      };
    });

    // Handle CSV export
    if (query.format === "csv") {
      const csvHeaders = [
        "Name",
        "Email",
        "Score (%)",
        "Grade",
        "Points Earned",
        "Points Possible",
        "Correct Answers",
        "Total Questions",
        "Time (seconds)",
        "Completed At",
      ];

      const csvRows = participants.map((p) => [
        p.name || "",
        p.email || "",
        p.score.toFixed(2),
        p.grade || "",
        p.pointsEarned.toFixed(2),
        p.pointsPossible.toFixed(2),
        p.correctCount,
        p.questionCount,
        p.timeSpentSeconds || "",
        p.completedAt?.toISOString() || "",
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="quiz-participants-${quizId}.csv"`,
        },
      });
    }

    return NextResponse.json({
      participants,
      pagination: {
        page,
        pageSize,
        total: Number(totalCount.count),
        totalPages: Math.ceil(Number(totalCount.count) / pageSize),
      },
      stats: {
        totalParticipants: allAttempts.length,
        completedCount: completedAttempts.length,
        averageScore: Math.round(averageScore * 100) / 100,
        highestScore: Math.round(highestScore * 100) / 100,
        lowestScore: Math.round(lowestScore * 100) / 100,
        averageTimeSeconds: Math.round(averageTimeSeconds),
        gradeDistribution,
        scoreDistribution,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}
