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

export function ConceptEditor({ content, answerData, onChange }: StepEditorProps) {
  const c = content as ConceptContent;

  const update = (patch: Partial<ConceptContent>) => {
    onChange({ ...c, ...patch }, answerData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input
          value={c.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Key concept title"
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={c.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Describe the concept..."
          rows={4}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>Style</Label>
        <Select
          value={c.highlightStyle || "default"}
          onValueChange={(v) => update({ highlightStyle: v as ConceptContent["highlightStyle"] })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="info">Info (Blue)</SelectItem>
            <SelectItem value="warning">Warning (Yellow)</SelectItem>
            <SelectItem value="success">Success (Green)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
