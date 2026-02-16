"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/hooks/use-locale";
import type { QuestionRendererProps, ResultRendererProps } from "./types";
import type { MatchingConfig, MatchingAnswer, MatchingUserAnswer } from "@/lib/types/quiz";

const EMPTY_MATCHING_CONFIG: MatchingConfig = {
  leftColumn: [],
  rightColumn: [],
};

function shuffleArray<T>(array: T[], seed?: number): T[] {
  const shuffled = [...array];
  let currentSeed = seed || Date.now();
  for (let i = shuffled.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const j = Math.floor((currentSeed / 233280) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function MatchingRenderer({
  questionId,
  config,
  userAnswer,
  onAnswer,
  disabled,
  showResult,
  correctAnswerData,
}: QuestionRendererProps) {
  const { t } = useLocale();
  const matchingConfig =
    (config as MatchingConfig | null | undefined) ?? EMPTY_MATCHING_CONFIG;
  const derivedPairs = useMemo(() => {
    const rawConfig = matchingConfig as unknown as Record<string, unknown>;
    const rawPairs = Array.isArray(rawConfig.pairs) ? rawConfig.pairs : [];
    return rawPairs
      .map((pair) => {
        const rawPair = (pair || {}) as Record<string, unknown>;
        const left = String(rawPair.left ?? rawPair.term ?? rawPair.prompt ?? "").trim();
        const right = String(rawPair.right ?? rawPair.match ?? rawPair.definition ?? "").trim();
        return { left, right };
      })
      .filter((pair) => pair.left.length > 0 && pair.right.length > 0);
  }, [matchingConfig]);

  const leftColumn = matchingConfig.leftColumn?.length
    ? matchingConfig.leftColumn
    : derivedPairs.map((pair) => pair.left);
  const rightColumn = useMemo(() => {
    if (matchingConfig.rightColumn?.length) return matchingConfig.rightColumn;
    return derivedPairs.map((pair) => pair.right);
  }, [matchingConfig.rightColumn, derivedPairs]);

  // Shuffle right column options if enabled
  const shuffledRight = useMemo(() => {
    if (matchingConfig.shuffleRight !== false) {
      // Use questionId as seed for consistent shuffling
      const seed = questionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return shuffleArray(rightColumn, seed);
    }
    return rightColumn;
  }, [rightColumn, matchingConfig.shuffleRight, questionId]);

  const currentPairs = (userAnswer as MatchingUserAnswer)?.pairs || {};
  const correctPairs = (correctAnswerData as MatchingAnswer)?.correctPairs || {};

  const currentPairsKey = JSON.stringify(currentPairs);
  const [prevPairsKey, setPrevPairsKey] = useState(currentPairsKey);
  const [pairs, setPairs] = useState<Record<string, string>>(currentPairs);

  if (currentPairsKey !== prevPairsKey) {
    setPrevPairsKey(currentPairsKey);
    setPairs(currentPairs);
  }

  const handleMatch = (leftItem: string, rightItem: string) => {
    if (disabled) return;

    const newPairs = { ...pairs, [leftItem]: rightItem };
    setPairs(newPairs);
    onAnswer({ pairs: newPairs });
  };

  return (
    <div className="space-y-4">
      {matchingConfig.leftColumnLabel && matchingConfig.rightColumnLabel && (
        <div className="grid grid-cols-1 gap-2 text-sm font-medium text-muted-foreground sm:grid-cols-2 sm:gap-4">
          <div>{matchingConfig.leftColumnLabel}</div>
          <div>{matchingConfig.rightColumnLabel}</div>
        </div>
      )}

      <div className="space-y-3">
        {leftColumn.map((leftItem, index) => {
          const selectedRight = pairs[leftItem];
          const isCorrect = showResult && selectedRight === correctPairs[leftItem];
          const isWrong = showResult && selectedRight && selectedRight !== correctPairs[leftItem];

          return (
            <div
              key={index}
              className={cn(
                "grid grid-cols-1 gap-3 items-center rounded-lg border p-3 sm:grid-cols-2 sm:gap-4",
                showResult && isCorrect && "border-green-500 bg-green-500/10",
                showResult && isWrong && "border-red-500 bg-red-500/10",
                !showResult && "border-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{leftItem}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select
                  value={selectedRight || ""}
                  onValueChange={(value) => handleMatch(leftItem, value)}
                  disabled={disabled}
                >
                  <SelectTrigger className={cn(
                    "flex-1",
                    showResult && isCorrect && "border-green-500",
                    showResult && isWrong && "border-red-500"
                  )}>
                    <SelectValue placeholder={t("quizRenderer.selectMatch")} />
                  </SelectTrigger>
                  <SelectContent>
                    {shuffledRight.map((rightItem, rIndex) => (
                      <SelectItem key={rIndex} value={rightItem}>
                        {rightItem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showResult && isCorrect && <Check className="h-5 w-5 text-green-500 shrink-0" />}
                {showResult && isWrong && <X className="h-5 w-5 text-red-500 shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>

      {showResult && (
        <div className="text-sm text-muted-foreground">
          {t("quizRenderer.correctOf", { count: Object.entries(pairs).filter(([left, right]) => right === correctPairs[left]).length, total: leftColumn.length })}
        </div>
      )}
    </div>
  );
}

export function MatchingResultRenderer({
  config,
  correctAnswerData,
  userAnswer,
  creditPercent,
  explanation,
}: ResultRendererProps) {
  const { t } = useLocale();
  const matchingConfig =
    (config as MatchingConfig | null | undefined) ?? EMPTY_MATCHING_CONFIG;
  const derivedPairs = useMemo(() => {
    const rawConfig = matchingConfig as unknown as Record<string, unknown>;
    const rawPairs = Array.isArray(rawConfig.pairs) ? rawConfig.pairs : [];
    return rawPairs
      .map((pair) => {
        const rawPair = (pair || {}) as Record<string, unknown>;
        const left = String(rawPair.left ?? rawPair.term ?? rawPair.prompt ?? "").trim();
        return left;
      })
      .filter((left) => left.length > 0);
  }, [matchingConfig]);
  const leftColumn = matchingConfig.leftColumn?.length
    ? matchingConfig.leftColumn
    : derivedPairs;
  const correctPairs = (correctAnswerData as MatchingAnswer)?.correctPairs || {};
  const userPairs = (userAnswer as MatchingUserAnswer)?.pairs || {};

  return (
    <div className="space-y-4">
      {matchingConfig.leftColumnLabel && matchingConfig.rightColumnLabel && (
        <div className="grid grid-cols-1 gap-2 text-sm font-medium text-muted-foreground sm:grid-cols-3 sm:gap-4">
          <div>{matchingConfig.leftColumnLabel}</div>
          <div>{t("quizRenderer.yourMatch")}</div>
          <div>{t("quizRenderer.correctMatch")}</div>
        </div>
      )}

      <div className="space-y-2">
        {leftColumn.map((leftItem, index) => {
          const userMatch = userPairs[leftItem];
          const correctMatch = correctPairs[leftItem];
          const isCorrect = userMatch === correctMatch;

          return (
            <div
              key={index}
              className={cn(
                "grid grid-cols-1 gap-3 items-center rounded-lg border p-3 sm:grid-cols-3 sm:gap-4",
                isCorrect ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
              )}
            >
              <div className="font-medium">{leftItem}</div>
              <div className="flex items-center gap-2">
                {userMatch ? (
                  <>
                    <span className={isCorrect ? "text-green-700" : "text-red-700"}>{userMatch}</span>
                    {isCorrect ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </>
                ) : (
                  <em className="text-muted-foreground">{t("quizRenderer.notMatched")}</em>
                )}
              </div>
              <div className="text-green-700">
                {correctMatch}
              </div>
            </div>
          );
        })}
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
