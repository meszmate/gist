"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Check,
  BookOpen,
  Users,
  Settings,
  Plus,
  Trash2,
  GitFork,
  ExternalLink,
  Loader2,
  AlertCircle,
  UserPlus,
  Mail,
  Pencil,
  Hash,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

interface Course {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  enrollmentRole: string | null;
}

interface CourseResource {
  id: string;
  resourceId: string;
  order: number;
  dueDate: string | null;
  title: string;
  description: string | null;
  contributorId: string;
  isMine: boolean;
}

interface CourseMember {
  id: string;
  role: string;
  enrolledAt: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}

interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  isOwned: boolean;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLocale();
  const courseId = params.courseId as string;

  const [codeCopied, setCodeCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"student" | "ta" | "instructor">(
    "student"
  );
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);

  const courseQuery = useQuery<{ course: Course } | { error: string }>({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load course");
      return data;
    },
    retry: false,
  });

  const course = courseQuery.data && "course" in courseQuery.data ? courseQuery.data.course : null;
  const isOwner = !!course?.isOwner;

  const resourcesQuery = useQuery<{ resources: CourseResource[] }>({
    queryKey: ["course-resources", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/resources`);
      if (!res.ok) throw new Error("Failed to load resources");
      return res.json();
    },
    enabled: !!course,
  });

  const membersQuery = useQuery<{ members: CourseMember[] }>({
    queryKey: ["course-members", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/members`);
      if (!res.ok) throw new Error("Failed to load members");
      return res.json();
    },
    enabled: !!course,
  });

  const libraryQuery = useQuery<LibraryResource[]>({
    queryKey: ["resources"],
    queryFn: async () => {
      const res = await fetch("/api/resources");
      if (!res.ok) throw new Error("Failed to load library");
      return res.json();
    },
    enabled: addResourceOpen,
  });

  const attachedResourceIds = useMemo(
    () => new Set((resourcesQuery.data?.resources || []).map((r) => r.resourceId)),
    [resourcesQuery.data]
  );

  const addResource = useMutation({
    mutationFn: async (resourceId: string) => {
      const res = await fetch(`/api/courses/${courseId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-resources", courseId] });
      toast.success(t("courseDetail.resourceAdded"));
      setAddResourceOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeResource = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(
        `/api/courses/${courseId}/resources?id=${entryId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-resources", courseId] });
      toast.success(t("courseDetail.resourceRemoved"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const forkResource = useMutation({
    mutationFn: async (resourceId: string) => {
      const res = await fetch(`/api/resources/${resourceId}/fork`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fork failed");
      return data as { id: string; title: string };
    },
    onSuccess: (forked) => {
      toast.success(t("resourceFork.success", { title: forked.title }));
      router.push(`/library/${forked.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const inviteMember = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-members", courseId] });
      toast.success(t("courseDetail.memberInvited"));
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("student");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMember = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const res = await fetch(
        `/api/courses/${courseId}/members?id=${enrollmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-members", courseId] });
      toast.success(t("courseDetail.memberRemoved"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCourse = useMutation({
    mutationFn: async (payload: {
      title?: string;
      description?: string | null;
      isActive?: boolean;
    }) => {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success(t("courseDetail.courseUpdated"));
      setEditOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCourse = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success(t("courseDetail.courseDeleted"));
      router.push("/courses");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyCode = async () => {
    if (!course) return;
    try {
      await navigator.clipboard.writeText(course.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      toast.error(t("courseDetail.copyFailed"));
    }
  };

  const copyJoinLink = async () => {
    if (!course) return;
    try {
      const link = `${window.location.origin}/courses?join=${course.code}`;
      await navigator.clipboard.writeText(link);
      toast.success(t("courseDetail.linkCopied"));
    } catch {
      toast.error(t("courseDetail.copyFailed"));
    }
  };

  if (courseQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (courseQuery.isError || !course) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-12 w-12" />}
        title={t("courseDetail.notFound")}
        description={t("courseDetail.notFoundDesc")}
        action={{ label: t("common.back"), href: "/courses" }}
      />
    );
  }

  const myResources = (libraryQuery.data || []).filter(
    (r) => r.isOwned && !attachedResourceIds.has(r.id)
  );

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">{t("nav.dashboard")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/courses">{t("nav.courses")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate max-w-[200px]">
              {course.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-3">
            <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
              <Link href="/courses" aria-label={t("common.back")}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {course.title}
                </h1>
                {!course.isActive && (
                  <Badge variant="secondary">{t("courseDetail.archived")}</Badge>
                )}
                {course.isOwner ? (
                  <Badge>{t("courses.role.instructor")}</Badge>
                ) : course.enrollmentRole ? (
                  <Badge variant="secondary">
                    {t(`courses.role.${course.enrollmentRole}`)}
                  </Badge>
                ) : null}
              </div>
              {course.description && (
                <p className="mt-1 text-muted-foreground">{course.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={copyCode}
            className={cn(
              "group inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm transition hover:border-primary/50 hover:bg-primary/5",
              codeCopied && "border-green-500/40 bg-green-500/5"
            )}
            title={t("courseDetail.copyCode")}
          >
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="tabular-nums">{course.code}</span>
            {codeCopied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            )}
          </button>
          <Button variant="outline" size="sm" onClick={copyJoinLink}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            {t("courseDetail.shareLink")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="resources">
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            {t("courseDetail.tabResources")}
            <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
              {resourcesQuery.data?.resources.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            {t("courseDetail.tabMembers")}
            <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
              {(membersQuery.data?.members.length ?? 0) + 1}
            </span>
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="settings">
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              {t("courseDetail.tabSettings")}
            </TabsTrigger>
          )}
        </TabsList>

        {/* --- Resources tab --- */}
        <TabsContent value="resources" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? t("courseDetail.resourcesDescOwner")
                : t("courseDetail.resourcesDescMember")}
            </p>
            <Button size="sm" onClick={() => setAddResourceOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {isOwner
                ? t("courseDetail.addResource")
                : t("courseDetail.shareResource")}
            </Button>
          </div>

          {resourcesQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : resourcesQuery.data?.resources.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-12 w-12" />}
              title={t("courseDetail.noResources")}
              description={
                isOwner
                  ? t("courseDetail.noResourcesOwner")
                  : t("courseDetail.noResourcesMember")
              }
            />
          ) : (
            <div className="space-y-2">
              {resourcesQuery.data?.resources.map((r) => {
                const canRemove = isOwner || r.isMine;
                return (
                  <Card key={r.id}>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold">{r.title}</h3>
                          {r.isMine && (
                            <Badge variant="outline" className="text-xs">
                              {t("courseDetail.sharedByYou")}
                            </Badge>
                          )}
                        </div>
                        {r.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {r.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => forkResource.mutate(r.resourceId)}
                          disabled={
                            forkResource.isPending &&
                            forkResource.variables === r.resourceId
                          }
                        >
                          {forkResource.isPending &&
                          forkResource.variables === r.resourceId ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <GitFork className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          {t("resourceFork.action")}
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/library/${r.resourceId}`}>
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            {t("common.open")}
                          </Link>
                        </Button>
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeResource.mutate(r.id)}
                            disabled={
                              removeResource.isPending &&
                              removeResource.variables === r.id
                            }
                            aria-label={t("courseDetail.removeResource")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* --- Members tab --- */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("courseDetail.membersDesc")}
            </p>
            {isOwner && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                {t("courseDetail.inviteMember")}
              </Button>
            )}
          </div>

          {membersQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {membersQuery.data?.members.length === 0 && !isOwner ? (
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title={t("courseDetail.noMembers")}
                  description={t("courseDetail.noMembersDesc")}
                />
              ) : (
                membersQuery.data?.members.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {(m.userName || m.userEmail || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {m.userName || m.userEmail || "—"}
                          </p>
                          {m.userEmail && m.userName && (
                            <p className="truncate text-xs text-muted-foreground">
                              {m.userEmail}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {t(`courses.role.${m.role}`)}
                        </Badge>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeMember.mutate(m.id)}
                            disabled={
                              removeMember.isPending &&
                              removeMember.variables === m.id
                            }
                            aria-label={t("courseDetail.removeMember")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* --- Settings tab --- */}
        {isOwner && (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {t("courseDetail.editSection")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("courseDetail.editSectionDesc")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditTitle(course.title);
                      setEditDescription(course.description || "");
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    {t("common.edit")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {course.isActive
                        ? t("courseDetail.archiveSection")
                        : t("courseDetail.unarchiveSection")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {course.isActive
                        ? t("courseDetail.archiveDesc")
                        : t("courseDetail.unarchiveDesc")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateCourse.mutate({ isActive: !course.isActive })
                    }
                    disabled={updateCourse.isPending}
                  >
                    {course.isActive
                      ? t("courseDetail.archive")
                      : t("courseDetail.unarchive")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-destructive">
                      {t("courseDetail.deleteSection")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("courseDetail.deleteSectionDesc")}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteCourseOpen(true)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t("common.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add / share resource dialog */}
      <Dialog open={addResourceOpen} onOpenChange={setAddResourceOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isOwner
                ? t("courseDetail.addResource")
                : t("courseDetail.shareResource")}
            </DialogTitle>
            <DialogDescription>
              {t("courseDetail.shareResourceDesc")}
            </DialogDescription>
          </DialogHeader>
          {libraryQuery.isLoading ? (
            <div className="space-y-2 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : myResources.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("courseDetail.noLibraryResources")}
            </div>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto py-2">
              {myResources.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addResource.mutate(r.id)}
                  disabled={addResource.isPending}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition",
                    "hover:border-primary/40 hover:bg-primary/5",
                    addResource.isPending &&
                      addResource.variables === r.id &&
                      "opacity-60"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    {r.description && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </div>
                  {addResource.isPending && addResource.variables === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddResourceOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("courseDetail.inviteMember")}</DialogTitle>
            <DialogDescription>
              {t("courseDetail.inviteDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {t("courseDetail.inviteEmail")}
              </Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="student@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("courseDetail.inviteRole")}</Label>
              <div className="flex flex-wrap gap-2">
                {(["student", "ta", "instructor"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setInviteRole(r)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition",
                      inviteRole === r
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/40"
                    )}
                  >
                    {t(`courses.role.${r}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => inviteMember.mutate()}
              disabled={!inviteEmail || inviteMember.isPending}
            >
              {inviteMember.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-3.5 w-3.5" />
              )}
              {t("courseDetail.sendInvite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit course dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("courseDetail.editCourse")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">{t("courses.titleLabel")}</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">
                {t("courses.descriptionLabel")}
              </Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() =>
                updateCourse.mutate({
                  title: editTitle,
                  description: editDescription || null,
                })
              }
              disabled={!editTitle || updateCourse.isPending}
            >
              {updateCourse.isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete course confirmation */}
      <Dialog open={deleteCourseOpen} onOpenChange={setDeleteCourseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("courseDetail.deleteCourse")}</DialogTitle>
            <DialogDescription>
              {t("courseDetail.deleteConfirm", { title: course.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteCourseOpen(false)}
              disabled={deleteCourse.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCourse.mutate()}
              disabled={deleteCourse.isPending}
            >
              {deleteCourse.isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
