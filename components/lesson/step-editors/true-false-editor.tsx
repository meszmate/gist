"use client";

import type { StepEditorProps } from "./types";
import type { TrueFalseContent, TrueFalseAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function TrueFalseEditor({ content, answerData, onChange }: StepEditorProps) {
  const c = content as TrueFalseContent;
  const ad = (answerData as TrueFalseAnswerData) || { correctValue: true };

  return (
    <div className="space-y-4">
      <div>
        <Label>Statement</Label>
        <Textarea
          value={c.statement}
          onChange={(e) => onChange({ ...c, statement: e.target.value }, ad)}
          placeholder="Enter a statement..."
          rows={3}
          className="mt-1.5"
        />
      </div>
      <div className="flex items-center gap-3">
        <Label>Correct Answer: {ad.correctValue ? "True" : "False"}</Label>
        <Switch
          checked={ad.correctValue}
          onCheckedChange={(checked) => onChange(c, { correctValue: checked })}
        />
      </div>
      <div>
        <Label>Explanation when True</Label>
        <Input
          value={c.trueExplanation || ""}
          onChange={(e) => onChange({ ...c, trueExplanation: e.target.value }, ad)}
          placeholder="Why this is true..."
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>Explanation when False</Label>
        <Input
          value={c.falseExplanation || ""}
          onChange={(e) => onChange({ ...c, falseExplanation: e.target.value }, ad)}
          placeholder="Why this is false..."
          className="mt-1.5"
        />
      </div>
    </div>
  );
}
