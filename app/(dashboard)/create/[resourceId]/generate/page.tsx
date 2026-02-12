"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BookOpen,
  Brain,
  FileQuestion,
  FileText,
  Sparkles,
  Check,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FileUploadDropzone } from "@/components/upload/file-upload-dropzone";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

function createGenerateSchema(t: (key: string) => string) {
  return z.object({
    sourceContent: z.string().min(50, t("generate.contentMinLength")),
    generateSummary: z.boolean(),
    generateFlashcards: z.boolean(),
    generateQuiz: z.boolean(),
    flashcardCount: z.number().min(1).max(50),
    quizQuestionCount: z.number().min(1).max(30),
  });
}

type GenerateForm = z.infer<ReturnType<typeof createGenerateSchema>>;

interface Resource {
  id: string;
  title: string;
  description: string | null;
  sourceContent: string | null;
  summary: string | null;
}

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useLocale();
  const resourceId = params.resourceId as string;
  const [progress, setProgress] = useState(0);
  const [generatingStep, setGeneratingStep] = useState<string | null>(null);

  const generateSchema = useMemo(() => createGenerateSchema(t), [t]);

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

  const generateOptions = [
    {
      name: "generateSummary" as const,
      icon: BookOpen,
      title: t("generate.summary"),
      description: t("generate.summaryDesc"),
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "generateFlashcards" as const,
      icon: Brain,
      title: t("generate.flashcards"),
      description: t("generate.flashcardsDesc"),
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      hasCount: true,
      countName: "flashcardCount" as const,
      countLabel: t("generate.numFlashcards"),
      countMax: 50,
    },
    {
      name: "generateQuiz" as const,
      icon: FileQuestion,
      title: t("generate.quizQuestions"),
      description: t("generate.quizDesc"),
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      hasCount: true,
      countName: "quizQuestionCount" as const,
      countLabel: t("generate.numQuestions"),
      countMax: 30,
    },
  ];

  const { data: resource, isLoading } = useQuery<Resource>({
    queryKey: ["resource", resourceId],
    queryFn: async () => {
      const res = await fetch(`/api/resources/${resourceId}`);
      if (!res.ok) throw new Error("Resource not found");
      return res.json();
    },
  });

  const form = useForm<GenerateForm>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      sourceContent: resource?.sourceContent || "",
      generateSummary: true,
      generateFlashcards: true,
      generateQuiz: true,
      flashcardCount: 10,
      quizQuestionCount: 5,
    },
  });

  const generate = useMutation({
    mutationFn: async (data: GenerateForm) => {
      const steps = [];
      if (data.generateSummary) steps.push("summary");
      if (data.generateFlashcards) steps.push("flashcards");
      if (data.generateQuiz) steps.push("quiz");

      let currentProgress = 0;
      const progressPerStep = 100 / steps.length;

      // First, save the source content
      setGeneratingStep(t("generate.savingContent"));
      await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceContent: data.sourceContent }),
      });

      // Generate each type of content
      for (const step of steps) {
        setGeneratingStep(
          step === "summary"
            ? t("generate.generatingSummary")
            : step === "flashcards"
            ? t("generate.creatingFlashcards")
            : t("generate.buildingQuiz")
        );

        const res = await fetch(`/api/resources/${resourceId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: step,
            sourceContent: data.sourceContent,
            count: step === "flashcards" ? data.flashcardCount : data.quizQuestionCount,
            locale,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to generate ${step}`);
        }

        currentProgress += progressPerStep;
        setProgress(Math.round(currentProgress));
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      toast.success(t("generate.contentGenerated"));
      router.push(`/library/${resourceId}`);
    },
    onError: (error) => {
      toast.error(error.message || t("generate.failedToGenerate"));
      setProgress(0);
      setGeneratingStep(null);
    },
  });

  const onSubmit = (data: GenerateForm) => {
    if (!data.generateSummary && !data.generateFlashcards && !data.generateQuiz) {
      toast.error(t("generate.selectAtLeastOne"));
      return;
    }
    generate.mutate(data);
  };

  // eslint-disable-next-line react-hooks/incompatible-library
  const contentLength = form.watch("sourceContent")?.length || 0;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!resource) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title={t("generate.resourceNotFound")}
        description={t("generate.resourceNotFoundDesc")}
        action={{
          label: t("generate.backToLibrary"),
          href: "/library",
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title={t("generate.title")}
        description={resource.title}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.create"), href: "/create" },
          { label: t("generate.title") },
        ]}
      />

      {/* Step Indicator */}
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted hidden sm:block" />
        <div className="absolute top-5 left-0 w-1/3 h-0.5 bg-primary hidden sm:block" />
        <div className="flex justify-between relative">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={cn(
                "flex flex-col items-center gap-2 animate-fade-in",
                index <= 1 ? "text-primary" : "text-muted-foreground"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background transition-all",
                  index < 1
                    ? "border-primary bg-primary/10"
                    : index === 1
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted"
                )}
              >
                {index < 1 ? (
                  <Check className="h-5 w-5 text-primary" />
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

      {generate.isPending ? (
        <Card className="animate-fade-in">
          <CardContent className="py-16">
            <div className="text-center space-y-6">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{generatingStep}</h3>
                <p className="text-muted-foreground">
                  {t("generate.aiWorking")}
                </p>
              </div>
              <div className="max-w-sm mx-auto space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">{t("generate.percentComplete", { progress })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {t("generate.sourceContent")}
                </CardTitle>
                <CardDescription>
                  {t("generate.sourceContentDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileUploadDropzone
                  onTextExtracted={(text) => {
                    const current = form.getValues("sourceContent");
                    if (current.trim()) {
                      form.setValue("sourceContent", current + "\n\n---\n\n" + text, { shouldValidate: true });
                    } else {
                      form.setValue("sourceContent", text, { shouldValidate: true });
                    }
                    toast.success(t("generate.textExtracted"));
                  }}
                  onError={(message) => toast.error(message)}
                  disabled={generate.isPending}
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {t("generate.orPasteText")}
                    </span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="sourceContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder={t("generate.pastePlaceholder")}
                          className="min-h-[200px] text-base leading-relaxed"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between">
                        <FormDescription>
                          {t("generate.characters", { count: contentLength })}
                          {contentLength < 50 && (
                            <span className="text-destructive ml-1">
                              {t("generate.minRequired")}
                            </span>
                          )}
                        </FormDescription>
                        {contentLength >= 50 && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {t("generate.readyToGenerate")}
                          </span>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="animate-slide-up" style={{ animationDelay: "50ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t("generate.whatToGenerate")}
                </CardTitle>
                <CardDescription>
                  {t("generate.whatToGenerateDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generateOptions.map((option, index) => (
                  <div
                    key={option.name}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <FormField
                      control={form.control}
                      name={option.name}
                      render={({ field }) => (
                        <FormItem
                          className={cn(
                            "flex items-start space-x-4 space-y-0 rounded-lg border p-4 transition-all",
                            field.value
                              ? "border-primary/50 bg-primary/5"
                              : "hover:border-muted-foreground/50"
                          )}
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("rounded-lg p-2", option.bgColor)}>
                                <option.icon className={cn("h-5 w-5", option.color)} />
                              </div>
                              <div>
                                <FormLabel className="text-base font-medium cursor-pointer">
                                  {option.title}
                                </FormLabel>
                                <FormDescription className="mt-0.5">
                                  {option.description}
                                </FormDescription>
                              </div>
                            </div>

                            {option.hasCount && field.value && (
                              <FormField
                                control={form.control}
                                name={option.countName}
                                render={({ field: countField }) => (
                                  <FormItem className="space-y-3 pl-12">
                                    <div className="flex items-center justify-between">
                                      <FormLabel className="text-sm">
                                        {option.countLabel}
                                      </FormLabel>
                                      <span className="text-sm font-medium tabular-nums">
                                        {countField.value}
                                      </span>
                                    </div>
                                    <FormControl>
                                      <Slider
                                        min={1}
                                        max={option.countMax}
                                        step={1}
                                        value={[countField.value]}
                                        onValueChange={([value]) =>
                                          countField.onChange(value)
                                        }
                                        className="py-2"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-between gap-4 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href={`/library/${resourceId}`}>{t("generate.skipForNow")}</Link>
              </Button>
              <Button
                type="submit"
                disabled={generate.isPending || contentLength < 50}
                className="min-w-[160px]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {t("generate.generateContent")}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
