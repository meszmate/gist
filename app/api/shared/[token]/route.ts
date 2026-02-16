import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  studyMaterials,
  quizQuestions,
  quizSettings,
  gradingConfigs,
  resourceAccessLogs,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { normalizeQuestionPayload } from "@/lib/quiz/question-normalizer";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    const { token } = await params;

    // Find resource by share token
    const [resource] = await db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        description: studyMaterials.description,
        isPublic: studyMaterials.isPublic,
      })
      .from(studyMaterials)
      .where(eq(studyMaterials.shareToken, token));

    if (!resource || !resource.isPublic) {
      return NextResponse.json(
        { error: "Resource not found or not public" },
        { status: 404 }
      );
    }

    // Get quiz questions (without correct answers)
    const questions = await db
      .select({
        id: quizQuestions.id,
        question: quizQuestions.question,
        questionType: quizQuestions.questionType,
        questionConfig: quizQuestions.questionConfig,
        points: quizQuestions.points,
        order: quizQuestions.order,
        options: quizQuestions.options,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.studyMaterialId, resource.id))
      .orderBy(asc(quizQuestions.order), asc(quizQuestions.createdAt));

    // Get quiz settings
    const [settings] = await db
      .select()
      .from(quizSettings)
      .where(eq(quizSettings.studyMaterialId, resource.id));

    // Get grading config
    const [gradingConfig] = await db
      .select({
        gradingType: gradingConfigs.gradingType,
        showPointValues: gradingConfigs.showPointValues,
      })
      .from(gradingConfigs)
      .where(eq(gradingConfigs.studyMaterialId, resource.id));

    // Check access requirements
    let requiresAuth = settings?.requireSignin ?? false;
    let isAllowed = true;

    if (settings?.allowedEmails && settings.allowedEmails.length > 0) {
      requiresAuth = true;
      if (session?.user?.email) {
        isAllowed = settings.allowedEmails.includes(session.user.email);
      } else {
        isAllowed = false;
      }
    }

    // Log access
    if (session?.user?.email || !requiresAuth) {
      await db.insert(resourceAccessLogs).values({
        resourceId: resource.id,
        email: session?.user?.email || null,
        userId: session?.user?.id || null,
        accessType: "quiz_view",
      });
    }

    // Transform questions for response
    const transformedQuestions = questions.map((q) => {
      const normalized = normalizeQuestionPayload({
        questionType: q.questionType,
        questionConfig: q.questionConfig,
        options: q.options,
      });

      return {
        id: q.id,
        question: q.question,
        questionType: normalized.questionType,
        config: normalized.questionConfig,
        points: parseFloat(q.points || '1'),
        order: q.order,
        options: normalized.options || [],
      };
    });

    return NextResponse.json({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      questions: transformedQuestions,
      settings: settings
        ? {
            timeLimitSeconds: settings.timeLimitSeconds,
            requireSignin: settings.requireSignin,
            shuffleQuestions: settings.shuffleQuestions,
            showCorrectAnswers: settings.showCorrectAnswers,
          }
        : null,
      gradingConfig: gradingConfig ? {
        gradingType: gradingConfig.gradingType,
        showPointValues: gradingConfig.showPointValues,
      } : null,
      requiresAuth,
      isAllowed,
    });
  } catch (error) {
    console.error("Error fetching shared resource:", error);
    return NextResponse.json(
      { error: "Failed to fetch resource" },
      { status: 500 }
    );
  }
}
