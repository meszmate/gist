"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { signIn, useSession } from "next-auth/react";
import {
  Clock,
  FileQuestion,
  Lock,
  Check,
  X,
} from "lucide-react";
import { GistLogo } from "@/components/icons/gist-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage, localizeErrorMessage } from "@/lib/i18n/error-localizer";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

interface PublicQuiz {
  id: string;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
  settings: {
    timeLimitSeconds: number | null;
    requireSignin: boolean;
    shuffleQuestions: boolean;
    showCorrectAnswers: boolean;
  } | null;
  requiresAuth: boolean;
  isAllowed: boolean;
}

interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  answers: {
    questionId: string;
    question: string;
    selectedAnswer: number;
    correctAnswer: number;
    options: string[];
    explanation: string | null;
    isCorrect: boolean;
  }[];
}

async function fetchPublicQuiz(quizId: string): Promise<PublicQuiz> {
  const res = await fetch(`/api/shared/${quizId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch quiz");
  }
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

export default function PublicQuizPage() {
  const params = useParams();
  const quizId = params.quizId as string;
  const { data: session, status: sessionStatus } = useSession();
  const { t } = useLocale();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const { data: quiz, isLoading, error } = useQuery({
    queryKey: ["public-quiz", quizId],
    queryFn: () => fetchPublicQuiz(quizId),
  });

  const submitQuiz = useMutation({
    mutationFn: async (answers: Record<string, number>) => {
      const res = await fetch(`/api/shared/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const rawError = await getApiErrorMessage(res, "Failed to submit quiz");
        throw new Error(localizeErrorMessage(rawError, t, "errors.failedToSubmit"));
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  // Initialize questions when quiz loads (stable due to useMemo caching)
  const questions = useMemo(() => {
    if (!quiz?.questions) return [];
    return quiz.settings?.shuffleQuestions
      ? shuffleArray(quiz.questions)
      : quiz.questions;
  }, [quiz]);

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
    if (quiz?.settings?.timeLimitSeconds) {
      setTimeRemaining(quiz.settings.timeLimitSeconds);
    }
  };

  const selectAnswer = useCallback((questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
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

  const handleSubmit = () => {
    submitQuiz.mutate(answers);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t("publicQuiz.loadingQuiz")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("publicQuiz.quizNotAvailable")}</h2>
            <p className="text-muted-foreground mb-4">
              {localizeErrorMessage((error as Error).message, t, "errors.generic")}
            </p>
            <Button asChild>
              <Link href="/">{t("publicQuiz.goToGist")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz) return null;

  // Check if authentication is required
  if (quiz.requiresAuth && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("publicQuiz.signInRequired")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("publicQuiz.signInRequiredDesc")}
            </p>
            <Button onClick={() => signIn("google")}>
              {t("publicQuiz.signInWithGoogle")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is allowed
  if (!quiz.isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("publicQuiz.accessDenied")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("errors.notAuthorizedQuiz")}
            </p>
            <Button asChild>
              <Link href="/">{t("publicQuiz.goToGist")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-3xl mx-auto py-8 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <GistLogo className="h-6 w-6" />
            <span className="font-semibold">gist</span>
          </div>

          <Card>
            <CardContent className="py-8 text-center">
              <div className="text-5xl font-bold mb-2">
                {result.percentage.toFixed(0)}%
              </div>
              <p className="text-muted-foreground">
                {result.score} out of {result.total} correct
              </p>
            </CardContent>
          </Card>

          {quiz.settings?.showCorrectAnswers !== false && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Review Answers</h2>
              {result.answers.map((answer, index) => (
                <Card
                  key={answer.questionId}
                  className={cn(
                    "border-l-4",
                    answer.isCorrect ? "border-l-green-500" : "border-l-red-500"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-3">
                      {answer.isCorrect ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                      <span className="font-medium">
                        {index + 1}. {answer.question}
                      </span>
                    </div>
                    <div className="space-y-2 ml-7">
                      {answer.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={cn(
                            "p-2 rounded text-sm",
                            optIndex === answer.correctAnswer &&
                              "bg-green-100 dark:bg-green-900/30",
                            optIndex === answer.selectedAnswer &&
                              optIndex !== answer.correctAnswer &&
                              "bg-red-100 dark:bg-red-900/30"
                          )}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option}
                        </div>
                      ))}
                    </div>
                    {answer.explanation && (
                      <p className="text-sm text-muted-foreground mt-3 ml-7 pt-2 border-t">
                        {answer.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center">
            <Button asChild>
              <Link href="/">{t("publicQuiz.goToGist")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <GistLogo className="h-5 w-5" />
              <span className="text-sm text-muted-foreground">gist Quiz</span>
            </div>
            <CardTitle>{quiz.title}</CardTitle>
            {quiz.description && (
              <p className="text-muted-foreground">{quiz.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="secondary">
                {questions.length} questions
              </Badge>
              {quiz.settings?.timeLimitSeconds && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(quiz.settings.timeLimitSeconds)}
                </Badge>
              )}
            </div>
            <Button onClick={startQuiz} size="lg" className="w-full">
              <FileQuestion className="mr-2 h-4 w-4" />
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GistLogo className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">gist</span>
            </div>
            <h1 className="text-xl font-bold">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          {timeRemaining !== null && (
            <Badge
              variant={timeRemaining < 60 ? "destructive" : "secondary"}
              className="text-lg px-3 py-1"
            >
              <Clock className="h-4 w-4 mr-1" />
              {formatTime(timeRemaining)}
            </Badge>
          )}
        </div>

        <Progress value={progress} className="h-2" />

        <Card>
          <CardContent className="p-6">
            <p className="text-lg font-medium mb-6">{currentQuestion?.question}</p>
            <div className="space-y-3">
              {currentQuestion?.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => selectAnswer(currentQuestion.id, index)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-colors",
                    answers[currentQuestion.id] === index
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  <span className="font-mono mr-2">{index + 1}.</span>
                  {option}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevQuestion}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {answeredCount} of {questions.length} answered
          </span>
          {currentIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={submitQuiz.isPending}
            >
              {submitQuiz.isPending ? "Submitting..." : "Submit Quiz"}
            </Button>
          ) : (
            <Button onClick={nextQuestion}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
