"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sparkles,
  Loader2,
  Check,
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
  Wand2,
  Target,
  AlertCircle,
  X,
  GraduationCap,
  Briefcase,
  Compass,
  RotateCcw,
  Brain,
  Dumbbell,
  Smile,
  BookOpen,
  Feather,
  HelpCircle,
  Megaphone,
  Scale,
  ListChecks,
  Settings2,
  Hash,
  Milestone,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import type { StepType } from "@/lib/types/lesson";

type Level = "auto" | "beginner" | "intermediate" | "advanced";
type Goal =
  | "exam_prep"
  | "interview_prep"
  | "curiosity"
  | "refresher"
  | "deep_understanding"
  | "drill";
type Tone = "friendly" | "formal" | "story" | "socratic" | "coach";

interface StreamedStep {
  index: number;
  stepType: StepType | string;
  preview: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
}

const STEP_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  explanation: FileText,
  concept: Lightbulb,
  multiple_choice: CircleDot,
  true_false: ToggleLeft,
  drag_sort: ArrowUpDown,
  drag_match: GitCompareArrows,
  drag_categorize: LayoutGrid,
  fill_blanks: TextCursorInput,
  type_answer: Keyboard,
  select_many: CheckSquare,
  reveal: Eye,
};

function extractStepPreview(step: Record<string, unknown>): string {
  const content = step.content as Record<string, unknown> | undefined;
  if (!content) return "";

  const candidates = [
    content.question,
    content.statement,
    content.instruction,
    content.title,
    content.template,
    content.markdown,
    content.description,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) {
      return c.trim().replace(/\s+/g, " ").slice(0, 160);
    }
  }
  return "";
}

