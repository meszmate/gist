import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, gradingConfigs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_LETTER_GRADES } from "@/lib/types/quiz";

const letterGradeSchema = z.object({
  grade: z.string().min(1).max(10),
  minPercentage: z.number().min(0).max(100),
  description: z.string().optional(),
});

const gradingConfigSchema = z.object({
  gradingType: z.enum(["percentage", "letter", "pass_fail", "points"]).optional(),
  passThreshold: z.number().min(0).max(100).optional(),
  letterGrades: z.array(letterGradeSchema).optional().nullable(),
  showGradeOnCompletion: z.boolean().optional(),
  showPointValues: z.boolean().optional(),
  partialCreditEnabled: z.boolean().optional(),
});

// GET - Fetch grading config for a quiz
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

    // Get grading config
    const [config] = await db
      .select()
      .from(gradingConfigs)
      .where(eq(gradingConfigs.studyMaterialId, quizId));

    // Return config or defaults
    if (!config) {
      return NextResponse.json({
        gradingType: "percentage",
        passThreshold: 60,
        letterGrades: DEFAULT_LETTER_GRADES,
        showGradeOnCompletion: true,
        showPointValues: false,
        partialCreditEnabled: true,
      });
    }

    return NextResponse.json({
      id: config.id,
      gradingType: config.gradingType,
      passThreshold: parseFloat(config.passThreshold || "60"),
      letterGrades: config.letterGrades || DEFAULT_LETTER_GRADES,
      showGradeOnCompletion: config.showGradeOnCompletion,
      showPointValues: config.showPointValues,
      partialCreditEnabled: config.partialCreditEnabled,
    });
  } catch (error) {
    console.error("Error fetching grading config:", error);
    return NextResponse.json(
      { error: "Failed to fetch grading config" },
      { status: 500 }
    );
  }
}

// PUT - Update grading config for a quiz
export async function PUT(
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
    const data = gradingConfigSchema.parse(body);

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

    // Check if config exists
    const [existingConfig] = await db
      .select()
      .from(gradingConfigs)
      .where(eq(gradingConfigs.studyMaterialId, quizId));

    const updateData = {
      gradingType: data.gradingType,
      passThreshold: data.passThreshold?.toString(),
      letterGrades: data.letterGrades,
      showGradeOnCompletion: data.showGradeOnCompletion,
      showPointValues: data.showPointValues,
      partialCreditEnabled: data.partialCreditEnabled,
      updatedAt: new Date(),
    };

    if (existingConfig) {
      // Update existing config
      await db
        .update(gradingConfigs)
        .set(updateData)
        .where(eq(gradingConfigs.id, existingConfig.id));

      return NextResponse.json({
        id: existingConfig.id,
        ...data,
      });
    } else {
      // Create new config
      const [newConfig] = await db
        .insert(gradingConfigs)
        .values({
          studyMaterialId: quizId,
          gradingType: data.gradingType || "percentage",
          passThreshold: (data.passThreshold || 60).toString(),
          letterGrades: data.letterGrades || null,
          showGradeOnCompletion: data.showGradeOnCompletion ?? true,
          showPointValues: data.showPointValues ?? false,
          partialCreditEnabled: data.partialCreditEnabled ?? true,
        })
        .returning();

      return NextResponse.json({
        id: newConfig.id,
        gradingType: newConfig.gradingType,
        passThreshold: parseFloat(newConfig.passThreshold || "60"),
        letterGrades: newConfig.letterGrades,
        showGradeOnCompletion: newConfig.showGradeOnCompletion,
        showPointValues: newConfig.showPointValues,
        partialCreditEnabled: newConfig.partialCreditEnabled,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating grading config:", error);
    return NextResponse.json(
      { error: "Failed to update grading config" },
      { status: 500 }
    );
  }
}

// DELETE - Remove grading config for a quiz (revert to defaults)
export async function DELETE(
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

    // Delete grading config
    await db
      .delete(gradingConfigs)
      .where(eq(gradingConfigs.studyMaterialId, quizId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting grading config:", error);
    return NextResponse.json(
      { error: "Failed to delete grading config" },
      { status: 500 }
    );
  }
}
