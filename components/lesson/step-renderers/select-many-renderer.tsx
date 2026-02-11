"use client";

import type { StepRendererProps } from "./types";
import type { SelectManyContent, SelectManyAnswerData, SelectManyUserAnswer } from "@/lib/types/lesson";
import { cn } from "@/lib/utils";
import { Check, X, Square, CheckSquare } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export function SelectManyRenderer({
  step,
  onAnswer,
  userAnswer,
  isChecked,
  disabled,
}: StepRendererProps) {
  const { t } = useLocale();
  const content = step.content as SelectManyContent;
  const answerData = step.answerData as SelectManyAnswerData;
  const selectedIds = (userAnswer as SelectManyUserAnswer)?.selectedOptionIds || [];
  const correctIds = new Set(answerData?.correctOptionIds || []);

  const toggle = (id: string) => {
    if (disabled) return;
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    onAnswer({ selectedOptionIds: newSelected });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{content.question}</h3>
      <p className="text-sm text-muted-foreground">{t("stepRenderer.selectMany")}</p>
      <div className="space-y-2">
        {content.options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          const isCorrectOpt = isChecked && correctIds.has(option.id);
          const isWrong = isChecked && isSelected && !correctIds.has(option.id);
          const isMissed = isChecked && !isSelected && correctIds.has(option.id);

          return (
            <button
              key={option.id}
              onClick={() => toggle(option.id)}
              disabled={disabled}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border-2 transition-all",
                "hover:border-primary/50",
                !isChecked && isSelected && "border-primary bg-primary/5",
                !isChecked && !isSelected && "border-border",
                isCorrectOpt && isSelected && "border-green-500 bg-green-500/10",
                isWrong && "border-red-500 bg-red-500/10",
                isMissed && "border-yellow-500 bg-yellow-500/10",
                isChecked && !isCorrectOpt && !isWrong && !isMissed && "border-border opacity-60",
                disabled && "cursor-default"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {isSelected ? (
                    <CheckSquare className={cn("h-5 w-5", isChecked ? (isWrong ? "text-red-500" : "text-green-500") : "text-primary")} />
                  ) : (
                    <Square className={cn("h-5 w-5", isMissed ? "text-yellow-500" : "text-muted-foreground/40")} />
                  )}
                </div>
                <span className="flex-1">{option.text}</span>
                {isChecked && isCorrectOpt && isSelected && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                {isWrong && <X className="h-4 w-4 text-red-500 shrink-0" />}
              </div>
              {isChecked && (isCorrectOpt || isWrong) && option.explanation && (
                <p className="mt-1.5 ml-8 text-sm text-muted-foreground">{option.explanation}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
