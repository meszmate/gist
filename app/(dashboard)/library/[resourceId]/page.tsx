"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  BookOpen,
  Brain,
  FileQuestion,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Target,
  Settings,
  BarChart3,
  Pencil,
  Lock,
  CheckCircle2,
  RotateCcw,
  Loader2,
  GraduationCap,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineEditableField } from "@/components/shared/inline-editable-field";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { QuestionEditDialog } from "@/components/quiz/question-edit-dialog";
import { ResourceSettingsDialog } from "@/components/resource/resource-settings-dialog";
import { AccessControlDialog } from "@/components/resource/access-control-dialog";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import type {
  QuestionConfig,
  CorrectAnswerData,
  MultipleChoiceConfig,
  MultipleChoiceAnswer,
  TrueFalseAnswer,
  TextInputAnswer,
  YearRangeAnswer,
  NumericRangeAnswer,
  MatchingConfig,
  MatchingAnswer,
  FillBlankConfig,
  MultiSelectConfig,
  MultiSelectAnswer,
} from "@/lib/types/quiz";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  questionType: string;
  questionConfig: QuestionConfig;
  correctAnswerData: CorrectAnswerData | null;
  points: string;
  order: number | null;
  explanation: string | null;
  options: string[] | null;
  correctAnswer: number | null;
}

interface LessonSummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  order: number;
  isPublic: boolean;
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  sourceContent: string | null;
  difficulty: string | null;
  completedAt: string | null;
  shareToken: string | null;
  isPublic: boolean;
  createdAt: string;
  availableFrom: string | null;
  availableTo: string | null;
  visibleSections: { flashcards: boolean; summary: boolean; quiz: boolean; lessons?: boolean } | null;
  requireAuthToInteract: boolean;
  allowedViewerEmails: string[] | null;
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

async function fetchResource(id: string): Promise<Resource> {
  const res = await fetch(`/api/resources/${id}`);
  if (!res.ok) throw new Error("Failed to fetch resource");
  return res.json();
}

function QuestionDetails({ question, t }: { question: QuizQuestion; t: (key: string, params?: Record<string, string | number>) => string }) {
  const type = question.questionType || "multiple_choice";
  const config = question.questionConfig || {};
  const answerData = question.correctAnswerData;

  switch (type) {
    case "multiple_choice": {
      const opts =
        (config as MultipleChoiceConfig)?.options || question.options || [];
      const correctIdx =
        (answerData as MultipleChoiceAnswer)?.correctIndex ??
        question.correctAnswer ??
        0;
      return (
        <div className="space-y-1.5">
          {opts.map((opt, i) => (
            <div
              key={i}
              className={cn(
                "text-sm px-3 py-1.5 rounded",
                i === correctIdx
                  ? "bg-green-500/10 text-green-700 dark:text-green-400 font-medium"
                  : "bg-muted"
              )}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </div>
          ))}
        </div>
      );
    }
    case "true_false": {
      const correct = (answerData as TrueFalseAnswer)?.correctValue;
      return (
        <p className="text-sm">
          {t("resourceDetail.correctAnswer")}{" "}
          <span className="font-medium text-green-700 dark:text-green-400">
            {correct === true ? t("resourceDetail.trueLabel") : correct === false ? t("resourceDetail.falseLabel") : t("resourceDetail.naLabel")}
          </span>
        </p>
      );
    }
    case "text_input": {
      const accepted = (answerData as TextInputAnswer)?.acceptedAnswers || [];
      return (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t("resourceDetail.acceptedAnswers")}</p>
          <div className="flex flex-wrap gap-1.5">
            {accepted.map((a, i) => (
              <Badge key={i} variant="secondary">
                {a}
              </Badge>
            ))}
          </div>
        </div>
      );
    }
    case "year_range": {
      const year = (answerData as YearRangeAnswer)?.correctYear;
      return (
        <p className="text-sm">
          {t("resourceDetail.correctYear")}{" "}
          <span className="font-medium text-green-700 dark:text-green-400">
            {year}
          </span>
        </p>
      );
    }
    case "numeric_range": {
      const val = (answerData as NumericRangeAnswer)?.correctValue;
      return (
        <p className="text-sm">
          {t("resourceDetail.correctValue")}{" "}
          <span className="font-medium text-green-700 dark:text-green-400">
            {val}
          </span>
        </p>
      );
    }
    case "matching": {
      const mc = config as MatchingConfig;
      const pairs = (answerData as MatchingAnswer)?.correctPairs || {};
      return (
        <div className="space-y-1">
          {(mc.leftColumn || []).map((left, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="bg-muted px-2 py-1 rounded">{left}</span>
              <span className="text-muted-foreground">&rarr;</span>
              <span className="bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                {pairs[left] || mc.rightColumn?.[i] || ""}
              </span>
            </div>
          ))}
        </div>
      );
    }
    case "fill_blank": {
      const fc = config as FillBlankConfig;
      return (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t("resourceDetail.template")}</p>
          <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
            {fc.template}
          </p>
        </div>
      );
    }
    case "multi_select": {
      const opts = (config as MultiSelectConfig)?.options || [];
      const correctIds = (answerData as MultiSelectAnswer)?.correctIndices || [];
      return (
        <div className="space-y-1.5">
          {opts.map((opt, i) => (
            <div
              key={i}
              className={cn(
                "text-sm px-3 py-1.5 rounded flex items-center gap-2",
                correctIds.includes(i)
                  ? "bg-green-500/10 text-green-700 dark:text-green-400 font-medium"
                  : "bg-muted"
              )}
            >
              {correctIds.includes(i) ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="w-3.5" />
              )}
              {opt}
            </div>
          ))}
        </div>
      );
    }
    default:
      return (
        <p className="text-sm text-muted-foreground">
          {t("resourceDetail.unknownType", { type })}
        </p>
      );
  }
}

