import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, flashcards, quizAttempts } from "@/lib/db/schema";
import { eq, and, lte, count, sql, gte, desc, gt } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";

interface DashboardStats {
  resourceCount: number;
  flashcardsDue: number;
  totalFlashcards: number;
  recentAttempts: {
    id: string;
    score: string | null;
    completedAt: Date | null;
    title: string;
  }[];
  weeklyActivity: number[];
  studyStreak: number;
  totalReviews: number;
}

async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [resourceCount] = await db
    .select({ count: count() })
    .from(studyMaterials)
    .where(eq(studyMaterials.userId, userId));

  const [flashcardsDue] = await db
    .select({ count: count() })
    .from(flashcards)
    .innerJoin(studyMaterials, eq(flashcards.studyMaterialId, studyMaterials.id))
    .where(
      and(
        eq(studyMaterials.userId, userId),
        lte(flashcards.nextReview, new Date())
      )
    );

  const [totalFlashcards] = await db
    .select({ count: count() })
    .from(flashcards)
    .innerJoin(studyMaterials, eq(flashcards.studyMaterialId, studyMaterials.id))
    .where(eq(studyMaterials.userId, userId));

  const recentAttempts = await db
    .select({
      id: quizAttempts.id,
      score: quizAttempts.score,
      completedAt: quizAttempts.completedAt,
      title: studyMaterials.title,
    })
    .from(quizAttempts)
    .innerJoin(studyMaterials, eq(quizAttempts.studyMaterialId, studyMaterials.id))
    .where(eq(studyMaterials.userId, userId))
    .orderBy(desc(quizAttempts.completedAt))
    .limit(5);

  // Get weekly activity based on flashcard updates (when repetitions > 0 and updated)
  const weeklyActivity: number[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      const [dayCount] = await db
        .select({ count: count() })
        .from(flashcards)
        .innerJoin(studyMaterials, eq(flashcards.studyMaterialId, studyMaterials.id))
        .where(
          and(
            eq(studyMaterials.userId, userId),
            gt(flashcards.repetitions, 0),
            gte(flashcards.updatedAt, dayStart),
            lte(flashcards.updatedAt, dayEnd)
          )
        );
      weeklyActivity.push(dayCount?.count ?? 0);
    } catch {
      weeklyActivity.push(0);
    }
  }

  // Calculate study streak based on quiz attempts and flashcard reviews
  let studyStreak = 0;
  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      // Check for quiz attempts on this day
      const [quizCount] = await db
        .select({ count: count() })
        .from(quizAttempts)
        .innerJoin(studyMaterials, eq(quizAttempts.studyMaterialId, studyMaterials.id))
        .where(
          and(
            eq(studyMaterials.userId, userId),
            gte(quizAttempts.completedAt, dayStart),
            lte(quizAttempts.completedAt, dayEnd)
          )
        );

      // Check for flashcard reviews on this day
      const [flashcardCount] = await db
        .select({ count: count() })
        .from(flashcards)
        .innerJoin(studyMaterials, eq(flashcards.studyMaterialId, studyMaterials.id))
        .where(
          and(
            eq(studyMaterials.userId, userId),
            gt(flashcards.repetitions, 0),
            gte(flashcards.updatedAt, dayStart),
            lte(flashcards.updatedAt, dayEnd)
          )
        );

      const dayActivity = (quizCount?.count ?? 0) + (flashcardCount?.count ?? 0);

      if (dayActivity > 0) {
        studyStreak++;
      } else if (i > 0) {
        break;
      }
    } catch {
      break;
    }
  }

  // Total reviews is sum of all flashcard repetitions
  let totalReviews = 0;
  try {
    const [reviewSum] = await db
      .select({ total: sql<number>`COALESCE(SUM(${flashcards.repetitions}), 0)` })
      .from(flashcards)
      .innerJoin(studyMaterials, eq(flashcards.studyMaterialId, studyMaterials.id))
      .where(eq(studyMaterials.userId, userId));
    totalReviews = Number(reviewSum?.total ?? 0);
  } catch {
    totalReviews = 0;
  }

  return {
    resourceCount: resourceCount?.count ?? 0,
    flashcardsDue: flashcardsDue?.count ?? 0,
    totalFlashcards: totalFlashcards?.count ?? 0,
    recentAttempts,
    weeklyActivity,
    studyStreak,
    totalReviews,
  };
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const stats = await getDashboardStats(session.user.id);
  const greeting = getTimeBasedGreeting();
  const firstName = session.user.name?.split(" ")[0] || "there";

  return (
    <DashboardClient
      greeting={greeting}
      firstName={firstName}
      stats={stats}
    />
  );
}
