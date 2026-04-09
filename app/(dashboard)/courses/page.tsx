"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, LogIn } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const { data } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error("Failed to create course");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Course created");
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
        throw new Error(data.error || "Failed to join");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setJoinOpen(false);
      setJoinCode("");
      toast.success(`Joined "${data.course.title}"`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Create and manage your courses or join existing ones"
        actions={
          <div className="flex gap-2">
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <LogIn className="mr-2 h-4 w-4" />
                  Join Course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a Course</DialogTitle>
                  <DialogDescription>Enter the course code to join</DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="ABC-123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <DialogFooter>
                  <Button onClick={() => joinMutation.mutate()} disabled={!joinCode.trim()}>
                    Join
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a Course</DialogTitle>
                  <DialogDescription>Organize resources and invite students</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Course title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={() => createMutation.mutate()} disabled={!title.trim()}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Owned Courses */}
      {data?.owned?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Your Courses</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.owned.map((course: { id: string; title: string; description: string | null; code: string; isActive: boolean }) => (
              <Card key={course.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <Badge variant={course.isActive ? "default" : "secondary"}>
                      {course.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {course.description && (
                    <CardDescription>{course.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <code className="text-sm bg-muted px-2 py-1 rounded">{course.code}</code>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/courses/${course.id}`}>
                        Manage
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Enrolled Courses */}
      {data?.enrolled?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Enrolled Courses</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.enrolled.map((course: { id: string; title: string; description: string | null; enrollmentRole: string }) => (
              <Card key={course.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <Badge variant="secondary">{course.enrollmentRole}</Badge>
                  </div>
                  {course.description && (
                    <CardDescription>{course.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/courses/${course.id}`}>
                      View
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!data?.owned?.length && !data?.enrolled?.length && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No courses yet. Create one or join with a code.</p>
        </div>
      )}
    </div>
  );
}
