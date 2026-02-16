"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, FileText, Loader2, Sparkles, Check, FolderOpen, GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

type CreateResourceForm = z.infer<ReturnType<typeof createResourceSchema>>;

function createResourceSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(1, t("create.titleRequired")).max(255),
    description: z.string().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    folderId: z.string().optional(),
  });
}

interface Folder {
  id: string;
  name: string;
}

export default function CreateResourcePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const { t } = useLocale();

  const steps = [
    {
      number: 1,
      title: t("create.step1"),
      description: t("create.step1Desc"),
      icon: FileText,
    },
    {
      number: 2,
      title: t("create.step2"),
      description: t("create.step2Desc"),
      icon: Sparkles,
    },
    {
      number: 3,
      title: t("create.step3"),
      description: t("create.step3Desc"),
      icon: GraduationCap,
    },
  ];

  const difficultyOptions = [
    { value: "beginner", label: t("common.difficulty.beginner"), color: "text-green-600" },
    { value: "intermediate", label: t("common.difficulty.intermediate"), color: "text-yellow-600" },
    { value: "advanced", label: t("common.difficulty.advanced"), color: "text-red-600" },
  ];

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const form = useForm<CreateResourceForm>({
    resolver: zodResolver(createResourceSchema(t)),
    defaultValues: {
      title: "",
      description: "",
      difficulty: undefined,
      folderId: undefined,
    },
  });

  const createResource = useMutation({
    mutationFn: async (data: CreateResourceForm) => {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create resource");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(t("create.resourceCreated"));
      router.push(`/create/${data.id}/generate`);
    },
    onError: () => {
      toast.error(t("create.failedCreate"));
    },
  });

  const createFolder = useMutation({
    mutationFn: async (data: { name: string; color?: string }) => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      form.setValue("folderId", data.id);
      setNewFolderName("");
      setNewFolderColor("");
      setFolderDialogOpen(false);
      toast.success(t("create.folderCreated"));
    },
    onError: () => {
      toast.error(t("create.failedCreateFolder"));
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder.mutate({
      name: newFolderName.trim(),
      color: newFolderColor || undefined,
    });
  };

  const onSubmit = (data: CreateResourceForm) => {
    createResource.mutate(data);
  };

  // eslint-disable-next-line react-hooks/incompatible-library
  const titleValue = form.watch("title");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title={t("create.title")}
        description={t("create.description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("create.title") },
        ]}
      />

      {/* Step Indicator */}
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted hidden sm:block z-0" />
        <div className="flex justify-between relative z-10">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={cn(
                "flex flex-col items-center gap-2 animate-fade-in",
                index === 0 ? "text-primary" : "text-muted-foreground"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background transition-all relative z-10",
                  index === 0
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted"
                )}
              >
                {index < 0 ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <div className="text-center hidden sm:block">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("create.resourceDetails")}
          </CardTitle>
          <CardDescription>
            {t("create.resourceDetailsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("create.titleLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("create.titlePlaceholder")}
                        className="h-12 text-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("create.titleDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("create.descriptionLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("create.descriptionPlaceholder")}
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create.difficultyLabel")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder={t("create.difficultyPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {difficultyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <span className={option.color}>{option.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t("create.difficultyDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="folderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create.folderLabel")}</FormLabel>
                      <div className="flex gap-2 items-center">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder={t("create.folderPlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {folders.length === 0 ? (
                              <SelectItem value="_none" disabled>
                                <span className="flex items-center gap-2 text-muted-foreground">
                                  <FolderOpen className="h-4 w-4" />
                                  {t("create.noFolders")}
                                </span>
                              </SelectItem>
                            ) : (
                              folders.map((folder) => (
                                <SelectItem key={folder.id} value={folder.id}>
                                  <span className="flex items-center gap-2">
                                    <FolderOpen className="h-4 w-4" />
                                    {folder.name}
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-11 w-11 shrink-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>{t("create.createFolder")}</DialogTitle>
                              <DialogDescription>
                                {t("create.createFolderDesc")}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Input
                                placeholder={t("create.folderName")}
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleCreateFolder();
                                  }
                                }}
                              />
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">{t("create.colorOptional")}</p>
                                <div className="flex gap-2">
                                  {["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"].map((color) => (
                                    <button
                                      key={color}
                                      type="button"
                                      className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all",
                                        newFolderColor === color
                                          ? "border-foreground scale-110"
                                          : "border-transparent"
                                      )}
                                      style={{ backgroundColor: color }}
                                      onClick={() => setNewFolderColor(newFolderColor === color ? "" : color)}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                type="button"
                                disabled={!newFolderName.trim() || createFolder.isPending}
                                onClick={handleCreateFolder}
                              >
                                {createFolder.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("common.creating")}
                                  </>
                                ) : (
                                  t("create.createFolder")
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <FormDescription>
                        {t("create.folderDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Preview card */}
              {titleValue && (
                <div className="rounded-lg border bg-muted/30 p-4 animate-fade-in">
                  <p className="text-xs text-muted-foreground mb-2">{t("common.preview")}</p>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{titleValue}</p>
                      <p className="text-sm text-muted-foreground">
                        {form.watch("description") || t("create.noDescription")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/library")}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createResource.isPending || !titleValue}
                  className="min-w-[140px]"
                >
                  {createResource.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common.creating")}
                    </>
                  ) : (
                    <>
                      {t("common.continue")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Tips card */}
      <Card className="bg-primary/5 border-primary/20 animate-slide-up" style={{ animationDelay: "100ms" }}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3 shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t("common.proTip")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("create.proTipText")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
