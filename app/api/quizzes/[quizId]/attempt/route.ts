import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, quizQuestions, quizAttempts, gradingConfigs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { gradeQuiz, type QuestionData } from "@/lib/quiz/grading-service";
import type {
  UserAnswer,
  AnswersData,
} from "@/lib/types/quiz";
import { normalizeQuestionPayload } from "@/lib/quiz/question-normalizer";

const submitAttemptSchema = z.object({
  answers: z.record(z.string(), z.any()), // Accept both legacy (number) and new (object) formats
  timeSpentSeconds: z.number().optional(),
  participantName: z.string().optional(),
});

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
    const data = submitAttemptSchema.parse(body);

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
      .where(eq(quizQuestions.studyMaterialId, quizId));

    // Get grading config if exists
    const [gradingConfig] = await db
      .select()
      .from(gradingConfigs)
      .where(eq(gradingConfigs.studyMaterialId, quizId));

    const normalizedQuestionsById = new Map<
      string,
      ReturnType<typeof normalizeQuestionPayload>
    >();

    // Prepare questions for grading service
    const questionData: QuestionData[] = questions.map((q) => {
      const normalized = normalizeQuestionPayload({
        questionType: q.questionType,
        questionConfig: q.questionConfig,
        correctAnswerData: q.correctAnswerData,
        options: q.options,
        correctAnswer: q.correctAnswer,
      });
      normalizedQuestionsById.set(q.id, normalized);

      return {
        id: q.id,
        questionType: normalized.questionType,
        questionConfig: normalized.questionConfig,
        correctAnswerData: normalized.correctAnswerData,
        points: parseFloat(q.points || '1'),
        options: normalized.options,
        correctAnswer: normalized.correctAnswer,
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
      const normalized = normalizedQuestionsById.get(q.id);

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
        questionType: normalized?.questionType || q.questionType || 'multiple_choice',
        selectedAnswer,
        correctAnswer:
          questionResult?.correctAnswer ||
          normalized?.correctAnswerData ||
          { correctIndex: normalized?.correctAnswer ?? q.correctAnswer },
        options: normalized?.options,
        config: normalized?.questionConfig || q.questionConfig || { options: normalized?.options || q.options },
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

    // Save attempt with new data structure
    await db.insert(quizAttempts).values({
      studyMaterialId: quizId,
      userId: session.user.id,
      participantName: data.participantName,
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
    console.error("Error submitting quiz attempt:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz attempt" },
      { status: 500 }
    );
  }
}
