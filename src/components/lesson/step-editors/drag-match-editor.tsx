"use client";

import type { StepEditorProps } from "./types";
import type { DragMatchContent, DragMatchAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export function DragMatchEditor({ content, answerData, onChange }: StepEditorProps) {
  const c = content as DragMatchContent;

  const updatePairs = (pairs: DragMatchContent["pairs"]) => {
    const correctPairs: Record<string, string> = {};
    pairs.forEach((p) => { correctPairs[p.id] = p.right; });
    onChange({ ...c, pairs }, { correctPairs } as DragMatchAnswerData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Instruction</Label>
        <Input
          value={c.instruction}
          onChange={(e) => onChange({ ...c, instruction: e.target.value }, answerData)}
          placeholder="Match the items..."
          className="mt-1.5"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Pairs</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = String(c.pairs.length + 1);
              updatePairs([...c.pairs, { id, left: "", right: "" }]);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Pair
          </Button>
        </div>
        {c.pairs.map((pair, i) => (
          <div key={pair.id} className="flex items-center gap-2 mb-2">
            <Input
              value={pair.left}
              onChange={(e) => {
                const pairs = [...c.pairs];
                pairs[i] = { ...pairs[i], left: e.target.value };
                updatePairs(pairs);
              }}
              placeholder="Left item"
              className="flex-1"
            />
            <span className="text-muted-foreground">&rarr;</span>
            <Input
              value={pair.right}
              onChange={(e) => {
                const pairs = [...c.pairs];
                pairs[i] = { ...pairs[i], right: e.target.value };
                updatePairs(pairs);
              }}
              placeholder="Right item"
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updatePairs(c.pairs.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
