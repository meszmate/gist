"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QuestionCard } from "@/components/quiz/question-card";
import {
  FileQuestion,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import type {
  QuestionConfig,
  UserAnswer,
  MultipleChoiceConfig,
} from "@/lib/types/quiz";

interface QuizQuestion {
  id: string;
  question: string;
  questionType: string;
  config: QuestionConfig;
  points: number;
  order: number | null;
  options: string[];
}

interface QuizSettings {
  timeLimitSeconds: number | null;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
}

interface SharedQuizTakerProps {
  questions: QuizQuestion[];
  settings: QuizSettings | null;
  token: string;
  resourceTitle: string;
}

type QuizState = "intro" | "taking" | "results";

interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  pointsEarned: number;
  pointsPossible: number;
  grade: string | null;
  answers: Array<{
    questionId: string;
    question: string;
    questionType: string;
    selectedAnswer: UserAnswer;
    correctAnswer: unknown;
    isCorrect: boolean;
    pointsEarned: number;
    pointsPossible: number;
    explanation: string | null;
  }>;
}

export function SharedQuizTaker({
  questions: rawQuestions,
  settings,
  token,
  resourceTitle,
}: SharedQuizTakerProps) {
  const { t } = useLocale();
  const [state, setState] = useState<QuizState>("intro");
  const [questions, setQuestions] = useState(rawQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(
    settings?.timeLimitSeconds || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [startTime, setStartTime] = useState(0);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  // Timer
  useEffect(() => {
    if (state !== "taking" || timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((t) => (t !== null ? t - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, timeLeft]);

  const startQuiz = () => {
    let quizQuestions = [...rawQuestions];
    if (settings?.shuffleQuestions) {
      quizQuestions = quizQuestions.sort(() => Math.random() - 0.5);
    }
    setQuestions(quizQuestions);
    setCurrentIndex(0);
    setAnswers({});
    setTimeLeft(settings?.timeLimitSeconds || null);
    setStartTime(Date.now());
    setState("taking");
  };

  const handleAnswer = useCallback(
    (answer: UserAnswer) => {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: answer,
      }));
    },
    [currentQuestion?.id]
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    try {
      const res = await fetch(`/api/shared/${token}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          timeSpentSeconds: timeSpent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setState("results");
      }
    } catch {
      // Fail silently
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Intro screen
  if (state === "intro") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-8">
        <div className="rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center mx-auto">
          <FileQuestion className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold">{resourceTitle} - Quiz</h3>
          <p className="text-muted-foreground mt-2">
            {t("quiz.questions", { count: questions.length })}
            {settings?.timeLimitSeconds &&
              ` | ${t("quiz.timeLimitInfo", { count: Math.ceil(settings.timeLimitSeconds / 60) })}`}
          </p>
        </div>
        <Button size="lg" onClick={startQuiz}>
          {t("quiz.startQuiz")}
        </Button>
      </div>
    );
  }

  // Results screen
  if (state === "results" && result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        <div className="text-center space-y-4">
          <div className="rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center mx-auto">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold">{t("quiz.quizComplete")}</h3>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold">
                {result.percentage.toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground">{t("quiz.score")}</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">
                {result.score}
              </p>
              <p className="text-sm text-muted-foreground">
                of {result.total} correct
              </p>
            </div>
            {result.grade && (
              <div className="text-center">
                <p className="text-4xl font-bold">{result.grade}</p>
                <p className="text-sm text-muted-foreground">{t("quiz.grade")}</p>
              </div>
            )}
          </div>
          <Button onClick={() => { setState("intro"); setResult(null); }}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("quiz.retakeQuiz")}
          </Button>
        </div>

        {/* Answer Review */}
        {settings?.showCorrectAnswers !== false && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">{t("quiz.reviewAnswers")}</h4>
            {result.answers.map((ans, i) => (
              <Card
                key={ans.questionId}
                className={cn(
                  "border-l-4",
                  ans.isCorrect ? "border-l-green-500" : "border-l-red-500"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">
                      {i + 1}. {ans.question}
                    </p>
                    <Badge
                      variant={ans.isCorrect ? "default" : "destructive"}
                      className="shrink-0"
                    >
                      {ans.isCorrect ? t("quiz.correct") : t("quiz.incorrect")}
                    </Badge>
                  </div>
                  {ans.explanation && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {ans.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Taking quiz
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {t("quiz.questionOf", { current: currentIndex + 1, total: questions.length })}
          </p>
          <Progress value={progress} className="h-2 w-48" />
        </div>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <Badge
              variant={timeLeft < 60 ? "destructive" : "outline"}
              className="gap-1 text-sm"
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </Badge>
          )}
          <Badge variant="outline">
            {t("quiz.answered", { count: answeredCount, total: questions.length })}
          </Badge>
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => {
              setCurrentIndex(i);
            }}
            className={cn(
              "w-8 h-8 rounded-full text-xs font-medium transition-colors",
              i === currentIndex
                ? "bg-primary text-primary-foreground"
                : answers[q.id] !== undefined
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question */}
      <QuestionCard
        questionId={currentQuestion.id}
        questionNumber={currentIndex + 1}
        questionText={currentQuestion.question}
        questionType={currentQuestion.questionType}
        config={
          currentQuestion.config && Object.keys(currentQuestion.config).length > 0
            ? currentQuestion.config
            : ({ options: currentQuestion.options } as MultipleChoiceConfig)
        }
        userAnswer={answers[currentQuestion.id]}
        onAnswer={handleAnswer}
        points={currentQuestion.points}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("quiz.previous")}
        </Button>

        {currentIndex === questions.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("common.submitting") : t("quiz.submitQuiz")}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => i + 1)}
          >
            {t("quiz.next")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
