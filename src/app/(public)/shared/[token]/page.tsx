import { db } from "@/lib/db";
import { studyMaterials, flashcards, quizQuestions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Brain, FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";

interface Props {
  params: Promise<{ token: string }>;
}

async function getSharedResource(token: string) {
  const [resource] = await db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      description: studyMaterials.description,
      summary: studyMaterials.summary,
      difficulty: studyMaterials.difficulty,
      isPublic: studyMaterials.isPublic,
    })
    .from(studyMaterials)
    .where(eq(studyMaterials.shareToken, token));

  if (!resource || !resource.isPublic) {
    return null;
  }

  const resourceFlashcards = await db
    .select({
      id: flashcards.id,
      front: flashcards.front,
      back: flashcards.back,
    })
    .from(flashcards)
    .where(eq(flashcards.studyMaterialId, resource.id));

  const resourceQuestions = await db
    .select({
      id: quizQuestions.id,
      question: quizQuestions.question,
      options: quizQuestions.options,
      correctAnswer: quizQuestions.correctAnswer,
      explanation: quizQuestions.explanation,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.studyMaterialId, resource.id));

  return {
    ...resource,
    flashcards: resourceFlashcards,
    quizQuestions: resourceQuestions,
  };
}

export default async function SharedResourcePage({ params }: Props) {
  const { token } = await params;
  const resource = await getSharedResource(token);

  if (!resource) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container max-w-4xl py-8 px-4">
        <div className="mb-8">
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            Powered by SmartNotes
          </Link>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{resource.title}</h1>
            {resource.description && (
              <p className="text-muted-foreground mt-2">{resource.description}</p>
            )}
            <div className="flex items-center gap-2 mt-4">
              {resource.difficulty && (
                <Badge variant="secondary">{resource.difficulty}</Badge>
              )}
              <Badge variant="outline">
                {resource.flashcards.length} flashcards
              </Badge>
              <Badge variant="outline">
                {resource.quizQuestions.length} quiz questions
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">
                <BookOpen className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="flashcards">
                <Brain className="mr-2 h-4 w-4" />
                Flashcards
              </TabsTrigger>
              <TabsTrigger value="quiz">
                <FileQuestion className="mr-2 h-4 w-4" />
                Quiz
              </TabsTrigger>
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
              {resource.flashcards.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      No flashcards available.
                    </p>
                  </CardContent>
                </Card>
              ) : (
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
              )}
            </TabsContent>

            <TabsContent value="quiz" className="mt-4">
              {resource.quizQuestions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      No quiz questions available.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {resource.quizQuestions.map((question, index) => (
                    <Card key={question.id}>
                      <CardContent className="p-4">
                        <p className="font-medium mb-3">
                          {index + 1}. {question.question}
                        </p>
                        <div className="space-y-2">
                          {question.options?.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`text-sm p-2 rounded ${
                                optionIndex === question.correctAnswer
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : "bg-muted"
                              }`}
                            >
                              {String.fromCharCode(65 + optionIndex)}. {option}
                            </div>
                          ))}
                        </div>
                        {question.explanation && (
                          <p className="text-sm text-muted-foreground mt-3">
                            {question.explanation}
                          </p>
                        )}
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
                <Link href="/login">Get Started with SmartNotes</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
