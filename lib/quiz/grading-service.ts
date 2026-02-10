import type {
  QuestionTypeSlug,
  QuestionConfig,
  CorrectAnswerData,
  UserAnswer,
  AnswersData,
  GradingType,
  LetterGradeThreshold,
  QuestionResult,
  GradeResult,
  MultipleChoiceAnswer,
  MultipleChoiceConfig,
} from '@/lib/types/quiz';
import { DEFAULT_LETTER_GRADES } from '@/lib/types/quiz';
import { validateAnswer, validateLegacyAnswer } from './answer-validator';

export interface QuestionData {
  id: string;
  questionType: QuestionTypeSlug;
  questionConfig: QuestionConfig;
  correctAnswerData: CorrectAnswerData | null;
  points: number;
  // Legacy fields
  options?: string[] | null;
  correctAnswer?: number | null;
}

export interface GradingOptions {
  gradingType: GradingType;
  passThreshold: number;
  letterGrades: LetterGradeThreshold[] | null;
  partialCreditEnabled: boolean;
}

const DEFAULT_GRADING_OPTIONS: GradingOptions = {
  gradingType: 'percentage',
  passThreshold: 60,
  letterGrades: null,
  partialCreditEnabled: true,
};

// Calculate letter grade from percentage
function calculateLetterGrade(
  percentage: number,
  letterGrades: LetterGradeThreshold[] | null
): string | null {
  const grades = letterGrades || (DEFAULT_LETTER_GRADES as unknown as LetterGradeThreshold[]);

  // Sort grades by minPercentage descending
  const sortedGrades = [...grades].sort((a, b) => b.minPercentage - a.minPercentage);

  for (const grade of sortedGrades) {
    if (percentage >= grade.minPercentage) {
      return grade.grade;
    }
  }

  // Return lowest grade if nothing matches
  return sortedGrades[sortedGrades.length - 1]?.grade || 'F';
}

// Normalize question data to handle both legacy and new formats
function normalizeQuestion(question: QuestionData): {
  questionType: QuestionTypeSlug;
  config: QuestionConfig;
  correctAnswerData: CorrectAnswerData | null;
  points: number;
  isLegacy: boolean;
} {
  // Check if this is a legacy question (has options and correctAnswer but no correctAnswerData)
  const isLegacy = question.correctAnswerData === null &&
    question.options !== null &&
    question.correctAnswer !== null &&
    question.correctAnswer !== undefined;

  if (isLegacy) {
    // Convert legacy question to new format
    return {
      questionType: 'multiple_choice',
      config: {
        options: question.options || [],
      } as MultipleChoiceConfig,
      correctAnswerData: {
        correctIndex: question.correctAnswer!,
      } as MultipleChoiceAnswer,
      points: question.points || 1,
      isLegacy: true,
    };
  }

  return {
    questionType: question.questionType,
    config: question.questionConfig || {},
    correctAnswerData: question.correctAnswerData,
    points: question.points || 1,
    isLegacy: false,
  };
}

// Normalize user answer to handle both legacy and new formats
function normalizeUserAnswer(
  userAnswer: UserAnswer | number | undefined,
  questionType: QuestionTypeSlug
): UserAnswer | null {
  if (userAnswer === undefined || userAnswer === null) {
    return null;
  }

  // Legacy format: just a number for multiple choice
  if (typeof userAnswer === 'number') {
    if (questionType === 'multiple_choice') {
      return { selectedIndex: userAnswer };
    }
    return userAnswer;
  }

  return userAnswer;
}

// Grade a single question
export function gradeQuestion(
  question: QuestionData,
  userAnswer: UserAnswer | number | undefined,
  partialCreditEnabled: boolean = true
): QuestionResult {
  const normalized = normalizeQuestion(question);
  const normalizedAnswer = normalizeUserAnswer(userAnswer, normalized.questionType);

  let validationResult;

  if (normalized.isLegacy && typeof userAnswer === 'number') {
    // Use legacy validation
    validationResult = validateLegacyAnswer(userAnswer, question.correctAnswer!);
  } else {
    validationResult = validateAnswer(
      normalized.questionType,
      normalizedAnswer,
      normalized.correctAnswerData,
      normalized.config,
      partialCreditEnabled
    );
  }

  const pointsEarned = (validationResult.creditPercent / 100) * normalized.points;

  return {
    questionId: question.id,
    questionType: normalized.questionType,
    isCorrect: validationResult.isCorrect,
    pointsEarned,
    pointsPossible: normalized.points,
    creditPercent: validationResult.creditPercent,
    userAnswer: normalizedAnswer || userAnswer as UserAnswer,
    correctAnswer: normalized.correctAnswerData!,
    feedback: validationResult.feedback,
  };
}

