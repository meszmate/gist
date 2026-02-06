"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X } from "lucide-react";
import type { QuestionRendererProps, ResultRendererProps } from "./types";
import type { MultiSelectConfig, MultiSelectAnswer, MultiSelectUserAnswer } from "@/lib/types/quiz";

export function MultiSelectRenderer({
  config,
  userAnswer,
  onAnswer,
  disabled,
  showResult,
  correctAnswerData,
}: QuestionRendererProps) {
  const msConfig = config as MultiSelectConfig;
  const options = msConfig.options || [];

  const currentSelected = (userAnswer as MultiSelectUserAnswer)?.selectedIndices || [];
  const [selected, setSelected] = useState<number[]>(currentSelected);

  const correctIndices = showResult
    ? new Set((correctAnswerData as MultiSelectAnswer)?.correctIndices || [])
    : new Set<number>();

  useEffect(() => {
    setSelected(currentSelected);
  }, [JSON.stringify(currentSelected)]);

  const handleToggle = (index: number) => {
    if (disabled) return;

    let newSelected: number[];
    if (selected.includes(index)) {
      newSelected = selected.filter(i => i !== index);
    } else {
      // Check max selections
      if (msConfig.maxSelections && selected.length >= msConfig.maxSelections) {
        return;
      }
      newSelected = [...selected, index];
    }

    setSelected(newSelected);
    onAnswer({ selectedIndices: newSelected });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select all that apply
        {msConfig.minSelections && ` (minimum ${msConfig.minSelections})`}
        {msConfig.maxSelections && ` (maximum ${msConfig.maxSelections})`}
      </p>

      {options.map((option, index) => {
        const isSelected = selected.includes(index);
        const isCorrectOption = correctIndices.has(index);
        const isWrongSelection = showResult && isSelected && !isCorrectOption;
        const isMissedCorrect = showResult && !isSelected && isCorrectOption;

        return (
          <button
            key={index}
            onClick={() => handleToggle(index)}
            disabled={disabled}
            className={cn(
              "w-full text-left p-4 rounded-lg border-2 transition-all flex items-center gap-3",
              disabled ? "cursor-default" : "hover:bg-muted/50",
              !showResult && isSelected && "border-primary bg-primary/10",
              !showResult && !isSelected && "border-muted",
              showResult && isCorrectOption && isSelected && "border-green-500 bg-green-500/10",
              showResult && isWrongSelection && "border-red-500 bg-red-500/10",
              showResult && isMissedCorrect && "border-amber-500 bg-amber-500/10",
              showResult && !isCorrectOption && !isSelected && "border-muted bg-muted/30"
            )}
          >
            <Checkbox
              checked={isSelected}
              disabled={disabled}
              className={cn(
                showResult && isCorrectOption && isSelected && "border-green-500 data-[state=checked]:bg-green-500",
                showResult && isWrongSelection && "border-red-500 data-[state=checked]:bg-red-500"
              )}
            />
            <span className="flex-1">{option}</span>
            {showResult && isCorrectOption && isSelected && (
              <Badge className="bg-green-500">Correct</Badge>
            )}
            {showResult && isWrongSelection && (
              <Badge variant="destructive">Wrong</Badge>
            )}
            {showResult && isMissedCorrect && (
              <Badge variant="outline" className="text-amber-600 border-amber-400">Missed</Badge>
            )}
          </button>
        );
      })}

      {showResult && (
        <div className="text-sm text-muted-foreground">
          {selected.filter(i => correctIndices.has(i)).length} of {correctIndices.size} correct options selected
        </div>
      )}
    </div>
  );
}

export function MultiSelectResultRenderer({
  config,
  correctAnswerData,
  userAnswer,
  creditPercent,
  feedback,
  explanation,
}: ResultRendererProps) {
  const msConfig = config as MultiSelectConfig;
  const options = msConfig.options || [];

  const selectedIndices = new Set((userAnswer as MultiSelectUserAnswer)?.selectedIndices || []);
  const correctIndices = new Set((correctAnswerData as MultiSelectAnswer)?.correctIndices || []);

  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const isSelected = selectedIndices.has(index);
        const isCorrectOption = correctIndices.has(index);
        const isWrongSelection = isSelected && !isCorrectOption;
        const isMissedCorrect = !isSelected && isCorrectOption;

        return (
          <div
            key={index}
            className={cn(
              "p-3 rounded-lg text-sm flex items-center gap-3",
              isCorrectOption && isSelected && "bg-green-500/10 border border-green-500/20",
              isWrongSelection && "bg-red-500/10 border border-red-500/20",
              isMissedCorrect && "bg-amber-500/10 border border-amber-500/20",
              !isCorrectOption && !isSelected && "bg-muted/50"
            )}
          >
            {isCorrectOption && isSelected && <Check className="h-4 w-4 text-green-500" />}
            {isWrongSelection && <X className="h-4 w-4 text-red-500" />}
            {isMissedCorrect && <span className="w-4 h-4 rounded border-2 border-amber-500" />}
            {!isCorrectOption && !isSelected && <span className="w-4" />}

            <span className="flex-1">{option}</span>

            {isCorrectOption && isSelected && (
              <Badge className="bg-green-500">Correct</Badge>
            )}
            {isWrongSelection && (
              <Badge variant="destructive">Wrong selection</Badge>
            )}
            {isMissedCorrect && (
              <Badge variant="outline" className="text-amber-600 border-amber-400">Should have selected</Badge>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-4 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Score:</span>
          <Badge variant={creditPercent === 100 ? "default" : "secondary"}>
            {creditPercent.toFixed(0)}%
          </Badge>
        </div>
        {feedback && (
          <span className="text-sm text-muted-foreground">{feedback}</span>
        )}
      </div>

      {explanation && (
        <p className="text-sm text-muted-foreground pt-3 border-t">
          <strong>Explanation:</strong> {explanation}
        </p>
      )}
    </div>
  );
}
