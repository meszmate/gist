"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, Hash } from "lucide-react";
import type { QuestionRendererProps, ResultRendererProps } from "./types";
import type { NumericRangeConfig, NumericRangeAnswer, NumericRangeUserAnswer } from "@/lib/types/quiz";

export function NumericRangeRenderer({
  config,
  userAnswer,
  onAnswer,
  disabled,
  showResult,
  isCorrect,
  feedback,
}: QuestionRendererProps) {
  const numericConfig = config as NumericRangeConfig;

  const currentValue = typeof userAnswer === 'number'
    ? userAnswer
    : (userAnswer as NumericRangeUserAnswer)?.value;

  const [prevCurrentValue, setPrevCurrentValue] = useState(currentValue);
  const [inputValue, setInputValue] = useState(currentValue?.toString() || '');

  if (currentValue !== prevCurrentValue) {
    setPrevCurrentValue(currentValue);
    setInputValue(currentValue?.toString() || '');
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onAnswer({ value: numValue });
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Hash className="h-5 w-5 text-muted-foreground" />
        </div>
        <Input
          type="number"
          value={inputValue}
          onChange={handleChange}
          disabled={disabled}
          placeholder={numericConfig.placeholder || "Enter value..."}
          min={numericConfig.min}
          max={numericConfig.max}
          step={numericConfig.step}
          className={cn(
            "text-lg py-6 pl-10",
            numericConfig.unit && "pr-16",
            showResult && isCorrect && "border-green-500 bg-green-500/10",
            showResult && !isCorrect && "border-red-500 bg-red-500/10"
          )}
        />
        {numericConfig.unit && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground">
            {numericConfig.unit}
          </div>
        )}
        {showResult && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCorrect ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      {numericConfig.min !== undefined && numericConfig.max !== undefined && (
        <p className="text-xs text-muted-foreground">
          Enter a value between {numericConfig.min} and {numericConfig.max}
          {numericConfig.unit && ` ${numericConfig.unit}`}
        </p>
      )}

      {showResult && feedback && (
        <div className={cn(
          "p-3 rounded-lg text-sm",
          isCorrect ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700"
        )}>
          {feedback}
        </div>
      )}
    </div>
  );
}

export function NumericRangeResultRenderer({
  config,
  correctAnswerData,
  userAnswer,
  isCorrect,
  creditPercent,
  feedback,
  explanation,
}: ResultRendererProps) {
  const numericConfig = config as NumericRangeConfig;
  const correctAnswer = correctAnswerData as NumericRangeAnswer;

  const userValue = typeof userAnswer === 'number'
    ? userAnswer
    : (userAnswer as NumericRangeUserAnswer)?.value;

  const difference = userValue !== undefined
    ? Math.abs(userValue - correctAnswer.correctValue)
    : null;

  const formatValue = (val: number) => {
    return numericConfig.unit ? `${val} ${numericConfig.unit}` : val.toString();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className={cn(
          "p-4 rounded-lg",
          isCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
        )}>
          <span className="text-sm text-muted-foreground block mb-1">Your answer:</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {userValue !== undefined
                ? formatValue(userValue)
                : <em className="text-base text-muted-foreground">No answer</em>}
            </span>
            {creditPercent > 0 && creditPercent < 100 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                {creditPercent.toFixed(0)}%
              </Badge>
            )}
          </div>
          {difference !== null && difference > 0 && (
            <span className="text-sm text-muted-foreground">
              Off by {difference.toFixed(2)}{numericConfig.unit && ` ${numericConfig.unit}`}
            </span>
          )}
        </div>

        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="text-sm text-muted-foreground block mb-1">Correct answer:</span>
          <span className="text-2xl font-bold text-green-700">
            {formatValue(correctAnswer.correctValue)}
          </span>
        </div>
      </div>

      {numericConfig.tolerance && numericConfig.tolerance > 0 && (
        <p className="text-sm text-muted-foreground">
          Answers within {numericConfig.tolerance}
          {numericConfig.toleranceType === 'percentage' ? '%' : (numericConfig.unit ? ` ${numericConfig.unit}` : '')}
          {' '}receive partial credit.
        </p>
      )}

      {feedback && (
        <p className="text-sm text-muted-foreground">{feedback}</p>
      )}

      {explanation && (
        <p className="text-sm text-muted-foreground pt-3 border-t">
          <strong>Explanation:</strong> {explanation}
        </p>
      )}
    </div>
  );
}
