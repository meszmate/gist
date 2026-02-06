"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QuestionBuilder } from "@/components/quiz/question-builder";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import type {
  QuestionConfig,
  CorrectAnswerData,
  QuestionTypeSlug,
} from "@/lib/types/quiz";

interface Question {
  id: string;
  question: string;
  questionType: QuestionTypeSlug;
  questionConfig: QuestionConfig;
  correctAnswerData: CorrectAnswerData | null;
  points: string;
  order: number | null;
  explanation: string | null;
  options: string[] | null;
  correctAnswer: number | null;
}

async function fetchQuestions(quizId: string): Promise<{ questions: Question[] }> {
  const res = await fetch(`/api/quizzes/${quizId}/questions`);
  if (!res.ok) throw new Error("Failed to fetch questions");
  return res.json();
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True/False",
  text_input: "Text Input",
  year_range: "Year",
  numeric_range: "Numeric",
  matching: "Matching",
  fill_blank: "Fill Blank",
  multi_select: "Multi-Select",
};

export default function QuestionsEditorPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const quizId = params.quizId as string;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState<Question | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz-questions", quizId],
    queryFn: () => fetchQuestions(quizId),
  });

  const createMutation = useMutation({
    mutationFn: async (questionData: {
      question: string;
      questionType: QuestionTypeSlug;
      questionConfig: QuestionConfig;
      correctAnswerData: CorrectAnswerData;
      points: number;
      explanation?: string;
    }) => {
      const res = await fetch(`/api/quizzes/${quizId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionData),
      });
      if (!res.ok) throw new Error("Failed to create question");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
      setIsCreateOpen(false);
      toast.success("Question created successfully");
    },
    onError: () => {
      toast.error("Failed to create question");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      questionId,
      data,
    }: {
      questionId: string;
      data: {
        question: string;
        questionType: QuestionTypeSlug;
        questionConfig: QuestionConfig;
        correctAnswerData: CorrectAnswerData;
        points: number;
        explanation?: string;
      };
    }) => {
      const res = await fetch(`/api/quizzes/${quizId}/questions/${questionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update question");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
      setEditingQuestion(null);
      toast.success("Question updated successfully");
    },
    onError: () => {
      toast.error("Failed to update question");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const res = await fetch(`/api/quizzes/${quizId}/questions/${questionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete question");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
      setDeleteQuestion(null);
      toast.success("Question deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete question");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (questionOrders: { id: string; order: number }[]) => {
      const res = await fetch(`/api/quizzes/${quizId}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionOrders }),
      });
      if (!res.ok) throw new Error("Failed to reorder questions");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
    },
  });

  const moveQuestion = (questionId: string, direction: "up" | "down") => {
    const questions = data?.questions || [];
    const currentIndex = questions.findIndex((q) => q.id === questionId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const newOrders = questions.map((q, index) => {
      if (index === currentIndex) return { id: q.id, order: newIndex + 1 };
      if (index === newIndex) return { id: q.id, order: currentIndex + 1 };
      return { id: q.id, order: index + 1 };
    });

    reorderMutation.mutate(newOrders);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const questions = data?.questions || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Edit Questions"
        description="Add, edit, reorder, or remove quiz questions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Quizzes", href: "/quiz" },
          { label: "Quiz", href: `/quiz/${quizId}` },
          { label: "Edit Questions" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/quiz/${quizId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quiz
              </Link>
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        }
      />

      {questions.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-12 w-12" />}
          title="No questions yet"
          description="Add your first question to get started"
          action={{
            label: "Add Question",
            onClick: () => setIsCreateOpen(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <Card key={question.id} className="overflow-hidden">
              <div
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setExpandedQuestion(
                    expandedQuestion === question.id ? null : question.id
                  )
                }
              >
                <div className="flex flex-col items-center gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveQuestion(question.id, "up");
                    }}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === questions.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveQuestion(question.id, "down");
                    }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {QUESTION_TYPE_LABELS[question.questionType] ||
                        question.questionType}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {parseFloat(question.points || "1")} pts
                    </Badge>
                  </div>
                  <p className="font-medium line-clamp-2">{question.question}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingQuestion(question);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteQuestion(question);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {expandedQuestion === question.id && (
                <CardContent className="pt-0 border-t">
                  <div className="pt-4 space-y-2 text-sm">
                    {question.explanation && (
                      <div>
                        <span className="font-medium">Explanation: </span>
                        <span className="text-muted-foreground">
                          {question.explanation}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Config: </span>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(question.questionConfig, null, 2)}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Question Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
          </DialogHeader>
          <QuestionBuilder
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog
        open={!!editingQuestion}
        onOpenChange={() => setEditingQuestion(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <QuestionBuilder
              initialData={{
                question: editingQuestion.question,
                questionType: editingQuestion.questionType,
                questionConfig: editingQuestion.questionConfig || {},
                correctAnswerData: editingQuestion.correctAnswerData || {},
                points: parseFloat(editingQuestion.points || "1"),
                explanation: editingQuestion.explanation || undefined,
              }}
              onSave={(data) =>
                updateMutation.mutate({
                  questionId: editingQuestion.id,
                  data,
                })
              }
              onCancel={() => setEditingQuestion(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteQuestion}
        onOpenChange={() => setDeleteQuestion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteQuestion && deleteMutation.mutate(deleteQuestion.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
