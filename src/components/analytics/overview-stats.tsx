"use client";

import { StatCard } from "@/components/shared/stat-card";
import { Eye, Users, Target, Clock, Brain, FileQuestion } from "lucide-react";

interface OverviewStatsProps {
  totalViews: number;
  uniqueViewers: number;
  totalAttempts: number;
  averageScore: number;
  averageTimeSeconds: number;
  flashcardStudySessions: number;
}

export function OverviewStats({
  totalViews,
  uniqueViewers,
  totalAttempts,
  averageScore,
  averageTimeSeconds,
  flashcardStudySessions,
}: OverviewStatsProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Views"
        value={totalViews}
        description="All-time resource views"
        icon={<Eye className="h-5 w-5" />}
        delay={0}
      />
      <StatCard
        title="Unique Viewers"
        value={uniqueViewers}
        description="Distinct users"
        icon={<Users className="h-5 w-5" />}
        delay={50}
      />
      <StatCard
        title="Quiz Attempts"
        value={totalAttempts}
        description="Completed quizzes"
        icon={<FileQuestion className="h-5 w-5" />}
        delay={100}
      />
      <StatCard
        title="Average Score"
        value={`${averageScore}%`}
        description="Across all attempts"
        icon={<Target className="h-5 w-5" />}
        delay={150}
      />
      <StatCard
        title="Avg Time Spent"
        value={formatTime(averageTimeSeconds)}
        description="Per quiz attempt"
        icon={<Clock className="h-5 w-5" />}
        delay={200}
      />
      <StatCard
        title="Study Sessions"
        value={flashcardStudySessions}
        description="Flashcard reviews"
        icon={<Brain className="h-5 w-5" />}
        delay={250}
      />
    </div>
  );
}
