"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FileQuestion,
  Plus,
  Search,
  Settings,
  Clock,
  Trophy,
  Target,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useVimNavigation } from "@/lib/hooks/use-vim-navigation";
import { useVimContext } from "@/components/keyboard/vim-navigation-provider";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import Link from "next/link";

interface QuizResource {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  hasSettings: boolean;
  attemptCount: number;
  lastAttempt: string | null;
  bestScore?: number | null;
}

async function fetchQuizzes(): Promise<QuizResource[]> {
  const res = await fetch("/api/quizzes");
  if (!res.ok) throw new Error("Failed to fetch quizzes");
  return res.json();
}

export default function QuizzesPage() {
  const router = useRouter();
  const { t, formatDate } = useLocale();
  const [search, setSearch] = useState("");
  const { searchOpen, setSearchOpen } = useVimContext();

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: fetchQuizzes,
  });

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.description?.toLowerCase().includes(search.toLowerCase())
  );

  const { selectedIndex, setSelectedIndex } = useVimNavigation({
    itemCount: filteredQuizzes.length,
    onSelect: (index) => {
      const quiz = filteredQuizzes[index];
      if (quiz) {
        router.push(`/quiz/${quiz.id}`);
      }
    },
    enabled: !searchOpen,
  });

  const totalQuizzes = quizzes.length;
  const completedQuizzes = quizzes.filter((q) => q.attemptCount > 0).length;
  const totalAttempts = quizzes.reduce((sum, q) => sum + q.attemptCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("quiz.title")}
        description={t("quiz.description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.quizzes") },
        ]}
        actions={
          <Button asChild>
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              {t("quiz.createResource")}
            </Link>
          </Button>
        }
      />

      {/* Stats Overview */}
      {quizzes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <FileQuestion className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalQuizzes}</p>
                <p className="text-sm text-muted-foreground">{t("quiz.availableQuizzes")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedQuizzes}</p>
                <p className="text-sm text-muted-foreground">{t("quiz.completed")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Trophy className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAttempts}</p>
                <p className="text-sm text-muted-foreground">{t("quiz.totalAttempts")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("quiz.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus={searchOpen}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <EmptyState
          icon={<FileQuestion className="h-12 w-12" />}
          title={t("quiz.noQuizzesFound")}
          description={
            search
              ? t("quiz.adjustSearchTerms")
              : t("quiz.createToStart")
          }
          action={
            !search
              ? {
                  label: t("quiz.createResource"),
                  href: "/create",
                  icon: <Plus className="mr-2 h-4 w-4" />,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz, index) => (
            <Card
              key={quiz.id}
              className={cn(
                "cursor-pointer transition-all duration-200 card-hover animate-scale-in group",
                selectedIndex === index && "border-primary ring-2 ring-primary ring-offset-2"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
              onClick={() => router.push(`/quiz/${quiz.id}`)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg truncate pr-2 group-hover:text-primary transition-colors">
                    {quiz.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/quiz/${quiz.id}/settings`);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {quiz.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {quiz.description}
                  </p>
                )}

                {/* Progress indicator */}
                {quiz.attemptCount > 0 && quiz.bestScore !== undefined && quiz.bestScore !== null && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{t("quiz.bestScore")}</span>
                      <span className="font-medium">{quiz.bestScore}%</span>
                    </div>
                    <Progress value={quiz.bestScore} className="h-2" />
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="gap-1">
                    <Target className="h-3 w-3" />
                    {t("quiz.questions", { count: quiz.questionCount })}
                  </Badge>
                  {quiz.attemptCount > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Trophy className="h-3 w-3" />
                      {t("quiz.attempts", { count: quiz.attemptCount })}
                    </Badge>
                  )}
                  {quiz.hasSettings && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Settings className="h-3 w-3" />
                      {t("quiz.configured")}
                    </Badge>
                  )}
                </div>

                {quiz.lastAttempt && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t("quiz.lastAttempt")}{" "}
                    {formatDate(quiz.lastAttempt, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
