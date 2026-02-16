"use client";

import { useEffect, useState } from "react";
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
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage, localizeErrorMessage } from "@/lib/i18n/error-localizer";

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

export default function QuestionTypesPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingType, setEditingType] = useState<QuestionType | null>(null);
  const [deleteType, setDeleteType] = useState<QuestionType | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["question-types"],
    queryFn: async (): Promise<{ questionTypes: QuestionType[] }> => {
      const res = await fetch("/api/question-types");
      if (!res.ok) {
        const rawError = await getApiErrorMessage(res, "Failed to fetch question types");
        throw new Error(localizeErrorMessage(rawError, t, "errors.failedToFetch"));
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (error instanceof Error) {
      toast.error(localizeErrorMessage(error, t, "errors.failedToFetch"));
    }
  }, [error, t]);

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
        const rawError = await getApiErrorMessage(res, "Failed to create question type");
        throw new Error(localizeErrorMessage(rawError, t, "questionTypes.failedCreate"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-types"] });
      setIsCreateOpen(false);
      toast.success(t("questionTypes.created"));
    },
    onError: (error: Error) => {
      toast.error(localizeErrorMessage(error, t, "questionTypes.failedCreate"));
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
        const rawError = await getApiErrorMessage(res, "Failed to update question type");
        throw new Error(localizeErrorMessage(rawError, t, "questionTypes.failedUpdate"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-types"] });
      setEditingType(null);
      toast.success(t("questionTypes.updated"));
    },
    onError: (error: Error) => {
      toast.error(localizeErrorMessage(error, t, "questionTypes.failedUpdate"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (typeId: string) => {
      const res = await fetch(`/api/question-types/${typeId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const rawError = await getApiErrorMessage(res, "Failed to delete question type");
        throw new Error(localizeErrorMessage(rawError, t, "questionTypes.failedDelete"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-types"] });
      setDeleteType(null);
      toast.success(t("questionTypes.deleted"));
    },
    onError: (error: Error) => {
      toast.error(localizeErrorMessage(error, t, "questionTypes.failedDelete"));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ typeId, isActive }: { typeId: string; isActive: boolean }) => {
      const res = await fetch(`/api/question-types/${typeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const rawError = await getApiErrorMessage(res, "Failed to update question type");
        throw new Error(localizeErrorMessage(rawError, t, "questionTypes.failedUpdate"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-types"] });
    },
    onError: (error: Error) => {
      toast.error(localizeErrorMessage(error, t, "questionTypes.failedUpdate"));
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        title={t("questionTypes.title")}
        description={t("questionTypes.description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.settings"), href: "/settings" },
          { label: t("questionTypes.title") },
        ]}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("questionTypes.createCustomType")}
          </Button>
        }
      />

      {/* Built-in Types */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {t("questionTypes.builtInTypes")}
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
                        {t("questionTypes.active")}
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        {t("questionTypes.disabled")}
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {type.description || t("questionTypes.noDescription")}
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
          {t("questionTypes.customTypes")}
        </h2>

        {customTypes.length === 0 ? (
          <EmptyState
            icon={<Settings2 className="h-12 w-12" />}
            title={t("questionTypes.noCustomTypes")}
            description={t("questionTypes.noCustomTypesDesc")}
            action={{
              label: t("questionTypes.createCustomType"),
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
                    {type.description || t("questionTypes.noDescription")}
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
                      {type.isActive ? t("questionTypes.active") : t("questionTypes.disabled")}
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
            <DialogTitle>{t("questionTypes.createDialog")}</DialogTitle>
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
            <DialogTitle>{t("questionTypes.editDialog")}</DialogTitle>
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
            <AlertDialogTitle>{t("questionTypes.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("questionTypes.deleteConfirm", { name: deleteType?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteType && deleteMutation.mutate(deleteType.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
