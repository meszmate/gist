"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonStat {
  id: string;
  title: string;
  totalAttempts: number;
  completedCount: number;
  averageScore: number;
  averageTime: number;
  completionRate: number;
}

interface LessonAnalyticsProps {
  lessons: LessonStat[];
}

export function LessonAnalytics({ lessons }: LessonAnalyticsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "[&>div]:bg-green-500";
    if (score >= 40) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Lesson Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lessons.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No lessons to analyze
          </p>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, i) => (
              <div
                key={lesson.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
              >
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lesson.totalAttempts} attempt{lesson.totalAttempts !== 1 ? "s" : ""} · {lesson.completionRate}% completion · Avg {formatTime(lesson.averageTime)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24">
                    <Progress
                      value={lesson.averageScore}
                      className={cn("h-2", getProgressColor(lesson.averageScore))}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium w-12 text-right",
                      getScoreColor(lesson.averageScore)
                    )}
                  >
                    {lesson.averageScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
