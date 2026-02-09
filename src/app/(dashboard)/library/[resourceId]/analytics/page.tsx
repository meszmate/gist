"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { BarChart3 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { OverviewStats } from "@/components/analytics/overview-stats";
import { ActivityTimeline } from "@/components/analytics/activity-timeline";
import { ViewerTable } from "@/components/analytics/viewer-table";
import { ScoreDistributionChart } from "@/components/analytics/score-distribution-chart";
import { QuestionAnalytics } from "@/components/analytics/question-analytics";
import { LessonAnalytics } from "@/components/analytics/lesson-analytics";

async function fetchAnalytics(resourceId: string, section: string) {
  const res = await fetch(
    `/api/resources/${resourceId}/analytics?section=${section}`
  );
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export default function AnalyticsPage() {
  const params = useParams();
  const resourceId = params.resourceId as string;

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["analytics", resourceId, "overview"],
    queryFn: () => fetchAnalytics(resourceId, "overview"),
  });

  const { data: timeline } = useQuery({
    queryKey: ["analytics", resourceId, "timeline"],
    queryFn: () => fetchAnalytics(resourceId, "timeline"),
  });

  const { data: viewers } = useQuery({
    queryKey: ["analytics", resourceId, "viewers"],
    queryFn: () => fetchAnalytics(resourceId, "viewers"),
  });

  const { data: scores } = useQuery({
    queryKey: ["analytics", resourceId, "scores"],
    queryFn: () => fetchAnalytics(resourceId, "scores"),
  });

  const { data: questions } = useQuery({
    queryKey: ["analytics", resourceId, "questions"],
    queryFn: () => fetchAnalytics(resourceId, "questions"),
  });

  const { data: lessonData } = useQuery({
    queryKey: ["analytics", resourceId, "lessons"],
    queryFn: () => fetchAnalytics(resourceId, "lessons"),
  });

  const { data: lessonScores } = useQuery({
    queryKey: ["analytics", resourceId, "lesson-scores"],
    queryFn: () => fetchAnalytics(resourceId, "lesson-scores"),
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              <BreadcrumbSeparator />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/library">Library</BreadcrumbLink>
              <BreadcrumbSeparator />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/library/${resourceId}`}>
                Resource
              </BreadcrumbLink>
              <BreadcrumbSeparator />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Analytics</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        </div>
        <p className="text-muted-foreground">
          Track how your shared resource is performing
        </p>
      </div>

      {loadingOverview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : overview ? (
        <OverviewStats {...overview} />
      ) : null}

      {timeline && (
        <ActivityTimeline
          views={timeline.views || []}
          attempts={timeline.attempts || []}
          lessonAttempts={timeline.lessonAttempts || []}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {scores && (
          <ScoreDistributionChart distribution={scores.distribution || []} />
        )}
        {viewers && <ViewerTable viewers={viewers.viewers || []} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {lessonScores && (
          <ScoreDistributionChart
            distribution={lessonScores.distribution || []}
            title="Lesson Score Distribution"
          />
        )}
        {lessonData && (
          <LessonAnalytics lessons={lessonData.lessons || []} />
        )}
      </div>

      {questions && (
        <QuestionAnalytics questions={questions.questions || []} />
      )}
    </div>
  );
}
