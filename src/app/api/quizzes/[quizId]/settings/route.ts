import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, quizSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSettingsSchema = z.object({
  timeLimitSeconds: z.number().min(0).max(10800).nullable(),
  requireSignin: z.boolean(),
  allowedEmails: z.array(z.string().email()).nullable(),
  maxAttempts: z.number().min(0).max(100).nullable(),
  shuffleQuestions: z.boolean(),
  showCorrectAnswers: z.boolean(),
});

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

    // Get the resource
    const [resource] = await db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        shareToken: studyMaterials.shareToken,
      })
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

    // Get settings
    const [settings] = await db
      .select()
      .from(quizSettings)
      .where(eq(quizSettings.studyMaterialId, quizId));

    return NextResponse.json({
      id: resource.id,
      title: resource.title,
      shareToken: resource.shareToken,
      settings: settings || null,
    });
  } catch (error) {
    console.error("Error fetching quiz settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz settings" },
      { status: 500 }
    );
  }
}

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
    const data = updateSettingsSchema.parse(body);

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

    // Check if settings exist
    const [existingSettings] = await db
      .select()
      .from(quizSettings)
      .where(eq(quizSettings.studyMaterialId, quizId));

    if (existingSettings) {
      // Update existing settings
      const [updated] = await db
        .update(quizSettings)
        .set({
          timeLimitSeconds: data.timeLimitSeconds,
          requireSignin: data.requireSignin,
          allowedEmails: data.allowedEmails,
          maxAttempts: data.maxAttempts,
          shuffleQuestions: data.shuffleQuestions,
          showCorrectAnswers: data.showCorrectAnswers,
          updatedAt: new Date(),
        })
        .where(eq(quizSettings.studyMaterialId, quizId))
        .returning();

      return NextResponse.json(updated);
    } else {
      // Create new settings
      const [created] = await db
        .insert(quizSettings)
        .values({
          studyMaterialId: quizId,
          timeLimitSeconds: data.timeLimitSeconds,
          requireSignin: data.requireSignin,
          allowedEmails: data.allowedEmails,
          maxAttempts: data.maxAttempts,
          shuffleQuestions: data.shuffleQuestions,
          showCorrectAnswers: data.showCorrectAnswers,
        })
        .returning();

      return NextResponse.json(created);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating quiz settings:", error);
    return NextResponse.json(
      { error: "Failed to update quiz settings" },
      { status: 500 }
    );
  }
}
