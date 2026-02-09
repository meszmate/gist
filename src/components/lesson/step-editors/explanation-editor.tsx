"use client";

import type { StepEditorProps } from "./types";
import type { ExplanationContent } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export function ExplanationEditor({ content, answerData, onChange }: StepEditorProps) {
  const c = content as ExplanationContent;

  const update = (patch: Partial<ExplanationContent>) => {
    onChange({ ...c, ...patch }, answerData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Content (Markdown)</Label>
        <Textarea
          value={c.markdown}
          onChange={(e) => update({ markdown: e.target.value })}
          rows={8}
          placeholder="Write your explanation in markdown..."
          className="mt-1.5 font-mono text-sm"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Reveal Sections (optional)</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                revealSections: [
                  ...(c.revealSections || []),
                  { label: "", content: "" },
                ],
              })
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Section
          </Button>
        </div>
        {c.revealSections?.map((section, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <Input
              value={section.label}
              onChange={(e) => {
                const sections = [...(c.revealSections || [])];
                sections[i] = { ...sections[i], label: e.target.value };
                update({ revealSections: sections });
              }}
              placeholder="Section label"
              className="w-1/3"
            />
            <Textarea
              value={section.content}
              onChange={(e) => {
                const sections = [...(c.revealSections || [])];
                sections[i] = { ...sections[i], content: e.target.value };
                update({ revealSections: sections });
              }}
              placeholder="Section content (markdown)"
              rows={2}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const sections = (c.revealSections || []).filter((_, j) => j !== i);
                update({ revealSections: sections });
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
