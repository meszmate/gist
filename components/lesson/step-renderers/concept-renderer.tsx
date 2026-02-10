"use client";

import type { StepRendererProps } from "./types";
import type { ConceptContent } from "@/lib/types/lesson";
import { cn } from "@/lib/utils";

const styleMap = {
  info: "border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10",
  warning: "border-yellow-500/30 bg-yellow-500/5 dark:bg-yellow-500/10",
  success: "border-green-500/30 bg-green-500/5 dark:bg-green-500/10",
  default: "border-border bg-muted/50",
};

const iconMap = {
  info: "text-blue-500",
  warning: "text-yellow-500",
  success: "text-green-500",
  default: "text-primary",
};

export function ConceptRenderer({ step }: StepRendererProps) {
  const content = step.content as ConceptContent;
  const style = content.highlightStyle || "default";

  return (
    <div className={cn("border-2 rounded-xl p-6 space-y-3", styleMap[style])}>
      <div className="flex items-center gap-2">
        <div className={cn("text-lg font-bold", iconMap[style])}>
          {style === "info" && "💡"}
          {style === "warning" && "⚠️"}
          {style === "success" && "✅"}
          {style === "default" && "📌"}
        </div>
        <h3 className="text-lg font-bold">{content.title}</h3>
      </div>
      <p className="text-muted-foreground leading-relaxed">{content.description}</p>
    </div>
  );
}
