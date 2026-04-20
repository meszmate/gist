"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Target, Brain, FileQuestion, GraduationCap, BookOpen, PieChart } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  role: string;
  totalResources: number;
  completedResources: number;
}

interface QuizAttempt {
  id: string;
  score: string | null;
  grade: string | null;
  completedAt: string | null;
  resourceTitle: string;
  resourceId: string;
}

interface LessonAttempt {
  id: string;
  score: string | null;
  completedAt: string | null;
  totalSteps: number;
  correctCount: number;
}

interface QuestionTypeStat {
  type: string;
  total: number;
  correct: number;
  accuracy: number;
}

const QUESTION_TYPE_KEYS: Record<string, string> = {
  multiple_choice: "progress.qt.multiple_choice",
  true_false: "progress.qt.true_false",
  text_input: "progress.qt.text_input",
  year_range: "progress.qt.year_range",
  numeric_range: "progress.qt.numeric_range",
  matching: "progress.qt.matching",
  fill_blank: "progress.qt.fill_blank",
  multi_select: "progress.qt.multi_select",
};

export default function ProgressPage() {
  const { t, formatDate } = useLocale();
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "student":
        return t("courses.role.student");
      case "instructor":
        return t("courses.role.instructor");
      case "ta":
        return t("courses.role.ta");
      default:
        return role;
    }
  };
  const { data, isLoading } = useQuery({
    queryKey: ["student-progress"],
    queryFn: async () => {
      const res = await fetch("/api/student/progress");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("progress.title")} description={t("progress.description")} />
        <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("progress.title")} description={t("progress.description")} />

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("progress.avgQuizScore")}
          value={`${data?.summary?.avgQuizScore || 0}%`}
          description={t("progress.avgQuizScoreDesc")}
          icon={<Target className="h-5 w-5" />}
          delay={0}
        />
        <StatCard
          title={t("progress.quizAttempts")}
          value={data?.summary?.totalQuizAttempts || 0}
          description={t("progress.quizAttemptsDesc")}
          icon={<FileQuestion className="h-5 w-5" />}
          delay={50}
        />
        <StatCard
          title={t("progress.flashcardsDue")}
          value={data?.flashcardsDue || 0}
          description={t("progress.flashcardsDueDesc")}
          icon={<Brain className="h-5 w-5" />}
          delay={100}
        />
        <StatCard
          title={t("progress.studySessions")}
          value={data?.summary?.totalFlashcardSessions || 0}
          description={t("progress.studySessionsDesc")}
          icon={<GraduationCap className="h-5 w-5" />}
          delay={150}
        />
      </div>

      {/* Course Progress */}
      {data?.courseProgress?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {t("progress.courseProgress")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.courseProgress.map((course: CourseProgress) => {
              const pct = course.totalResources > 0
                ? Math.round((course.completedResources / course.totalResources) * 100)
                : 0;
              return (
                <Card key={course.courseId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{course.courseTitle}</CardTitle>
                      <Badge variant="secondary">{getRoleLabel(course.role)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("progress.resources", { completed: course.completedResources, total: course.totalResources })}
                        </span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <Progress value={pct} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Quiz Attempts */}
      {data?.quizAttempts?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t("progress.recentQuizAttempts")}</h2>
          <div className="space-y-2">
            {data.quizAttempts.map((attempt: QuizAttempt) => {
              const score = attempt.score ? Number(attempt.score) : null;
              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{attempt.resourceTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {attempt.completedAt
                        ? formatDate(new Date(attempt.completedAt), {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : t("common.inProgress")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {attempt.grade && <Badge variant="secondary">{attempt.grade}</Badge>}
                    {score !== null && (
                      <Badge variant={score >= 80 ? "default" : "secondary"}>
                        {Math.round(score)}%
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Lesson Attempts */}
      {data?.lessonAttempts?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t("progress.recentLessonAttempts")}</h2>
          <div className="space-y-2">
            {data.lessonAttempts.map((attempt: LessonAttempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div>
                  <p className="text-sm">
                    {t("progress.stepsCorrect", { correct: attempt.correctCount, total: attempt.totalSteps })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attempt.completedAt
                      ? formatDate(new Date(attempt.completedAt), {
                          month: "short",
                          day: "numeric",
                        })
                      : t("common.inProgress")}
                  </p>
                </div>
                {attempt.score && (
                  <Badge variant={Number(attempt.score) >= 80 ? "default" : "secondary"}>
                    {Math.round(Number(attempt.score))}%
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Type Performance */}
      {data?.questionTypeStats && data.questionTypeStats.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            {t("progress.questionTypePerformance")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.questionTypeStats.map((stat: QuestionTypeStat) => {
              const typeKey = QUESTION_TYPE_KEYS[stat.type];
              const typeLabel = typeKey ? t(typeKey) : stat.type.replace(/_/g, " ");
              const accuracyTone =
                stat.accuracy >= 80
                  ? "text-green-600 dark:text-green-500"
                  : stat.accuracy >= 60
                  ? "text-yellow-600 dark:text-yellow-500"
                  : "text-red-600 dark:text-red-500";
              return (
                <Card key={stat.type}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{typeLabel}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("progress.questionTypeAttempts", { count: stat.total })}
                        </p>
                      </div>
                      <div className={`text-2xl font-bold tabular-nums ${accuracyTone}`}>
                        {stat.accuracy}%
                      </div>
                    </div>
                    <div className="mt-3">
                      <Progress value={stat.accuracy} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Flashcard Stats */}
      {data?.flashcardStats && Number(data.flashcardStats.sessions) > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t("progress.flashcardStats")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{Number(data.flashcardStats.totalStudied)}</div>
                <p className="text-xs text-muted-foreground">{t("progress.cardsStudied")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{Number(data.flashcardStats.totalCorrect)}</div>
                <p className="text-xs text-muted-foreground">{t("progress.cardsCorrect")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {Number(data.flashcardStats.totalStudied) > 0
                    ? Math.round((Number(data.flashcardStats.totalCorrect) / Number(data.flashcardStats.totalStudied)) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">{t("progress.accuracyRate")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!data?.quizAttempts?.length && !data?.lessonAttempts?.length && !data?.courseProgress?.length && (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t("progress.noActivity")}</p>
        </div>
      )}
    </div>
  );
}
