"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import type { QuestionRendererProps, ResultRendererProps } from "./types";
import type { TextInputConfig, TextInputAnswer, TextInputUserAnswer } from "@/lib/types/quiz";

export function TextInputRenderer({
  config,
  userAnswer,
  onAnswer,
  disabled,
  showResult,
  isCorrect,
  feedback,
}: QuestionRendererProps) {
  const { t } = useLocale();
  const textConfig = config as TextInputConfig;
  const currentValue = typeof userAnswer === 'string'
    ? userAnswer
    : (userAnswer as TextInputUserAnswer)?.text || '';

  const [inputValue, setInputValue] = useState(currentValue);

  useEffect(() => {
    setInputValue(currentValue);
  }, [currentValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onAnswer({ text: value });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleChange}
          disabled={disabled}
          placeholder={textConfig.placeholder || t("quizRenderer.typeAnswer")}
          maxLength={textConfig.maxLength}
          className={cn(
            "text-lg py-6",
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
      {textConfig.maxLength && (
        <p className="text-xs text-muted-foreground text-right">
          {inputValue.length} / {textConfig.maxLength}
        </p>
      )}
      {showResult && feedback && (
        <div className={cn(
          "p-3 rounded-lg text-sm flex items-start gap-2",
          isCorrect ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700"
        )}>
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}

export function TextInputResultRenderer({
  config,
  correctAnswerData,
  userAnswer,
  isCorrect,
  creditPercent,
  feedback,
  explanation,
}: ResultRendererProps) {
  const { t } = useLocale();
  const textConfig = config as TextInputConfig;
  const correctAnswer = correctAnswerData as TextInputAnswer;

  const userText = typeof userAnswer === 'string'
    ? userAnswer
    : (userAnswer as TextInputUserAnswer)?.text || '';

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className={cn(
          "p-3 rounded-lg",
          isCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">{t("quizRenderer.yourAnswer")}</span>
            {creditPercent > 0 && creditPercent < 100 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                {t("quizRenderer.credit", { percent: creditPercent.toFixed(0) })}
              </Badge>
            )}
          </div>
          <p className="font-medium">{userText || <em className="text-muted-foreground">{t("quizRenderer.noAnswer")}</em>}</p>
        </div>

        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="text-sm text-muted-foreground block mb-1">{t("quizRenderer.acceptedAnswers")}</span>
          <div className="flex flex-wrap gap-2">
            {correctAnswer.acceptedAnswers.map((answer, index) => (
              <Badge key={index} variant="secondary" className="bg-green-500/20">
                {answer}
              </Badge>
            ))}
          </div>
        </div>

        {correctAnswer.keywords && correctAnswer.keywords.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground block mb-1">{t("quizRenderer.keyConcepts")}</span>
            <div className="flex flex-wrap gap-2">
              {correctAnswer.keywords.map((keyword, index) => {
                const isMatched = !textConfig.caseSensitive
                  ? userText.toLowerCase().includes(keyword.toLowerCase())
                  : userText.includes(keyword);
                return (
                  <Badge
                    key={index}
                    variant="outline"
                    className={cn(
                      isMatched && "bg-green-500/20 border-green-500/50"
                    )}
                  >
                    {isMatched && <Check className="h-3 w-3 mr-1" />}
                    {keyword}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
