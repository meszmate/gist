import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { flashcards, studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const reviewSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.number().min(1).max(4),
});

// SM-2 Algorithm implementation
function calculateNextReview(
  rating: number,
  repetitions: number,
  easeFactor: number,
  interval: number
): { interval: number; repetitions: number; easeFactor: number; nextReview: Date } {
  // Rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
  // Convert to SM-2 quality (0-5 scale)
  const quality = rating === 1 ? 0 : rating === 2 ? 2 : rating === 3 ? 4 : 5;

  let newInterval: number;
  let newRepetitions: number;
  let newEaseFactor: number;

  if (quality < 3) {
    // Failed - reset repetitions
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    // Passed
    newRepetitions = repetitions + 1;
    newEaseFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
  }

  // Adjust for rating
  if (rating === 4) {
    // Easy - bonus interval
    newInterval = Math.round(newInterval * 1.3);
  } else if (rating === 2) {
    // Hard - reduce interval
    newInterval = Math.max(1, Math.round(newInterval * 0.8));
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    nextReview,
  };
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = reviewSchema.parse(body);

    // Get the card and verify ownership
    const [card] = await db
      .select({
        id: flashcards.id,
        repetitions: flashcards.repetitions,
        easeFactor: flashcards.easeFactor,
        interval: flashcards.interval,
        studyMaterialId: flashcards.studyMaterialId,
      })
      .from(flashcards)
      .innerJoin(studyMaterials, eq(flashcards.studyMaterialId, studyMaterials.id))
      .where(
        and(
          eq(flashcards.id, data.cardId),
          eq(studyMaterials.userId, session.user.id)
        )
      );

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const { interval, repetitions, easeFactor, nextReview } = calculateNextReview(
      data.rating,
      card.repetitions ?? 0,
      Number(card.easeFactor) || 2.5,
      card.interval ?? 0
    );

    await db
      .update(flashcards)
      .set({
        interval,
        repetitions,
        easeFactor: easeFactor.toFixed(2),
        nextReview,
        updatedAt: new Date(),
      })
      .where(eq(flashcards.id, data.cardId));

    return NextResponse.json({
      success: true,
      nextReview,
      interval,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error reviewing card:", error);
    return NextResponse.json(
      { error: "Failed to review card" },
      { status: 500 }
    );
  }
}
