import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { questionTypes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

const createQuestionTypeSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z_]+$/, "Slug must be lowercase with underscores only"),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  configSchema: z.record(z.string(), schemaPropertySchema),
  answerSchema: z.record(z.string(), schemaPropertySchema),
});

// GET - List all question types (system + custom)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get custom types from database
    const customTypes = await db
      .select()
      .from(questionTypes)
      .where(eq(questionTypes.isActive, true));

    // Combine with built-in types
    const builtInTypesList = Object.entries(BUILT_IN_QUESTION_TYPES).map(([key, type]) => ({
      id: `system_${key}`,
      ...type,
      createdAt: null,
      updatedAt: null,
    }));

    return NextResponse.json({
      types: [
        ...builtInTypesList,
        ...customTypes.map((t) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          description: t.description,
          configSchema: t.configSchema,
          answerSchema: t.answerSchema,
          isSystem: t.isSystem,
          isActive: t.isActive,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      ],
    });
  } catch (error) {
    console.error("Error fetching question types:", error);
    return NextResponse.json(
      { error: "Failed to fetch question types" },
      { status: 500 }
    );
  }
}

// POST - Create a new custom question type
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createQuestionTypeSchema.parse(body);

    // Check if slug already exists (including built-in)
    if (BUILT_IN_QUESTION_TYPES[data.slug]) {
      return NextResponse.json(
        { error: "A question type with this slug already exists" },
        { status: 409 }
      );
    }

    const [existing] = await db
      .select()
      .from(questionTypes)
      .where(eq(questionTypes.slug, data.slug));

    if (existing) {
      return NextResponse.json(
        { error: "A question type with this slug already exists" },
        { status: 409 }
      );
    }

    // Create the new type
    const [newType] = await db
      .insert(questionTypes)
      .values({
        slug: data.slug,
        name: data.name,
        description: data.description || null,
        configSchema: data.configSchema as Record<string, QuestionTypeSchema>,
        answerSchema: data.answerSchema as Record<string, QuestionTypeSchema>,
        isSystem: false,
        isActive: true,
      })
      .returning();

    return NextResponse.json(newType, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating question type:", error);
    return NextResponse.json(
      { error: "Failed to create question type" },
      { status: 500 }
    );
  }
}
