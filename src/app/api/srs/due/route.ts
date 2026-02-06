import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { flashcards, studyMaterials } from "@/lib/db/schema";
import { eq, and, lte, isNull } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resourceId = searchParams.get("resource");

    const now = new Date();

    let query = db
      .select({
        id: flashcards.id,
        front: flashcards.front,
        back: flashcards.back,
        studyMaterialId: flashcards.studyMaterialId,
        studyMaterialTitle: studyMaterials.title,
      })
      .from(flashcards)
      .innerJoin(studyMaterials, eq(flashcards.studyMaterialId, studyMaterials.id))
      .where(
        and(
          eq(studyMaterials.userId, session.user.id),
          lte(flashcards.nextReview, now),
          isNull(studyMaterials.completedAt),
          resourceId ? eq(flashcards.studyMaterialId, resourceId) : undefined
        )
      )
      .orderBy(flashcards.nextReview)
      .limit(50);

    const dueCards = await query;

    return NextResponse.json(dueCards);
  } catch (error) {
    console.error("Error fetching due cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch due cards" },
      { status: 500 }
    );
  }
}
