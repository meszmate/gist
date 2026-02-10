"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LessonCard } from "@/components/lesson/lesson-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { GraduationCap, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Lesson } from "@/lib/types/lesson";

export default function LessonsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const resourceId = params.resourceId as string;
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: lessons = [], isLoading } = useQuery<Lesson[]>({
    queryKey: ["lessons", resourceId],
    queryFn: async () => {
      const res = await fetch(`/api/resources/${resourceId}/lessons`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createLesson = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/resources/${resourceId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Lesson", order: lessons.length }),
      });
      if (!res.ok) throw new Error("Failed to create lesson");
      return res.json();
    },
    onSuccess: (lesson) => {
      queryClient.invalidateQueries({ queryKey: ["lessons", resourceId] });
      toast.success("Lesson created");
      window.location.href = `/library/${resourceId}/lessons/${lesson.id}/edit`;
    },
  });

  const generateLesson = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/resources/${resourceId}/lessons/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to generate lesson");
      return res.json();
    },
    onSuccess: (lesson) => {
      queryClient.invalidateQueries({ queryKey: ["lessons", resourceId] });
      toast.success("Lesson generated! Opening editor...");
      window.location.href = `/library/${resourceId}/lessons/${lesson.id}/edit`;
    },
    onError: () => toast.error("Failed to generate lesson"),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/resources/${resourceId}/lessons/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", resourceId] });
      setDeleteId(null);
      toast.success("Lesson deleted");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/library">Library</BreadcrumbLink>
            <BreadcrumbSeparator />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/library/${resourceId}`}>Resource</BreadcrumbLink>
            <BreadcrumbSeparator />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Lessons</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Lessons</h1>
          <Badge variant="secondary">{lessons.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => generateLesson.mutate()}
            disabled={generateLesson.isPending}
          >
            {generateLesson.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            AI Generate
          </Button>
          <Button
            onClick={() => createLesson.mutate()}
            disabled={createLesson.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Lesson
          </Button>
        </div>
      </div>

      {lessons.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-12 w-12" />}
          title="No lessons yet"
          description="Create interactive lessons for step-by-step learning"
        />
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              resourceId={resourceId}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure? This will permanently delete this lesson and all its steps.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteLesson.mutate(deleteId)}
              disabled={deleteLesson.isPending}
            >
              {deleteLesson.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
