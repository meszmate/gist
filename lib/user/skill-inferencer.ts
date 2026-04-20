import { db } from "@/lib/db";
import {
  quizAttempts,
  lessonAttempts,
  flashcards,
  studyMaterials,
  lessons,
} from "@/lib/db/schema";
import { and, eq, desc, sql, inArray } from "drizzle-orm";

export type UserLevel = "beginner" | "intermediate" | "advanced";

export interface SkillAssessment {
  level: UserLevel;
  masteryScore: number; // 0-100, or 0 when there's no data
  confidence: number; // 0-1, how much data we have (sum of signal weights)
  signals: {
    quizAvg: number | null;
    lessonAvg: number | null;
    flashcardEaseAvg: number | null;
    attempts: number;
  };
}

/**
 * Infer a user's skill level for a specific resource by combining
 * their past quiz scores, lesson step accuracy, and SM-2 flashcard ease.
 *
 * Falls back to `studyMaterials.difficulty` for users with no attempts yet,
 * and to "intermediate" if even that is missing.
 */
export async function assessUserSkill(
  userId: string,
  resourceId: string
): Promise<SkillAssessment> {
  // --- Quiz signal: recent scores for this resource ---
  const quizzes = await db
    .select({
      score: quizAttempts.score,
    })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.studyMaterialId, resourceId)
      )
    )
    .orderBy(desc(quizAttempts.completedAt))
    .limit(10);

  const quizScores = quizzes
    .map((q) => (q.score != null ? Number(q.score) : null))
    .filter((s): s is number => s != null && !Number.isNaN(s));

  const quizAvg =
    quizScores.length > 0
      ? quizScores.reduce((sum, s) => sum + s, 0) / quizScores.length
      : null;

  // --- Lesson signal: recent lesson-attempt scores for any lesson in the resource ---
  const lessonRows = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.studyMaterialId, resourceId));

  const lessonIds = lessonRows.map((l) => l.id);

  let lessonAvg: number | null = null;
  if (lessonIds.length > 0) {
    const lessonResults = await db
      .select({ score: lessonAttempts.score })
      .from(lessonAttempts)
      .where(
        and(
          eq(lessonAttempts.userId, userId),
          inArray(lessonAttempts.lessonId, lessonIds)
        )
      )
      .orderBy(desc(lessonAttempts.completedAt))
      .limit(10);

    const lessonScores = lessonResults
      .map((l) => (l.score != null ? Number(l.score) : null))
      .filter((s): s is number => s != null && !Number.isNaN(s));

    if (lessonScores.length > 0) {
      lessonAvg =
        lessonScores.reduce((sum, s) => sum + s, 0) / lessonScores.length;
    }
  }

  // --- Flashcard signal: SM-2 ease factor across reviewed cards for this resource ---
  const [flashStat] = await db
    .select({
      avgEase: sql<number>`avg(${flashcards.easeFactor})`,
      reviewedCount: sql<number>`count(*)`,
    })
    .from(flashcards)
    .where(
      and(
        eq(flashcards.studyMaterialId, resourceId),
        sql`${flashcards.repetitions} > 0`
      )
    );

  const flashcardEaseAvg =
    flashStat && Number(flashStat.reviewedCount) > 0
      ? Number(flashStat.avgEase)
      : null;

  // --- Combine signals into a mastery score (0-100) ---
  // Weights: quiz 50%, lesson 30%, flashcard ease 20%.
  // Ease factor ~1.3 (struggling) to 2.5+ (mastered); map linearly to 0-100.
  let totalWeight = 0;
  let masteryAccum = 0;

  if (quizAvg != null) {
    masteryAccum += quizAvg * 0.5;
    totalWeight += 0.5;
  }
  if (lessonAvg != null) {
    masteryAccum += lessonAvg * 0.3;
    totalWeight += 0.3;
  }
  if (flashcardEaseAvg != null) {
    const easeScore = Math.max(
      0,
      Math.min(100, ((flashcardEaseAvg - 1.3) / 1.2) * 100)
    );
    masteryAccum += easeScore * 0.2;
    totalWeight += 0.2;
  }

  const hasData = totalWeight > 0;
  const masteryScore = hasData ? masteryAccum / totalWeight : 0;

  // --- Bucket to level ---
  let level: UserLevel;
  if (!hasData) {
    // Cold start: use the resource's static difficulty, or default to intermediate.
    const [resource] = await db
      .select({ difficulty: studyMaterials.difficulty })
      .from(studyMaterials)
      .where(eq(studyMaterials.id, resourceId));

    if (resource?.difficulty === "beginner") level = "beginner";
    else if (resource?.difficulty === "advanced") level = "advanced";
    else level = "intermediate";
  } else if (masteryScore < 55) {
    level = "beginner";
  } else if (masteryScore < 80) {
    level = "intermediate";
  } else {
    level = "advanced";
  }

  return {
    level,
    masteryScore: Math.round(masteryScore),
    confidence: totalWeight,
    signals: {
      quizAvg: quizAvg != null ? Math.round(quizAvg) : null,
      lessonAvg: lessonAvg != null ? Math.round(lessonAvg) : null,
      flashcardEaseAvg:
        flashcardEaseAvg != null
          ? Math.round(flashcardEaseAvg * 100) / 100
          : null,
      attempts: quizScores.length + (lessonAvg != null ? 1 : 0),
    },
  };
}

/**
 * Shortcut when you only need the level label.
 */
export async function inferUserLevel(
  userId: string,
  resourceId: string
): Promise<UserLevel> {
  const assessment = await assessUserSkill(userId, resourceId);
  return assessment.level;
}