export function LessonGenerationDialog({ open, onOpenChange, resourceId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useLocale();

  const [phase, setPhase] = useState<"config" | "streaming" | "error">("config");
  const [title, setTitle] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [stepCount, setStepCount] = useState(14);
  const [level, setLevel] = useState<Level>("auto");
  const [goal, setGoal] = useState<Goal | "">("");
  const [tone, setTone] = useState<Tone | "">("");
  const [theoryPractice, setTheoryPractice] = useState(50);
  const [incExamples, setIncExamples] = useState(false);
  const [incPitfalls, setIncPitfalls] = useState(false);
  const [incRecap, setIncRecap] = useState(false);
  const [incMemory, setIncMemory] = useState(false);

  // streaming state
  const [liveTitle, setLiveTitle] = useState("");
  const [liveDescription, setLiveDescription] = useState("");
  const [liveSteps, setLiveSteps] = useState<StreamedStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const resetAll = () => {
    setTitle("");
    setCustomInstructions("");
    setStepCount(14);
    setLevel("auto");
    setGoal("");
    setTone("");
    setTheoryPractice(50);
    setIncExamples(false);
    setIncPitfalls(false);
    setIncRecap(false);
    setIncMemory(false);
  };

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      // reset fully only when closed
      const timer = setTimeout(() => {
        setPhase("config");
        resetAll();
        setLiveTitle("");
        setLiveDescription("");
        setLiveSteps([]);
        setSaving(false);
        setErrorMsg(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (phase === "streaming" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveSteps, phase]);

  const handleStart = async () => {
    setPhase("streaming");
    setLiveTitle("");
    setLiveDescription("");
    setLiveSteps([]);
    setSaving(false);
    setErrorMsg(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/resources/${resourceId}/lessons/generate/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            targetLevel: level === "auto" ? undefined : level,
            stepCount,
            title: title.trim() || undefined,
            customInstructions: customInstructions.trim() || undefined,
            goal: goal || undefined,
            tone: tone || undefined,
            theoryPractice,
            inclusions:
              incExamples || incPitfalls || incRecap || incMemory
                ? {
                    examples: incExamples,
                    pitfalls: incPitfalls,
                    recap: incRecap,
                    memoryTricks: incMemory,
                  }
                : undefined,
          }),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        if (errorBody.code === "TOKEN_LIMIT_EXCEEDED") {
          throw new Error(t("generate.tokenLimitExceeded"));
        }
        throw new Error(errorBody.error || t("resourceLessons.failedGenerate"));
      }
      if (!res.body) {
        throw new Error(t("resourceLessons.failedGenerate"));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let savedLessonId: string | null = null;

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
            if (type === "title" && typeof parsed.value === "string") {
              setLiveTitle(parsed.value);
            } else if (type === "description" && typeof parsed.value === "string") {
              setLiveDescription(parsed.value);
            } else if (type === "step" && typeof parsed.index === "number") {
              const step = parsed.step as Record<string, unknown>;
              setLiveSteps((prev) => [
                ...prev,
                {
                  index: parsed.index as number,
                  stepType: String(step?.stepType || ""),
                  preview: extractStepPreview(step || {}),
                },
              ]);
            } else if (type === "saving") {
              setSaving(true);
            } else if (type === "saved" && typeof parsed.lessonId === "string") {
              savedLessonId = parsed.lessonId;
            } else if (type === "error" && typeof parsed.message === "string") {
              throw new Error(parsed.message);
            }
          }
        }

        if (done) break;
      }

      if (!savedLessonId) {
        throw new Error(t("resourceLessons.failedGenerate"));
      }

      queryClient.invalidateQueries({ queryKey: ["lessons", resourceId] });
      toast.success(t("resourceLessons.lessonGenerated"));
      router.push(`/library/${resourceId}/lessons/${savedLessonId}/edit`);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : t("resourceLessons.failedGenerate");
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
          const ok = window.confirm(t("lessonGen.cancelConfirm"));
          if (!ok) return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl overflow-hidden p-0 sm:max-w-3xl">
        {phase === "config" && (
          <div className="flex flex-col">
            <DialogHeader className="border-b bg-gradient-to-br from-primary/5 via-transparent to-primary/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>{t("lessonGen.title")}</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    {t("lessonGen.subtitle")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="max-h-[65vh] overflow-y-auto">
              <div className="divide-y">
                {/* Section: freeform focus */}
                <div className="space-y-2 px-6 py-5">
                  <Label htmlFor="gen-instructions" className="flex items-center gap-2">
                    <Wand2 className="h-3.5 w-3.5 text-primary" />
                    {t("lessonGen.focusLabel")}
                  </Label>
                  <Textarea
                    id="gen-instructions"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder={t("lessonGen.focusPlaceholder")}
                    rows={3}
                    maxLength={2000}
                    className="resize-none"
                  />
                </div>

                {/* Section: Learner profile — goal + tone */}
                <div className="space-y-5 px-6 py-5">
                  <SectionHeader
                    icon={Target}
                    title={t("lessonGen.sectionLearner")}
                    hint={t("lessonGen.sectionLearnerHint")}
                  />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t("lessonGen.goalLabel")}
                    </Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {GOAL_OPTIONS.map((opt) => (
                        <ChipButton
                          key={opt.value}
                          active={goal === opt.value}
                          onClick={() =>
                            setGoal((cur) => (cur === opt.value ? "" : opt.value))
                          }
                          icon={opt.icon}
                          label={t(opt.labelKey)}
                          description={t(opt.descKey)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t("lessonGen.toneLabel")}
                    </Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {TONE_OPTIONS.map((opt) => (
                        <ChipButton
                          key={opt.value}
                          active={tone === opt.value}
                          onClick={() =>
                            setTone((cur) => (cur === opt.value ? "" : opt.value))
                          }
                          icon={opt.icon}
                          label={t(opt.labelKey)}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section: balance slider */}
                <div className="space-y-4 px-6 py-5">
                  <SectionHeader
                    icon={Scale}
                    title={t("lessonGen.sectionBalance")}
                    hint={t("lessonGen.sectionBalanceHint")}
                  />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3" />
                        {t("lessonGen.balanceTheory")}
                      </span>
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 tabular-nums text-primary">
                        {100 - theoryPractice}% · {theoryPractice}%
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Dumbbell className="h-3 w-3" />
                        {t("lessonGen.balancePractice")}
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[theoryPractice]}
                      onValueChange={([v]) => setTheoryPractice(v)}
                      className="py-1"
                    />
                    <p className="text-center text-xs text-muted-foreground">
                      {theoryPractice <= 25
                        ? t("lessonGen.balanceTheoryHeavy")
                        : theoryPractice <= 55
                        ? t("lessonGen.balanceBalanced")
                        : theoryPractice <= 75
                        ? t("lessonGen.balancePracticeLean")
                        : t("lessonGen.balancePracticeHeavy")}
                    </p>
                  </div>
                </div>

                {/* Section: inclusions */}
                <div className="space-y-4 px-6 py-5">
                  <SectionHeader
                    icon={ListChecks}
                    title={t("lessonGen.sectionInclude")}
                    hint={t("lessonGen.sectionIncludeHint")}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <IncludeToggle
                      checked={incExamples}
                      onChange={setIncExamples}
                      label={t("lessonGen.incExamples")}
                      description={t("lessonGen.incExamplesDesc")}
                    />
                    <IncludeToggle
                      checked={incPitfalls}
                      onChange={setIncPitfalls}
                      label={t("lessonGen.incPitfalls")}
                      description={t("lessonGen.incPitfallsDesc")}
                    />
                    <IncludeToggle
                      checked={incRecap}
                      onChange={setIncRecap}
                      label={t("lessonGen.incRecap")}
                      description={t("lessonGen.incRecapDesc")}
                    />
                    <IncludeToggle
                      checked={incMemory}
                      onChange={setIncMemory}
                      label={t("lessonGen.incMemory")}
                      description={t("lessonGen.incMemoryDesc")}
                    />
                  </div>
                </div>

                {/* Section: structure */}
                <div className="space-y-5 px-6 py-5">
                  <SectionHeader
                    icon={Settings2}
                    title={t("lessonGen.sectionStructure")}
                    hint={t("lessonGen.sectionStructureHint")}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gen-title" className="flex items-center gap-1.5 text-sm">
                        <Milestone className="h-3.5 w-3.5 text-muted-foreground" />
                        {t("lessonGen.titleLabel")}
                      </Label>
                      <Input
                        id="gen-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t("lessonGen.titlePlaceholder")}
                        maxLength={120}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="gen-steps"
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("lessonGen.stepCount")}
                        </Label>
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
                          {stepCount}
                        </span>
                      </div>
                      <Slider
                        id="gen-steps"
                        min={6}
                        max={20}
                        step={1}
                        value={[stepCount]}
                        onValueChange={([v]) => setStepCount(v)}
                        className="py-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {stepCount <= 8
                          ? t("lessonGen.sizeShort")
                          : stepCount <= 14
                          ? t("lessonGen.sizeStandard")
                          : t("lessonGen.sizeDeep")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">{t("lessonGen.levelLabel")}</Label>
                    <RadioGroup
                      value={level}
                      onValueChange={(v) => setLevel(v as Level)}
                      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                    >
                      {(
                        [
                          { value: "auto", labelKey: "lessonGen.levelAuto" },
                          { value: "beginner", labelKey: "common.difficulty.beginner" },
                          { value: "intermediate", labelKey: "common.difficulty.intermediate" },
                          { value: "advanced", labelKey: "common.difficulty.advanced" },
                        ] as const
                      ).map((opt) => (
                        <label
                          key={opt.value}
                          htmlFor={`level-${opt.value}`}
                          className={cn(
                            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                            level === opt.value
                              ? "border-primary bg-primary/5 text-foreground"
                              : "text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                          )}
                        >
                          <RadioGroupItem
                            id={`level-${opt.value}`}
                            value={opt.value}
                            className="sr-only"
                          />
                          {t(opt.labelKey)}
                        </label>
                      ))}
                    </RadioGroup>
                    {level === "auto" && (
                      <p className="text-xs text-muted-foreground">
                        {t("lessonGen.levelAutoHint")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Live summary + actions */}
            <div className="border-t bg-muted/20 px-6 py-4">
              <div className="mb-3 flex items-start gap-2 rounded-lg bg-background/60 px-3 py-2.5 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <p className="leading-relaxed">
                  {buildSummary({
                    t,
                    stepCount,
                    level,
                    goal,
                    tone,
                    theoryPractice,
                    inclusions: {
                      examples: incExamples,
                      pitfalls: incPitfalls,
                      recap: incRecap,
                      memoryTricks: incMemory,
                    },
                  })}
                </p>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  <RefreshCcw className="h-3 w-3" />
                  {t("lessonGen.reset")}
                </button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleStart}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("lessonGen.startGeneration")}
                  </Button>
                </div>
              </div>
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
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate">
                    {liveTitle || t("lessonGen.composing")}
                    <span className="ml-0.5 inline-block w-0.5 animate-pulse bg-primary align-middle" style={{ height: "0.9em" }} />
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 line-clamp-2">
                    {liveDescription ||
                      (saving ? t("lessonGen.saving") : t("lessonGen.thinking"))}
                  </DialogDescription>
                </div>
                <div className="hidden rounded-full border bg-background px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground sm:flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {liveSteps.length} / ~{stepCount}
                </div>
              </div>
            </DialogHeader>

            <div
              ref={scrollRef}
              className="max-h-[60vh] overflow-y-auto px-6 py-5"
            >
              {liveSteps.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 animate-pulse"
                      style={{ animationDelay: `${i * 120}ms` }}
                    >
                      <div className="h-8 w-8 rounded-md bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/3 rounded bg-muted" />
                        <div className="h-2.5 w-2/3 rounded bg-muted/70" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ol className="space-y-2">
                  {liveSteps.map((s) => {
                    const Icon = STEP_ICON[s.stepType as string] || FileText;
                    const label = t(`stepType.${s.stepType}` as string);
                    const labelDisplay =
                      typeof label === "string" && !label.startsWith("stepType.")
                        ? label
                        : s.stepType.replace(/_/g, " ");
                    return (
                      <li
                        key={s.index}
                        className="group flex items-start gap-3 rounded-lg border bg-card/50 p-3 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                              #{s.index + 1}
                            </span>
                            <span className="text-sm font-medium capitalize">
                              {labelDisplay}
                            </span>
                            <Check className="ml-auto h-3.5 w-3.5 text-green-600" />
                          </div>
                          {s.preview && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                              {s.preview}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {!saving && (
                    <li className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/20 p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {t("lessonGen.writingNext")}
                      </span>
                    </li>
                  )}
                </ol>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-6 py-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("lessonGen.savingLesson")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {t("lessonGen.streamingHint")}
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
                  <DialogTitle>{t("lessonGen.errorTitle")}</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    {errorMsg || t("resourceLessons.failedGenerate")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex justify-end gap-2 border-t bg-muted/20 px-6 py-4">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t("common.close")}
              </Button>
              <Button onClick={() => setPhase("config")}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("lessonGen.tryAgain")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============== SUB-COMPONENTS ==============

interface ChipOption<T extends string> {
  value: T;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  descKey: string;
}

const GOAL_OPTIONS: ChipOption<Goal>[] = [
  { value: "exam_prep", icon: GraduationCap, labelKey: "lessonGen.goalExam", descKey: "lessonGen.goalExamDesc" },
  { value: "interview_prep", icon: Briefcase, labelKey: "lessonGen.goalInterview", descKey: "lessonGen.goalInterviewDesc" },
  { value: "curiosity", icon: Compass, labelKey: "lessonGen.goalCuriosity", descKey: "lessonGen.goalCuriosityDesc" },
  { value: "refresher", icon: RotateCcw, labelKey: "lessonGen.goalRefresher", descKey: "lessonGen.goalRefresherDesc" },
  { value: "deep_understanding", icon: Brain, labelKey: "lessonGen.goalDeep", descKey: "lessonGen.goalDeepDesc" },
  { value: "drill", icon: Dumbbell, labelKey: "lessonGen.goalDrill", descKey: "lessonGen.goalDrillDesc" },
];

const TONE_OPTIONS: Pick<ChipOption<Tone>, "value" | "icon" | "labelKey">[] = [
  { value: "friendly", icon: Smile, labelKey: "lessonGen.toneFriendly" },
  { value: "formal", icon: BookOpen, labelKey: "lessonGen.toneFormal" },
  { value: "story", icon: Feather, labelKey: "lessonGen.toneStory" },
  { value: "socratic", icon: HelpCircle, labelKey: "lessonGen.toneSocratic" },
  { value: "coach", icon: Megaphone, labelKey: "lessonGen.toneCoach" },
];

function SectionHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  icon: Icon,
  label,
  description,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-2 rounded-lg border text-left transition-all",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "hover:border-muted-foreground/40 hover:bg-muted/40"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          compact ? "mt-0" : "mt-0.5",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-xs font-medium",
            active ? "text-foreground" : "text-foreground"
          )}
        >
          {label}
        </p>
        {description && !compact && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}

function IncludeToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all",
        checked
          ? "border-primary/50 bg-primary/5"
          : "hover:border-muted-foreground/40 hover:bg-muted/30"
      )}
    >
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
    </label>
  );
}

function buildSummary({
  t,
  stepCount,
  level,
  goal,
  tone,
  theoryPractice,
  inclusions,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
  stepCount: number;
  level: Level;
  goal: Goal | "";
  tone: Tone | "";
  theoryPractice: number;
  inclusions: {
    examples: boolean;
    pitfalls: boolean;
    recap: boolean;
    memoryTricks: boolean;
  };
}): string {
  const sizeKey =
    stepCount <= 8 ? "short" : stepCount <= 14 ? "standard" : "deep";
  const levelKey =
    level === "auto" ? "auto" : level;
  const balanceKey =
    theoryPractice <= 25
      ? "theoryHeavy"
      : theoryPractice <= 55
      ? "balanced"
      : theoryPractice <= 75
      ? "practiceLean"
      : "practiceHeavy";

  const parts: string[] = [];
  parts.push(t(`lessonGen.summary.size.${sizeKey}`, { count: stepCount }));
  parts.push(t(`lessonGen.summary.level.${levelKey}`));
  if (goal) parts.push(t(`lessonGen.summary.goal.${goal}`));
  if (tone) parts.push(t(`lessonGen.summary.tone.${tone}`));
  parts.push(t(`lessonGen.summary.balance.${balanceKey}`));

  const incs: string[] = [];
  if (inclusions.examples) incs.push(t("lessonGen.summary.incExamples"));
  if (inclusions.pitfalls) incs.push(t("lessonGen.summary.incPitfalls"));
  if (inclusions.recap) incs.push(t("lessonGen.summary.incRecap"));
  if (inclusions.memoryTricks) incs.push(t("lessonGen.summary.incMemory"));
  if (incs.length > 0) {
    parts.push(t("lessonGen.summary.withInclusions", { items: incs.join(", ") }));
  }

  return parts.join(" · ");
}
