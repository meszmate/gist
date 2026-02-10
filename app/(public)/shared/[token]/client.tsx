"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Brain,
  FileQuestion,
  Bookmark,
  BookmarkCheck,
  Clock,
  Lock,
  GraduationCap,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { SharedFlashcardStudy } from "@/components/shared/shared-flashcard-study";
import { SharedQuizTaker } from "@/components/shared/shared-quiz-taker";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { toast } from "sonner";
import type { QuestionConfig } from "@/lib/types/quiz";
import type { LessonWithSteps } from "@/lib/types/lesson";

interface SharedResource {
  accessDenied: false;
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  difficulty: string | null;
  flashcards: Array<{ id: string; front: string; back: string }>;
  quizQuestions: Array<{
    id: string;
    question: string;
    questionType: string;
    config: QuestionConfig;
    points: number;
    order: number | null;
    options: string[];
  }>;
  lessons: Array<{
    id: string;
    title: string;
    description: string | null;
    order: number;
  }>;
  settings: {
    timeLimitSeconds: number | null;
    shuffleQuestions: boolean | null;
    showCorrectAnswers: boolean | null;
  } | null;
  visibleSections: { flashcards: boolean; summary: boolean; quiz: boolean; lessons?: boolean };
  availabilityStatus: "available" | "not_yet" | "closed";
  availableFrom: string | null;
  availableTo: string | null;
  requireAuthToInteract: boolean;
  isSaved: boolean;
  isAuthenticated: boolean;
}

interface SharedResourceClientProps {
  resource: SharedResource;
  token: string;
}