// Grade an entire quiz
export function gradeQuiz(
  questions: QuestionData[],
  answers: AnswersData | Record<string, number>,
  options: Partial<GradingOptions> = {}
): GradeResult {
  const gradingOptions = { ...DEFAULT_GRADING_OPTIONS, ...options };

  const questionResults: QuestionResult[] = [];
  let totalPointsEarned = 0;
  let totalPointsPossible = 0;

  for (const question of questions) {
    const userAnswer = answers[question.id];
    const result = gradeQuestion(question, userAnswer, gradingOptions.partialCreditEnabled);

    questionResults.push(result);
    totalPointsEarned += result.pointsEarned;
    totalPointsPossible += result.pointsPossible;
  }

  // Calculate percentage score
  const score = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;

  // Determine grade based on grading type
  let grade: string | null = null;
  let passed: boolean | null = null;

  switch (gradingOptions.gradingType) {
    case 'percentage':
      // No letter grade, just show percentage
      passed = score >= gradingOptions.passThreshold;
      break;

    case 'letter':
      grade = calculateLetterGrade(score, gradingOptions.letterGrades);
      // Consider passing if grade is D- or better (or custom threshold)
      const passingGrades = (gradingOptions.letterGrades || DEFAULT_LETTER_GRADES as unknown as LetterGradeThreshold[])
        .filter(g => g.minPercentage >= gradingOptions.passThreshold)
        .map(g => g.grade);
      passed = grade ? passingGrades.includes(grade) : null;
      break;

    case 'pass_fail':
      passed = score >= gradingOptions.passThreshold;
      grade = passed ? 'Pass' : 'Fail';
      break;

    case 'points':
      // Just show points, no grade
      passed = score >= gradingOptions.passThreshold;
      break;
  }

  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    pointsEarned: Math.round(totalPointsEarned * 100) / 100,
    pointsPossible: Math.round(totalPointsPossible * 100) / 100,
    grade,
    passed,
    questionResults,
  };
}

// Format grade result for display
export function formatGradeDisplay(
  result: GradeResult,
  gradingType: GradingType,
  showPointValues: boolean = false
): string {
  switch (gradingType) {
    case 'percentage':
      return `${result.score.toFixed(1)}%`;

    case 'letter':
      return result.grade || `${result.score.toFixed(1)}%`;

    case 'pass_fail':
      return result.grade || (result.passed ? 'Pass' : 'Fail');

    case 'points':
      if (showPointValues) {
        return `${result.pointsEarned.toFixed(1)} / ${result.pointsPossible.toFixed(1)} pts`;
      }
      return `${result.score.toFixed(1)}%`;

    default:
      return `${result.score.toFixed(1)}%`;
  }
}

// Get pass/fail color class
export function getGradeColorClass(
  score: number,
  passThreshold: number = 60
): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= passThreshold) return 'warning';
  return 'error';
}

// Calculate statistics for a set of quiz results
export function calculateQuizStatistics(results: GradeResult[]): {
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  standardDeviation: number;
  passRate: number;
  gradeDistribution: Record<string, number>;
} {
  if (results.length === 0) {
    return {
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      medianScore: 0,
      standardDeviation: 0,
      passRate: 0,
      gradeDistribution: {},
    };
  }

  const scores = results.map(r => r.score);
  const sortedScores = [...scores].sort((a, b) => a - b);

  const sum = scores.reduce((a, b) => a + b, 0);
  const averageScore = sum / scores.length;

  const highestScore = sortedScores[sortedScores.length - 1];
  const lowestScore = sortedScores[0];

  // Calculate median
  const mid = Math.floor(sortedScores.length / 2);
  const medianScore = sortedScores.length % 2 !== 0
    ? sortedScores[mid]
    : (sortedScores[mid - 1] + sortedScores[mid]) / 2;

  // Calculate standard deviation
  const squaredDiffs = scores.map(score => Math.pow(score - averageScore, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  const standardDeviation = Math.sqrt(avgSquaredDiff);

  // Calculate pass rate
  const passedCount = results.filter(r => r.passed === true).length;
  const passRate = (passedCount / results.length) * 100;

  // Calculate grade distribution
  const gradeDistribution: Record<string, number> = {};
  for (const result of results) {
    if (result.grade) {
      gradeDistribution[result.grade] = (gradeDistribution[result.grade] || 0) + 1;
    }
  }

  return {
    averageScore: Math.round(averageScore * 100) / 100,
    highestScore: Math.round(highestScore * 100) / 100,
    lowestScore: Math.round(lowestScore * 100) / 100,
    medianScore: Math.round(medianScore * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
    passRate: Math.round(passRate * 100) / 100,
    gradeDistribution,
  };
}
