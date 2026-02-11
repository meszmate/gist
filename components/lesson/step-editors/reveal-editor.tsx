"use client";

import type { StepEditorProps } from "./types";
import type { RevealContent } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export function RevealEditor({ content, answerData, onChange }: StepEditorProps) {
  const { t } = useLocale();
  const c = content as RevealContent;

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("stepEditor.titleOptional")}</Label>
        <Input
          value={c.title || ""}
          onChange={(e) => onChange({ ...c, title: e.target.value }, answerData)}
          placeholder={t("stepEditor.revealSectionTitlePlaceholder")}
          className="mt-1.5"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>{t("stepEditor.steps")}</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = String(c.steps.length + 1);
              onChange({ ...c, steps: [...c.steps, { id, content: "" }] }, answerData);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("stepEditor.addStep")}
          </Button>
        </div>
        {c.steps.map((revealStep, i) => (
          <div key={revealStep.id} className="flex gap-2 mb-2">
            <span className="text-sm text-muted-foreground mt-2 w-6">{i + 1}.</span>
            <Textarea
              value={revealStep.content}
              onChange={(e) => {
                const steps = [...c.steps];
                steps[i] = { ...steps[i], content: e.target.value };
                onChange({ ...c, steps }, answerData);
              }}
              placeholder={`${t("stepEditor.step")} ${i + 1} ${t("stepEditor.contentMarkdownSuffix")}`}
              rows={2}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => {
                const steps = c.steps.filter((_, j) => j !== i);
                onChange({ ...c, steps }, answerData);
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
