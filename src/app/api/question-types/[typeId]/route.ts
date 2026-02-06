import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { questionTypes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { BUILT_IN_QUESTION_TYPES, type QuestionTypeSchema } from "@/lib/types/quiz";

const schemaPropertySchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.enum(["string", "number", "boolean", "array", "object"]),
    required: z.boolean().optional(),
    description: z.string().optional(),
    default: z.any().optional(),
    items: schemaPropertySchema.optional(),
    properties: z.record(z.string(), schemaPropertySchema).optional(),
    enum: z.array(z.any()).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
);

const updateQuestionTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  configSchema: z.record(z.string(), schemaPropertySchema).optional(),
  answerSchema: z.record(z.string(), schemaPropertySchema).optional(),
  isActive: z.boolean().optional(),
});

// GET - Fetch a single question type
export async function GET(
  req: Request,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { typeId } = await params;

    // Check if it's a system type
    if (typeId.startsWith("system_")) {
      const slug = typeId.replace("system_", "");
      const builtInType = BUILT_IN_QUESTION_TYPES[slug];

      if (!builtInType) {
        return NextResponse.json({ error: "Question type not found" }, { status: 404 });
      }

      return NextResponse.json({
        id: typeId,
        ...builtInType,
        createdAt: null,
        updatedAt: null,
      });
    }

    // Fetch from database
    const [type] = await db
      .select()
      .from(questionTypes)
      .where(eq(questionTypes.id, typeId));

    if (!type) {
      return NextResponse.json({ error: "Question type not found" }, { status: 404 });
    }

    return NextResponse.json(type);
  } catch (error) {
    console.error("Error fetching question type:", error);
    return NextResponse.json(
      { error: "Failed to fetch question type" },
      { status: 500 }
    );
  }
}

// PUT - Update a custom question type
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { typeId } = await params;
    const body = await req.json();
    const data = updateQuestionTypeSchema.parse(body);

    // Cannot modify system types
    if (typeId.startsWith("system_")) {
      return NextResponse.json(
        { error: "Cannot modify system question types" },
        { status: 403 }
      );
    }

    // Fetch existing type
    const [existing] = await db
      .select()
      .from(questionTypes)
      .where(eq(questionTypes.id, typeId));

    if (!existing) {
      return NextResponse.json({ error: "Question type not found" }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { error: "Cannot modify system question types" },
        { status: 403 }
      );
    }

    // Update the type
    const [updated] = await db
      .update(questionTypes)
      .set({
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        configSchema: (data.configSchema as Record<string, QuestionTypeSchema>) ?? existing.configSchema,
        answerSchema: (data.answerSchema as Record<string, QuestionTypeSchema>) ?? existing.answerSchema,
        isActive: data.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(questionTypes.id, typeId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating question type:", error);
    return NextResponse.json(
      { error: "Failed to update question type" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a custom question type
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { typeId } = await params;

    // Cannot delete system types
    if (typeId.startsWith("system_")) {
      return NextResponse.json(
        { error: "Cannot delete system question types" },
        { status: 403 }
      );
    }

    // Fetch existing type
    const [existing] = await db
      .select()
      .from(questionTypes)
      .where(eq(questionTypes.id, typeId));

    if (!existing) {
      return NextResponse.json({ error: "Question type not found" }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system question types" },
        { status: 403 }
      );
    }

    // Soft delete by setting isActive to false
    await db
      .update(questionTypes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(questionTypes.id, typeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting question type:", error);
    return NextResponse.json(
      { error: "Failed to delete question type" },
      { status: 500 }
    );
  }
}
