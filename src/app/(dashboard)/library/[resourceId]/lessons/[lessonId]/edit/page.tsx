"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { LessonEditor } from "@/components/lesson/lesson-editor";
import { Loader2 } from "lucide-react";
import type { LessonWithSteps } from "@/lib/types/lesson";

export default function LessonEditorPage() {
  const params = useParams();
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

  if (isLoading || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <LessonEditor lesson={lesson} resourceId={resourceId} />;
}
