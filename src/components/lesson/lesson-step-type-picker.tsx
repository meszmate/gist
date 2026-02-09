"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { STEP_TYPE_META } from "@/lib/types/lesson";
import type { StepType } from "@/lib/types/lesson";
import {
  FileText,
  Lightbulb,
  CircleDot,
  ToggleLeft,
  ArrowUpDown,
  GitCompareArrows,
  LayoutGrid,
  TextCursorInput,
  Keyboard,
  CheckSquare,
  Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconComponents: Record<string, LucideIcon> = {
  FileText,
  Lightbulb,
  CircleDot,
  ToggleLeft,
  ArrowUpDown,
  GitCompareArrows,
  LayoutGrid,
  TextCursorInput,
  Keyboard,
  CheckSquare,
  Eye,
};

interface LessonStepTypePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: StepType) => void;
}

export function LessonStepTypePicker({
  open,
  onOpenChange,
  onSelect,
}: LessonStepTypePickerProps) {
  const contentTypes = Object.values(STEP_TYPE_META).filter((m) => m.category === "content");
  const interactiveTypes = Object.values(STEP_TYPE_META).filter((m) => m.category === "interactive");

  const handleSelect = (type: StepType) => {
    onSelect(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Step</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Content</h4>
            <div className="grid grid-cols-1 gap-1.5">
              {contentTypes.map((meta) => {
                const Icon = iconComponents[meta.icon] || FileText;
                return (
                  <Button
                    key={meta.type}
                    variant="ghost"
                    className="justify-start h-auto py-2.5 px-3"
                    onClick={() => handleSelect(meta.type)}
                  >
                    <Icon className="h-4 w-4 mr-3 text-muted-foreground" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{meta.label}</div>
                      <div className="text-xs text-muted-foreground">{meta.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Interactive
              <Badge variant="secondary" className="ml-2 text-xs">Graded</Badge>
            </h4>
            <div className="grid grid-cols-1 gap-1.5">
              {interactiveTypes.map((meta) => {
                const Icon = iconComponents[meta.icon] || FileText;
                return (
                  <Button
                    key={meta.type}
                    variant="ghost"
                    className="justify-start h-auto py-2.5 px-3"
                    onClick={() => handleSelect(meta.type)}
                  >
                    <Icon className="h-4 w-4 mr-3 text-primary" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{meta.label}</div>
                      <div className="text-xs text-muted-foreground">{meta.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
