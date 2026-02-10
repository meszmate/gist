"use client";

import type { StepRendererProps } from "./types";
import type { TypeAnswerContent, TypeAnswerAnswerData, TypeAnswerUserAnswer } from "@/lib/types/lesson";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

export function TypeAnswerRenderer({
  step,
  onAnswer,
  userAnswer,
  isChecked,
  isCorrect,
  disabled,
}: StepRendererProps) {
  const content = step.content as TypeAnswerContent;
  const answerData = step.answerData as TypeAnswerAnswerData;
  const currentText = (userAnswer as TypeAnswerUserAnswer)?.text || "";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{content.question}</h3>
      <div className="relative">
        <Input
          value={currentText}
          onChange={(e) => onAnswer({ text: e.target.value })}
          disabled={disabled}
          placeholder={content.placeholder || "Type your answer..."}
          className={cn(
            "text-lg py-6 pr-10",
            isChecked && isCorrect && "border-green-500 text-green-700 dark:text-green-400",
            isChecked && !isCorrect && "border-red-500 text-red-700 dark:text-red-400"
          )}
        />
        {isChecked && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCorrect ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>
      {isChecked && !isCorrect && answerData?.acceptedAnswers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Accepted answers: {answerData.acceptedAnswers.join(", ")}
        </p>
      )}
    </div>
  );
}
