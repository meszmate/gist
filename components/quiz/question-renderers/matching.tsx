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
import type { QuestionRendererProps, ResultRendererProps } from "./types";
import type { MatchingConfig, MatchingAnswer, MatchingUserAnswer } from "@/lib/types/quiz";

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
  const matchingConfig = config as MatchingConfig;
  const leftColumn = matchingConfig.leftColumn || [];
  const rightColumn = useMemo(() => matchingConfig.rightColumn || [], [matchingConfig.rightColumn]);

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
        <div className="grid grid-cols-2 gap-4 text-sm font-medium text-muted-foreground">
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
                "grid grid-cols-2 gap-4 items-center p-3 rounded-lg border",
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
                    <SelectValue placeholder="Select match..." />
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
          {Object.entries(pairs).filter(([left, right]) => right === correctPairs[left]).length} of {leftColumn.length} correct
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
  const matchingConfig = config as MatchingConfig;
  const leftColumn = matchingConfig.leftColumn || [];
  const correctPairs = (correctAnswerData as MatchingAnswer)?.correctPairs || {};
  const userPairs = (userAnswer as MatchingUserAnswer)?.pairs || {};

  return (
    <div className="space-y-4">
      {matchingConfig.leftColumnLabel && matchingConfig.rightColumnLabel && (
        <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
          <div>{matchingConfig.leftColumnLabel}</div>
          <div>Your Match</div>
          <div>Correct Match</div>
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
                "grid grid-cols-3 gap-4 items-center p-3 rounded-lg border",
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
                  <em className="text-muted-foreground">Not matched</em>
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
        <span className="text-sm text-muted-foreground">Score:</span>
        <Badge variant={creditPercent === 100 ? "default" : "secondary"}>
          {creditPercent.toFixed(0)}%
        </Badge>
      </div>

      {explanation && (
        <p className="text-sm text-muted-foreground pt-3 border-t">
          <strong>Explanation:</strong> {explanation}
        </p>
      )}
    </div>
  );
}
