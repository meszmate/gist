import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, quizQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { normalizeQuestionPayload } from "@/lib/quiz/question-normalizer";

const updateQuestionSchema = z.object({
  question: z.string().min(1).optional(),
  questionType: z.string().optional(),
  questionConfig: z.record(z.string(), z.any()).optional(),
  correctAnswerData: z.record(z.string(), z.any()).optional(),
  points: z.number().optional(),
  order: z.number().optional(),
  explanation: z.string().optional().nullable(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.number().optional(),
});

// GET - Fetch a single question
export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId, questionId } = await params;

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

    // Get the question
    const [question] = await db
      .select()
      .from(quizQuestions)
      .where(
        and(
          eq(quizQuestions.id, questionId),
          eq(quizQuestions.studyMaterialId, quizId)
        )
      );

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const normalized = normalizeQuestionPayload({
      questionType: question.questionType,
      questionConfig: question.questionConfig,
      correctAnswerData: question.correctAnswerData,
      options: question.options,
      correctAnswer: question.correctAnswer,
    });

    return NextResponse.json({
      ...question,
      questionType: normalized.questionType,
      questionConfig: normalized.questionConfig,
      correctAnswerData: normalized.correctAnswerData,
      options: normalized.options,
      correctAnswer: normalized.correctAnswer,
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    return NextResponse.json(
      { error: "Failed to fetch question" },
      { status: 500 }
    );
  }
}

// PUT - Update a question
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId, questionId } = await params;
    const body = await req.json();
    const data = updateQuestionSchema.parse(body);

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

    // Check if question exists
    const [existing] = await db
      .select()
      .from(quizQuestions)
      .where(
        and(
          eq(quizQuestions.id, questionId),
          eq(quizQuestions.studyMaterialId, quizId)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    const normalized = normalizeQuestionPayload({
      questionType: data.questionType ?? existing.questionType,
      questionConfig: data.questionConfig ?? existing.questionConfig,
      correctAnswerData: data.correctAnswerData ?? existing.correctAnswerData,
      options: data.options ?? existing.options,
      correctAnswer: data.correctAnswer ?? existing.correctAnswer,
    });

    // Update the question
    const [updated] = await db
      .update(quizQuestions)
      .set({
        question: data.question ?? existing.question,
        questionType: normalized.questionType,
        questionConfig: normalized.questionConfig,
        correctAnswerData: normalized.correctAnswerData,
        points: data.points?.toString() ?? existing.points,
        order: data.order ?? existing.order,
        explanation: data.explanation !== undefined ? data.explanation : existing.explanation,
        options: normalized.options,
        correctAnswer: normalized.correctAnswer,
        updatedAt: new Date(),
      })
      .where(eq(quizQuestions.id, questionId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a question
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId, questionId } = await params;

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

    // Delete the question
    await db
      .delete(quizQuestions)
      .where(
        and(
          eq(quizQuestions.id, questionId),
          eq(quizQuestions.studyMaterialId, quizId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
