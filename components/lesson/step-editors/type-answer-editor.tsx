"use client";

import type { StepEditorProps } from "./types";
import type { TypeAnswerContent, TypeAnswerAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function TypeAnswerEditor({ content, answerData, onChange }: StepEditorProps) {
  const c = content as TypeAnswerContent;
  const ad = (answerData as TypeAnswerAnswerData) || { acceptedAnswers: [] };

  return (
    <div className="space-y-4">
      <div>
        <Label>Question</Label>
        <Input
          value={c.question}
          onChange={(e) => onChange({ ...c, question: e.target.value }, ad)}
          placeholder="Enter your question..."
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>Accepted Answers</Label>
        <Input
          value={ad.acceptedAnswers.join(", ")}
          onChange={(e) =>
            onChange(c, {
              acceptedAnswers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder="Comma-separated accepted answers"
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Enter all accepted answers, separated by commas.
        </p>
      </div>
      <div>
        <Label>Placeholder</Label>
        <Input
          value={c.placeholder || ""}
          onChange={(e) => onChange({ ...c, placeholder: e.target.value }, ad)}
          placeholder="Input placeholder text"
          className="mt-1.5"
        />
      </div>
      <div className="flex items-center gap-3">
        <Label>Case sensitive</Label>
        <Switch
          checked={c.caseSensitive || false}
          onCheckedChange={(checked) => onChange({ ...c, caseSensitive: checked }, ad)}
        />
      </div>
    </div>
  );
}
