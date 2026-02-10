import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  studyMaterials,
  quizQuestions,
  quizSettings,
  quizAttempts,
  gradingConfigs,
  contacts,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { gradeQuiz, type QuestionData } from "@/lib/quiz/grading-service";
import type {
  UserAnswer,
  AnswersData,
  MultipleChoiceConfig,
  MultipleChoiceAnswer,
} from "@/lib/types/quiz";

const submitAttemptSchema = z.object({
  answers: z.record(z.string(), z.any()), // Accept both legacy (number) and new (object) formats
  timeSpentSeconds: z.number().optional(),
  participantName: z.string().optional(),
  guestEmail: z.string().email().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    const { token } = await params;
    const body = await req.json();
    const data = submitAttemptSchema.parse(body);

    // Find resource by share token
    const [resource] = await db
      .select({
        id: studyMaterials.id,
        userId: studyMaterials.userId,
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

    // Get quiz settings to check access
    const [settings] = await db
      .select()
      .from(quizSettings)
      .where(eq(quizSettings.studyMaterialId, resource.id));

    // Verify access
    if (settings?.requireSignin && !session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (settings?.allowedEmails && settings.allowedEmails.length > 0) {
      const userEmail = session?.user?.email || data.guestEmail;
      if (!userEmail || !settings.allowedEmails.includes(userEmail)) {
        return NextResponse.json(
          { error: "You are not authorized to take this quiz" },
          { status: 403 }
        );
      }
    }

    // Get all questions with correct answers
    const questions = await db
      .select({
        id: quizQuestions.id,
        question: quizQuestions.question,
        questionType: quizQuestions.questionType,
        questionConfig: quizQuestions.questionConfig,
        correctAnswerData: quizQuestions.correctAnswerData,
        points: quizQuestions.points,
        options: quizQuestions.options,
        correctAnswer: quizQuestions.correctAnswer,
        explanation: quizQuestions.explanation,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.studyMaterialId, resource.id));

    // Get grading config if exists
    const [gradingConfig] = await db
      .select()
      .from(gradingConfigs)
      .where(eq(gradingConfigs.studyMaterialId, resource.id));

    // Prepare questions for grading service
    const questionData: QuestionData[] = questions.map((q) => {
      // Check if this is a legacy question (has options but no correctAnswerData)
      const isLegacy = q.correctAnswerData === null && q.options !== null && q.correctAnswer !== null;

      if (isLegacy) {
        return {
          id: q.id,
          questionType: 'multiple_choice',
          questionConfig: {
            options: q.options || [],
          } as MultipleChoiceConfig,
          correctAnswerData: {
            correctIndex: q.correctAnswer!,
          } as MultipleChoiceAnswer,
          points: parseFloat(q.points || '1'),
          options: q.options,
          correctAnswer: q.correctAnswer,
        };
      }

      return {
        id: q.id,
        questionType: q.questionType,
        questionConfig: q.questionConfig || {},
        correctAnswerData: q.correctAnswerData,
        points: parseFloat(q.points || '1'),
        options: q.options,
        correctAnswer: q.correctAnswer,
      };
    });

    // Grade the quiz
    const gradeResult = gradeQuiz(
      questionData,
      data.answers as AnswersData,
      {
        gradingType: (gradingConfig?.gradingType as 'percentage' | 'letter' | 'pass_fail' | 'points') || 'percentage',
        passThreshold: parseFloat(gradingConfig?.passThreshold || '60'),
        letterGrades: gradingConfig?.letterGrades || null,
        partialCreditEnabled: gradingConfig?.partialCreditEnabled ?? true,
      }
    );

    // Build response with full question details
    const results = questions.map((q) => {
      const questionResult = gradeResult.questionResults.find(r => r.questionId === q.id);
      const userAnswer = data.answers[q.id];

      // For legacy format, convert selectedIndex/number back to the answer index
      let selectedAnswer: UserAnswer = userAnswer;
      if (typeof userAnswer === 'number') {
        selectedAnswer = userAnswer;
      } else if (userAnswer && typeof userAnswer === 'object' && 'selectedIndex' in userAnswer) {
        selectedAnswer = userAnswer;
      }

      return {
        questionId: q.id,
        question: q.question,
        questionType: q.questionType || 'multiple_choice',
        selectedAnswer,
        correctAnswer: questionResult?.correctAnswer || { correctIndex: q.correctAnswer },
        options: q.options,
        config: q.questionConfig || { options: q.options },
        explanation: q.explanation,
        isCorrect: questionResult?.isCorrect ?? false,
        pointsEarned: questionResult?.pointsEarned ?? 0,
        pointsPossible: questionResult?.pointsPossible ?? 1,
        creditPercent: questionResult?.creditPercent ?? 0,
        feedback: questionResult?.feedback,
      };
    });

    // Count correct answers (full credit only)
    const correctCount = gradeResult.questionResults.filter(r => r.isCorrect).length;
    const total = questions.length;

    // Determine participant info
    const participantEmail = session?.user?.email || data.guestEmail || null;
    const participantName = data.participantName || session?.user?.name || null;

    // Save attempt with new data structure
    await db.insert(quizAttempts).values({
      studyMaterialId: resource.id,
      userId: session?.user?.id || null,
      guestEmail: participantEmail,
      participantName: participantName,
      startedAt: new Date(),
      completedAt: new Date(),
      score: gradeResult.score.toFixed(2),
      answers: typeof Object.values(data.answers)[0] === 'number'
        ? data.answers as Record<string, number>
        : null,
      answersData: typeof Object.values(data.answers)[0] !== 'number'
        ? data.answers as AnswersData
        : null,
      pointsEarned: gradeResult.pointsEarned.toFixed(2),
      pointsPossible: gradeResult.pointsPossible.toFixed(2),
      grade: gradeResult.grade,
      questionResults: gradeResult.questionResults,
      timeSpentSeconds: data.timeSpentSeconds,
      attemptNumber: 1, // TODO: Calculate attempt number based on previous attempts
    });

    // Update contact's hasAccount if they exist and have account now
    if (session?.user?.email) {
      await db
        .update(contacts)
        .set({ hasAccount: true, updatedAt: new Date() })
        .where(
          and(
            eq(contacts.teacherId, resource.userId),
            eq(contacts.email, session.user.email)
          )
        );
    }

    return NextResponse.json({
      score: correctCount,
      total,
      percentage: gradeResult.score,
      pointsEarned: gradeResult.pointsEarned,
      pointsPossible: gradeResult.pointsPossible,
      grade: gradeResult.grade,
      passed: gradeResult.passed,
      answers: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error submitting public quiz attempt:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz attempt" },
      { status: 500 }
    );
  }
}
