"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { Loader2 } from "lucide-react";
import type { LessonWithSteps } from "@/lib/types/lesson";

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = params.resourceId as string;
  const lessonId = params.lessonId as string;

  const { data: lesson, isLoading } = useQuery<LessonWithSteps>({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const res = await fetch(
        `/api/resources/${resourceId}/lessons/${lessonId}`
      );
      if (!res.ok) throw new Error("Failed to fetch lesson");
      return res.json();
    },
  });

  const startAttempt = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/resources/${resourceId}/lessons/${lessonId}/attempts`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to start attempt");
      return res.json();
    },
  });

  // Start attempt when lesson loads
  if (lesson && !startAttempt.data && !startAttempt.isPending && !startAttempt.isSuccess) {
    startAttempt.mutate();
  }

  if (isLoading || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <LessonPlayer
      lesson={lesson}
      resourceId={resourceId}
      attemptId={startAttempt.data?.id}
      onExit={() => router.push(`/library/${resourceId}`)}
    />
  );
}
