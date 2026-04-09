"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Target, Brain, FileQuestion, GraduationCap, BookOpen } from "lucide-react";

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  role: string;
  totalResources: number;
  completedResources: number;
}

interface QuizAttempt {
  id: string;
  score: string | null;
  grade: string | null;
  completedAt: string | null;
  resourceTitle: string;
  resourceId: string;
}

interface LessonAttempt {
  id: string;
  score: string | null;
  completedAt: string | null;
  totalSteps: number;
  correctCount: number;
}

export default function ProgressPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["student-progress"],
    queryFn: async () => {
      const res = await fetch("/api/student/progress");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Progress" description="Track your learning across all resources" />
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="My Progress" description="Track your learning across all resources" />

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Avg Quiz Score"
          value={`${data?.summary?.avgQuizScore || 0}%`}
          description="Across all attempts"
          icon={<Target className="h-5 w-5" />}
          delay={0}
        />
        <StatCard
          title="Quiz Attempts"
          value={data?.summary?.totalQuizAttempts || 0}
          description="Total quiz submissions"
          icon={<FileQuestion className="h-5 w-5" />}
          delay={50}
        />
        <StatCard
          title="Flashcards Due"
          value={data?.flashcardsDue || 0}
          description="Ready for review"
          icon={<Brain className="h-5 w-5" />}
          delay={100}
        />
        <StatCard
          title="Study Sessions"
          value={data?.summary?.totalFlashcardSessions || 0}
          description="Last 30 days"
          icon={<GraduationCap className="h-5 w-5" />}
          delay={150}
        />
      </div>

      {/* Course Progress */}
      {data?.courseProgress?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Course Progress
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.courseProgress.map((course: CourseProgress) => {
              const pct = course.totalResources > 0
                ? Math.round((course.completedResources / course.totalResources) * 100)
                : 0;
              return (
                <Card key={course.courseId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{course.courseTitle}</CardTitle>
                      <Badge variant="secondary">{course.role}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {course.completedResources} / {course.totalResources} resources
                        </span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <Progress value={pct} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Quiz Attempts */}
      {data?.quizAttempts?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Recent Quiz Attempts</h2>
          <div className="space-y-2">
            {data.quizAttempts.map((attempt: QuizAttempt) => {
              const score = attempt.score ? Number(attempt.score) : null;
              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{attempt.resourceTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {attempt.completedAt
                        ? new Date(attempt.completedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "In progress"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {attempt.grade && <Badge variant="secondary">{attempt.grade}</Badge>}
                    {score !== null && (
                      <Badge variant={score >= 80 ? "default" : "secondary"}>
                        {Math.round(score)}%
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Lesson Attempts */}
      {data?.lessonAttempts?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Recent Lesson Attempts</h2>
          <div className="space-y-2">
            {data.lessonAttempts.map((attempt: LessonAttempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div>
                  <p className="text-sm">
                    {attempt.correctCount} / {attempt.totalSteps} steps correct
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attempt.completedAt
                      ? new Date(attempt.completedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "In progress"}
                  </p>
                </div>
                {attempt.score && (
                  <Badge variant={Number(attempt.score) >= 80 ? "default" : "secondary"}>
                    {Math.round(Number(attempt.score))}%
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flashcard Stats */}
      {data?.flashcardStats && Number(data.flashcardStats.sessions) > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Flashcard Stats (30 days)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{Number(data.flashcardStats.totalStudied)}</div>
                <p className="text-xs text-muted-foreground">Cards studied</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{Number(data.flashcardStats.totalCorrect)}</div>
                <p className="text-xs text-muted-foreground">Cards correct</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {Number(data.flashcardStats.totalStudied) > 0
                    ? Math.round((Number(data.flashcardStats.totalCorrect) / Number(data.flashcardStats.totalStudied)) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Accuracy rate</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!data?.quizAttempts?.length && !data?.lessonAttempts?.length && !data?.courseProgress?.length && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No activity yet. Start studying to see your progress here.</p>
        </div>
      )}
    </div>
  );
}
