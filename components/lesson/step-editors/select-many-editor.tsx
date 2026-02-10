"use client";

import type { StepEditorProps } from "./types";
import type { SelectManyContent, SelectManyAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

export function SelectManyEditor({ content, answerData, onChange }: StepEditorProps) {
  const c = content as SelectManyContent;
  const ad = (answerData as SelectManyAnswerData) || { correctOptionIds: [] };

  const toggleCorrect = (id: string) => {
    const newCorrect = ad.correctOptionIds.includes(id)
      ? ad.correctOptionIds.filter((i) => i !== id)
      : [...ad.correctOptionIds, id];
    onChange(c, { correctOptionIds: newCorrect });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Question</Label>
        <Input
          value={c.question}
          onChange={(e) => onChange({ ...c, question: e.target.value }, ad)}
          placeholder="Select all that apply..."
          className="mt-1.5"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Options (check correct answers)</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = String.fromCharCode(97 + c.options.length);
              onChange({ ...c, options: [...c.options, { id, text: "" }] }, ad);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Option
          </Button>
        </div>
        {c.options.map((option, i) => (
          <div key={option.id} className="flex items-center gap-2 mb-2">
            <Checkbox
              checked={ad.correctOptionIds.includes(option.id)}
              onCheckedChange={() => toggleCorrect(option.id)}
            />
            <Input
              value={option.text}
              onChange={(e) => {
                const opts = [...c.options];
                opts[i] = { ...opts[i], text: e.target.value };
                onChange({ ...c, options: opts }, ad);
              }}
              placeholder={`Option ${option.id.toUpperCase()}`}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const opts = c.options.filter((_, j) => j !== i);
                const newCorrect = ad.correctOptionIds.filter((id) => id !== option.id);
                onChange({ ...c, options: opts }, { correctOptionIds: newCorrect });
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
