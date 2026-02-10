"use client";

import type { StepRendererProps } from "./types";
import type { TrueFalseContent, TrueFalseAnswerData, TrueFalseUserAnswer } from "@/lib/types/lesson";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export function TrueFalseRenderer({
  step,
  onAnswer,
  userAnswer,
  isChecked,
  isCorrect,
  disabled,
}: StepRendererProps) {
  const content = step.content as TrueFalseContent;
  const answerData = step.answerData as TrueFalseAnswerData;
  const selected = (userAnswer as TrueFalseUserAnswer)?.selectedValue;

  const options = [
    { value: true, label: "True" },
    { value: false, label: "False" },
  ];

  return (
    <div className="space-y-6">
      <div className="p-6 bg-muted/50 rounded-xl border">
        <p className="text-lg font-medium leading-relaxed">{content.statement}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = selected === option.value;
          const isCorrectOpt = isChecked && answerData?.correctValue === option.value;
          const isWrong = isChecked && isSelected && !isCorrect;

          return (
            <button
              key={String(option.value)}
              onClick={() => !disabled && onAnswer({ selectedValue: option.value })}
              disabled={disabled}
              className={cn(
                "py-4 px-6 rounded-lg border-2 text-lg font-medium transition-all",
                "hover:border-primary/50",
                !isChecked && isSelected && "border-primary bg-primary/5",
                !isChecked && !isSelected && "border-border",
                isCorrectOpt && "border-green-500 bg-green-500/10 animate-correct-pulse",
                isWrong && "border-red-500 bg-red-500/10 animate-incorrect-shake",
                isChecked && !isCorrectOpt && !isWrong && "border-border opacity-60",
                disabled && "cursor-default"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                {isCorrectOpt && <Check className="h-5 w-5 text-green-500" />}
                {isWrong && <X className="h-5 w-5 text-red-500" />}
                {option.label}
              </div>
            </button>
          );
        })}
      </div>
      {isChecked && (
        <p className="text-sm text-muted-foreground">
          {answerData?.correctValue ? content.trueExplanation : content.falseExplanation}
        </p>
      )}
    </div>
  );
}
