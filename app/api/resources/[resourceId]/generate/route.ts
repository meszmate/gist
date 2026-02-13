import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, flashcards, quizQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  generateSummary,
  generateFlashcards,
  generateExtendedQuizQuestions,
  MODEL,
} from "@/lib/ai/openai";
import { checkTokenLimit, logTokenUsage } from "@/lib/ai/token-usage";

const generateSchema = z.object({
  type: z.enum(["summary", "flashcards", "quiz"]),
  sourceContent: z.string().min(1),
  count: z.number().min(1).max(50).optional(),
  locale: z.string().optional(),
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

    // Check token limit
    const { allowed, tokensUsed, tokenLimit } = await checkTokenLimit(session.user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Token usage limit exceeded", code: "TOKEN_LIMIT_EXCEEDED", tokensUsed, tokenLimit },
        { status: 429 }
      );
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
        const { result: summary, usage } = await generateSummary(data.sourceContent, data.locale);
        await db
          .update(studyMaterials)
          .set({ summary, updatedAt: new Date() })
          .where(eq(studyMaterials.id, resourceId));
        await logTokenUsage(session.user.id, usage, "generate_summary", MODEL);
        return NextResponse.json({ summary });
      }

      case "flashcards": {
        const { result: generatedFlashcards, usage } = await generateFlashcards(
          data.sourceContent,
          data.count || 10,
          data.locale
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

        await logTokenUsage(session.user.id, usage, "generate_flashcards", MODEL);
        return NextResponse.json({
          flashcards: generatedFlashcards,
          count: generatedFlashcards.length,
        });
      }

      case "quiz": {
        const { result: generatedQuestions, usage } = await generateExtendedQuizQuestions(
          data.sourceContent,
          data.count || 5,
          "mixed",
          data.locale
        );

        if (generatedQuestions.length > 0) {
          await db.insert(quizQuestions).values(
            generatedQuestions.map((q, index) => ({
              studyMaterialId: resourceId,
              question: q.question,
              questionType: q.questionType,
              questionConfig: q.questionConfig,
              correctAnswerData: q.correctAnswerData,
              points: String(q.points),
              order: index,
              explanation: q.explanation,
              // Legacy fields for backward compatibility
              options: q.questionType === "multiple_choice" && "options" in q.questionConfig
                ? (q.questionConfig as { options: string[] }).options
                : null,
              correctAnswer: q.questionType === "multiple_choice" && "correctIndex" in q.correctAnswerData
                ? (q.correctAnswerData as { correctIndex: number }).correctIndex
                : null,
            }))
          );
        }

        await logTokenUsage(session.user.id, usage, "generate_quiz", MODEL);
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
