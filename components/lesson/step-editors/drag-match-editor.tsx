"use client";

import type { StepEditorProps } from "./types";
import type { DragMatchContent, DragMatchAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export function DragMatchEditor({ content, answerData, onChange }: StepEditorProps) {
  const { t } = useLocale();
  const c =
    (content as DragMatchContent) ??
    ({ type: "drag_match", instruction: "", pairs: [] } as DragMatchContent);
  const instruction = typeof c.instruction === "string" ? c.instruction : "";
  const pairs = Array.isArray(c.pairs) ? c.pairs : [];

  const updatePairs = (pairs: DragMatchContent["pairs"]) => {
    const correctPairs: Record<string, string> = {};
    pairs.forEach((p) => { correctPairs[p.id] = p.right; });
    onChange(
      { ...c, type: "drag_match", instruction, pairs },
      { correctPairs } as DragMatchAnswerData
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("stepEditor.instruction")}</Label>
        <Input
          value={instruction}
          onChange={(e) =>
            onChange({ ...c, type: "drag_match", instruction: e.target.value }, answerData)
          }
          placeholder={t("stepEditor.matchItemsPlaceholder")}
          className="mt-1.5"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>{t("stepEditor.pairs")}</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = String(pairs.length + 1);
              updatePairs([...pairs, { id, left: "", right: "" }]);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("stepEditor.addPair")}
          </Button>
        </div>
        {pairs.map((pair, i) => (
          <div key={pair.id} className="flex items-center gap-2 mb-2">
            <Input
              value={pair.left}
              onChange={(e) => {
                const nextPairs = [...pairs];
                nextPairs[i] = { ...nextPairs[i], left: e.target.value };
                updatePairs(nextPairs);
              }}
              placeholder={t("stepEditor.leftItem")}
              className="flex-1"
            />
            <span className="text-muted-foreground">&rarr;</span>
            <Input
              value={pair.right}
              onChange={(e) => {
                const nextPairs = [...pairs];
                nextPairs[i] = { ...nextPairs[i], right: e.target.value };
                updatePairs(nextPairs);
              }}
              placeholder={t("stepEditor.rightItem")}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updatePairs(pairs.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
