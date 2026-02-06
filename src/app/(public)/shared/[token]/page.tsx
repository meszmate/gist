import { db } from "@/lib/db";
import {
  studyMaterials,
  flashcards,
  quizQuestions,
  quizSettings,
  resourceAccessLogs,
  savedResources,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { SharedResourceClient } from "./client";

interface Props {
  params: Promise<{ token: string }>;
}

async function getSharedResource(token: string, userEmail?: string | null, userId?: string | null) {
  const [resource] = await db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      description: studyMaterials.description,
      summary: studyMaterials.summary,
      difficulty: studyMaterials.difficulty,
      isPublic: studyMaterials.isPublic,
      availableFrom: studyMaterials.availableFrom,
      availableTo: studyMaterials.availableTo,
      visibleSections: studyMaterials.visibleSections,
      requireAuthToInteract: studyMaterials.requireAuthToInteract,
      allowedViewerEmails: studyMaterials.allowedViewerEmails,
      userId: studyMaterials.userId,
    })
    .from(studyMaterials)
    .where(eq(studyMaterials.shareToken, token));

  if (!resource || !resource.isPublic) {
    return null;
  }

  // Access control check
  if (resource.allowedViewerEmails && resource.allowedViewerEmails.length > 0) {
    if (!userEmail || !resource.allowedViewerEmails.includes(userEmail)) {
      return { accessDenied: true as const, title: resource.title };
    }
  }

  // Availability check
  const now = new Date();
  let availabilityStatus: "available" | "not_yet" | "closed" = "available";
  if (resource.availableFrom && new Date(resource.availableFrom) > now) {
    availabilityStatus = "not_yet";
  }
  if (resource.availableTo && new Date(resource.availableTo) < now) {
    availabilityStatus = "closed";
  }

  const visibleSections = resource.visibleSections || {
    flashcards: true,
    summary: true,
    quiz: true,
  };

  const resourceFlashcards = visibleSections.flashcards
    ? await db
        .select({ id: flashcards.id, front: flashcards.front, back: flashcards.back })
        .from(flashcards)
        .where(eq(flashcards.studyMaterialId, resource.id))
    : [];

  const resourceQuestions = visibleSections.quiz
    ? await db
        .select({
          id: quizQuestions.id,
          question: quizQuestions.question,
          questionType: quizQuestions.questionType,
          questionConfig: quizQuestions.questionConfig,
          points: quizQuestions.points,
          order: quizQuestions.order,
          options: quizQuestions.options,
        })
        .from(quizQuestions)
        .where(eq(quizQuestions.studyMaterialId, resource.id))
    : [];

  const [settings] = await db
    .select({
      timeLimitSeconds: quizSettings.timeLimitSeconds,
      shuffleQuestions: quizSettings.shuffleQuestions,
      showCorrectAnswers: quizSettings.showCorrectAnswers,
    })
    .from(quizSettings)
    .where(eq(quizSettings.studyMaterialId, resource.id));

  // Check if saved by current user
  let isSaved = false;
  if (userId) {
    const [saved] = await db
      .select({ id: savedResources.id })
      .from(savedResources)
      .where(
        and(
          eq(savedResources.userId, userId),
          eq(savedResources.resourceId, resource.id)
        )
      );
    isSaved = !!saved;
  }

  // Log access
  await db.insert(resourceAccessLogs).values({
    resourceId: resource.id,
    email: userEmail || null,
    userId: userId || null,
    accessType: "resource_view",
  });

  return {
    accessDenied: false as const,
    id: resource.id,
    title: resource.title,
    description: resource.description,
    summary: visibleSections.summary ? resource.summary : null,
    difficulty: resource.difficulty,
    flashcards: resourceFlashcards,
    quizQuestions: resourceQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      questionType: q.questionType || "multiple_choice",
      config: q.questionConfig || {},
      points: parseFloat(q.points || "1"),
      order: q.order,
      options: q.options || [],
    })),
    settings: settings || null,
    visibleSections,
    availabilityStatus,
    availableFrom: resource.availableFrom?.toISOString() || null,
    availableTo: resource.availableTo?.toISOString() || null,
    requireAuthToInteract: resource.requireAuthToInteract || false,
    isSaved,
    isAuthenticated: !!userId,
  };
}

export default async function SharedResourcePage({ params }: Props) {
  const { token } = await params;
  const session = await auth();
  const resource = await getSharedResource(
    token,
    session?.user?.email,
    session?.user?.id
  );

  if (!resource) {
    notFound();
  }

  if (resource.accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Access Restricted</h1>
          <p className="text-muted-foreground">
            This resource is restricted to specific users. You don&apos;t have
            permission to view &quot;{resource.title}&quot;.
          </p>
        </div>
      </div>
    );
  }

  return <SharedResourceClient resource={resource} token={token} />;
}
