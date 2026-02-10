"use client";

import { useState } from "react";
import type { StepRendererProps } from "./types";
import type { ExplanationContent } from "@/lib/types/lesson";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExplanationRenderer({ step }: StepRendererProps) {
  const content = step.content as ExplanationContent;
  const [revealedSections, setRevealedSections] = useState<Set<number>>(new Set());

  const toggleSection = (index: number) => {
    setRevealedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="prose-custom">
        <MarkdownRenderer content={content.markdown} />
      </div>
      {content.revealSections?.map((section, i) => (
        <div key={i} className="border rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-3 h-auto font-medium"
            onClick={() => toggleSection(i)}
          >
            {section.label}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                revealedSections.has(i) && "rotate-180"
              )}
            />
          </Button>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300",
              revealedSections.has(i) ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="px-4 pb-4 prose-custom">
              <MarkdownRenderer content={section.content} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
