"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import type { QuestionRendererProps, ResultRendererProps } from "./types";
import type { FillBlankConfig, FillBlankAnswer, FillBlankUserAnswer } from "@/lib/types/quiz";
import { parseFillBlankTemplate } from "@/lib/quiz/fill-blank-template";

export function FillBlankRenderer({
  config,
  userAnswer,
  onAnswer,
  disabled,
  showResult,
  correctAnswerData,
}: QuestionRendererProps) {
  const { t } = useLocale();
  const fillConfig =
    ((config as FillBlankConfig) ||
      ({ template: "", blanks: [] } as FillBlankConfig)) as FillBlankConfig;
  const template = fillConfig.template || '';
  const blanks = useMemo(() => fillConfig.blanks || [], [fillConfig.blanks]);
  const correctBlanks = (correctAnswerData as FillBlankAnswer)?.blanks || {};

  const parsedTemplate = useMemo(
    () => parseFillBlankTemplate(template, blanks),
    [template, blanks]
  );
  const templateBlankIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const part of parsedTemplate) {
      if (part.type !== "blank" || !part.blankId || seen.has(part.blankId)) {
        continue;
      }
      seen.add(part.blankId);
      ids.push(part.blankId);
    }
    return ids;
  }, [parsedTemplate]);

  const currentValues = (userAnswer as FillBlankUserAnswer)?.blanks || {};
  const currentValuesKey = JSON.stringify(currentValues);
  const [prevValuesKey, setPrevValuesKey] = useState(currentValuesKey);
  const [values, setValues] = useState<Record<string, string>>(currentValues);

  if (currentValuesKey !== prevValuesKey) {
    setPrevValuesKey(currentValuesKey);
    setValues(currentValues);
  }

  const handleChange = (blankId: string, value: string) => {
    if (disabled) return;

    const newValues = { ...values, [blankId]: value };
    setValues(newValues);
    onAnswer({ blanks: newValues });
  };

  const checkBlankCorrect = (blankId: string): boolean | null => {
    if (!showResult) return null;

    const userValue = values[blankId]?.trim() || '';
    const acceptedAnswers = correctBlanks[blankId] || [];

    const normalize = (str: string) => {
      let result = str.trim();
      if (!fillConfig.caseSensitive) {
        result = result.toLowerCase();
      }
      return result;
    };

    return acceptedAnswers.some(answer => normalize(answer) === normalize(userValue));
  };

  return (
    <div className="space-y-4">
      <div className="text-lg leading-relaxed flex flex-wrap items-center gap-1">
        {parsedTemplate.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index}>{part.content}</span>;
          }

          const blankId = part.blankId;
          if (!blankId) return <span key={index}>{part.content}</span>;
          const isCorrect = checkBlankCorrect(blankId);

          return (
            <span key={index} className="inline-flex items-center gap-1">
              <Input
                type="text"
                value={values[blankId] || ''}
                onChange={(e) => handleChange(blankId, e.target.value)}
                disabled={disabled}
                placeholder="..."
                className={cn(
                  "w-32 inline-flex h-8 text-center",
                  showResult && isCorrect === true && "border-green-500 bg-green-500/10",
                  showResult && isCorrect === false && "border-red-500 bg-red-500/10"
                )}
              />
              {showResult && isCorrect === true && (
                <Check className="h-4 w-4 text-green-500" />
              )}
              {showResult && isCorrect === false && (
                <X className="h-4 w-4 text-red-500" />
              )}
            </span>
          );
        })}
      </div>

      {showResult && (
        <div className="text-sm text-muted-foreground">
          {t("quizRenderer.blanksCorrect", {
            count: templateBlankIds.filter((id) => checkBlankCorrect(id)).length,
            total: templateBlankIds.length,
          })}
        </div>
      )}
    </div>
  );
}

export function FillBlankResultRenderer({
  config,
  correctAnswerData,
  userAnswer,
  creditPercent,
  explanation,
}: ResultRendererProps) {
  const { t } = useLocale();
  const fillConfig =
    ((config as FillBlankConfig) ||
      ({ template: "", blanks: [] } as FillBlankConfig)) as FillBlankConfig;
  const template = fillConfig.template || '';
  const blanks = useMemo(() => fillConfig.blanks || [], [fillConfig.blanks]);
  const correctBlanks = (correctAnswerData as FillBlankAnswer)?.blanks || {};
  const userBlanks = (userAnswer as FillBlankUserAnswer)?.blanks || {};

  const parsedTemplate = useMemo(
    () => parseFillBlankTemplate(template, blanks),
    [template, blanks]
  );
  const blankIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const part of parsedTemplate) {
      if (part.type !== "blank" || !part.blankId || seen.has(part.blankId)) {
        continue;
      }
      seen.add(part.blankId);
      ids.push(part.blankId);
    }
    if (ids.length > 0) return ids;
    return blanks.map((blank) => blank.id);
  }, [parsedTemplate, blanks]);

  const normalize = (str: string) => {
    let result = str.trim();
    if (!fillConfig.caseSensitive) {
      result = result.toLowerCase();
    }
    return result;
  };

  const checkBlankCorrect = (blankId: string): boolean => {
    const userValue = userBlanks[blankId]?.trim() || '';
    const acceptedAnswers = correctBlanks[blankId] || [];
    return acceptedAnswers.some(answer => normalize(answer) === normalize(userValue));
  };

  return (
    <div className="space-y-4">
      <div className="text-lg leading-relaxed">
        {parsedTemplate.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index}>{part.content}</span>;
          }

          const blankId = part.blankId;
          if (!blankId) return <span key={index}>{part.content}</span>;
          const userValue = userBlanks[blankId] || '';
          const isCorrect = checkBlankCorrect(blankId);
          const acceptedAnswers = correctBlanks[blankId] || [];

          return (
            <span
              key={index}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded mx-1",
                isCorrect ? "bg-green-500/20" : "bg-red-500/20"
              )}
            >
              <span className={cn(
                "font-medium",
                isCorrect ? "text-green-700" : "text-red-700 line-through"
              )}>
                {userValue || <em className="text-muted-foreground">blank</em>}
              </span>
              {!isCorrect && (
                <span className="text-green-700 font-medium">
                  ({acceptedAnswers[0]})
                </span>
              )}
              {isCorrect ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
            </span>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">{t("quizRenderer.acceptedForBlanks")}</div>
        <div className="grid gap-2">
          {blankIds.map((blankId, index) => (
            <div key={blankId} className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{t("quizRenderer.blank", { index: index + 1 })}</Badge>
              <div className="flex flex-wrap gap-1">
                {correctBlanks[blankId]?.map((answer, i) => (
                  <Badge key={i} variant="secondary" className="bg-green-500/20">
                    {answer}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("quizRenderer.score")}</span>
        <Badge variant={creditPercent === 100 ? "default" : "secondary"}>
          {creditPercent.toFixed(0)}%
        </Badge>
      </div>

      {explanation && (
        <p className="text-sm text-muted-foreground pt-3 border-t">
          <strong>{t("quizRenderer.explanation")}</strong> {explanation}
        </p>
      )}
    </div>
  );
}
