"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Share2, Copy, Check, Clock, Users, Shuffle, Eye, GraduationCap, Settings2, ListOrdered, FileText } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import Link from "next/link";
import { useState } from "react";
import { QuizPdfPreview } from "@/components/pdf/quiz-pdf-preview";
import type { QuizQuestion } from "@/components/pdf/quiz-pdf-document";

const quizSettingsSchema = z.object({
  timeLimitMinutes: z.number().min(0).max(180).optional(),
  requireSignin: z.boolean(),
  allowedEmails: z.string().optional(),
  maxAttempts: z.number().min(0).max(100).optional(),
  shuffleQuestions: z.boolean(),
  showCorrectAnswers: z.boolean(),
  // Grading settings
  gradingType: z.enum(["percentage", "letter", "pass_fail", "points"]),
  passThreshold: z.number().min(0).max(100),
  showPointValues: z.boolean(),
  partialCreditEnabled: z.boolean(),
});

type QuizSettingsForm = z.infer<typeof quizSettingsSchema>;

interface QuizSettings {
  id: string;
  timeLimitSeconds: number | null;
  requireSignin: boolean;
  allowedEmails: string[] | null;
  maxAttempts: number | null;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
}

interface GradingConfig {
  gradingType: "percentage" | "letter" | "pass_fail" | "points";
  passThreshold: number;
  showPointValues: boolean;
  partialCreditEnabled: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  shareToken: string | null;
  settings: QuizSettings | null;
  gradingConfig?: GradingConfig | null;
  questions?: QuizQuestion[];
}

async function fetchQuizSettings(quizId: string): Promise<Quiz> {
  const [settingsRes, gradingRes, questionsRes] = await Promise.all([
    fetch(`/api/quizzes/${quizId}/settings`),
    fetch(`/api/quizzes/${quizId}/grading`),
    fetch(`/api/quizzes/${quizId}/questions`),
  ]);
  if (!settingsRes.ok) throw new Error("Failed to fetch quiz settings");
  const settings = await settingsRes.json();
  const grading = gradingRes.ok ? await gradingRes.json() : null;
  const questionsData = questionsRes.ok ? await questionsRes.json() : null;
  return { ...settings, gradingConfig: grading, questions: questionsData?.questions || [] };
}