export function SharedResourceClient({
  resource,
  token,
}: SharedResourceClientProps) {
  const [isSaved, setIsSaved] = useState(resource.isSaved);
  const [savingState, setSavingState] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [studyMode, setStudyMode] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [lessonMode, setLessonMode] = useState<string | null>(null);

  const handleSave = async () => {
    if (!resource.isAuthenticated) {
      toast.error("Sign in to save resources to your library");
      return;
    }
    setSavingState(true);
    try {
      if (isSaved) {
        await fetch(`/api/resources/${resource.id}/save`, { method: "DELETE" });
        setIsSaved(false);
        toast.success("Removed from library");
      } else {
        await fetch(`/api/resources/${resource.id}/save`, { method: "POST" });
        setIsSaved(true);
        toast.success("Saved to library");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSavingState(false);
    }
  };

  // Availability messages
  if (resource.availabilityStatus === "not_yet") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Not Yet Available</h1>
          <p className="text-muted-foreground">
            This resource will be available on{" "}
            {new Date(resource.availableFrom!).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </p>
        </div>
      </div>
    );
  }

  if (resource.availabilityStatus === "closed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Resource Closed</h1>
          <p className="text-muted-foreground">
            This resource was available until{" "}
            {new Date(resource.availableTo!).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </p>
        </div>
      </div>
    );
  }

  const needsAuth = resource.requireAuthToInteract && !resource.isAuthenticated;

  // Build tabs based on visible sections
  const tabs: Array<{ value: string; label: string; icon: React.ReactNode }> =
    [];
  if (resource.visibleSections.summary || resource.summary) {
    tabs.push({
      value: "overview",
      label: "Overview",
      icon: <BookOpen className="mr-2 h-4 w-4" />,
    });
  }
  if (
    resource.visibleSections.flashcards &&
    resource.flashcards.length > 0
  ) {
    tabs.push({
      value: "flashcards",
      label: "Flashcards",
      icon: <Brain className="mr-2 h-4 w-4" />,
    });
  }
  if (
    resource.visibleSections.quiz &&
    resource.quizQuestions.length > 0
  ) {
    tabs.push({
      value: "quiz",
      label: "Quiz",
      icon: <FileQuestion className="mr-2 h-4 w-4" />,
    });
  }
  if (
    (resource.visibleSections.lessons ?? true) &&
    resource.lessons.length > 0
  ) {
    tabs.push({
      value: "learn",
      label: "Learn",
      icon: <GraduationCap className="mr-2 h-4 w-4" />,
    });
  }

  if (tabs.length === 0) {
    tabs.push({
      value: "overview",
      label: "Overview",
      icon: <BookOpen className="mr-2 h-4 w-4" />,
    });
  }

  // Full study mode
  if (studyMode && resource.flashcards.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
        <div className="container max-w-3xl py-8 px-4 sm:px-6 lg:px-8 mx-auto flex-1 flex flex-col">
          <Button
            variant="ghost"
            className="mb-4 self-start"
            onClick={() => setStudyMode(false)}
          >
            &larr; Back to resource
          </Button>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full">
              <SharedFlashcardStudy
                flashcards={resource.flashcards}
                resourceId={resource.id}
                token={token}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full quiz mode
  if (quizMode && resource.quizQuestions.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
        <div className="container max-w-3xl py-8 px-4 sm:px-6 lg:px-8 mx-auto flex-1 flex flex-col">
          <Button
            variant="ghost"
            className="mb-4 self-start"
            onClick={() => setQuizMode(false)}
          >
            &larr; Back to resource
          </Button>
          <div className="flex-1">
            <SharedQuizTaker
              questions={resource.quizQuestions}
              settings={resource.settings ? {
                timeLimitSeconds: resource.settings.timeLimitSeconds,
                shuffleQuestions: resource.settings.shuffleQuestions ?? true,
                showCorrectAnswers: resource.settings.showCorrectAnswers ?? true,
              } : null}
              token={token}
              resourceTitle={resource.title}
            />
          </div>
        </div>
      </div>
    );
  }

  // Full lesson mode
  if (lessonMode) {
    return (
      <SharedLessonMode
        token={token}
        lessonId={lessonMode}
        onExit={() => setLessonMode(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container max-w-5xl py-8 px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:underline"
          >
            Powered by gist
          </Link>
          {resource.isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={savingState}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="mr-2 h-4 w-4 text-primary" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Save to Library
                </>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{resource.title}</h1>
            {resource.description && (
              <p className="text-muted-foreground mt-2">
                {resource.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-4">
              {resource.difficulty && (
                <Badge variant="secondary">{resource.difficulty}</Badge>
              )}
              {resource.flashcards.length > 0 && (
                <Badge variant="outline">
                  {resource.flashcards.length} flashcards
                </Badge>
              )}
              {resource.quizQuestions.length > 0 && (
                <Badge variant="outline">
                  {resource.quizQuestions.length} quiz questions
                </Badge>
              )}
              {resource.lessons.length > 0 && (
                <Badge variant="outline">
                  {resource.lessons.length} lesson{resource.lessons.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {resource.summary ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer content={resource.summary} />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      No summary available for this resource.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="flashcards" className="mt-4">
              {needsAuth ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Sign in to study flashcards
                    </p>
                    <Button asChild>
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {resource.flashcards.length} flashcards available
                    </p>
                    <Button onClick={() => setStudyMode(true)}>
                      <Brain className="mr-2 h-4 w-4" />
                      Start Study Session
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {resource.flashcards.map((card) => (
                      <Card key={card.id}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                Front
                              </span>
                              <p className="text-sm">{card.front}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                Back
                              </span>
                              <p className="text-sm">{card.back}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="quiz" className="mt-4">
              {needsAuth ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Sign in to take the quiz
                    </p>
                    <Button asChild>
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {resource.quizQuestions.length} questions
                    </p>
                    <Button onClick={() => setQuizMode(true)}>
                      <FileQuestion className="mr-2 h-4 w-4" />
                      Take Quiz
                    </Button>
                  </div>
                  <Card>
                    <CardContent className="py-8 text-center">
                      <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="font-medium mb-2">
                        Ready to test your knowledge?
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {resource.quizQuestions.length} questions
                        {resource.settings?.timeLimitSeconds &&
                          ` | ${Math.ceil(resource.settings.timeLimitSeconds / 60)} min time limit`}
                      </p>
                      <Button onClick={() => setQuizMode(true)}>
                        Start Quiz
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            <TabsContent value="learn" className="mt-4">
              {needsAuth ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Sign in to take lessons
                    </p>
                    <Button asChild>
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {resource.lessons.map((lesson) => (
                    <Card key={lesson.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium">{lesson.title}</h3>
                          {lesson.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {lesson.description}
                            </p>
                          )}
                        </div>
                        <Button size="sm" onClick={() => setLessonMode(lesson.id)}>
                          Start
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Card className="bg-primary/5">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Want to create your own study materials with AI?
              </p>
              <Button asChild>
                <Link href="/login">Get Started with gist</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SharedLessonMode({
  token,
  lessonId,
  onExit,
}: {
  token: string;
  lessonId: string;
  onExit: () => void;
}) {
  const [lesson, setLesson] = useState<LessonWithSteps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/shared/${token}/lessons/${lessonId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load lesson");
        return res.json();
      })
      .then((data) => {
        setLesson(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load lesson");
        onExit();
      });
  }, [token, lessonId, onExit]);

  if (loading || !lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <LessonPlayer lesson={lesson} onExit={onExit} />;
}
