import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, flashcards, quizQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateCSV } from "@/lib/csv";

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
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "flashcards";

    // Verify ownership
    const [resource] = await db
      .select({ id: studyMaterials.id, title: studyMaterials.title })
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

    if (type === "flashcards") {
      const cards = await db
        .select({ front: flashcards.front, back: flashcards.back })
        .from(flashcards)
        .where(eq(flashcards.studyMaterialId, resourceId));

      const csv = generateCSV(
        ["front", "back"],
        cards.map((c) => [c.front, c.back])
      );

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${resource.title}-flashcards.csv"`,
        },
      });
    }

    if (type === "questions") {
      const questions = await db
        .select({
          question: quizQuestions.question,
          questionType: quizQuestions.questionType,
          points: quizQuestions.points,
          explanation: quizQuestions.explanation,
        })
        .from(quizQuestions)
        .where(eq(quizQuestions.studyMaterialId, resourceId));

      const csv = generateCSV(
        ["question", "questionType", "points", "explanation"],
        questions.map((q) => [
          q.question,
          q.questionType,
          q.points || "1",
          q.explanation || "",
        ])
      );

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${resource.title}-questions.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
