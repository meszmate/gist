"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Search,
  Users,
  Trophy,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Participant {
  id: string;
  attemptId: string;
  name: string | null;
  email: string | null;
  userId: string | null;
  score: number;
  grade: string | null;
  pointsEarned: number;
  pointsPossible: number;
  timeSpentSeconds: number | null;
  completedAt: string;
  attemptNumber: number;
  questionCount: number;
  correctCount: number;
}

interface ParticipantStats {
  totalParticipants: number;
  completedCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageTimeSeconds: number;
  gradeDistribution: Record<string, number>;
  scoreDistribution: { range: string; count: number }[];
}

interface ParticipantsResponse {
  participants: Participant[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: ParticipantStats;
}

async function fetchParticipants(
  quizId: string,
  params: Record<string, string>
): Promise<ParticipantsResponse> {
  const queryString = new URLSearchParams(params).toString();
  const res = await fetch(`/api/quizzes/${quizId}/participants?${queryString}`);
  if (!res.ok) throw new Error("Failed to fetch participants");
  return res.json();
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SortColumn = "name" | "score" | "date" | "time";

function SortIcon({ column, sortBy, sortOrder }: { column: SortColumn; sortBy: SortColumn; sortOrder: "asc" | "desc" }) {
  if (sortBy !== column) return null;
  return sortOrder === "asc" ? (
    <ChevronUp className="h-4 w-4" />
  ) : (
    <ChevronDown className="h-4 w-4" />
  );
}

export default function ParticipantsPage() {
  const params = useParams();
  const quizId = params.quizId as string;

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortColumn>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["participants", quizId, search, sortBy, sortOrder, page],
    queryFn: () =>
      fetchParticipants(quizId, {
        search,
        sortBy,
        sortOrder,
        page: page.toString(),
        pageSize: "20",
      }),
  });

  const handleExportCSV = async () => {
    const res = await fetch(`/api/quizzes/${quizId}/participants?format=csv`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-participants-${quizId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  const { participants, pagination, stats } = data || {
    participants: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    stats: {
      totalParticipants: 0,
      completedCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      averageTimeSeconds: 0,
      gradeDistribution: {},
      scoreDistribution: [],
    },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Participants"
        description="View quiz results and participant performance"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Quizzes", href: "/quiz" },
          { label: "Quiz", href: `/quiz/${quizId}` },
          { label: "Participants" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/quiz/${quizId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quiz
              </Link>
            </Button>
            <Button onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalParticipants}</p>
                <p className="text-sm text-muted-foreground">Total Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.averageScore.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.highestScore.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Highest Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatTime(stats.averageTimeSeconds)}</p>
                <p className="text-sm text-muted-foreground">Avg. Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution */}
      {stats.scoreDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24">
              {stats.scoreDistribution.map((bucket, index) => {
                const maxCount = Math.max(...stats.scoreDistribution.map(b => b.count));
                const height = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        index < 6 ? "bg-red-500/50" : index < 8 ? "bg-yellow-500/50" : "bg-green-500/50"
                      )}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">
                      {bucket.range.split("-")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Participants Table */}
      {participants.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No participants yet"
          description="Share your quiz to get participants"
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Participant
                    <SortIcon column="name" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("score")}
                >
                  <div className="flex items-center gap-1">
                    Score
                    <SortIcon column="score" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Correct</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("time")}
                >
                  <div className="flex items-center gap-1">
                    Time
                    <SortIcon column="time" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    Completed
                    <SortIcon column="date" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {participant.name || "Anonymous"}
                      </p>
                      {participant.email && (
                        <p className="text-sm text-muted-foreground">
                          {participant.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-12 h-2 rounded-full bg-muted overflow-hidden"
                        )}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full",
                            participant.score >= 80
                              ? "bg-green-500"
                              : participant.score >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          )}
                          style={{ width: `${participant.score}%` }}
                        />
                      </div>
                      <span className="font-medium">
                        {participant.score.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {participant.grade && (
                      <Badge
                        variant={
                          participant.grade === "Pass" ||
                          participant.grade.startsWith("A") ||
                          participant.grade.startsWith("B")
                            ? "default"
                            : "secondary"
                        }
                      >
                        {participant.grade}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {participant.correctCount} / {participant.questionCount}
                  </TableCell>
                  <TableCell>{formatTime(participant.timeSpentSeconds)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(participant.completedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                {pagination.total} participants
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
