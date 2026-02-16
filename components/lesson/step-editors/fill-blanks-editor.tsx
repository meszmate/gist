"use client";

import type { StepEditorProps } from "./types";
import type { FillBlanksContent, FillBlanksAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export function FillBlanksEditor({ content, answerData, onChange }: StepEditorProps) {
  const { t } = useLocale();
  const c =
    (content as FillBlanksContent) ??
    ({ type: "fill_blanks", template: "", blanks: [] } as FillBlanksContent);
  const template = typeof c.template === "string" ? c.template : "";
  const blanks = Array.isArray(c.blanks) ? c.blanks : [];
  const ad = (answerData as FillBlanksAnswerData) || { correctBlanks: {} };

  const updateBlanks = (blanks: FillBlanksContent["blanks"]) => {
    const correctBlanks: Record<string, string[]> = {};
    blanks.forEach((b) => { correctBlanks[b.id] = b.acceptedAnswers; });
    onChange({ ...c, type: "fill_blanks", template, blanks }, { correctBlanks });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("stepEditor.template")}</Label>
        <Textarea
          value={template}
          onChange={(e) =>
            onChange({ ...c, type: "fill_blanks", template: e.target.value }, ad)
          }
          placeholder={t("stepEditor.templatePlaceholder")}
          rows={3}
          className="mt-1.5 font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("stepEditor.templateHint")}
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>{t("stepEditor.blanks")}</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = `b${blanks.length + 1}`;
              updateBlanks([...blanks, { id, acceptedAnswers: [""] }]);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("stepEditor.addBlank")}
          </Button>
        </div>
        {blanks.map((blank, i) => (
          <div key={blank.id} className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-muted-foreground w-12">{`{{${blank.id}}}`}</span>
            <Input
              value={blank.acceptedAnswers.join(", ")}
              onChange={(e) => {
                const nextBlanks = [...blanks];
                nextBlanks[i] = {
                  ...nextBlanks[i],
                  acceptedAnswers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                };
                updateBlanks(nextBlanks);
              }}
              placeholder={t("stepEditor.acceptedAnswersCommaSeparated")}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateBlanks(blanks.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
