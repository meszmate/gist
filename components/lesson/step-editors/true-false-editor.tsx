"use client";

import type { StepEditorProps } from "./types";
import type { TrueFalseContent, TrueFalseAnswerData } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/hooks/use-locale";

export function TrueFalseEditor({ content, answerData, onChange }: StepEditorProps) {
  const { t } = useLocale();
  const c = content as TrueFalseContent;
  const ad = (answerData as TrueFalseAnswerData) || { correctValue: true };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("stepEditor.statement")}</Label>
        <Textarea
          value={c.statement}
          onChange={(e) => onChange({ ...c, statement: e.target.value }, ad)}
          placeholder={t("stepEditor.enterStatementPlaceholder")}
          rows={3}
          className="mt-1.5"
        />
      </div>
      <div className="flex items-center gap-3">
        <Label>{t("stepEditor.correctAnswer")}: {ad.correctValue ? t("stepEditor.true") : t("stepEditor.false")}</Label>
        <Switch
          checked={ad.correctValue}
          onCheckedChange={(checked) => onChange(c, { correctValue: checked })}
        />
      </div>
      <div>
        <Label>{t("stepEditor.explanationWhenTrue")}</Label>
        <Input
          value={c.trueExplanation || ""}
          onChange={(e) => onChange({ ...c, trueExplanation: e.target.value }, ad)}
          placeholder={t("stepEditor.whyTruePlaceholder")}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>{t("stepEditor.explanationWhenFalse")}</Label>
        <Input
          value={c.falseExplanation || ""}
          onChange={(e) => onChange({ ...c, falseExplanation: e.target.value }, ad)}
          placeholder={t("stepEditor.whyFalsePlaceholder")}
          className="mt-1.5"
        />
      </div>
    </div>
  );
}
