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

const createResourceSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  folderId: z.string().optional(),
});

type CreateResourceForm = z.infer<typeof createResourceSchema>;

interface Folder {
  id: string;
  name: string;
}

const steps = [
  {
    number: 1,
    title: "Details",
    description: "Name your resource",
    icon: FileText,
  },
  {
    number: 2,
    title: "Generate",
    description: "Add content & generate",
    icon: Sparkles,
  },
  {
    number: 3,
    title: "Study",
    description: "Start learning",
    icon: GraduationCap,
  },
];

const difficultyOptions = [
  { value: "beginner", label: "Beginner", color: "text-green-600" },
  { value: "intermediate", label: "Intermediate", color: "text-yellow-600" },
  { value: "advanced", label: "Advanced", color: "text-red-600" },
];

export default function CreateResourcePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const form = useForm<CreateResourceForm>({
    resolver: zodResolver(createResourceSchema),
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
      toast.success("Resource created");
      router.push(`/create/${data.id}/generate`);
    },
    onError: () => {
      toast.error("Failed to create resource");
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
      toast.success("Folder created");
    },
    onError: () => {
      toast.error("Failed to create folder");
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

  const titleValue = form.watch("title");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title="Create Resource"
        description="Start by setting up your study material"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Create Resource" },
        ]}
      />

      {/* Step Indicator */}
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted hidden sm:block" />
        <div className="flex justify-between relative">
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
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background transition-all",
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
            Resource Details
          </CardTitle>
          <CardDescription>
            Give your resource a title and optional details to help organize your studies
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
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Biology Chapter 5: Cell Division"
                        className="h-12 text-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a descriptive title for your study material
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What topics does this resource cover? Any specific learning goals?"
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
                      <FormLabel>Difficulty Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select difficulty" />
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
                        Helps tailor generated content
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
                      <FormLabel>Folder</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select folder" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {folders.length === 0 ? (
                              <SelectItem value="_none" disabled>
                                <span className="flex items-center gap-2 text-muted-foreground">
                                  <FolderOpen className="h-4 w-4" />
                                  No folders yet
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
                              className="h-11 w-11 shrink-0 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Create Folder</DialogTitle>
                              <DialogDescription>
                                Add a new folder to organize your resources.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Input
                                placeholder="Folder name"
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
                                <p className="text-sm text-muted-foreground mb-2">Color (optional)</p>
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
                                    Creating...
                                  </>
                                ) : (
                                  "Create Folder"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <FormDescription>
                        Organize resources into folders
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Preview card */}
              {titleValue && (
                <div className="rounded-lg border bg-muted/30 p-4 animate-fade-in">
                  <p className="text-xs text-muted-foreground mb-2">Preview</p>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{titleValue}</p>
                      <p className="text-sm text-muted-foreground">
                        {form.watch("description") || "No description"}
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createResource.isPending || !titleValue}
                  className="min-w-[140px]"
                >
                  {createResource.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Continue
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
              <h3 className="font-semibold mb-1">Pro tip</h3>
              <p className="text-sm text-muted-foreground">
                After creating your resource, you can paste any text content—lecture notes,
                textbook excerpts, or articles—and our AI will generate flashcards, quizzes,
                and summaries automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
