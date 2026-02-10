"use client";

import type { StepRendererProps } from "./types";
import type { FillBlanksContent, FillBlanksAnswerData, FillBlanksUserAnswer } from "@/lib/types/lesson";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function FillBlanksRenderer({
  step,
  onAnswer,
  userAnswer,
  isChecked,
  disabled,
}: StepRendererProps) {
  const content = step.content as FillBlanksContent;
  const answerData = step.answerData as FillBlanksAnswerData;
  const currentBlanks = (userAnswer as FillBlanksUserAnswer)?.blanks || {};

  const parts = content.template.split(/(\{\{[^}]+\}\})/g);

  const handleChange = (blankId: string, value: string) => {
    const newBlanks = { ...currentBlanks, [blankId]: value };
    onAnswer({ blanks: newBlanks });
  };

  return (
    <div className="space-y-4">
      <div className="text-lg leading-relaxed flex flex-wrap items-baseline gap-1">
        {parts.map((part, i) => {
          const match = part.match(/^\{\{(.+)\}\}$/);
          if (!match) return <span key={i}>{part}</span>;

          const blankId = match[1];
          const value = currentBlanks[blankId] || "";
          const correctAnswers = answerData?.correctBlanks[blankId] || [];
          const isCorrectBlank = isChecked && correctAnswers.some(
            (a) => a.toLowerCase() === value.trim().toLowerCase()
          );
          const isWrongBlank = isChecked && !isCorrectBlank;

          return (
            <span key={i} className="inline-flex flex-col items-center">
              <Input
                value={value}
                onChange={(e) => handleChange(blankId, e.target.value)}
                disabled={disabled}
                placeholder="..."
                className={cn(
                  "inline-block w-32 h-8 text-center text-base border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent px-1",
                  !isChecked && "border-primary/50 focus:border-primary",
                  isCorrectBlank && "border-green-500 text-green-700 dark:text-green-400",
                  isWrongBlank && "border-red-500 text-red-700 dark:text-red-400"
                )}
              />
              {isWrongBlank && correctAnswers.length > 0 && (
                <span className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                  {correctAnswers[0]}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
