"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { School, Plus, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

interface Course {
  id: string;
  title: string;
  description: string | null;
  code: string;
  ownerId: string;
  isActive: boolean;
  enrollmentRole?: string;
}

interface CoursesResponse {
  owned: Course[];
  enrolled: Course[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
}

/**
 * Pick one of your courses and attach this resource to it. The picker
 * shows both the courses you own and those you're enrolled in — the
 * backend accepts contributions from any enrolled member (provided you
 * own the resource being shared).
 */
export function AddToCourseDialog({ open, onOpenChange, resourceId }: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const coursesQuery = useQuery<CoursesResponse>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) throw new Error("Failed to load courses");
      return res.json();
    },
    enabled: open,
  });

  const allCourses = useMemo<Course[]>(() => {
    const data = coursesQuery.data;
    if (!data) return [];
    // dedupe by id (user could own AND be enrolled in the same course in
    // edge cases).
    const seen = new Set<string>();
    const combined: Course[] = [];
    for (const c of [...(data.owned || []), ...(data.enrolled || [])]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      combined.push(c);
    }
    return combined.filter((c) => c.isActive);
  }, [coursesQuery.data]);

  const add = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch(`/api/courses/${courseId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      return { courseId, ...data };
    },
    onSuccess: (_result, courseId) => {
      queryClient.invalidateQueries({ queryKey: ["course-resources", courseId] });
      toast.success(t("addToCourse.success"));
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addToCourse.title")}</DialogTitle>
          <DialogDescription>{t("addToCourse.description")}</DialogDescription>
        </DialogHeader>

        {coursesQuery.isLoading ? (
          <div className="space-y-2 py-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : allCourses.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <School className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("addToCourse.empty")}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/courses">{t("addToCourse.goToCourses")}</Link>
            </Button>
          </div>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto py-2">
            {allCourses.map((c) => {
              const owned = coursesQuery.data?.owned.some((o) => o.id === c.id);
              const busy = add.isPending && add.variables === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => add.mutate(c.id)}
                  disabled={add.isPending}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition",
                    "hover:border-primary/40 hover:bg-primary/5",
                    busy && "opacity-60"
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <Badge variant="secondary" className="text-xs">
                        {owned
                          ? t("courses.role.instructor")
                          : c.enrollmentRole
                          ? t(`courses.role.${c.enrollmentRole}`)
                          : t("courses.role.student")}
                      </Badge>
                    </div>
                    {c.description && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                  </div>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : add.isSuccess && add.variables === c.id ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
