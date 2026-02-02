import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, flashcards, quizQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  generateSummary,
  generateFlashcards,
  generateQuizQuestions,
} from "@/lib/ai/openai";

const generateSchema = z.object({
  type: z.enum(["summary", "flashcards", "quiz"]),
  sourceContent: z.string().min(1),
  count: z.number().min(1).max(50).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;
    const body = await req.json();
    const data = generateSchema.parse(body);

    // Verify ownership
    const [resource] = await db
      .select()
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

    switch (data.type) {
      case "summary": {
        const summary = await generateSummary(data.sourceContent);
        await db
          .update(studyMaterials)
          .set({ summary, updatedAt: new Date() })
          .where(eq(studyMaterials.id, resourceId));
        return NextResponse.json({ summary });
      }

      case "flashcards": {
        const generatedFlashcards = await generateFlashcards(
          data.sourceContent,
          data.count || 10
        );

        if (generatedFlashcards.length > 0) {
          await db.insert(flashcards).values(
            generatedFlashcards.map((card) => ({
              studyMaterialId: resourceId,
              front: card.front,
              back: card.back,
            }))
          );
        }

        return NextResponse.json({
          flashcards: generatedFlashcards,
          count: generatedFlashcards.length,
        });
      }

      case "quiz": {
        const generatedQuestions = await generateQuizQuestions(
          data.sourceContent,
          data.count || 5
        );

        if (generatedQuestions.length > 0) {
          await db.insert(quizQuestions).values(
            generatedQuestions.map((q) => ({
              studyMaterialId: resourceId,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
            }))
          );
        }

        return NextResponse.json({
          questions: generatedQuestions,
          count: generatedQuestions.length,
        });
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
