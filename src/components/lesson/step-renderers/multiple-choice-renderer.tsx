"use client";

import type { StepRendererProps } from "./types";
import type { MultipleChoiceContent, MultipleChoiceAnswerData, MultipleChoiceUserAnswer } from "@/lib/types/lesson";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export function MultipleChoiceRenderer({
  step,
  onAnswer,
  userAnswer,
  isChecked,
  isCorrect,
  disabled,
}: StepRendererProps) {
  const content = step.content as MultipleChoiceContent;
  const answerData = step.answerData as MultipleChoiceAnswerData;
  const selected = (userAnswer as MultipleChoiceUserAnswer)?.selectedOptionId;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{content.question}</h3>
      <div className="space-y-2">
        {content.options.map((option) => {
          const isSelected = selected === option.id;
          const isCorrectOption = isChecked && answerData?.correctOptionId === option.id;
          const isWrong = isChecked && isSelected && !isCorrect;

          return (
            <button
              key={option.id}
              onClick={() => !disabled && onAnswer({ selectedOptionId: option.id })}
              disabled={disabled}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border-2 transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                !isChecked && isSelected && "border-primary bg-primary/5",
                !isChecked && !isSelected && "border-border",
                isCorrectOption && "border-green-500 bg-green-500/10 animate-correct-pulse",
                isWrong && "border-red-500 bg-red-500/10 animate-incorrect-shake",
                isChecked && !isCorrectOption && !isWrong && "border-border opacity-60",
                disabled && "cursor-default hover:border-border hover:bg-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium shrink-0",
                    !isChecked && isSelected && "border-primary bg-primary text-primary-foreground",
                    !isChecked && !isSelected && "border-muted-foreground/30",
                    isCorrectOption && "border-green-500 bg-green-500 text-white",
                    isWrong && "border-red-500 bg-red-500 text-white"
                  )}
                >
                  {isCorrectOption ? (
                    <Check className="h-4 w-4" />
                  ) : isWrong ? (
                    <X className="h-4 w-4" />
                  ) : (
                    option.id.toUpperCase()
                  )}
                </div>
                <span className="flex-1">{option.text}</span>
              </div>
              {isChecked && isCorrectOption && option.explanation && (
                <p className="mt-2 ml-11 text-sm text-green-700 dark:text-green-400">
                  {option.explanation}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
