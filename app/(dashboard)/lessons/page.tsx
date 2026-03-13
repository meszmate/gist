"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  BookOpen,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LessonCard } from "@/components/lesson/lesson-card";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

interface LessonItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  isPublic: boolean;
  order: number;
  resourceId: string;
  resourceTitle: string;
  stepsCount: number;
  createdAt: string;
  updatedAt: string;
}

async function fetchLessons(): Promise<LessonItem[]> {
  const res = await fetch("/api/lessons");
  if (!res.ok) throw new Error("Failed to fetch lessons");
  return res.json();
}

export default function LessonsPage() {
  const [search, setSearch] = useState("");
  const { t } = useLocale();

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });

  const filteredLessons = lessons.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.description?.toLowerCase().includes(search.toLowerCase()) ||
      l.resourceTitle.toLowerCase().includes(search.toLowerCase())
  );

  const totalLessons = lessons.length;
  const publishedLessons = lessons.filter((l) => l.status === "published").length;
  const totalSteps = lessons.reduce((sum, l) => sum + l.stepsCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("lessons.title")}
        description={t("lessons.description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("lessons.title") },
        ]}
        actions={
          <Button asChild>
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              {t("lessons.createResource")}
            </Link>
          </Button>
        }
      />

      {/* Stats Overview */}
      {lessons.length > 0 && (
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" />
            <strong className="text-foreground">{totalLessons}</strong> {t("lessons.totalLessons")}
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            <strong className="text-foreground">{publishedLessons}</strong> {t("lessons.publishedLessons")}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <strong className="text-foreground">{totalSteps}</strong> {t("lessons.totalSteps")}
          </span>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("lessons.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
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
      ) : filteredLessons.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-12 w-12" />}
          title={t("lessons.noLessonsFound")}
          description={
            search
              ? t("lessons.adjustSearchTerms")
              : t("lessons.createToStart")
          }
          action={
            !search
              ? {
                  label: t("lessons.createResource"),
                  href: "/create",
                  icon: <Plus className="mr-2 h-4 w-4" />,
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Group lessons by resource */}
          {Object.entries(
            filteredLessons.reduce<Record<string, LessonItem[]>>((acc, lesson) => {
              const key = lesson.resourceId;
              if (!acc[key]) acc[key] = [];
              acc[key].push(lesson);
              return acc;
            }, {})
          ).map(([resourceId, resourceLessons]) => (
            <div key={resourceId} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5">
                  <BookOpen className="h-3 w-3" />
                  {resourceLessons[0].resourceTitle}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t("lessons.lessonCount", { count: resourceLessons.length })}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {resourceLessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={{
                      id: lesson.id,
                      studyMaterialId: lesson.resourceId,
                      title: lesson.title,
                      description: lesson.description,
                      order: lesson.order,
                      settings: null,
                      status: lesson.status as "draft" | "published",
                      isPublic: lesson.isPublic,
                      createdAt: lesson.createdAt,
                      updatedAt: lesson.updatedAt,
                    }}
                    resourceId={lesson.resourceId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
