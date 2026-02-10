"use client";

import { useState, useCallback } from "react";
import type { StepRendererProps } from "./types";
import type { DragSortContent, DragSortAnswerData, DragSortUserAnswer } from "@/lib/types/lesson";
import { cn } from "@/lib/utils";
import { GripVertical, Check, X } from "lucide-react";

export function DragSortRenderer({
  step,
  onAnswer,
  userAnswer,
  isChecked,
  disabled,
}: StepRendererProps) {
  const content = step.content as DragSortContent;
  const answerData = step.answerData as DragSortAnswerData;
  const currentOrder = (userAnswer as DragSortUserAnswer)?.orderedIds || content.items.map((i) => i.id);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [tapSelected, setTapSelected] = useState<string | null>(null);

  const itemMap = new Map(content.items.map((i) => [i.id, i]));

  const moveItem = useCallback(
    (fromId: string, toId: string) => {
      const newOrder = [...currentOrder];
      const fromIdx = newOrder.indexOf(fromId);
      const toIdx = newOrder.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return;
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, fromId);
      onAnswer({ orderedIds: newOrder });
    },
    [currentOrder, onAnswer]
  );

  const handleTap = (id: string) => {
    if (disabled) return;
    if (tapSelected === null) {
      setTapSelected(id);
    } else if (tapSelected === id) {
      setTapSelected(null);
    } else {
      moveItem(tapSelected, id);
      setTapSelected(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{content.instruction}</h3>
      <p className="text-sm text-muted-foreground">Drag to reorder, or tap two items to swap.</p>
      <div className="space-y-2">
        {currentOrder.map((id, index) => {
          const item = itemMap.get(id);
          if (!item) return null;
          const correctIdx = answerData?.correctOrder.indexOf(id) ?? -1;
          const isInCorrectPosition = isChecked && correctIdx === index;
          const isInWrongPosition = isChecked && correctIdx !== index;

          return (
            <div
              key={id}
              draggable={!disabled}
              onDragStart={() => setDraggedId(id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedId && draggedId !== id) {
                  moveItem(draggedId, id);
                }
              }}
              onClick={() => handleTap(id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all select-none",
                !isChecked && "border-border hover:border-primary/30 cursor-grab active:cursor-grabbing",
                !isChecked && tapSelected === id && "border-primary bg-primary/5",
                !isChecked && draggedId === id && "opacity-50 scale-95",
                isInCorrectPosition && "border-green-500 bg-green-500/10",
                isInWrongPosition && "border-red-500 bg-red-500/10",
                disabled && "cursor-default"
              )}
            >
              {!disabled && <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />}
              <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
              <span className="flex-1">{item.text}</span>
              {isInCorrectPosition && <Check className="h-4 w-4 text-green-500 shrink-0" />}
              {isInWrongPosition && <X className="h-4 w-4 text-red-500 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
