"use client";

import { useState } from "react";
import type { StepRendererProps } from "./types";
import type { RevealContent } from "@/lib/types/lesson";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";

export function RevealRenderer({ step }: StepRendererProps) {
  const content = step.content as RevealContent;
  const [revealedCount, setRevealedCount] = useState(0);

  const revealNext = () => {
    if (revealedCount < content.steps.length) {
      setRevealedCount(revealedCount + 1);
    }
  };

  return (
    <div className="space-y-4">
      {content.title && <h3 className="text-lg font-medium">{content.title}</h3>}
      <div className="space-y-3">
        {content.steps.map((revealStep, i) => (
          <div
            key={revealStep.id}
            className={cn(
              "transition-all duration-500",
              i < revealedCount
                ? "opacity-100 max-h-96 translate-y-0"
                : "opacity-0 max-h-0 overflow-hidden -translate-y-2"
            )}
          >
            <div className="p-4 bg-muted/50 rounded-lg border prose-custom">
              <MarkdownRenderer content={revealStep.content} />
            </div>
          </div>
        ))}
      </div>
      {revealedCount < content.steps.length && (
        <Button onClick={revealNext} variant="outline" className="gap-2">
          <Eye className="h-4 w-4" />
          Reveal Next ({revealedCount + 1}/{content.steps.length})
        </Button>
      )}
      {revealedCount === content.steps.length && content.steps.length > 0 && (
        <p className="text-sm text-muted-foreground">All content revealed.</p>
      )}
    </div>
  );
}