export default function ResourcePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, formatDate } = useLocale();
  const resourceId = params.resourceId as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(
    null
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [accessControlDialogOpen, setAccessControlDialogOpen] = useState(false);

  const { data: resource, isLoading } = useQuery({
    queryKey: ["resource", resourceId],
    queryFn: () => fetchResource(resourceId),
  });

  const { data: lessons = [] } = useQuery<LessonSummary[]>({
    queryKey: ["lessons", resourceId],
    queryFn: async () => {
      const res = await fetch(`/api/resources/${resourceId}/lessons`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!resource,
  });

  const generateShareToken = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/resources/${resourceId}/share`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate share link");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
    },
  });

  const deleteResource = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete resource");
    },
    onSuccess: () => {
      toast.success(t("resourceDetail.resourceDeleted"));
      router.push("/library");
    },
  });

  const updateResource = useMutation({
    mutationFn: async (data: { title?: string; description?: string }) => {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      toast.success(t("resourceDetail.resourceUpdated"));
    },
    onError: () => {
      toast.error(t("resourceDetail.failedUpdate"));
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async (completed: boolean) => {
      const res = await fetch(`/api/resources/${resourceId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update completion status");
      return res.json();
    },
    onSuccess: (_, completed) => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["due-cards"] });
      toast.success(completed ? t("resourceDetail.resourceMarkedDone") : t("resourceDetail.resourceReopened"));
    },
    onError: () => {
      toast.error(t("resourceDetail.failedUpdateCompletion"));
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(
        `/api/quizzes/${resourceId}/questions/${editingQuestion?.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error("Failed to update question");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      setEditDialogOpen(false);
      setEditingQuestion(null);
      toast.success(t("resourceDetail.questionUpdated"));
    },
    onError: () => {
      toast.error(t("resourceDetail.failedUpdateQuestion"));
    },
  });

  const createQuestion = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/quizzes/${resourceId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create question");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      setCreateDialogOpen(false);
      toast.success(t("resourceDetail.questionCreated"));
    },
    onError: () => {
      toast.error(t("resourceDetail.failedCreateQuestion"));
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const res = await fetch(
        `/api/quizzes/${resourceId}/questions/${questionId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete question");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      setDeleteQuestionId(null);
      toast.success(t("resourceDetail.questionDeleted"));
    },
    onError: () => {
      toast.error(t("resourceDetail.failedDeleteQuestion"));
    },
  });

  // Keyboard navigation for tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const tabs = ["overview", "flashcards", "quiz", "lessons"];
      const currentIndex = tabs.indexOf(activeTab);

      if (e.key === "h" && currentIndex > 0) {
        e.preventDefault();
        setActiveTab(tabs[currentIndex - 1]);
      } else if (e.key === "l" && currentIndex < tabs.length - 1) {
        e.preventDefault();
        setActiveTab(tabs[currentIndex + 1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  const shareUrl = resource?.shareToken
    ? `${window.location.origin}/shared/${resource.shareToken}`
    : null;

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t("resourceDetail.linkCopied"));
    }
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "advanced":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!resource) {
    return (
      <EmptyState
        icon={<BookOpen className="h-12 w-12" />}
        title={t("resourceDetail.notFound")}
        description={t("resourceDetail.notFoundDesc")}
        action={{
          label: t("resourceDetail.backToLibrary"),
          href: "/library",
        }}
      />
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">{t("nav.dashboard")}</BreadcrumbLink>
              <BreadcrumbSeparator />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/library">{t("nav.library")}</BreadcrumbLink>
              <BreadcrumbSeparator />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>{resource.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <InlineEditableField
              value={resource.title}
              onSave={(title) => updateResource.mutate({ title })}
              isSaving={updateResource.isPending}
              className="text-3xl font-bold tracking-tight"
              inputClassName="text-3xl font-bold tracking-tight h-auto py-1"
            />
            <InlineEditableField
              value={resource.description || ""}
              onSave={(description) => updateResource.mutate({ description })}
              isSaving={updateResource.isPending}
              multiline
              placeholder={t("resourceDetail.addDescription")}
              className="text-muted-foreground"
              inputClassName="text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 animate-fade-in shrink-0">
            {resource.completedAt ? (
              <Button
                variant="outline"
                onClick={() => toggleComplete.mutate(false)}
                disabled={toggleComplete.isPending}
                className="gap-2"
              >
                {toggleComplete.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {t("resourceDetail.reopen")}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => toggleComplete.mutate(true)}
                disabled={toggleComplete.isPending}
                className="gap-2 border-green-500/50 text-green-700 hover:bg-green-500/10 dark:text-green-400"
              >
                {toggleComplete.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {t("resourceDetail.markAsDone")}
              </Button>
            )}
            <Button variant="outline" size="icon" asChild>
              <Link href={`/library/${resource.id}/analytics`}>
                <BarChart3 className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsDialogOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAccessControlDialogOpen(true)}
            >
              <Lock className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              {t("resourceDetail.share")}
            </Button>
            <Button asChild>
              <Link href={`/create/${resource.id}/generate`}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("resourceDetail.generateMore")}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap animate-fade-in">
        {resource.completedAt && (
          <Badge className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 border">
            <CheckCircle2 className="h-3 w-3" />
            {t("resourceDetail.completed", { date: formatDate(resource.completedAt) })}
          </Badge>
        )}
        {resource.difficulty && (
          <Badge
            className={cn("border", getDifficultyColor(resource.difficulty))}
          >
            {resource.difficulty}
          </Badge>
        )}
        <Badge variant="outline" className="gap-1">
          <Brain className="h-3 w-3" />
          {t("resourceDetail.flashcardsCount", { count: resource.flashcards.length })}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <FileQuestion className="h-3 w-3" />
          {t("resourceDetail.quizQuestionsCount", { count: resource.quizQuestions.length })}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {t("resourceDetail.created", { date: formatDate(resource.createdAt) })}
        </Badge>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t("resourceDetail.overview")}
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-2">
            <Brain className="h-4 w-4" />
            {t("resourceDetail.flashcardsTab")}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {resource.flashcards.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-2">
            <FileQuestion className="h-4 w-4" />
            {t("resourceDetail.quizTab")}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {resource.quizQuestions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="lessons" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            {t("resourceDetail.lessonsTab")}
            {lessons.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {lessons.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="text-xs text-muted-foreground">
          {(() => {
            const hint = t("resourceDetail.switchTabsHint", { h: "__H__", l: "__L__" });
            const parts = hint.split(/(__[HL]__)/);
            return parts.map((part, i) => {
              if (part === "__H__") return <kbd key={i} className="px-1.5 py-0.5 bg-muted rounded border mx-1">h</kbd>;
              if (part === "__L__") return <kbd key={i} className="px-1.5 py-0.5 bg-muted rounded border mx-1">l</kbd>;
              return <span key={i}>{part}</span>;
            });
          })()}
        </div>

        <TabsContent value="overview" className="space-y-6 animate-fade-in">
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title={t("resourceDetail.flashcardsTab")}
              value={resource.flashcards.length}
              description={t("resourceDetail.totalCards")}
              icon={<Brain className="h-5 w-5" />}
              onClick={() => setActiveTab("flashcards")}
            />
            <StatCard
              title={t("resourceDetail.quizTab")}
              value={resource.quizQuestions.length}
              description={t("resourceDetail.totalQuestions")}
              icon={<FileQuestion className="h-5 w-5" />}
              onClick={() => setActiveTab("quiz")}
            />
            <StatCard
              title={t("resourceDetail.difficulty")}
              value={resource.difficulty || t("resourceDetail.notSet")}
              icon={<Target className="h-5 w-5" />}
            />
          </div>

          {/* Summary */}
          {resource.summary ? (
            <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {t("resourceDetail.summary")}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 transition-transform",
                          summaryOpen && "rotate-180"
                        )}
                      />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <MarkdownRenderer content={resource.summary} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {t("resourceDetail.noSummaryYet")}
                </p>
                <Button asChild>
                  <Link href={`/create/${resource.id}/generate`}>
                    {t("resourceDetail.generateSummary")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t("resourceDetail.quickActions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {resource.flashcards.length > 0 && (
                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto py-4"
                >
                  <Link href={`/study?resource=${resource.id}`}>
                    <Brain className="mr-3 h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">{t("resourceDetail.studyFlashcards")}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("resourceDetail.reviewSpacedRepetition")}
                      </div>
                    </div>
                  </Link>
                </Button>
              )}
              {resource.quizQuestions.length > 0 && (
                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto py-4"
                >
                  <Link href={`/quiz/${resource.id}`}>
                    <FileQuestion className="mr-3 h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">{t("resourceDetail.takeQuiz")}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("resourceDetail.testKnowledge")}
                      </div>
                    </div>
                  </Link>
                </Button>
              )}
              <Button
                asChild
                variant="outline"
                className="justify-start h-auto py-4"
              >
                <Link href={`/create/${resource.id}/generate`}>
                  <Sparkles className="mr-3 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">{t("resourceDetail.generateContent")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("resourceDetail.addMoreCards")}
                    </div>
                  </div>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">{t("resourceDetail.deleteResource")}</div>
                  <div className="text-xs opacity-80">{t("resourceDetail.removePermanently")}</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flashcards" className="animate-fade-in">
          {resource.flashcards.length === 0 ? (
            <EmptyState
              icon={<Brain className="h-12 w-12" />}
              title={t("resourceDetail.noFlashcardsYet")}
              description={t("resourceDetail.generateFlashcardsDesc")}
              action={{
                label: t("resourceDetail.generateFlashcards"),
                href: `/create/${resource.id}/generate`,
                icon: <Plus className="mr-2 h-4 w-4" />,
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("resourceDetail.flashcardCount", { count: resource.flashcards.length })}
                </p>
                <Button asChild>
                  <Link href={`/study?resource=${resource.id}`}>
                    <Brain className="mr-2 h-4 w-4" />
                    {t("resourceDetail.startStudySession")}
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resource.flashcards.map((card, index) => (
                  <Card
                    key={card.id}
                    className="group hover:border-primary transition-colors animate-scale-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <span className="text-xs font-medium text-primary uppercase tracking-wide">
                          {t("resourceDetail.question")}
                        </span>
                        <p className="text-sm mt-1">{card.front}</p>
                      </div>
                      <div className="border-t pt-3">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {t("resourceDetail.answer")}
                        </span>
                        <p className="text-sm mt-1 text-muted-foreground">
                          {card.back}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quiz" className="animate-fade-in">
          {resource.quizQuestions.length === 0 ? (
            <EmptyState
              icon={<FileQuestion className="h-12 w-12" />}
              title={t("resourceDetail.noQuizYet")}
              description={t("resourceDetail.generateQuizDesc")}
              action={{
                label: t("resourceDetail.generateQuiz"),
                href: `/create/${resource.id}/generate`,
                icon: <Plus className="mr-2 h-4 w-4" />,
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("resourceDetail.questionCount", { count: resource.quizQuestions.length })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("resourceDetail.addQuestion")}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/quiz/${resource.id}/settings`}>
                      <Settings className="mr-2 h-4 w-4" />
                      {t("nav.settings")}
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/quiz/${resource.id}`}>
                      <FileQuestion className="mr-2 h-4 w-4" />
                      {t("resourceDetail.takeQuiz")}
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {resource.quizQuestions.map((question, index) => {
                  const isExpanded = expandedQuestions.has(question.id);
                  const qType = question.questionType || "multiple_choice";
                  const typeLabel =
                    t(`quiz.questionTypes.${qType}`) !== `quiz.questionTypes.${qType}`
                      ? t(`quiz.questionTypes.${qType}`)
                      : question.questionType;
                  return (
                    <Card
                      key={question.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={() => toggleQuestion(question.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                            <span className="text-sm font-medium text-muted-foreground w-8">
                              #{index + 1}
                            </span>
                            <p className="flex-1 text-sm font-medium truncate">
                              {question.question}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {typeLabel}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {parseFloat(question.points || "1")} pts
                            </Badge>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 pt-0 space-y-4 border-t">
                            <div className="pt-3">
                              <QuestionDetails question={question} t={t} />
                            </div>
                            {question.explanation && (
                              <div className="text-sm p-3 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded">
                                <p className="font-medium text-xs uppercase mb-1">
                                  {t("resourceDetail.explanation")}
                                </p>
                                {question.explanation}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingQuestion(question);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                {t("common.edit")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  setDeleteQuestionId(question.id)
                                }
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                {t("common.delete")}
                              </Button>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lessons" className="animate-fade-in">
          {lessons.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="h-12 w-12" />}
              title={t("resourceDetail.noLessonsYet")}
              description={t("resourceDetail.createLessonsDesc")}
              action={{
                label: t("resourceDetail.createLesson"),
                href: `/library/${resource.id}/lessons`,
                icon: <Plus className="mr-2 h-4 w-4" />,
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("resourceDetail.lessonCount", { count: lessons.length })}
                </p>
                <Button asChild>
                  <Link href={`/library/${resource.id}/lessons`}>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    {t("resourceDetail.manageLessons")}
                  </Link>
                </Button>
              </div>
              <div className="space-y-2">
                {lessons.map((lesson, index) => (
                  <Card
                    key={lesson.id}
                    className="group hover:border-primary/30 transition-colors animate-slide-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{lesson.title}</h3>
                          <Badge
                            variant={lesson.status === "published" ? "default" : "secondary"}
                            className="text-xs shrink-0"
                          >
                            {lesson.status}
                          </Badge>
                        </div>
                        {lesson.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/library/${resource.id}/lessons/${lesson.id}`}>
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            {t("resourceDetail.play")}
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/library/${resource.id}/lessons/${lesson.id}/edit`}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            {t("common.edit")}
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resourceDetail.shareResource")}</DialogTitle>
            <DialogDescription>
              {t("resourceDetail.shareResourceDesc")}
            </DialogDescription>
          </DialogHeader>
          {shareUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="icon"
                  onClick={copyShareLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("resourceDetail.anyoneCanView")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("resourceDetail.generateShareLinkDesc")}
              </p>
              <Button
                onClick={() => generateShareToken.mutate()}
                disabled={generateShareToken.isPending}
              >
                {generateShareToken.isPending
                  ? t("common.loading")
                  : t("resourceDetail.generateShareLink")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Resource Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resourceDetail.deleteResourceTitle")}</DialogTitle>
            <DialogDescription>
              {t("resourceDetail.deleteResourceConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteResource.mutate()}
              disabled={deleteResource.isPending}
            >
              {deleteResource.isPending ? t("resourceDetail.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Question Dialog */}
      <Dialog
        open={!!deleteQuestionId}
        onOpenChange={(open) => !open && setDeleteQuestionId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resourceDetail.deleteQuestionTitle")}</DialogTitle>
            <DialogDescription>
              {t("resourceDetail.deleteQuestionConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteQuestionId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteQuestionId && deleteQuestion.mutate(deleteQuestionId)
              }
              disabled={deleteQuestion.isPending}
            >
              {deleteQuestion.isPending ? t("resourceDetail.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <QuestionEditDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingQuestion(null);
        }}
        mode="edit"
        isSaving={updateQuestion.isPending}
        initialData={
          editingQuestion
            ? {
                question: editingQuestion.question,
                questionType:
                  editingQuestion.questionType || "multiple_choice",
                questionConfig: editingQuestion.questionConfig || {},
                correctAnswerData: editingQuestion.correctAnswerData,
                points: parseFloat(editingQuestion.points || "1"),
                explanation: editingQuestion.explanation,
                options: editingQuestion.options,
                correctAnswer: editingQuestion.correctAnswer,
              }
            : undefined
        }
        onSave={(data) => updateQuestion.mutate(data)}
      />

      {/* Create Question Dialog */}
      <QuestionEditDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
        isSaving={createQuestion.isPending}
        onSave={(data) => createQuestion.mutate(data)}
      />

      {/* Resource Settings Dialog */}
      <ResourceSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        resourceId={resource.id}
        initialSettings={{
          availableFrom: resource.availableFrom,
          availableTo: resource.availableTo,
          visibleSections: resource.visibleSections || {
            flashcards: true,
            summary: true,
            quiz: true,
            lessons: true,
          },
          requireAuthToInteract: resource.requireAuthToInteract,
        }}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: ["resource", resourceId] })
        }
      />

      {/* Access Control Dialog */}
      <AccessControlDialog
        open={accessControlDialogOpen}
        onOpenChange={setAccessControlDialogOpen}
        resourceId={resource.id}
        initialEmails={resource.allowedViewerEmails}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: ["resource", resourceId] })
        }
      />
    </div>
  );
}
