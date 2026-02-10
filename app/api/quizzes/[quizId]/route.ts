import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, quizQuestions, quizSettings, gradingConfigs } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import type { MultipleChoiceConfig } from "@/lib/types/quiz";

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

    // Get the resource (quiz)
    const [resource] = await db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        description: studyMaterials.description,
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

    // Get questions (without correct answers for the quiz-taking view)
    const questions = await db
      .select({
        id: quizQuestions.id,
        question: quizQuestions.question,
        questionType: quizQuestions.questionType,
        questionConfig: quizQuestions.questionConfig,
        points: quizQuestions.points,
        order: quizQuestions.order,
        // Legacy fields for backward compatibility
        options: quizQuestions.options,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.studyMaterialId, quizId))
      .orderBy(asc(quizQuestions.order), asc(quizQuestions.createdAt));

    // Get settings
    const [settings] = await db
      .select({
        timeLimitSeconds: quizSettings.timeLimitSeconds,
        shuffleQuestions: quizSettings.shuffleQuestions,
        showCorrectAnswers: quizSettings.showCorrectAnswers,
      })
      .from(quizSettings)
      .where(eq(quizSettings.studyMaterialId, quizId));

    // Get grading config
    const [gradingConfig] = await db
      .select({
        gradingType: gradingConfigs.gradingType,
        showPointValues: gradingConfigs.showPointValues,
      })
      .from(gradingConfigs)
      .where(eq(gradingConfigs.studyMaterialId, quizId));

    // Transform questions for response
    const transformedQuestions = questions.map((q) => {
      // Determine the config to use
      let config = q.questionConfig;

      // For legacy questions without questionConfig, build from options
      if (!config || Object.keys(config).length === 0) {
        if (q.options) {
          config = { options: q.options } as MultipleChoiceConfig;
        } else {
          config = {};
        }
      }

      return {
        id: q.id,
        question: q.question,
        questionType: q.questionType || 'multiple_choice',
        config,
        points: parseFloat(q.points || '1'),
        order: q.order,
        // Legacy field for backward compatibility with old UI
        options: q.options || (config as MultipleChoiceConfig)?.options || [],
      };
    });

    return NextResponse.json({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      questions: transformedQuestions,
      settings: settings || null,
      gradingConfig: gradingConfig ? {
        gradingType: gradingConfig.gradingType,
        showPointValues: gradingConfig.showPointValues,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}
