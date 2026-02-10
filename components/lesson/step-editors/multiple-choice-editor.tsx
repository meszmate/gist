"use client";

import type { StepEditorProps } from "./types";
import type { MultipleChoiceContent, MultipleChoiceAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2 } from "lucide-react";

export function MultipleChoiceEditor({ content, answerData, onChange }: StepEditorProps) {
  const c = content as MultipleChoiceContent;
  const ad = (answerData as MultipleChoiceAnswerData) || { correctOptionId: "a" };

  const updateContent = (patch: Partial<MultipleChoiceContent>) => {
    onChange({ ...c, ...patch }, ad);
  };

  const updateAnswer = (correctOptionId: string) => {
    onChange(c, { correctOptionId });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Question</Label>
        <Input
          value={c.question}
          onChange={(e) => updateContent({ question: e.target.value })}
          placeholder="Enter your question..."
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>Options</Label>
        <RadioGroup value={ad.correctOptionId} onValueChange={updateAnswer} className="mt-2">
          {c.options.map((option, i) => (
            <div key={option.id} className="flex items-center gap-2">
              <RadioGroupItem value={option.id} id={`opt-${option.id}`} />
              <Input
                value={option.text}
                onChange={(e) => {
                  const opts = [...c.options];
                  opts[i] = { ...opts[i], text: e.target.value };
                  updateContent({ options: opts });
                }}
                placeholder={`Option ${option.id.toUpperCase()}`}
                className="flex-1"
              />
              <Input
                value={option.explanation || ""}
                onChange={(e) => {
                  const opts = [...c.options];
                  opts[i] = { ...opts[i], explanation: e.target.value };
                  updateContent({ options: opts });
                }}
                placeholder="Explanation (optional)"
                className="w-48"
              />
              {c.options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const opts = c.options.filter((_, j) => j !== i);
                    updateContent({ options: opts });
                    if (ad.correctOptionId === option.id && opts.length > 0) {
                      updateAnswer(opts[0].id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </RadioGroup>
        {c.options.length < 6 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              const newId = String.fromCharCode(97 + c.options.length);
              updateContent({
                options: [...c.options, { id: newId, text: "" }],
              });
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Option
          </Button>
        )}
      </div>
    </div>
  );
}
