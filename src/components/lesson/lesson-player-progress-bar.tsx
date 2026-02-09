"use client";

import { cn } from "@/lib/utils";

interface LessonPlayerProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function LessonPlayerProgressBar({ current, total, className }: LessonPlayerProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          Step {Math.min(current + 1, total)} of {total}
        </span>
        <span className="text-xs font-medium">{percentage}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out animate-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
