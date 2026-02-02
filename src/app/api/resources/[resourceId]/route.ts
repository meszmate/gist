import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, flashcards, quizQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { v4 as uuid } from "uuid";

const updateResourceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  sourceContent: z.string().optional(),
  summary: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

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

    const resourceFlashcards = await db
      .select({
        id: flashcards.id,
        front: flashcards.front,
        back: flashcards.back,
      })
      .from(flashcards)
      .where(eq(flashcards.studyMaterialId, resourceId));

    const resourceQuizQuestions = await db
      .select({
        id: quizQuestions.id,
        question: quizQuestions.question,
        options: quizQuestions.options,
        correctAnswer: quizQuestions.correctAnswer,
        explanation: quizQuestions.explanation,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.studyMaterialId, resourceId));

    return NextResponse.json({
      ...resource,
      flashcards: resourceFlashcards,
      quizQuestions: resourceQuizQuestions,
    });
  } catch (error) {
    console.error("Error fetching resource:", error);
    return NextResponse.json(
      { error: "Failed to fetch resource" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const data = updateResourceSchema.parse(body);

    const [existing] = await db
      .select()
      .from(studyMaterials)
      .where(
        and(
          eq(studyMaterials.id, resourceId),
          eq(studyMaterials.userId, session.user.id)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(studyMaterials)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(studyMaterials.id, resourceId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating resource:", error);
    return NextResponse.json(
      { error: "Failed to update resource" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;

    const [existing] = await db
      .select()
      .from(studyMaterials)
      .where(
        and(
          eq(studyMaterials.id, resourceId),
          eq(studyMaterials.userId, session.user.id)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    await db.delete(studyMaterials).where(eq(studyMaterials.id, resourceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json(
      { error: "Failed to delete resource" },
      { status: 500 }
    );
  }
}
