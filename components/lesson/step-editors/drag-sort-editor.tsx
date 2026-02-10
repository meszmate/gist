"use client";

import type { StepEditorProps } from "./types";
import type { DragSortContent, DragSortAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export function DragSortEditor({ content, answerData, onChange }: StepEditorProps) {
  const c = content as DragSortContent;
  const ad = (answerData as DragSortAnswerData) || { correctOrder: [] };

  const updateItems = (items: DragSortContent["items"]) => {
    onChange(
      { ...c, items },
      { correctOrder: items.map((i) => i.id) }
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Instruction</Label>
        <Input
          value={c.instruction}
          onChange={(e) => onChange({ ...c, instruction: e.target.value }, ad)}
          placeholder="Put these items in order..."
          className="mt-1.5"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Items (in correct order)</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = String(c.items.length + 1);
              updateItems([...c.items, { id, text: "" }]);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Item
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Enter items in the CORRECT order. They will be shuffled for the student.
        </p>
        {c.items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
            <Input
              value={item.text}
              onChange={(e) => {
                const items = [...c.items];
                items[i] = { ...items[i], text: e.target.value };
                updateItems(items);
              }}
              placeholder={`Item ${i + 1}`}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateItems(c.items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
