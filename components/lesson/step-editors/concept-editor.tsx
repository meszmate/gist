"use client";

import type { StepEditorProps } from "./types";
import type { ConceptContent } from "@/lib/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/hooks/use-locale";

export function ConceptEditor({ content, answerData, onChange }: StepEditorProps) {
  const { t } = useLocale();
  const c = content as ConceptContent;

  const update = (patch: Partial<ConceptContent>) => {
    onChange({ ...c, ...patch }, answerData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("stepEditor.title")}</Label>
        <Input
          value={c.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={t("stepEditor.conceptTitlePlaceholder")}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>{t("stepEditor.description")}</Label>
        <Textarea
          value={c.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder={t("stepEditor.describeConceptPlaceholder")}
          rows={4}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>{t("stepEditor.style")}</Label>
        <Select
          value={c.highlightStyle || "default"}
          onValueChange={(v) => update({ highlightStyle: v as ConceptContent["highlightStyle"] })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{t("stepEditor.styleDefault")}</SelectItem>
            <SelectItem value="info">{t("stepEditor.styleInfo")}</SelectItem>
            <SelectItem value="warning">{t("stepEditor.styleWarning")}</SelectItem>
            <SelectItem value="success">{t("stepEditor.styleSuccess")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
