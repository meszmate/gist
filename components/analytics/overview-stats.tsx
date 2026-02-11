"use client";

import { StatCard } from "@/components/shared/stat-card";
import { Eye, Users, Target, Clock, Brain, FileQuestion, GraduationCap } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface OverviewStatsProps {
  totalViews: number;
  uniqueViewers: number;
  totalAttempts: number;
  averageScore: number;
  averageTimeSeconds: number;
  flashcardStudySessions: number;
  lessonAttempts?: number;
  averageLessonScore?: number;
}

export function OverviewStats({
  totalViews,
  uniqueViewers,
  totalAttempts,
  averageScore,
  averageTimeSeconds,
  flashcardStudySessions,
  lessonAttempts = 0,
  averageLessonScore = 0,
}: OverviewStatsProps) {
  const { t } = useLocale();

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t("analytics.totalViews")}
        value={totalViews}
        description={t("analytics.allTimeViews")}
        icon={<Eye className="h-5 w-5" />}
        delay={0}
      />
      <StatCard
        title={t("analytics.uniqueViewers")}
        value={uniqueViewers}
        description={t("analytics.distinctUsers")}
        icon={<Users className="h-5 w-5" />}
        delay={50}
      />
      <StatCard
        title={t("analytics.quizAttempts")}
        value={totalAttempts}
        description={t("analytics.completedQuizzes")}
        icon={<FileQuestion className="h-5 w-5" />}
        delay={100}
      />
      <StatCard
        title={t("analytics.averageScore")}
        value={`${averageScore}%`}
        description={t("analytics.acrossAllAttempts")}
        icon={<Target className="h-5 w-5" />}
        delay={150}
      />
      <StatCard
        title={t("analytics.avgTimeSpent")}
        value={formatTime(averageTimeSeconds)}
        description={t("analytics.perQuizAttempt")}
        icon={<Clock className="h-5 w-5" />}
        delay={200}
      />
      <StatCard
        title={t("analytics.studySessions")}
        value={flashcardStudySessions}
        description={t("analytics.flashcardReviews")}
        icon={<Brain className="h-5 w-5" />}
        delay={250}
      />
      <StatCard
        title={t("analytics.lessonAttempts")}
        value={lessonAttempts}
        description={t("analytics.completedLessons")}
        icon={<GraduationCap className="h-5 w-5" />}
        delay={300}
      />
      <StatCard
        title={t("analytics.avgLessonScore")}
        value={`${averageLessonScore}%`}
        description={t("analytics.acrossLessonAttempts")}
        icon={<Target className="h-5 w-5" />}
        delay={350}
      />
    </div>
  );
}
