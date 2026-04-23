import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  studyMaterials,
  flashcards,
  quizQuestions,
  lessons,
  lessonSteps,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { generateLessonStream, MODEL, type UserLevel } from "@/lib/ai/openai";
import { checkTokenLimit, logTokenUsage } from "@/lib/ai/token-usage";
import { LessonStreamParser } from "@/lib/ai/lesson-stream-parser";
import { normalizeLessonStepPayload } from "@/lib/lesson/step-normalizer";
import { inferUserLevel } from "@/lib/user/skill-inferencer";
import type { StepType, StepContent, StepAnswerData } from "@/lib/types/lesson";

const streamSchema = z.object({
  locale: z.string().optional(),
  targetLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  stepCount: z.number().min(6).max(24).optional(),
  title: z.string().optional(),
  customInstructions: z.string().max(2000).optional(),
  goal: z
    .enum([
      "exam_prep",
      "interview_prep",
      "curiosity",
      "refresher",
      "deep_understanding",
      "drill",
    ])
    .optional(),
  tone: z.enum(["friendly", "formal", "story", "socratic", "coach"]).optional(),
  theoryPractice: z.number().min(0).max(100).optional(),
  inclusions: z
    .object({
      examples: z.boolean().optional(),
      pitfalls: z.boolean().optional(),
      recap: z.boolean().optional(),
      memoryTricks: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, tokensUsed, tokenLimit } = await checkTokenLimit(session.user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Token usage limit exceeded", code: "TOKEN_LIMIT_EXCEEDED", tokensUsed, tokenLimit },
      { status: 429 }
    );
  }

  const { resourceId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = streamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const [resource] = await db
    .select({
      id: studyMaterials.id,
      sourceContent: studyMaterials.sourceContent,
      summary: studyMaterials.summary,
      title: studyMaterials.title,
    })
    .from(studyMaterials)
    .where(
      and(
        eq(studyMaterials.id, resourceId),
        eq(studyMaterials.userId, session.user.id)
      )
    );

  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const content = resource.sourceContent || resource.summary || "";
  if (!content) {
    return NextResponse.json(
      { error: "No source content available" },
      { status: 400 }
    );
  }

  const existingFlashcards = await db
    .select({ front: flashcards.front, back: flashcards.back })
    .from(flashcards)
    .where(eq(flashcards.studyMaterialId, resourceId));

  const existingQuestions = await db
    .select({ question: quizQuestions.question, options: quizQuestions.options })
    .from(quizQuestions)
    .where(eq(quizQuestions.studyMaterialId, resourceId));

  const validLevels: UserLevel[] = ["beginner", "intermediate", "advanced"];
  const targetLevel: UserLevel = validLevels.includes(data.targetLevel as UserLevel)
    ? (data.targetLevel as UserLevel)
    : await inferUserLevel(session.user.id, resourceId);

  const { stream: aiStream, getUsage } = await generateLessonStream(
    content,
    existingFlashcards,
    existingQuestions.map((q) => ({ question: q.question, options: q.options || undefined })),
    {
      stepCount: data.stepCount,
      title: data.title,
      targetLevel,
      customInstructions: data.customInstructions,
      goal: data.goal,
      tone: data.tone,
      theoryPractice: data.theoryPractice,
      inclusions: data.inclusions,
    },
    data.locale
  );

  const encoder = new TextEncoder();
  const parser = new LessonStreamParser();
  const userId = session.user.id;

  interface CollectedStep {
    stepType: string;
    content: unknown;
    answerData: unknown;
    explanation: unknown;
    hint: unknown;
  }

  const collected: {
    title: string;
    description: string;
    steps: CollectedStep[];
  } = { title: "", description: "", steps: [] };

  const sse = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      try {
        send({ type: "meta", targetLevel });

        for await (const chunk of aiStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (!delta) continue;
          const events = parser.feed(delta);
          for (const ev of events) {
            if (ev.type === "title") {
              collected.title = ev.value;
            } else if (ev.type === "description") {
              collected.description = ev.value;
            } else if (ev.type === "step") {
              const s = ev.step as Record<string, unknown>;
              collected.steps.push({
                stepType: String(s.stepType || ""),
                content: s.content,
                answerData: s.answerData,
                explanation: s.explanation,
                hint: s.hint,
              });
            }
            send(ev);
          }
        }

        await logTokenUsage(userId, getUsage(), "generate_lesson_stream", MODEL);

        if (collected.steps.length === 0) {
          send({ type: "error", message: "No steps were generated" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        send({ type: "saving" });

        const [lesson] = await db
          .insert(lessons)
          .values({
            studyMaterialId: resourceId,
            title: collected.title || data.title || "Untitled Lesson",
            description: collected.description || null,
            order: 0,
            settings: { allowSkip: true, showProgressBar: true, transitionStyle: "slide" },
            status: "draft",
            isPublic: false,
            targetLevel,
          })
          .returning();

        const normalizedSteps = collected.steps
          .map((step) => {
            const normalized = normalizeLessonStepPayload({
              stepType: step.stepType,
              content: step.content,
              answerData: step.answerData,
            });
            const explanation =
              typeof step.explanation === "string" ? step.explanation : null;
            const hint = typeof step.hint === "string" ? step.hint : null;
            return {
              stepType: normalized.stepType as StepType,
              content: normalized.content as StepContent,
              answerData: normalized.answerData as StepAnswerData,
              explanation,
              hint,
            };
          });

        if (normalizedSteps.length > 0) {
          await db.insert(lessonSteps).values(
            normalizedSteps.map((step, index) => ({
              lessonId: lesson.id,
              order: index,
              stepType: step.stepType,
              content: step.content,
              answerData: step.answerData,
              explanation: step.explanation,
              hint: step.hint,
            }))
          );
        }

        send({
          type: "saved",
          lessonId: lesson.id,
          stepCount: normalizedSteps.length,
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Error streaming lesson:", err);
        try {
          send({ type: "error", message: "Failed to generate lesson" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch {
          // ignore
        }
        controller.close();
      }
    },
  });

  return new Response(sse, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
