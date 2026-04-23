"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, LogIn, School } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/hooks/use-locale";

interface Course {
  id: string;
  title: string;
  description: string | null;
  code: string;
  isActive: boolean;
  enrollmentRole?: string;
}

interface CoursesResponse {
  owned: Course[];
  enrolled: Course[];
}

export default function CoursesPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "student":
        return t("courses.role.student");
      case "instructor":
        return t("courses.role.instructor");
      case "ta":
        return t("courses.role.ta");
      default:
        return role;
    }
  };
  // Opening /courses?join=CODE from an invite link pre-fills the join
  // dialog so the user can commit with one click. We seed once on mount;
  // after that the user owns the state.
  const searchParams = useSearchParams();
  const initialJoinCode = searchParams.get("join") ?? "";

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(!!initialJoinCode);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [joinCode, setJoinCode] = useState(initialJoinCode);

  const { data, isLoading } = useQuery<CoursesResponse>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) throw new Error("Failed to load courses");
      return res.json();
    },
  });

  const hasOwned = (data?.owned?.length ?? 0) > 0;
  const hasEnrolled = (data?.enrolled?.length ?? 0) > 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error(t("courses.failedCreate"));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      toast.success(t("courses.courseCreated"));
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/courses/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("courses.failedJoin"));
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setJoinOpen(false);
      setJoinCode("");
      toast.success(t("courses.joinedCourse", { title: data.course.title }));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("courses.title")}
        description={t("courses.description")}
        actions={
          <div className="flex gap-2">
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <LogIn className="mr-2 h-4 w-4" />
                  {t("courses.joinCourse")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("courses.joinCourseTitle")}</DialogTitle>
                  <DialogDescription>{t("courses.joinCourseDescription")}</DialogDescription>
                </DialogHeader>
                <Input
                  placeholder={t("courses.joinCodePlaceholder")}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <DialogFooter>
                  <Button onClick={() => joinMutation.mutate()} disabled={!joinCode.trim()}>
                    {t("courses.join")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("courses.createCourse")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("courses.createCourseTitle")}</DialogTitle>
                  <DialogDescription>{t("courses.createCourseDescription")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder={t("courses.titlePlaceholder")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Input
                    placeholder={t("courses.descriptionPlaceholder")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={() => createMutation.mutate()} disabled={!title.trim()}>
                    {t("courses.create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {isLoading ? (
        <CoursesListSkeleton />
      ) : !hasOwned && !hasEnrolled ? (
        <EmptyState
          icon={<School className="h-12 w-12" />}
          title={t("courses.noCourses")}
          description={t("courses.noCoursesDesc")}
        />
      ) : (
        <>
          {hasOwned && (
            <section className="space-y-4 animate-fade-in">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t("courses.yourCourses")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data!.owned.map((course) => (
                  <Card
                    key={course.id}
                    className="group transition-shadow hover:shadow-md"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        <Badge variant={course.isActive ? "default" : "secondary"}>
                          {course.isActive
                            ? t("courses.active")
                            : t("courses.inactive")}
                        </Badge>
                      </div>
                      {course.description && (
                        <CardDescription>{course.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <code className="rounded bg-muted px-2 py-1 text-sm">
                          {course.code}
                        </code>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/courses/${course.id}`}>
                            {t("courses.manage")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {hasEnrolled && (
            <section className="space-y-4 animate-fade-in">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t("courses.enrolledCourses")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data!.enrolled.map((course) => (
                  <Card
                    key={course.id}
                    className="group transition-shadow hover:shadow-md"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        <Badge variant="secondary">
                          {getRoleLabel(course.enrollmentRole || "student")}
                        </Badge>
                      </div>
                      {course.description && (
                        <CardDescription>{course.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/courses/${course.id}`}>
                          {t("courses.view")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ============== LOADING SKELETON ==============
// Two sections of card skeletons that match the real list's shape, with a
// gentle pulse + a shimmer sweep across each card so the wait feels alive
// instead of empty. Stagger delays keep the cards from all pulsing in
// lockstep — gives it a "wave" feel.

function CoursesListSkeleton() {
  return (
    <div className="space-y-8">
      {[0, 1].map((section) => (
        <section key={section} className="space-y-4">
          <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} delay={(section * 3 + i) * 120} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-6",
        "animate-pulse"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="h-5 w-14 shrink-0 rounded-full bg-muted/70" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-muted/60" />
          <div className="h-3 w-4/5 rounded bg-muted/50" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="h-7 w-20 rounded bg-muted/70" />
          <div className="h-7 w-24 rounded bg-muted/60" />
        </div>
      </div>
      {/* Shimmer sweep — uses the app-wide keyframe from globals.css */}
      <div
        className="pointer-events-none absolute inset-0 animate-shimmer"
        style={{ animationDelay: `${delay}ms` }}
      />
    </div>
  );
}
