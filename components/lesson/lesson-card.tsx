"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Pencil, Trash2, Play, Globe } from "lucide-react";
import type { Lesson } from "@/lib/types/lesson";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

interface LessonCardProps {
  lesson: Lesson;
  resourceId: string;
  onDelete?: (id: string) => void;
}

export function LessonCard({ lesson, resourceId, onDelete }: LessonCardProps) {
  const { t } = useLocale();

  return (
    <Card className="group hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{lesson.title}</h3>
              <Badge
                variant={lesson.status === "published" ? "default" : "secondary"}
                className="text-xs shrink-0"
              >
                {lesson.status === "published" ? t("common.published") : t("common.draft")}
              </Badge>
              {lesson.isPublic && (
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
            {lesson.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {lesson.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <Button asChild size="sm" className="gap-1.5">
                <Link href={`/library/${resourceId}/lessons/${lesson.id}`}>
                  <Play className="h-3.5 w-3.5" />
                  {t("lessons.play")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href={`/library/${resourceId}/lessons/${lesson.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t("common.edit")}
                </Link>
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive gap-1.5 ml-auto"
                  onClick={() => onDelete(lesson.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
