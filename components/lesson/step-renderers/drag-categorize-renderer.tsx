"use client";

import { useState } from "react";
import type { StepRendererProps } from "./types";
import type { DragCategorizeContent, DragCategorizeAnswerData, DragCategorizeUserAnswer } from "@/lib/types/lesson";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export function DragCategorizeRenderer({
  step,
  onAnswer,
  userAnswer,
  isChecked,
  disabled,
}: StepRendererProps) {
  const { t } = useLocale();
  const content = step.content as DragCategorizeContent;
  const answerData = step.answerData as DragCategorizeAnswerData;
  const currentMapping = (userAnswer as DragCategorizeUserAnswer)?.mapping || {};
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const unassignedItems = content.items.filter((item) => !currentMapping[item.id]);

  const handleItemClick = (itemId: string) => {
    if (disabled) return;
    setSelectedItem(selectedItem === itemId ? null : itemId);
  };

  const handleCategoryClick = (categoryId: string) => {
    if (disabled || !selectedItem) return;
    const newMapping = { ...currentMapping, [selectedItem]: categoryId };
    onAnswer({ mapping: newMapping });
    setSelectedItem(null);
  };

  const removeFromCategory = (itemId: string) => {
    if (disabled) return;
    const newMapping = { ...currentMapping };
    delete newMapping[itemId];
    onAnswer({ mapping: newMapping });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{content.instruction}</h3>
      <p className="text-sm text-muted-foreground">{t("stepRenderer.dragCategorize")}</p>

      {/* Unassigned items */}
      {unassignedItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unassignedItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              disabled={disabled}
              className={cn(
                "px-3 py-1.5 rounded-lg border-2 text-sm transition-all",
                selectedItem === item.id && "border-primary bg-primary/5",
                selectedItem !== item.id && "border-border hover:border-primary/30"
              )}
            >
              {item.text}
            </button>
          ))}
        </div>
      )}

      {/* Categories */}
      <div className={cn("grid grid-cols-1 gap-3", content.categories.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {content.categories.map((category) => {
          const itemsInCategory = content.items.filter((i) => currentMapping[i.id] === category.id);
          return (
            <div
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={cn(
                "rounded-xl border-2 border-dashed p-3 min-h-[120px] transition-all",
                selectedItem && "cursor-pointer hover:border-primary/50 hover:bg-accent/30",
                !selectedItem && "cursor-default",
                "border-border"
              )}
            >
              <div className="text-sm font-semibold mb-2 text-center">{category.name}</div>
              <div className="space-y-1.5">
                {itemsInCategory.map((item) => {
                  const correct = isChecked && answerData?.correctMapping[item.id] === category.id;
                  const wrong = isChecked && answerData?.correctMapping[item.id] !== category.id;
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCategory(item.id);
                      }}
                      className={cn(
                        "px-2 py-1 rounded text-xs border flex items-center gap-1",
                        !isChecked && "border-border cursor-pointer hover:bg-muted",
                        correct && "border-green-500 bg-green-500/10",
                        wrong && "border-red-500 bg-red-500/10",
                        disabled && "cursor-default"
                      )}
                    >
                      <span className="flex-1">{item.text}</span>
                      {correct && <Check className="h-3 w-3 text-green-500" />}
                      {wrong && <X className="h-3 w-3 text-red-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