export default function QuizSettingsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const quizId = params.quizId as string;
  const [copied, setCopied] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz-settings", quizId],
    queryFn: () => fetchQuizSettings(quizId),
  });

  const form = useForm<QuizSettingsForm>({
    resolver: zodResolver(quizSettingsSchema),
    defaultValues: {
      timeLimitMinutes: 0,
      requireSignin: false,
      allowedEmails: "",
      maxAttempts: 0,
      shuffleQuestions: true,
      showCorrectAnswers: true,
      gradingType: "percentage",
      passThreshold: 60,
      showPointValues: false,
      partialCreditEnabled: true,
    },
    values: quiz
      ? {
          timeLimitMinutes: quiz.settings?.timeLimitSeconds
            ? Math.floor(quiz.settings.timeLimitSeconds / 60)
            : 0,
          requireSignin: quiz.settings?.requireSignin ?? false,
          allowedEmails: quiz.settings?.allowedEmails?.join("\n") || "",
          maxAttempts: quiz.settings?.maxAttempts || 0,
          shuffleQuestions: quiz.settings?.shuffleQuestions ?? true,
          showCorrectAnswers: quiz.settings?.showCorrectAnswers ?? true,
          gradingType: quiz.gradingConfig?.gradingType || "percentage",
          passThreshold: quiz.gradingConfig?.passThreshold || 60,
          showPointValues: quiz.gradingConfig?.showPointValues ?? false,
          partialCreditEnabled: quiz.gradingConfig?.partialCreditEnabled ?? true,
        }
      : undefined,
  });

  const saveSettings = useMutation({
    mutationFn: async (data: QuizSettingsForm) => {
      // Save quiz settings
      const settingsRes = await fetch(`/api/quizzes/${quizId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeLimitSeconds: data.timeLimitMinutes
            ? data.timeLimitMinutes * 60
            : null,
          requireSignin: data.requireSignin,
          allowedEmails: data.allowedEmails
            ? data.allowedEmails
                .split("\n")
                .map((e) => e.trim())
                .filter(Boolean)
            : null,
          maxAttempts: data.maxAttempts || null,
          shuffleQuestions: data.shuffleQuestions,
          showCorrectAnswers: data.showCorrectAnswers,
        }),
      });
      if (!settingsRes.ok) throw new Error("Failed to save settings");

      // Save grading config
      const gradingRes = await fetch(`/api/quizzes/${quizId}/grading`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradingType: data.gradingType,
          passThreshold: data.passThreshold,
          showPointValues: data.showPointValues,
          partialCreditEnabled: data.partialCreditEnabled,
        }),
      });
      if (!gradingRes.ok) throw new Error("Failed to save grading config");

      return settingsRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-settings", quizId] });
      toast.success("Settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const generateShareLink = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/resources/${quizId}/share`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate share link");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-settings", quizId] });
      toast.success("Share link generated");
    },
  });

  const shareUrl = quiz?.shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/quiz/${quiz.shareToken}`
    : null;

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <EmptyState
        icon={<Clock className="h-12 w-12" />}
        title="Quiz not found"
        description="This quiz may have been deleted or doesn't exist."
        action={{
          label: "Back to Quizzes",
          href: "/quiz",
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Quiz Settings"
        description={quiz.title}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Quizzes", href: "/quiz" },
          { label: quiz.title, href: `/quiz/${quizId}` },
          { label: "Settings" },
        ]}
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => saveSettings.mutate(data))}
          className="space-y-6"
        >
          {/* Time & Attempts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Time & Attempts
              </CardTitle>
              <CardDescription>
                Configure time limits and attempt restrictions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="timeLimitMinutes"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Time Limit</FormLabel>
                      <span className="text-sm font-medium">
                        {field.value === 0 ? "No limit" : `${field.value} min`}
                      </span>
                    </div>
                    <FormControl>
                      <Slider
                        min={0}
                        max={120}
                        step={5}
                        value={[field.value ?? 0]}
                        onValueChange={([value]) => field.onChange(value)}
                        className="py-4"
                      />
                    </FormControl>
                    <FormDescription>
                      Slide to set a time limit (0 = no limit)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxAttempts"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Maximum Attempts</FormLabel>
                      <span className="text-sm font-medium">
                        {field.value === 0 ? "Unlimited" : field.value}
                      </span>
                    </div>
                    <FormControl>
                      <Slider
                        min={0}
                        max={10}
                        step={1}
                        value={[field.value ?? 0]}
                        onValueChange={([value]) => field.onChange(value)}
                        className="py-4"
                      />
                    </FormControl>
                    <FormDescription>
                      Limit how many times users can attempt this quiz (0 = unlimited)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Access Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Access Control
              </CardTitle>
              <CardDescription>
                Control who can access this quiz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="requireSignin"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base cursor-pointer">
                        Require Sign-in
                      </FormLabel>
                      <FormDescription>
                        Users must sign in to take this quiz
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowedEmails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Whitelist</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter email addresses, one per line&#10;student1@school.edu&#10;student2@school.edu"
                        className="min-h-[100px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Only these emails can access the quiz. Leave empty to allow
                      anyone (or anyone signed in if sign-in is required).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Quiz Behavior */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-5 w-5 text-primary" />
                Quiz Behavior
              </CardTitle>
              <CardDescription>
                Configure how the quiz works
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="shuffleQuestions"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base cursor-pointer">
                        Shuffle Questions
                      </FormLabel>
                      <FormDescription>
                        Randomize question order for each attempt
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showCorrectAnswers"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base cursor-pointer flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Show Correct Answers
                      </FormLabel>
                      <FormDescription>
                        Display correct answers after submission
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Grading Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Grading
              </CardTitle>
              <CardDescription>
                Configure how quiz results are graded and displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="gradingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grading Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grading type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="letter">Letter Grade</SelectItem>
                        <SelectItem value="pass_fail">Pass/Fail</SelectItem>
                        <SelectItem value="points">Points</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How results are displayed to quiz takers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passThreshold"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Pass Threshold</FormLabel>
                      <span className="text-sm font-medium">{field.value}%</span>
                    </div>
                    <FormControl>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[field.value]}
                        onValueChange={([value]) => field.onChange(value)}
                        className="py-4"
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum score percentage to pass
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showPointValues"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base cursor-pointer">
                        Show Point Values
                      </FormLabel>
                      <FormDescription>
                        Display point values for each question
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partialCreditEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base cursor-pointer">
                        Partial Credit
                      </FormLabel>
                      <FormDescription>
                        Allow partial credit for certain question types
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Manage quiz questions and view results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="button" variant="outline" className="w-full justify-start" asChild>
                <Link href={`/quiz/${quizId}/questions`}>
                  <ListOrdered className="h-4 w-4 mr-2" />
                  Edit Questions
                </Link>
              </Button>
              <Button type="button" variant="outline" className="w-full justify-start" asChild>
                <Link href={`/quiz/${quizId}/participants`}>
                  <Users className="h-4 w-4 mr-2" />
                  View Participants
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowPdfPreview(true)}
                disabled={!quiz.questions?.length}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
            </CardContent>
          </Card>

          {/* Share Quiz */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Share Quiz
              </CardTitle>
              <CardDescription>
                Share this quiz with students or others
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shareUrl ? (
                <div className="flex items-center gap-2">
                  <Input value={shareUrl} readOnly className="flex-1 font-mono text-sm" />
                  <Button type="button" size="icon" onClick={copyShareLink} className="shrink-0">
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateShareLink.mutate()}
                  disabled={generateShareLink.isPending}
                  className="w-full"
                >
                  {generateShareLink.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" />
                      Generate Share Link
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href={`/quiz/${quizId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={saveSettings.isPending}>
              {saveSettings.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* PDF Preview Modal */}
      <QuizPdfPreview
        open={showPdfPreview}
        onOpenChange={setShowPdfPreview}
        title={quiz.title}
        description={quiz.description}
        questions={quiz.questions || []}
        quizId={quizId}
      />
    </div>
  );
}
