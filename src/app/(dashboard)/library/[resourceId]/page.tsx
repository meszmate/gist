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
  Clock,
  Target,
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
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  sourceContent: string | null;
  difficulty: string | null;
  shareToken: string | null;
  isPublic: boolean;
  createdAt: string;
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

async function fetchResource(id: string): Promise<Resource> {
  const res = await fetch(`/api/resources/${id}`);
  if (!res.ok) throw new Error("Failed to fetch resource");
  return res.json();
}

export default function ResourcePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const resourceId = params.resourceId as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);

  const { data: resource, isLoading } = useQuery({
    queryKey: ["resource", resourceId],
    queryFn: () => fetchResource(resourceId),
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
      toast.success("Resource deleted");
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
      toast.success("Resource updated");
    },
    onError: () => {
      toast.error("Failed to update resource");
    },
  });

  // Keyboard navigation for tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const tabs = ["overview", "flashcards", "quiz"];
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
      toast.success("Link copied to clipboard");
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
        title="Resource not found"
        description="This resource may have been deleted or doesn't exist."
        action={{
          label: "Back to Library",
          href: "/library",
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              <BreadcrumbSeparator />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/library">Library</BreadcrumbLink>
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
              placeholder="Add a description..."
              className="text-muted-foreground"
              inputClassName="text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 animate-fade-in shrink-0">
            <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button asChild>
              <Link href={`/create/${resource.id}/generate`}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate More
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap animate-fade-in">
        {resource.difficulty && (
          <Badge className={cn("border", getDifficultyColor(resource.difficulty))}>
            {resource.difficulty}
          </Badge>
        )}
        <Badge variant="outline" className="gap-1">
          <Brain className="h-3 w-3" />
          {resource.flashcards.length} flashcards
        </Badge>
        <Badge variant="outline" className="gap-1">
          <FileQuestion className="h-3 w-3" />
          {resource.quizQuestions.length} quiz questions
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Created {new Date(resource.createdAt).toLocaleDateString()}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-2">
            <Brain className="h-4 w-4" />
            Flashcards
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {resource.flashcards.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-2">
            <FileQuestion className="h-4 w-4" />
            Quiz
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {resource.quizQuestions.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <div className="text-xs text-muted-foreground">
          Use <kbd className="px-1.5 py-0.5 bg-muted rounded border mx-1">h</kbd> and{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded border mx-1">l</kbd> to switch tabs
        </div>

        <TabsContent value="overview" className="space-y-6 animate-fade-in">
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Flashcards"
              value={resource.flashcards.length}
              description="Total cards"
              icon={<Brain className="h-5 w-5" />}
              onClick={() => setActiveTab("flashcards")}
            />
            <StatCard
              title="Quiz Questions"
              value={resource.quizQuestions.length}
              description="Multiple choice"
              icon={<FileQuestion className="h-5 w-5" />}
              onClick={() => setActiveTab("quiz")}
            />
            <StatCard
              title="Difficulty"
              value={resource.difficulty || "Not set"}
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
                        Summary
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
                  No summary generated yet
                </p>
                <Button asChild>
                  <Link href={`/create/${resource.id}/generate`}>
                    Generate Summary
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
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {resource.flashcards.length > 0 && (
                <Button asChild variant="outline" className="justify-start h-auto py-4">
                  <Link href={`/study?resource=${resource.id}`}>
                    <Brain className="mr-3 h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Study Flashcards</div>
                      <div className="text-xs text-muted-foreground">
                        Review with spaced repetition
                      </div>
                    </div>
                  </Link>
                </Button>
              )}
              {resource.quizQuestions.length > 0 && (
                <Button asChild variant="outline" className="justify-start h-auto py-4">
                  <Link href={`/quiz/${resource.id}`}>
                    <FileQuestion className="mr-3 h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Take Quiz</div>
                      <div className="text-xs text-muted-foreground">
                        Test your knowledge
                      </div>
                    </div>
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="justify-start h-auto py-4">
                <Link href={`/create/${resource.id}/generate`}>
                  <Sparkles className="mr-3 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Generate Content</div>
                    <div className="text-xs text-muted-foreground">
                      Add more cards or questions
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
                  <div className="font-medium">Delete Resource</div>
                  <div className="text-xs opacity-80">
                    Remove permanently
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flashcards" className="animate-fade-in">
          {resource.flashcards.length === 0 ? (
            <EmptyState
              icon={<Brain className="h-12 w-12" />}
              title="No flashcards yet"
              description="Generate flashcards from your content to start studying"
              action={{
                label: "Generate Flashcards",
                href: `/create/${resource.id}/generate`,
                icon: <Plus className="mr-2 h-4 w-4" />,
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {resource.flashcards.length} flashcard{resource.flashcards.length !== 1 ? "s" : ""}
                </p>
                <Button asChild>
                  <Link href={`/study?resource=${resource.id}`}>
                    <Brain className="mr-2 h-4 w-4" />
                    Start Study Session
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
                          Question
                        </span>
                        <p className="text-sm mt-1">{card.front}</p>
                      </div>
                      <div className="border-t pt-3">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Answer
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
              title="No quiz questions yet"
              description="Generate quiz questions to test your knowledge"
              action={{
                label: "Generate Quiz",
                href: `/create/${resource.id}/generate`,
                icon: <Plus className="mr-2 h-4 w-4" />,
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {resource.quizQuestions.length} question{resource.quizQuestions.length !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/quiz/${resource.id}/settings`}>
                      Quiz Settings
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/quiz/${resource.id}`}>
                      <FileQuestion className="mr-2 h-4 w-4" />
                      Take Quiz
                    </Link>
                  </Button>
                </div>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead className="w-24 text-center">Options</TableHead>
                      <TableHead className="w-32">Correct</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resource.quizQuestions.map((question, index) => (
                      <TableRow key={question.id} className="animate-slide-up" style={{ animationDelay: `${index * 30}ms` }}>
                        <TableCell className="font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {question.question}
                        </TableCell>
                        <TableCell className="text-center">
                          {question.options.length}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                            {String.fromCharCode(65 + question.correctAnswer)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Resource</DialogTitle>
            <DialogDescription>
              Share this resource with others via a public link
            </DialogDescription>
          </DialogHeader>
          {shareUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="font-mono text-sm" />
                <Button size="icon" onClick={copyShareLink} className="shrink-0">
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view this resource
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a share link to allow others to view this resource
              </p>
              <Button
                onClick={() => generateShareToken.mutate()}
                disabled={generateShareToken.isPending}
              >
                {generateShareToken.isPending
                  ? "Generating..."
                  : "Generate Share Link"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resource</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this resource? This action cannot
              be undone. All flashcards and quiz questions will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteResource.mutate()}
              disabled={deleteResource.isPending}
            >
              {deleteResource.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
