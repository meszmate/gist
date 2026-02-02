"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Settings2,
  Lock,
  Check,
  X,
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
import { CustomTypeBuilder } from "@/components/quiz/custom-type-builder";
import { toast } from "sonner";

interface QuestionType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  configSchema: Record<string, unknown>;
  answerSchema: Record<string, unknown>;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
}

async function fetchQuestionTypes(): Promise<{ questionTypes: QuestionType[] }> {
  const res = await fetch("/api/question-types");
  if (!res.ok) throw new Error("Failed to fetch question types");
  return res.json();
}

export default function QuestionTypesPage() {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingType, setEditingType] = useState<QuestionType | null>(null);
  const [deleteType, setDeleteType] = useState<QuestionType | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["question-types"],
    queryFn: fetchQuestionTypes,
  });

  const createMutation = useMutation({
    mutationFn: async (typeData: {
      slug: string;
      name: string;
      description: string;
      configSchema: Record<string, unknown>;
      answerSchema: Record<string, unknown>;
    }) => {
      const res = await fetch("/api/question-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create question type");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-types"] });
      setIsCreateOpen(false);
      toast.success("Question type created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      typeId,
      data,
    }: {
      typeId: string;
      data: {
        slug: string;
        name: string;
        description: string;
        configSchema: Record<string, unknown>;
        answerSchema: Record<string, unknown>;
      };
    }) => {
      const res = await fetch(`/api/question-types/${typeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update question type");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-types"] });
      setEditingType(null);
      toast.success("Question type updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (typeId: string) => {
      const res = await fetch(`/api/question-types/${typeId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete question type");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-types"] });
      setDeleteType(null);
      toast.success("Question type deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ typeId, isActive }: { typeId: string; isActive: boolean }) => {
      const res = await fetch(`/api/question-types/${typeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update question type");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-types"] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const questionTypes = data?.questionTypes || [];
  const systemTypes = questionTypes.filter((t) => t.isSystem);
  const customTypes = questionTypes.filter((t) => !t.isSystem);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Question Types"
        description="Manage built-in and custom question types for your quizzes"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "Question Types" },
        ]}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Type
          </Button>
        }
      />

      {/* Built-in Types */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Built-in Types
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemTypes.map((type) => (
            <Card key={type.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {type.name}
                      <Badge variant="secondary" className="text-xs">
                        {type.slug}
                      </Badge>
                    </CardTitle>
                  </div>
                  <Badge
                    variant={type.isActive ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        typeId: type.id,
                        isActive: !type.isActive,
                      })
                    }
                  >
                    {type.isActive ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Disabled
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {type.description || "No description"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Types */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Custom Types
        </h2>

        {customTypes.length === 0 ? (
          <EmptyState
            icon={<Settings2 className="h-12 w-12" />}
            title="No custom question types"
            description="Create your own question types with custom validation rules"
            action={{
              label: "Create Custom Type",
              onClick: () => setIsCreateOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customTypes.map((type) => (
              <Card key={type.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {type.name}
                        <Badge variant="outline" className="text-xs">
                          {type.slug}
                        </Badge>
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingType(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteType(type)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {type.description || "No description"}
                  </p>
                  <div className="flex gap-2">
                    <Badge
                      variant={type.isActive ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        toggleActiveMutation.mutate({
                          typeId: type.id,
                          isActive: !type.isActive,
                        })
                      }
                    >
                      {type.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Question Type</DialogTitle>
          </DialogHeader>
          <CustomTypeBuilder
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingType} onOpenChange={() => setEditingType(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question Type</DialogTitle>
          </DialogHeader>
          {editingType && (
            <CustomTypeBuilder
              initialData={{
                slug: editingType.slug,
                name: editingType.name,
                description: editingType.description || "",
                configSchema: editingType.configSchema,
                answerSchema: editingType.answerSchema,
              }}
              onSave={(data) =>
                updateMutation.mutate({
                  typeId: editingType.id,
                  data,
                })
              }
              onCancel={() => setEditingType(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteType} onOpenChange={() => setDeleteType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{deleteType?.name}&quot; question
              type? This will not affect existing questions that use this type,
              but you won&apos;t be able to create new questions with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteType && deleteMutation.mutate(deleteType.id)}
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
