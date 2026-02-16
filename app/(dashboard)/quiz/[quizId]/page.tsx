"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Clock,
  FileQuestion,
  X,
  Flag,
  ChevronLeft,
  ChevronRight,
  Target,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QuestionCard } from "@/components/quiz/question-card";
import { getResultRenderer } from "@/components/quiz/question-renderers";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import Link from "next/link";
import type {
  QuestionTypeSlug,
  QuestionConfig,
  UserAnswer,
  CorrectAnswerData,
  MultipleChoiceConfig,
} from "@/lib/types/quiz";

interface QuizQuestion {
  id: string;
  question: string;
  questionType: QuestionTypeSlug;
  config: QuestionConfig;
  points: number;
  order: number | null;
  // Legacy
  options: string[];
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
  settings: {
    timeLimitSeconds: number | null;
    shuffleQuestions: boolean;
    showCorrectAnswers: boolean;
  } | null;
  gradingConfig: {
    gradingType: string;
    showPointValues: boolean;
  } | null;
}

interface AnswerResult {
  questionId: string;
  question: string;
  questionType: QuestionTypeSlug;
  selectedAnswer: UserAnswer;
  correctAnswer: CorrectAnswerData;
  options: string[];
  config: QuestionConfig;
  explanation: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  creditPercent: number;
  feedback?: string;
}

interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  pointsEarned: number;
  pointsPossible: number;
  grade: string | null;
  passed: boolean | null;
  answers: AnswerResult[];
}

async function fetchQuiz(quizId: string): Promise<Quiz> {
  const res = await fetch(`/api/quizzes/${quizId}`);
  if (!res.ok) throw new Error("Failed to fetch quiz");
  return res.json();
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function CircularProgress({ value, size = 80, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        className="text-muted stroke-current"
        strokeWidth={strokeWidth}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="text-primary stroke-current transition-all duration-500 ease-out"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
        }}
      />
    </svg>
  );
}

