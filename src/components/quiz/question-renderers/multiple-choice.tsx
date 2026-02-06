"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import type { QuestionRendererProps, ResultRendererProps } from "./types";
import type { MultipleChoiceConfig, MultipleChoiceAnswer, MultipleChoiceUserAnswer } from "@/lib/types/quiz";

export function MultipleChoiceRenderer({
  config,
  userAnswer,
  onAnswer,
  disabled,
  showResult,
  correctAnswerData,
}: QuestionRendererProps) {
  const mcConfig = config as MultipleChoiceConfig;
  const options = mcConfig.options || [];

  const selectedIndex = typeof userAnswer === 'number'
    ? userAnswer
    : (userAnswer as MultipleChoiceUserAnswer)?.selectedIndex;

  const correctIndex = showResult
    ? (correctAnswerData as MultipleChoiceAnswer)?.correctIndex
    : undefined;

  const handleSelect = (index: number) => {
    if (disabled) return;
    onAnswer({ selectedIndex: index });
  };

  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        const isCorrectOption = correctIndex === index;
        const isWrongSelection = showResult && isSelected && !isCorrectOption;

        return (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={disabled}
            className={cn(
              "w-full text-left p-4 rounded-lg border-2 transition-all",
              disabled ? "cursor-default" : "hover:scale-[1.01]",
              !showResult && isSelected && "border-primary bg-primary/10 shadow-sm",
              !showResult && !isSelected && !disabled && "border-muted hover:border-primary/50 hover:bg-muted/50",
              !showResult && !isSelected && disabled && "border-muted bg-muted/30",
              showResult && isCorrectOption && "border-green-500 bg-green-500/10",
              showResult && isWrongSelection && "border-red-500 bg-red-500/10",
              showResult && !isCorrectOption && !isWrongSelection && "border-muted bg-muted/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mr-3",
                  showResult && isCorrectOption && "bg-green-500 text-white",
                  showResult && isWrongSelection && "bg-red-500 text-white",
                  !showResult && isSelected && "bg-primary text-primary-foreground",
                  !showResult && !isSelected && "bg-muted"
                )}>
                  {showResult && isCorrectOption ? (
                    <Check className="h-4 w-4" />
                  ) : showResult && isWrongSelection ? (
                    <X className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span>{option}</span>
              </div>
              {showResult && isCorrectOption && (
                <Badge className="bg-green-500">Correct</Badge>
              )}
              {showResult && isWrongSelection && (
                <Badge variant="destructive">Your answer</Badge>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function MultipleChoiceResultRenderer({
  config,
  correctAnswerData,
  userAnswer,
  isCorrect,
  explanation,
}: ResultRendererProps) {
  const mcConfig = config as MultipleChoiceConfig;
  const options = mcConfig.options || [];

  const selectedIndex = typeof userAnswer === 'number'
    ? userAnswer
    : (userAnswer as MultipleChoiceUserAnswer)?.selectedIndex;
  const correctIndex = (correctAnswerData as MultipleChoiceAnswer)?.correctIndex;

  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        const isCorrectOption = correctIndex === index;
        const isWrongSelection = isSelected && !isCorrectOption;

        return (
          <div
            key={index}
            className={cn(
              "p-3 rounded-lg text-sm",
              isCorrectOption && "bg-green-500/10 border border-green-500/20",
              isWrongSelection && "bg-red-500/10 border border-red-500/20",
              !isCorrectOption && !isWrongSelection && "bg-muted/50"
            )}
          >
            <span className="font-mono mr-2">
              {String.fromCharCode(65 + index)}.
            </span>
            {option}
            {isCorrectOption && (
              <Badge className="ml-2 bg-green-500">Correct</Badge>
            )}
            {isWrongSelection && (
              <Badge variant="destructive" className="ml-2">Your answer</Badge>
            )}
          </div>
        );
      })}
      {explanation && (
        <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
          <strong>Explanation:</strong> {explanation}
        </p>
      )}
    </div>
  );
}
