"use client";

import { useState } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { SharedFlashcardStudy } from "@/components/shared/shared-flashcard-study";
import { SharedQuizTaker } from "@/components/shared/shared-quiz-taker";
import { toast } from "sonner";
import type { QuestionConfig } from "@/lib/types/quiz";

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
  settings: {
    timeLimitSeconds: number | null;
    shuffleQuestions: boolean | null;
    showCorrectAnswers: boolean | null;
  } | null;
  visibleSections: { flashcards: boolean; summary: boolean; quiz: boolean };
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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="container max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => setStudyMode(false)}
          >
            &larr; Back to resource
          </Button>
          <SharedFlashcardStudy
            flashcards={resource.flashcards}
            resourceId={resource.id}
            token={token}
          />
        </div>
      </div>
    );
  }

  // Full quiz mode
  if (quizMode && resource.quizQuestions.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="container max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => setQuizMode(false)}
          >
            &larr; Back to resource
          </Button>
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
