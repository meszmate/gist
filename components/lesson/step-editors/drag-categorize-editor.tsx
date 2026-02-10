"use client";

import type { StepEditorProps } from "./types";
import type { DragCategorizeContent, DragCategorizeAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export function DragCategorizeEditor({ content, answerData, onChange }: StepEditorProps) {
  const c = content as DragCategorizeContent;

  const rebuildAnswer = (items: DragCategorizeContent["items"]) => {
    const mapping: Record<string, string> = {};
    items.forEach((i) => { mapping[i.id] = i.categoryId; });
    return { correctMapping: mapping } as DragCategorizeAnswerData;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Instruction</Label>
        <Input
          value={c.instruction}
          onChange={(e) => onChange({ ...c, instruction: e.target.value }, answerData)}
          placeholder="Sort these items into categories..."
          className="mt-1.5"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Categories</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = `cat${c.categories.length + 1}`;
              onChange({ ...c, categories: [...c.categories, { id, name: "" }] }, answerData);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Category
          </Button>
        </div>
        {c.categories.map((cat, i) => (
          <div key={cat.id} className="flex items-center gap-2 mb-2">
            <Input
              value={cat.name}
              onChange={(e) => {
                const cats = [...c.categories];
                cats[i] = { ...cats[i], name: e.target.value };
                onChange({ ...c, categories: cats }, answerData);
              }}
              placeholder={`Category ${i + 1}`}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const cats = c.categories.filter((_, j) => j !== i);
                onChange({ ...c, categories: cats }, answerData);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Items</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = String(c.items.length + 1);
              const catId = c.categories[0]?.id || "";
              const items = [...c.items, { id, text: "", categoryId: catId }];
              onChange({ ...c, items }, rebuildAnswer(items));
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Item
          </Button>
        </div>
        {c.items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            <Input
              value={item.text}
              onChange={(e) => {
                const items = [...c.items];
                items[i] = { ...items[i], text: e.target.value };
                onChange({ ...c, items }, rebuildAnswer(items));
              }}
              placeholder={`Item ${i + 1}`}
              className="flex-1"
            />
            <Select
              value={item.categoryId}
              onValueChange={(v) => {
                const items = [...c.items];
                items[i] = { ...items[i], categoryId: v };
                onChange({ ...c, items }, rebuildAnswer(items));
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {c.categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name || cat.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const items = c.items.filter((_, j) => j !== i);
                onChange({ ...c, items }, rebuildAnswer(items));
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
