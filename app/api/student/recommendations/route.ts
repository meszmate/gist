import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, flashcards } from "@/lib/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import { assessUserSkill } from "@/lib/user/skill-inferencer";

type RecommendationType =
  | "review_flashcards"
  | "review_lesson"
  | "try_advanced"
  | "start_learning";

interface Recommendation {
  type: RecommendationType;
  resourceId: string;
  resourceTitle: string;
  priority: number;
  dueCount?: number;
  lastScore?: number;
  level?: string;
  masteryScore?: number;
}

/**
 * Produce "next up" recommendations for the dashboard based on the user's
 * skill profile and learning signals across their resources.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch the user's most recently touched resources (active ones first)
    const userResources = await db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        updatedAt: studyMaterials.updatedAt,
      })
      .from(studyMaterials)
      .where(
        and(
          eq(studyMaterials.userId, userId),
          sql`${studyMaterials.completedAt} IS NULL`
        )
      )
      .orderBy(desc(studyMaterials.updatedAt))
      .limit(15);

    if (userResources.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const recommendations: Recommendation[] = [];

    for (const resource of userResources) {
      // Due flashcard count for this resource
      const [due] = await db
        .select({ count: sql<number>`count(*)` })
        .from(flashcards)
        .where(
          and(
            eq(flashcards.studyMaterialId, resource.id),
            sql`${flashcards.nextReview} <= now()`
          )
        );

      const dueCount = Number(due?.count || 0);

      // Due flashcards beat everything — they're time-sensitive
      if (dueCount >= 5) {
        recommendations.push({
          type: "review_flashcards",
          resourceId: resource.id,
          resourceTitle: resource.title,
          priority: 100 + dueCount, // bigger dueCount = higher priority
          dueCount,
        });
        continue; // Don't spam multiple recs per resource
      }

      // Skill-based recommendations
      const assessment = await assessUserSkill(userId, resource.id);

      // No data yet but the resource exists — nudge them to start
      if (assessment.confidence === 0) {
        recommendations.push({
          type: "start_learning",
          resourceId: resource.id,
          resourceTitle: resource.title,
          priority: 20,
        });
        continue;
      }

      // Struggling: mastery < 55 and they've actually attempted something
      if (assessment.masteryScore < 55 && assessment.signals.attempts > 0) {
        recommendations.push({
          type: "review_lesson",
          resourceId: resource.id,
          resourceTitle: resource.title,
          priority: 80 - assessment.masteryScore,
          lastScore: assessment.signals.quizAvg ?? assessment.signals.lessonAvg ?? undefined,
          level: assessment.level,
          masteryScore: assessment.masteryScore,
        });
        continue;
      }

      // Mastering: push them toward advanced content
      if (assessment.masteryScore >= 85 && assessment.level === "advanced") {
        recommendations.push({
          type: "try_advanced",
          resourceId: resource.id,
          resourceTitle: resource.title,
          priority: 40,
          masteryScore: assessment.masteryScore,
          level: assessment.level,
        });
        continue;
      }
    }

    // Fall back: if no strong signals, include due flashcards below threshold
    if (recommendations.length === 0) {
      for (const resource of userResources.slice(0, 3)) {
        const [due] = await db
          .select({ count: sql<number>`count(*)` })
          .from(flashcards)
          .where(
            and(
              eq(flashcards.studyMaterialId, resource.id),
              sql`${flashcards.nextReview} <= now()`
            )
          );
        const dueCount = Number(due?.count || 0);
        if (dueCount > 0) {
          recommendations.push({
            type: "review_flashcards",
            resourceId: resource.id,
            resourceTitle: resource.title,
            priority: dueCount,
            dueCount,
          });
        }
      }
    }

    // Sort by priority desc, take top 3
    recommendations.sort((a, b) => b.priority - a.priority);
    const top = recommendations.slice(0, 3);

    return NextResponse.json({ recommendations: top });
  } catch (error) {
    console.error("Error computing recommendations:", error);
    return NextResponse.json(
      { error: "Failed to compute recommendations" },
      { status: 500 }
    );
  }
}
