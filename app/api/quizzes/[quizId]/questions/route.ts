import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, quizQuestions } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const createQuestionSchema = z.object({
  question: z.string().min(1),
  questionType: z.string().default("multiple_choice"),
  questionConfig: z.record(z.string(), z.any()).default({}),
  correctAnswerData: z.record(z.string(), z.any()),
  points: z.number().default(1),
  order: z.number().optional(),
  explanation: z.string().optional(),
  // Legacy support
  options: z.array(z.string()).optional(),
  correctAnswer: z.number().optional(),
});

const reorderSchema = z.object({
  questionOrders: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
    })
  ),
});

// GET - List all questions for a quiz
export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;

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

    // Get all questions
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.studyMaterialId, quizId))
      .orderBy(asc(quizQuestions.order), asc(quizQuestions.createdAt));

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

// POST - Create a new question
export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;
    const body = await req.json();
    const data = createQuestionSchema.parse(body);

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

    // Get the next order number
    const existingQuestions = await db
      .select({ order: quizQuestions.order })
      .from(quizQuestions)
      .where(eq(quizQuestions.studyMaterialId, quizId))
      .orderBy(asc(quizQuestions.order));

    const maxOrder = existingQuestions.reduce(
      (max, q) => Math.max(max, q.order || 0),
      0
    );

    // Create the question
    const [newQuestion] = await db
      .insert(quizQuestions)
      .values({
        studyMaterialId: quizId,
        question: data.question,
        questionType: data.questionType,
        questionConfig: data.questionConfig,
        correctAnswerData: data.correctAnswerData,
        points: data.points.toString(),
        order: data.order ?? maxOrder + 1,
        explanation: data.explanation,
        options: data.options,
        correctAnswer: data.correctAnswer,
      })
      .returning();

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

// PATCH - Reorder questions
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;
    const body = await req.json();
    const data = reorderSchema.parse(body);

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

    // Update orders
    for (const { id, order } of data.questionOrders) {
      await db
        .update(quizQuestions)
        .set({ order, updatedAt: new Date() })
        .where(
          and(
            eq(quizQuestions.id, id),
            eq(quizQuestions.studyMaterialId, quizId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error reordering questions:", error);
    return NextResponse.json(
      { error: "Failed to reorder questions" },
      { status: 500 }
    );
  }
}
