"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import type { QuestionRendererProps, ResultRendererProps } from "./types";
import type { TrueFalseConfig, TrueFalseAnswer, TrueFalseUserAnswer } from "@/lib/types/quiz";

export function TrueFalseRenderer({
  config,
  userAnswer,
  onAnswer,
  disabled,
  showResult,
  correctAnswerData,
}: QuestionRendererProps) {
  const tfConfig = config as TrueFalseConfig;
  const trueLabel = tfConfig.trueLabel || "True";
  const falseLabel = tfConfig.falseLabel || "False";

  const selectedValue = typeof userAnswer === 'boolean'
    ? userAnswer
    : (userAnswer as TrueFalseUserAnswer)?.selectedValue;

  const correctValue = showResult
    ? (correctAnswerData as TrueFalseAnswer)?.correctValue
    : undefined;

  const handleSelect = (value: boolean) => {
    if (disabled) return;
    onAnswer({ selectedValue: value });
  };

  const options = [
    { value: true, label: trueLabel },
    { value: false, label: falseLabel },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {options.map(({ value, label }) => {
        const isSelected = selectedValue === value;
        const isCorrectOption = correctValue === value;
        const isWrongSelection = showResult && isSelected && !isCorrectOption;

        return (
          <button
            key={String(value)}
            onClick={() => handleSelect(value)}
            disabled={disabled}
            className={cn(
              "p-6 rounded-lg border-2 transition-all text-center",
              disabled ? "cursor-default" : "hover:scale-[1.02]",
              !showResult && isSelected && "border-primary bg-primary/10 shadow-sm",
              !showResult && !isSelected && !disabled && "border-muted hover:border-primary/50 hover:bg-muted/50",
              !showResult && !isSelected && disabled && "border-muted bg-muted/30",
              showResult && isCorrectOption && "border-green-500 bg-green-500/10",
              showResult && isWrongSelection && "border-red-500 bg-red-500/10",
              showResult && !isCorrectOption && !isWrongSelection && "border-muted bg-muted/30"
            )}
          >
            <div className="flex flex-col items-center gap-2">
              {showResult && isCorrectOption && (
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
              {showResult && isWrongSelection && (
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                  <X className="h-5 w-5 text-white" />
                </div>
              )}
              {!showResult && (
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {value ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </div>
              )}
              <span className="text-lg font-medium">{label}</span>
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

export function TrueFalseResultRenderer({
  config,
  correctAnswerData,
  userAnswer,
  explanation,
}: ResultRendererProps) {
  const tfConfig = config as TrueFalseConfig;
  const trueLabel = tfConfig.trueLabel || "True";
  const falseLabel = tfConfig.falseLabel || "False";

  const selectedValue = typeof userAnswer === 'boolean'
    ? userAnswer
    : (userAnswer as TrueFalseUserAnswer)?.selectedValue;
  const correctValue = (correctAnswerData as TrueFalseAnswer)?.correctValue;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className={cn(
          "p-4 rounded-lg text-center",
          correctValue === true && "bg-green-500/10 border border-green-500/20",
          selectedValue === true && correctValue !== true && "bg-red-500/10 border border-red-500/20",
          correctValue !== true && selectedValue !== true && "bg-muted/50"
        )}>
          <span className="font-medium">{trueLabel}</span>
          {correctValue === true && <Badge className="ml-2 bg-green-500">Correct</Badge>}
          {selectedValue === true && correctValue !== true && (
            <Badge variant="destructive" className="ml-2">Your answer</Badge>
          )}
        </div>
        <div className={cn(
          "p-4 rounded-lg text-center",
          correctValue === false && "bg-green-500/10 border border-green-500/20",
          selectedValue === false && correctValue !== false && "bg-red-500/10 border border-red-500/20",
          correctValue !== false && selectedValue !== false && "bg-muted/50"
        )}>
          <span className="font-medium">{falseLabel}</span>
          {correctValue === false && <Badge className="ml-2 bg-green-500">Correct</Badge>}
          {selectedValue === false && correctValue !== false && (
            <Badge variant="destructive" className="ml-2">Your answer</Badge>
          )}
        </div>
      </div>
      {explanation && (
        <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
          <strong>Explanation:</strong> {explanation}
        </p>
      )}
    </div>
  );
}
