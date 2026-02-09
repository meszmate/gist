"use client";

import { cn } from "@/lib/utils";
import { Check, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonPlayerFeedbackProps {
  isCorrect: boolean;
  explanation?: string | null;
  hint?: string | null;
  showTryAgain: boolean;
  onTryAgain: () => void;
  onContinue: () => void;
}

export function LessonPlayerFeedback({
  isCorrect,
  explanation,
  showTryAgain,
  onTryAgain,
  onContinue,
}: LessonPlayerFeedbackProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 border-2 animate-slide-up",
        isCorrect
          ? "bg-green-500/5 border-green-500/30"
          : "bg-red-500/5 border-red-500/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            isCorrect ? "bg-green-500" : "bg-red-500"
          )}
        >
          {isCorrect ? (
            <Check className="h-5 w-5 text-white" />
          ) : (
            <X className="h-5 w-5 text-white" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <p
            className={cn(
              "font-semibold",
              isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
            )}
          >
            {isCorrect ? "Correct!" : "Not quite right"}
          </p>
          {explanation && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{explanation}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            {showTryAgain && !isCorrect && (
              <Button variant="outline" size="sm" onClick={onTryAgain}>
                Try Again
              </Button>
            )}
            <Button size="sm" onClick={onContinue}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
