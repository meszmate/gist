"use client";

import { BookOpen, Brain, FileQuestion, Plus, Flame, Target, Clock, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

interface DashboardStats {
  resourceCount: number;
  flashcardsDue: number;
  totalFlashcards: number;
  recentAttempts: {
    id: string;
    score: string | null;
    completedAt: Date | null;
    title: string;
  }[];
  weeklyActivity: number[];
  studyStreak: number;
  totalReviews: number;
}

interface DashboardClientProps {
  greeting: string;
  firstName: string;
  stats: DashboardStats;
}

function WeeklyChart({ data }: { data: number[] }) {
  const { t } = useLocale();
  const max = Math.max(...data, 1);
  const days = [
    t("dashboard.days.mon"),
    t("dashboard.days.tue"),
    t("dashboard.days.wed"),
    t("dashboard.days.thu"),
    t("dashboard.days.fri"),
    t("dashboard.days.sat"),
    t("dashboard.days.sun"),
  ];

  return (
    <div className="flex items-end justify-between gap-2 h-32 pt-4">
      {data.map((value, index) => {
        const height = (value / max) * 100;
        const isToday = index === data.length - 1;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full relative group"
              style={{ height: "80px" }}
            >
              <div
                className={cn(
                  "absolute bottom-0 w-full rounded-t-md transition-all duration-500 ease-out",
                  isToday
                    ? "bg-primary"
                    : "bg-primary/30 group-hover:bg-primary/50"
                )}
                style={{
                  height: `${Math.max(height, 4)}%`,
                  animationDelay: `${index * 50}ms`,
                }}
              />
              {value > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant="secondary" className="text-xs">
                    {value}
                  </Badge>
                </div>
              )}
            </div>
            <span
              className={cn(
                "text-xs",
                isToday ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              {days[index]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityTimeline({
  attempts,
}: {
  attempts: DashboardStats["recentAttempts"];
}) {
  const { t, formatDate } = useLocale();

  if (attempts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileQuestion className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          {t("dashboard.noQuizAttempts")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("dashboard.createAndQuiz")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {attempts.map((attempt, index) => {
        const score = attempt.score ? Number(attempt.score) : null;
        const scoreColor =
          score === null
            ? "bg-muted"
            : score >= 80
            ? "bg-green-500"
            : score >= 60
            ? "bg-yellow-500"
            : "bg-red-500";

        return (
          <div
            key={attempt.id}
            className={cn(
              "flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors animate-slide-up",
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="relative">
              <div
                className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white", scoreColor)}
              >
                {score !== null ? (
                  <span className="text-sm font-bold">{Math.round(score)}</span>
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              {index < attempts.length - 1 && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-border" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{attempt.title}</p>
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
            {score !== null && (
              <Badge variant={score >= 80 ? "default" : "secondary"}>
                {score >= 80 ? t("dashboard.great") : score >= 60 ? t("dashboard.good") : t("dashboard.keepPracticing")}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardClient({ greeting, firstName, stats }: DashboardClientProps) {
  const { t } = useLocale();
  const hasCardsDue = stats.flashcardsDue > 0;
  const totalWeeklyReviews = stats.weeklyActivity.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight animate-fade-in">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted-foreground animate-fade-in">
            {hasCardsDue
              ? t("dashboard.cardsDueMessage", { count: stats.flashcardsDue })
              : t("dashboard.allCaughtUp")}
          </p>
        </div>
        <Button asChild size="lg" className="animate-fade-in">
          <Link href="/create">
            <Plus className="mr-2 h-4 w-4" />
            {t("dashboard.createResource")}
          </Link>
        </Button>
      </div>

      {/* Study Prompt */}
      {hasCardsDue && (
        <Alert className="border-primary/50 bg-primary/5 animate-slide-up">
          <Brain className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">{t("dashboard.readyToStudy")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {t("dashboard.flashcardsDue", { count: stats.flashcardsDue })}
            </span>
            <Button asChild size="sm" className="w-full sm:ml-4 sm:w-auto">
              <Link href="/study">
                {t("dashboard.startSession")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.totalResources")}
          value={stats.resourceCount}
          description={t("dashboard.studyMaterialsCreated")}
          icon={<BookOpen className="h-5 w-5" />}
          delay={0}
          onClick={() => (window.location.href = "/library")}
        />
        <StatCard
          title={t("dashboard.cardsDue")}
          value={stats.flashcardsDue}
          description={t("dashboard.readyForReview")}
          icon={<Brain className="h-5 w-5" />}
          delay={50}
          onClick={() => (window.location.href = "/study")}
          sparklineData={stats.weeklyActivity}
        />
        <StatCard
          title={t("dashboard.totalFlashcards")}
          value={stats.totalFlashcards}
          description={t("dashboard.acrossAllResources")}
          icon={<Target className="h-5 w-5" />}
          delay={100}
        />
        <StatCard
          title={t("dashboard.studyStreak")}
          value={stats.studyStreak}
          description={stats.studyStreak > 0 ? t("dashboard.daysInARow") : t("dashboard.startStudying")}
          icon={<Flame className="h-5 w-5" />}
          delay={150}
          trend={
            stats.studyStreak > 0
              ? { value: stats.studyStreak, label: t("dashboard.keepItUp") }
              : undefined
          }
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("dashboard.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasCardsDue ? (
              <Button
                asChild
                className="w-full justify-between group"
                size="lg"
              >
                <Link href="/study">
                  <span className="flex items-center">
                    <Brain className="mr-2 h-4 w-4" />
                    {t("dashboard.studyDueCards", { count: stats.flashcardsDue })}
                  </span>
                  <kbd
                    className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-xs border border-black/10 rounded"
                    style={{ backgroundColor: "#fff", color: "#000" }}
                  >
                    S
                  </kbd>
                </Link>
              </Button>
            ) : (
              <Button variant="secondary" className="w-full justify-start" disabled size="lg">
                <Brain className="mr-2 h-4 w-4" />
                {t("dashboard.noCardsDue")}
              </Button>
            )}
            <Button asChild variant="outline" className="w-full justify-between" size="lg">
              <Link href="/library">
                <span className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4" />
                  {t("dashboard.browseLibrary")}
                </span>
                <kbd
                  className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-xs border border-black/10 rounded"
                  style={{ backgroundColor: "#fff", color: "#000" }}
                >
                  L
                </kbd>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between" size="lg">
              <Link href="/create">
                <span className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("dashboard.createResource")}
                </span>
                <kbd
                  className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-xs border border-black/10 rounded"
                  style={{ backgroundColor: "#fff", color: "#000" }}
                >
                  C
                </kbd>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between" size="lg">
              <Link href="/quiz">
                <span className="flex items-center">
                  <FileQuestion className="mr-2 h-4 w-4" />
                  {t("dashboard.takeQuiz")}
                </span>
                <kbd
                  className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-xs border border-black/10 rounded"
                  style={{ backgroundColor: "#fff", color: "#000" }}
                >
                  Q
                </kbd>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{t("dashboard.weeklyProgress")}</CardTitle>
              <Badge variant="secondary" className="font-normal">
                {t("dashboard.reviewsThisWeek", { count: totalWeeklyReviews })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <WeeklyChart data={stats.weeklyActivity} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{t("dashboard.recentQuizAttempts")}</CardTitle>
            {stats.recentAttempts.length > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/quiz">
                  {t("common.viewAll")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTimeline attempts={stats.recentAttempts} />
        </CardContent>
      </Card>
    </div>
  );
}
