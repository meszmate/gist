"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Save,
  Eye,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  LessonWithSteps,
  StepType,
  StepContent,
  StepAnswerData,
} from "@/lib/types/lesson";
import {
  STEP_TYPE_META,
  isInteractiveStep,
  getDefaultStepContent,
  getDefaultAnswerData,
} from "@/lib/types/lesson";
import { STEP_EDITORS } from "./step-editors";
import { LessonStepTypePicker } from "./lesson-step-type-picker";
import { LessonPlayer } from "./lesson-player";

interface LessonEditorProps {
  lesson: LessonWithSteps;
  resourceId: string;
}

export function LessonEditor({ lesson: initialLesson, resourceId }: LessonEditorProps) {
  const queryClient = useQueryClient();
  const [lesson, setLesson] = useState(initialLesson);
  const [steps, setSteps] = useState(initialLesson.steps);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(
    steps.length > 0 ? 0 : null
  );
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const selectedStep = selectedStepIndex !== null ? steps[selectedStepIndex] : null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save lesson metadata
      await fetch(`/api/resources/${resourceId}/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lesson.title,
          description: lesson.description,
          status: lesson.status,
          isPublic: lesson.isPublic,
          settings: lesson.settings,
        }),
      });

      // Save step order
      await fetch(`/api/resources/${resourceId}/lessons/${lesson.id}/steps/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepOrders: steps.map((s, i) => ({ id: s.id, order: i })),
        }),
      });

      // Save each step
      for (const step of steps) {
        await fetch(
          `/api/resources/${resourceId}/lessons/${lesson.id}/steps/${step.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: step.content,
              answerData: step.answerData,
              explanation: step.explanation,
              hint: step.hint,
              stepType: step.stepType,
            }),
          }
        );
      }
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["lesson", lesson.id] });
      toast.success("Lesson saved");
    },
    onError: () => {
      toast.error("Failed to save lesson");
    },
  });

  const addStepMutation = useMutation({
    mutationFn: async (type: StepType) => {
      const res = await fetch(
        `/api/resources/${resourceId}/lessons/${lesson.id}/steps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepType: type,
            content: getDefaultStepContent(type),
            answerData: getDefaultAnswerData(type),
            order: steps.length,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to create step");
      return res.json();
    },
    onSuccess: (newStep) => {
      setSteps((prev) => [...prev, newStep]);
      setSelectedStepIndex(steps.length);
      setIsDirty(true);
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      await fetch(
        `/api/resources/${resourceId}/lessons/${lesson.id}/steps/${stepId}`,
        { method: "DELETE" }
      );
    },
    onSuccess: (_, stepId) => {
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
      setSelectedStepIndex((prev) => {
        if (prev === null) return null;
        if (steps.length <= 1) return null;
        return Math.max(0, prev - 1);
      });
      setIsDirty(true);
    },
  });

  const improveStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const res = await fetch(
        `/api/resources/${resourceId}/lessons/${lesson.id}/steps/${stepId}/improve`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to improve step");
      return res.json();
    },
    onSuccess: (improved) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === improved.id ? improved : s))
      );
      setIsDirty(true);
      toast.success("Step improved with AI");
    },
  });

  const handleStepContentChange = useCallback(
    (content: StepContent, answerData: StepAnswerData) => {
      if (selectedStepIndex === null) return;
      setSteps((prev) => {
        const next = [...prev];
        next[selectedStepIndex] = {
          ...next[selectedStepIndex],
          content,
          answerData,
        };
        return next;
      });
      setIsDirty(true);
    },
    [selectedStepIndex]
  );

  const moveStep = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= steps.length) return;
    const next = [...steps];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    setSteps(next);
    setSelectedStepIndex(toIndex);
    setIsDirty(true);
  };

  if (previewOpen) {
    return (
      <LessonPlayer
        lesson={{ ...lesson, steps }}
        onExit={() => setPreviewOpen(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/library/${resourceId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Input
            value={lesson.title}
            onChange={(e) => {
              setLesson((l) => ({ ...l, title: e.target.value }));
              setIsDirty(true);
            }}
            className="text-lg font-semibold border-none shadow-none h-auto py-1 px-2 focus-visible:ring-1 max-w-sm"
          />
          <Badge variant={lesson.status === "published" ? "default" : "secondary"}>
            {lesson.status}
          </Badge>
          {isDirty && (
            <Badge variant="outline" className="text-xs">
              Unsaved changes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            disabled={steps.length === 0}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLesson((l) => ({
                ...l,
                status: l.status === "published" ? "draft" : "published",
                isPublic: l.status === "draft",
              }));
              setIsDirty(true);
            }}
          >
            {lesson.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !isDirty}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/30 flex flex-col shrink-0">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Steps ({steps.length})</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTypePickerOpen(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {steps.map((step, index) => {
                const meta = STEP_TYPE_META[step.stepType as StepType];
                const interactive = isInteractiveStep(step.stepType as StepType);
                return (
                  <button
                    key={step.id}
                    onClick={() => setSelectedStepIndex(index)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      "hover:bg-accent",
                      selectedStepIndex === index && "bg-accent border border-border"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground w-4">
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate">
                        {meta?.label || step.stepType}
                      </span>
                      {interactive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Editor panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedStep ? (
            <div className="max-w-2xl mx-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {STEP_TYPE_META[selectedStep.stepType as StepType]?.label || selectedStep.stepType}
                  </Badge>
                  {isInteractiveStep(selectedStep.stepType as StepType) && (
                    <Badge variant="secondary" className="text-xs">Interactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveStep(selectedStepIndex!, "up")}
                    disabled={selectedStepIndex === 0}
                  >
                    Move Up
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveStep(selectedStepIndex!, "down")}
                    disabled={selectedStepIndex === steps.length - 1}
                  >
                    Move Down
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => improveStepMutation.mutate(selectedStep.id)}
                    disabled={improveStepMutation.isPending}
                  >
                    {improveStepMutation.isPending ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                    )}
                    AI Improve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteStepMutation.mutate(selectedStep.id)}
                    disabled={deleteStepMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Step-specific editor */}
              <DynamicStepEditor
                stepType={selectedStep.stepType as StepType}
                content={selectedStep.content}
                answerData={selectedStep.answerData}
                onChange={handleStepContentChange}
              />

              <Separator />

              {/* Common fields */}
              {isInteractiveStep(selectedStep.stepType as StepType) && (
                <div className="space-y-4">
                  <div>
                    <Label>Explanation (shown after answering)</Label>
                    <Textarea
                      value={selectedStep.explanation || ""}
                      onChange={(e) => {
                        setSteps((prev) => {
                          const next = [...prev];
                          next[selectedStepIndex!] = {
                            ...next[selectedStepIndex!],
                            explanation: e.target.value || null,
                          };
                          return next;
                        });
                        setIsDirty(true);
                      }}
                      placeholder="Why is this the correct answer?"
                      rows={3}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Hint (optional)</Label>
                    <Input
                      value={selectedStep.hint || ""}
                      onChange={(e) => {
                        setSteps((prev) => {
                          const next = [...prev];
                          next[selectedStepIndex!] = {
                            ...next[selectedStepIndex!],
                            hint: e.target.value || null,
                          };
                          return next;
                        });
                        setIsDirty(true);
                      }}
                      placeholder="A helpful hint for the student"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <p>No step selected</p>
                <Button
                  variant="outline"
                  onClick={() => setTypePickerOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add a Step
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <LessonStepTypePicker
        open={typePickerOpen}
        onOpenChange={setTypePickerOpen}
        onSelect={(type) => addStepMutation.mutate(type)}
      />
    </div>
  );
}

function DynamicStepEditor({
  stepType,
  content,
  answerData,
  onChange,
}: {
  stepType: StepType;
  content: StepContent;
  answerData: StepAnswerData;
  onChange: (content: StepContent, answerData: StepAnswerData) => void;
}) {
  const Editor = STEP_EDITORS[stepType];
  if (!Editor) return null;
  return <Editor content={content} answerData={answerData} onChange={onChange} />;
}
