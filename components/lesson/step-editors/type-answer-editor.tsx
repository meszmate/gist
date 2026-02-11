"use client";

import type { StepEditorProps } from "./types";
import type { TypeAnswerContent, TypeAnswerAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/hooks/use-locale";

export function TypeAnswerEditor({ content, answerData, onChange }: StepEditorProps) {
  const { t } = useLocale();
  const c = content as TypeAnswerContent;
  const ad = (answerData as TypeAnswerAnswerData) || { acceptedAnswers: [] };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("stepEditor.question")}</Label>
        <Input
          value={c.question}
          onChange={(e) => onChange({ ...c, question: e.target.value }, ad)}
          placeholder={t("stepEditor.enterQuestionPlaceholder")}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>{t("stepEditor.acceptedAnswers")}</Label>
        <Input
          value={ad.acceptedAnswers.join(", ")}
          onChange={(e) =>
            onChange(c, {
              acceptedAnswers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder={t("stepEditor.acceptedAnswersCommaSeparated")}
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("stepEditor.acceptedAnswersHint")}
        </p>
      </div>
      <div>
        <Label>{t("stepEditor.placeholder")}</Label>
        <Input
          value={c.placeholder || ""}
          onChange={(e) => onChange({ ...c, placeholder: e.target.value }, ad)}
          placeholder={t("stepEditor.inputPlaceholderText")}
          className="mt-1.5"
        />
      </div>
      <div className="flex items-center gap-3">
        <Label>{t("stepEditor.caseSensitive")}</Label>
        <Switch
          checked={c.caseSensitive || false}
          onCheckedChange={(checked) => onChange({ ...c, caseSensitive: checked }, ad)}
        />
      </div>
    </div>
  );
}
