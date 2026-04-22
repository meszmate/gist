"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Wand2,
  Check,
  X,
  AlertCircle,
  Feather,
  TrendingUp,
  TrendingDown,
  Minimize2,
  Zap,
  BookOpenCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLocale } from "@/hooks/use-locale";
import type { LessonStep } from "@/lib/types/lesson";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
  lessonId: string;
  step: LessonStep | null;
  onImproved: (step: LessonStep) => void;
}

export function StepImproveDialog({
  open,
  onOpenChange,
  resourceId,
  lessonId,
  step,
  onImproved,
}: Props) {
  const { t, locale } = useLocale();

  const [phase, setPhase] = useState<"config" | "streaming" | "error">("config");
  const [prompt, setPrompt] = useState("");
  const [streamBuffer, setStreamBuffer] = useState("");
  const [chars, setChars] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const presets = [
    { icon: Feather, labelKey: "stepImprove.presetClearer", textKey: "stepImprove.presetClearerText" },
    { icon: TrendingDown, labelKey: "stepImprove.presetEasier", textKey: "stepImprove.presetEasierText" },
    { icon: TrendingUp, labelKey: "stepImprove.presetHarder", textKey: "stepImprove.presetHarderText" },
    { icon: Minimize2, labelKey: "stepImprove.presetShorter", textKey: "stepImprove.presetShorterText" },
    { icon: Zap, labelKey: "stepImprove.presetEngaging", textKey: "stepImprove.presetEngagingText" },
    { icon: BookOpenCheck, labelKey: "stepImprove.presetExample", textKey: "stepImprove.presetExampleText" },
  ];

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      const timer = setTimeout(() => {
        setPhase("config");
        setPrompt("");
        setStreamBuffer("");
        setChars(0);
        setSaving(false);
        setErrorMsg(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [streamBuffer]);

  const handleStart = async () => {
    if (!step) return;
    setPhase("streaming");
    setStreamBuffer("");
    setChars(0);
    setSaving(false);
    setErrorMsg(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/resources/${resourceId}/lessons/${lessonId}/steps/${step.id}/improve/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            customInstructions: prompt.trim() || undefined,
          }),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        if (errorBody.code === "TOKEN_LIMIT_EXCEEDED") {
          throw new Error(t("generate.tokenLimitExceeded"));
        }
        throw new Error(errorBody.error || t("lessonEditor.failedToSave"));
      }
      if (!res.body) throw new Error(t("lessonEditor.failedToSave"));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let savedStep: LessonStep | null = null;

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          for (const line of event.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;

            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue;
            }

            const type = parsed.type as string;
            if (type === "delta" && typeof parsed.text === "string") {
              setStreamBuffer((cur) => cur + parsed.text);
              if (typeof parsed.chars === "number") {
                setChars(parsed.chars);
              }
            } else if (type === "saving") {
              setSaving(true);
            } else if (type === "saved" && parsed.step) {
              savedStep = parsed.step as LessonStep;
            } else if (type === "error" && typeof parsed.message === "string") {
              throw new Error(parsed.message);
            }
          }
        }

        if (done) break;
      }

      if (!savedStep) throw new Error(t("lessonEditor.failedToSave"));

      onImproved(savedStep);
      toast.success(t("lessonEditor.stepImproved"));
      onOpenChange(false);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : t("lessonEditor.failedToSave");
      setErrorMsg(message);
      setPhase("error");
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && phase === "streaming" && !saving) {
          const ok = window.confirm(t("stepImprove.cancelConfirm"));
          if (!ok) return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-xl overflow-hidden p-0 sm:max-w-2xl">
        {phase === "config" && (
          <div className="flex flex-col">
            <DialogHeader className="border-b bg-gradient-to-br from-primary/5 via-transparent to-primary/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>{t("stepImprove.title")}</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    {t("stepImprove.subtitle")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="improve-prompt" className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t("stepImprove.promptLabel")}
                </Label>
                <Textarea
                  id="improve-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("stepImprove.promptPlaceholder")}
                  rows={3}
                  maxLength={2000}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("stepImprove.quickPresets")}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {presets.map((p) => (
                    <button
                      key={p.labelKey}
                      type="button"
                      onClick={() => {
                        const text = t(p.textKey);
                        setPrompt((cur) => (cur.trim() ? cur.trim() + "\n" + text : text));
                      }}
                      className="group flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <p.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="truncate">{t(p.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleStart} disabled={!step}>
                <Wand2 className="mr-2 h-4 w-4" />
                {t("stepImprove.run")}
              </Button>
            </div>
          </div>
        )}

        {phase === "streaming" && (
          <div className="flex flex-col">
            <DialogHeader className="border-b bg-gradient-to-br from-primary/10 via-transparent to-primary/5 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                    <Wand2 className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle>{t("stepImprove.rewriting")}</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    {saving ? t("stepImprove.saving") : t("stepImprove.streamingHint")}
                  </DialogDescription>
                </div>
                <div className="hidden items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {chars.toLocaleString()} {t("stepImprove.chars")}
                </div>
              </div>
            </DialogHeader>

            <div
              ref={previewRef}
              className={cn(
                "max-h-[50vh] overflow-y-auto px-6 py-5 font-mono text-xs leading-relaxed",
                "bg-muted/20"
              )}
            >
              {streamBuffer ? (
                <pre className="whitespace-pre-wrap break-words text-muted-foreground">
                  {streamBuffer}
                  <span className="ml-0.5 inline-block w-1.5 animate-pulse bg-primary align-middle" style={{ height: "0.9em" }} />
                </pre>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
                  {t("stepImprove.thinking")}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-6 py-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {saving ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    {t("stepImprove.applying")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {t("stepImprove.streamingHint")}
                  </>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="mr-1 h-3.5 w-3.5" />
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col">
            <DialogHeader className="border-b px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>{t("stepImprove.errorTitle")}</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    {errorMsg || t("lessonEditor.failedToSave")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex justify-end gap-2 border-t bg-muted/20 px-6 py-4">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t("common.close")}
              </Button>
              <Button onClick={() => setPhase("config")}>
                <Wand2 className="mr-2 h-4 w-4" />
                {t("stepImprove.tryAgain")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
