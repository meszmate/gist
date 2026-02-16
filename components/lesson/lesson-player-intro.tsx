"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Clock, Zap } from "lucide-react";
import type { LessonWithSteps } from "@/lib/types/lesson";
import { isInteractiveStep } from "@/lib/types/lesson";
import type { StepType } from "@/lib/types/lesson";
import { useLocale } from "@/hooks/use-locale";

interface LessonPlayerIntroProps {
  lesson: LessonWithSteps;
  onStart: () => void;
}

export function LessonPlayerIntro({ lesson, onStart }: LessonPlayerIntroProps) {
  const { t } = useLocale();
  const totalSteps = lesson.steps.length;
  const interactiveSteps = lesson.steps.filter((s) => isInteractiveStep(s.stepType as StepType)).length;
  const contentSteps = totalSteps - interactiveSteps;
  const estimatedMinutes = Math.max(1, Math.ceil(totalSteps * 0.5));

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <GraduationCap className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2 max-w-lg">
        <h1 className="text-2xl font-bold sm:text-3xl">{lesson.title}</h1>
        {lesson.description && (
          <p className="text-muted-foreground">{lesson.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Badge variant="outline" className="gap-1.5 py-1 px-3">
          <Clock className="h-3.5 w-3.5" />
          {t("lessons.estimatedTime", { count: estimatedMinutes })}
        </Badge>
        <Badge variant="outline" className="gap-1.5 py-1 px-3">
          {t("lessons.steps", { count: totalSteps })}
        </Badge>
        <Badge variant="outline" className="gap-1.5 py-1 px-3">
          <Zap className="h-3.5 w-3.5" />
          {t("lessons.interactive", { count: interactiveSteps })}
        </Badge>
        {contentSteps > 0 && (
          <Badge variant="secondary" className="gap-1.5 py-1 px-3">
            {t("lessons.content", { count: contentSteps })}
          </Badge>
        )}
      </div>
      <Button size="lg" onClick={onStart} className="mt-4 w-full px-8 sm:w-auto">
        {t("lessons.startLesson")}
      </Button>
    </div>
  );
}
