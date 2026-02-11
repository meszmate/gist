"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, Calendar } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import type { QuestionRendererProps, ResultRendererProps } from "./types";
import type { YearRangeConfig, YearRangeAnswer, YearRangeUserAnswer } from "@/lib/types/quiz";

export function YearRangeRenderer({
  config,
  userAnswer,
  onAnswer,
  disabled,
  showResult,
  isCorrect,
  feedback,
}: QuestionRendererProps) {
  const { t } = useLocale();
  const yearConfig = config as YearRangeConfig;

  const currentValue = typeof userAnswer === 'number'
    ? userAnswer
    : (userAnswer as YearRangeUserAnswer)?.year;

  const [prevCurrentValue, setPrevCurrentValue] = useState(currentValue);
  const [inputValue, setInputValue] = useState(currentValue?.toString() || '');

  if (currentValue !== prevCurrentValue) {
    setPrevCurrentValue(currentValue);
    setInputValue(currentValue?.toString() || '');
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      onAnswer({ year: numValue });
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>
        <Input
          type="number"
          value={inputValue}
          onChange={handleChange}
          disabled={disabled}
          placeholder={yearConfig.placeholder || t("quizRenderer.enterYear")}
          min={yearConfig.minYear}
          max={yearConfig.maxYear}
          className={cn(
            "text-lg py-6 pl-10",
            showResult && isCorrect && "border-green-500 bg-green-500/10",
            showResult && !isCorrect && "border-red-500 bg-red-500/10"
          )}
        />
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

      {yearConfig.minYear !== undefined && yearConfig.maxYear !== undefined && (
        <p className="text-xs text-muted-foreground">
          {t("quizRenderer.enterYearBetween", { min: yearConfig.minYear, max: yearConfig.maxYear })}
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

export function YearRangeResultRenderer({
  config,
  correctAnswerData,
  userAnswer,
  isCorrect,
  creditPercent,
  feedback,
  explanation,
}: ResultRendererProps) {
  const { t } = useLocale();
  const yearConfig = config as YearRangeConfig;
  const correctAnswer = correctAnswerData as YearRangeAnswer;

  const userYear = typeof userAnswer === 'number'
    ? userAnswer
    : (userAnswer as YearRangeUserAnswer)?.year;

  const difference = userYear !== undefined ? Math.abs(userYear - correctAnswer.correctYear) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className={cn(
          "p-4 rounded-lg",
          isCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
        )}>
          <span className="text-sm text-muted-foreground block mb-1">{t("quizRenderer.yourAnswer")}</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {userYear !== undefined ? userYear : <em className="text-base text-muted-foreground">{t("quizRenderer.noAnswer")}</em>}
            </span>
            {creditPercent > 0 && creditPercent < 100 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                {creditPercent.toFixed(0)}%
              </Badge>
            )}
          </div>
          {difference !== null && difference > 0 && (
            <span className="text-sm text-muted-foreground">
              {t("quizRenderer.offByYears", { diff: difference })}
            </span>
          )}
        </div>

        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="text-sm text-muted-foreground block mb-1">{t("quizRenderer.correctAnswer")}</span>
          <span className="text-2xl font-bold text-green-700">{correctAnswer.correctYear}</span>
        </div>
      </div>

      {yearConfig.tolerance && yearConfig.tolerance > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("quizRenderer.partialCreditYears", { range: yearConfig.tolerance })}
        </p>
      )}

      {feedback && (
        <p className="text-sm text-muted-foreground">{feedback}</p>
      )}

      {explanation && (
        <p className="text-sm text-muted-foreground pt-3 border-t">
          <strong>{t("quizRenderer.explanation")}</strong> {explanation}
        </p>
      )}
    </div>
  );
}