export default function QuizPage() {
  const params = useParams();
  const quizId = params.quizId as string;
  const { t } = useLocale();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [reviewOpen, setReviewOpen] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => fetchQuiz(quizId),
  });

  const questions = useMemo<QuizQuestion[]>(() => {
    if (!quiz) return [];
    return quiz.settings?.shuffleQuestions
      ? shuffleArray(quiz.questions)
      : quiz.questions;
  }, [quiz]);

  const submitQuiz = useMutation({
    mutationFn: async (submitAnswers: Record<string, UserAnswer>) => {
      const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : undefined;
      const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: submitAnswers,
          timeSpentSeconds: timeSpent,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit quiz");
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  // Timer
  useEffect(() => {
    if (!quizStarted || !quiz?.settings?.timeLimitSeconds || result) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          submitQuiz.mutate(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, quiz, result, answers, submitQuiz]);

  const startQuiz = () => {
    setQuizStarted(true);
    setStartTime(Date.now());
    if (quiz?.settings?.timeLimitSeconds) {
      setTimeRemaining(quiz.settings.timeLimitSeconds);
    }
  };

  const selectAnswer = useCallback((questionId: string, answer: UserAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  const nextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, questions.length]);

  const prevQuestion = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const goToQuestion = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleSubmit = useCallback(() => {
    submitQuiz.mutate(answers);
  }, [submitQuiz, answers]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!quizStarted || result) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const currentQuestion = questions[currentIndex];
      if (!currentQuestion) return;

      // Only use number keys for multiple choice
      if (currentQuestion.questionType === 'multiple_choice' && ["1", "2", "3", "4"].includes(e.key)) {
        const index = parseInt(e.key) - 1;
        const options = (currentQuestion.config as MultipleChoiceConfig)?.options || currentQuestion.options;
        if (index < options.length) {
          e.preventDefault();
          selectAnswer(currentQuestion.id, { selectedIndex: index });
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentIndex === questions.length - 1) {
          handleSubmit();
        } else {
          nextQuestion();
        }
      } else if (e.key === "j" || e.key === "ArrowRight") {
        e.preventDefault();
        nextQuestion();
      } else if (e.key === "k" || e.key === "ArrowLeft") {
        e.preventDefault();
        prevQuestion();
      } else if (e.key === "f") {
        e.preventDefault();
        toggleFlag(currentQuestion.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quizStarted, result, currentIndex, questions, selectAnswer, nextQuestion, prevQuestion, toggleFlag, handleSubmit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <EmptyState
        icon={<FileQuestion className="h-12 w-12" />}
        title={t("quizSettings.quizNotFound")}
        description={t("quizSettings.quizNotFoundDesc")}
        action={{
          label: t("quizSettings.backToQuizzes"),
          href: "/quiz",
        }}
      />
    );
  }

  if (result) {
    const scoreColor =
      result.percentage >= 80
        ? "text-green-600"
        : result.percentage >= 60
        ? "text-yellow-600"
        : "text-red-600";

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Quiz Results"
          description={quiz.title}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Quizzes", href: "/quiz" },
            { label: quiz.title, href: `/quiz/${quizId}` },
            { label: "Results" },
          ]}
        />

        {/* Score Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="relative">
                <CircularProgress value={result.percentage} size={120} strokeWidth={10} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn("text-3xl font-bold", scoreColor)}>
                    {result.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold mb-2">
                  {result.percentage >= 80
                    ? "Excellent!"
                    : result.percentage >= 60
                    ? "Good job!"
                    : "Keep practicing!"}
                </h2>
                <p className="text-muted-foreground">
                  You got {result.score} out of {result.total} correct
                </p>
                {result.grade && (
                  <Badge className="mt-2" variant={result.passed ? "default" : "destructive"}>
                    Grade: {result.grade}
                  </Badge>
                )}
                {quiz.gradingConfig?.showPointValues && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.pointsEarned.toFixed(1)} / {result.pointsPossible.toFixed(1)} points
                  </p>
                )}
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <div className="text-2xl font-bold text-green-600">{result.score}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10">
                <div className="text-2xl font-bold text-red-600">
                  {result.total - result.score}
                </div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{result.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setAnswers({});
                  setCurrentIndex(0);
                  setQuizStarted(false);
                  setFlaggedQuestions(new Set());
                  setStartTime(null);
                }}
                size="lg"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake Quiz
              </Button>
              <Button asChild size="lg">
                <Link href="/quiz">Back to Quizzes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Answer Review */}
        {quiz.settings?.showCorrectAnswers !== false && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review Answers</h3>
            {result.answers.map((answer, index) => {
              const ResultRenderer = getResultRenderer(answer.questionType);

              return (
                <Collapsible
                  key={answer.questionId}
                  open={reviewOpen === answer.questionId}
                  onOpenChange={(open) =>
                    setReviewOpen(open ? answer.questionId : null)
                  }
                >
                  <Card
                    className={cn(
                      "border-l-4 animate-slide-up",
                      answer.isCorrect ? "border-l-green-500" :
                      answer.creditPercent > 0 ? "border-l-amber-500" : "border-l-red-500"
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                        <div className="flex items-start gap-3">
                          {answer.isCorrect ? (
                            <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                          ) : answer.creditPercent > 0 ? (
                            <div className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center mt-0.5 shrink-0">
                              <span className="text-xs text-white font-bold">
                                {Math.round(answer.creditPercent / 10)}
                              </span>
                            </div>
                          ) : (
                            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1">
                            <span className="font-medium text-left">
                              {index + 1}. {answer.question}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {answer.questionType.replace('_', ' ')}
                              </Badge>
                              {quiz.gradingConfig?.showPointValues && (
                                <span className="text-xs text-muted-foreground">
                                  {answer.pointsEarned.toFixed(1)} / {answer.pointsPossible.toFixed(1)} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {ResultRenderer ? (
                          <ResultRenderer
                            questionId={answer.questionId}
                            questionText={answer.question}
                            questionType={answer.questionType}
                            config={answer.config || { options: answer.options }}
                            correctAnswerData={answer.correctAnswer}
                            userAnswer={answer.selectedAnswer}
                            isCorrect={answer.isCorrect}
                            creditPercent={answer.creditPercent}
                            feedback={answer.feedback}
                            explanation={answer.explanation}
                            points={answer.pointsPossible}
                            pointsEarned={answer.pointsEarned}
                            showPoints={quiz.gradingConfig?.showPointValues}
                          />
                        ) : (
                          // Fallback for unknown types
                          <div className="space-y-2">
                            {answer.options?.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={cn(
                                  "p-3 rounded-lg text-sm",
                                  typeof answer.correctAnswer === 'object' &&
                                  'correctIndex' in answer.correctAnswer &&
                                  optIndex === answer.correctAnswer.correctIndex &&
                                    "bg-green-500/10 border border-green-500/20",
                                  typeof answer.selectedAnswer === 'number' &&
                                  optIndex === answer.selectedAnswer &&
                                  (typeof answer.correctAnswer !== 'object' ||
                                   !('correctIndex' in answer.correctAnswer) ||
                                   optIndex !== answer.correctAnswer.correctIndex) &&
                                    "bg-red-500/10 border border-red-500/20",
                                  (typeof answer.correctAnswer !== 'object' ||
                                   !('correctIndex' in answer.correctAnswer) ||
                                   optIndex !== answer.correctAnswer.correctIndex) &&
                                  (typeof answer.selectedAnswer !== 'number' ||
                                   optIndex !== answer.selectedAnswer) &&
                                    "bg-muted/50"
                                )}
                              >
                                <span className="font-mono mr-2">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>
                                {option}
                              </div>
                            ))}
                            {answer.explanation && (
                              <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                                <strong>Explanation:</strong> {answer.explanation}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title={quiz.title}
          description={quiz.description || undefined}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Quizzes", href: "/quiz" },
            { label: quiz.title },
          ]}
        />

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/5 to-transparent p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <FileQuestion className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ready to start?</h2>
              <p className="text-muted-foreground">
                Test your knowledge with this quiz
              </p>
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <span>{questions.length} questions</span>
              </div>
              {quiz.settings?.timeLimitSeconds && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span>{formatTime(quiz.settings.timeLimitSeconds)}</span>
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Keyboard shortcuts</h3>
              <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border">1-4</kbd>{" "}
                  Select answer
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border">Enter</kbd>{" "}
                  Next question
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border">j/k</kbd>{" "}
                  Navigate
                </div>
                <div>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border">f</kbd>{" "}
                  Flag for review
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={startQuiz} size="lg" className="px-8">
                <Sparkles className="mr-2 h-4 w-4" />
                Start Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const timerProgress = timeRemaining && quiz?.settings?.timeLimitSeconds
    ? (timeRemaining / quiz.settings.timeLimitSeconds) * 100
    : 100;

  // Helper to check if answer exists
  const hasAnswer = (questionId: string): boolean => {
    const answer = answers[questionId];
    if (answer === undefined || answer === null) return false;
    if (typeof answer === 'number') return true;
    if (typeof answer === 'object') {
      const answerObj = answer as Record<string, unknown>;
      // Check for various answer types
      if ('selectedIndex' in answerObj) return true;
      if ('selectedValue' in answerObj) return true;
      if ('text' in answerObj && answerObj.text) return true;
      if ('year' in answerObj) return true;
      if ('value' in answerObj) return true;
      if ('pairs' in answerObj && typeof answerObj.pairs === 'object' && answerObj.pairs !== null && Object.keys(answerObj.pairs).length > 0) return true;
      if ('blanks' in answerObj && typeof answerObj.blanks === 'object' && answerObj.blanks !== null && Object.keys(answerObj.blanks).length > 0) return true;
      if ('selectedIndices' in answerObj && Array.isArray(answerObj.selectedIndices) && answerObj.selectedIndices.length > 0) return true;
    }
    return false;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/quiz">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
        </div>
        {timeRemaining !== null && (
          <div className="flex items-center gap-2">
            <div className="relative w-12 h-12">
              <CircularProgress value={timerProgress} size={48} strokeWidth={4} />
              <Clock
                className={cn(
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4",
                  timeRemaining < 60 ? "text-red-500" : "text-muted-foreground"
                )}
              />
            </div>
            <Badge
              variant={timeRemaining < 60 ? "destructive" : "secondary"}
              className="text-lg px-3 py-1 font-mono"
            >
              {formatTime(timeRemaining)}
            </Badge>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{answeredCount} answered</span>
          <span>{questions.length - answeredCount} remaining</span>
        </div>
      </div>

      {/* Question Navigation Dots */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {questions.map((q, index) => (
          <button
            key={q.id}
            onClick={() => goToQuestion(index)}
            className={cn(
              "w-8 h-8 rounded-full text-xs font-medium transition-all",
              index === currentIndex
                ? "bg-primary text-primary-foreground scale-110"
                : hasAnswer(q.id)
                ? "bg-green-500/20 text-green-700 dark:text-green-400"
                : "bg-muted hover:bg-muted/80",
              flaggedQuestions.has(q.id) && "ring-2 ring-yellow-500"
            )}
          >
            {flaggedQuestions.has(q.id) ? (
              <Flag className="h-3 w-3 mx-auto" />
            ) : (
              index + 1
            )}
          </button>
        ))}
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <QuestionCard
          questionId={currentQuestion.id}
          questionNumber={currentIndex + 1}
          questionText={currentQuestion.question}
          questionType={currentQuestion.questionType}
          config={currentQuestion.config || { options: currentQuestion.options }}
          userAnswer={answers[currentQuestion.id]}
          onAnswer={(answer) => selectAnswer(currentQuestion.id, answer)}
          points={currentQuestion.points}
          showPoints={quiz.gradingConfig?.showPointValues}
          isFlagged={flaggedQuestions.has(currentQuestion.id)}
          onToggleFlag={() => toggleFlag(currentQuestion.id)}
          showFlagButton={true}
        />
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={prevQuestion}
          disabled={currentIndex === 0}
          className="w-full sm:w-auto"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <span className="text-center text-sm text-muted-foreground">
          {answeredCount} of {questions.length} answered
        </span>
        {currentIndex === questions.length - 1 ? (
          <Button onClick={handleSubmit} disabled={submitQuiz.isPending} className="w-full sm:w-auto">
            {submitQuiz.isPending ? "Submitting..." : "Submit Quiz"}
          </Button>
        ) : (
          <Button onClick={nextQuestion} className="w-full sm:w-auto">
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
