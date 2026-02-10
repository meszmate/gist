"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Trophy, RotateCcw, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonStep, StepResult, StepType } from "@/lib/types/lesson";
import { isInteractiveStep, STEP_TYPE_META } from "@/lib/types/lesson";

interface LessonPlayerSummaryProps {
  steps: LessonStep[];
  stepResults: Record<string, StepResult>;
  correctCount: number;
  interactiveSteps: number;
  timeSpentSeconds: number;
  onRetake: () => void;
  onBack: () => void;
}

export function LessonPlayerSummary({
  steps,
  stepResults,
  correctCount,
  interactiveSteps,
  timeSpentSeconds,
  onRetake,
  onBack,
}: LessonPlayerSummaryProps) {
  const score = interactiveSteps > 0 ? Math.round((correctCount / interactiveSteps) * 100) : 100;
  const mastery =
    score >= 80 ? "strong" : score >= 50 ? "moderate" : "weak";

  const masteryConfig = {
    strong: { label: "Strong Mastery", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
    moderate: { label: "Moderate Mastery", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10" },
    weak: { label: "Needs Review", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  };

  const minutes = Math.floor(timeSpentSeconds / 60);
  const seconds = timeSpentSeconds % 60;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-celebrate">
        <Trophy className="h-8 w-8 text-primary" />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Lesson Complete!</h1>
        <div className={cn("text-lg font-semibold", masteryConfig[mastery].color)}>
          {masteryConfig[mastery].label}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-md">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{score}%</div>
            <div className="text-xs text-muted-foreground">Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {correctCount}/{interactiveSteps}
            </div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {minutes}:{String(seconds).padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground">Time</div>
          </CardContent>
        </Card>
      </div>

      {/* Step-by-step breakdown */}
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">Step Breakdown</h3>
          <div className="space-y-1.5">
            {steps.map((step, i) => {
              const interactive = isInteractiveStep(step.stepType as StepType);
              const result = stepResults[step.id];
              const meta = STEP_TYPE_META[step.stepType as StepType];

              return (
                <div key={step.id} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-muted-foreground">{i + 1}.</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {meta?.label || step.stepType}
                  </Badge>
                  <span className="flex-1 truncate text-muted-foreground">
                    {interactive ? (result?.isCorrect ? "Correct" : "Incorrect") : "Viewed"}
                  </span>
                  {interactive && result && (
                    result.isCorrect ? (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-red-500 shrink-0" />
                    )
                  )}
                  {result && !result.firstAttemptCorrect && result.isCorrect && (
                    <span className="text-xs text-muted-foreground">
                      ({result.attempts} tries)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onRetake} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Retake Lesson
        </Button>
      </div>
    </div>
  );
}
