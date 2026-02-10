"use client";

import { useState } from "react";
import type { StepRendererProps } from "./types";
import type { DragMatchContent, DragMatchAnswerData, DragMatchUserAnswer } from "@/lib/types/lesson";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export function DragMatchRenderer({
  step,
  onAnswer,
  userAnswer,
  isChecked,
  disabled,
}: StepRendererProps) {
  const content = step.content as DragMatchContent;
  const answerData = step.answerData as DragMatchAnswerData;
  const currentPairs = (userAnswer as DragMatchUserAnswer)?.pairs || {};
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const rightItems = content.pairs.map((p) => p.right);
  const usedRight = new Set(Object.values(currentPairs));

  const handleLeftClick = (id: string) => {
    if (disabled) return;
    setSelectedLeft(selectedLeft === id ? null : id);
  };

  const handleRightClick = (rightText: string) => {
    if (disabled || !selectedLeft) return;
    const newPairs = { ...currentPairs, [selectedLeft]: rightText };
    onAnswer({ pairs: newPairs });
    setSelectedLeft(null);
  };

  const clearPair = (leftId: string) => {
    if (disabled) return;
    const newPairs = { ...currentPairs };
    delete newPairs[leftId];
    onAnswer({ pairs: newPairs });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{content.instruction}</h3>
      <p className="text-sm text-muted-foreground">Tap a left item, then tap a right item to match.</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {content.pairs.map((pair) => {
            const matched = currentPairs[pair.id];
            const isCorrectMatch = isChecked && answerData?.correctPairs[pair.id] === matched;
            const isWrongMatch = isChecked && matched && answerData?.correctPairs[pair.id] !== matched;

            return (
              <div key={pair.id} className="space-y-1">
                <button
                  onClick={() => matched ? clearPair(pair.id) : handleLeftClick(pair.id)}
                  disabled={disabled}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all text-sm",
                    !isChecked && selectedLeft === pair.id && "border-primary bg-primary/5",
                    !isChecked && matched && "border-primary/30 bg-primary/5",
                    !isChecked && !matched && selectedLeft !== pair.id && "border-border",
                    isCorrectMatch && "border-green-500 bg-green-500/10",
                    isWrongMatch && "border-red-500 bg-red-500/10",
                    disabled && "cursor-default"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1">{pair.left}</span>
                    {isCorrectMatch && <Check className="h-3.5 w-3.5 text-green-500" />}
                    {isWrongMatch && <X className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                </button>
                {matched && !isChecked && (
                  <div className="text-xs text-primary ml-2">→ {matched}</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          {rightItems.map((right, i) => {
            const isUsed = usedRight.has(right);
            return (
              <button
                key={i}
                onClick={() => handleRightClick(right)}
                disabled={disabled || isUsed || !selectedLeft}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all text-sm",
                  !isUsed && selectedLeft && "border-border hover:border-primary/50 cursor-pointer",
                  !isUsed && !selectedLeft && "border-border",
                  isUsed && "border-border opacity-40",
                  disabled && "cursor-default"
                )}
              >
                {right}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
