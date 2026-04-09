import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, flashcards, quizQuestions } from "@/lib/db/schema";
import { eq, or, sql, and, ilike } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const type = searchParams.get("type") || "all";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const pattern = `%${query}%`;
    const results: Array<{
      id: string;
      type: "resource" | "flashcard" | "question";
      title: string;
      subtitle?: string;
      resourceId?: string;
    }> = [];

    // Search resources
    if (type === "all" || type === "resources") {
      const resources = await db
        .select({
          id: studyMaterials.id,
          title: studyMaterials.title,
          description: studyMaterials.description,
        })
        .from(studyMaterials)
        .where(
          and(
            eq(studyMaterials.userId, session.user.id),
            or(
              ilike(studyMaterials.title, pattern),
              ilike(studyMaterials.description, pattern),
              sql`to_tsvector('english', coalesce(${studyMaterials.title}, '') || ' ' || coalesce(${studyMaterials.description}, '')) @@ plainto_tsquery('english', ${query})`
            )
          )
        )
        .limit(limit);

      for (const r of resources) {
        results.push({
          id: r.id,
          type: "resource",
          title: r.title,
          subtitle: r.description?.slice(0, 100) || undefined,
        });
      }
    }

    // Search flashcards
    if (type === "all" || type === "flashcards") {
      const cards = await db
        .select({
          id: flashcards.id,
          front: flashcards.front,
          back: flashcards.back,
          resourceId: flashcards.studyMaterialId,
        })
        .from(flashcards)
        .innerJoin(studyMaterials, eq(flashcards.studyMaterialId, studyMaterials.id))
        .where(
          and(
            eq(studyMaterials.userId, session.user.id),
            or(
              ilike(flashcards.front, pattern),
              ilike(flashcards.back, pattern),
              sql`to_tsvector('english', coalesce(${flashcards.front}, '') || ' ' || coalesce(${flashcards.back}, '')) @@ plainto_tsquery('english', ${query})`
            )
          )
        )
        .limit(limit);

      for (const c of cards) {
        results.push({
          id: c.id,
          type: "flashcard",
          title: c.front,
          subtitle: c.back.slice(0, 100),
          resourceId: c.resourceId,
        });
      }
    }

    // Search questions
    if (type === "all" || type === "questions") {
      const questions = await db
        .select({
          id: quizQuestions.id,
          question: quizQuestions.question,
          explanation: quizQuestions.explanation,
          resourceId: quizQuestions.studyMaterialId,
        })
        .from(quizQuestions)
        .innerJoin(studyMaterials, eq(quizQuestions.studyMaterialId, studyMaterials.id))
        .where(
          and(
            eq(studyMaterials.userId, session.user.id),
            or(
              ilike(quizQuestions.question, pattern),
              sql`to_tsvector('english', coalesce(${quizQuestions.question}, '') || ' ' || coalesce(${quizQuestions.explanation}, '')) @@ plainto_tsquery('english', ${query})`
            )
          )
        )
        .limit(limit);

      for (const q of questions) {
        results.push({
          id: q.id,
          type: "question",
          title: q.question,
          subtitle: q.explanation?.slice(0, 100) || undefined,
          resourceId: q.resourceId,
        });
      }
    }

    return NextResponse.json({ results: results.slice(0, limit) });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
