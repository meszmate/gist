import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessons, lessonSteps, studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { improveLessonStream, MODEL, type UserLevel } from "@/lib/ai/openai";
import { checkTokenLimit, logTokenUsage } from "@/lib/ai/token-usage";
import { LessonStreamParser } from "@/lib/ai/lesson-stream-parser";
import { normalizeLessonStepPayload } from "@/lib/lesson/step-normalizer";
import type { StepType, StepContent, StepAnswerData } from "@/lib/types/lesson";

const improveSchema = z.object({
  locale: z.string().optional(),
  customInstructions: z.string().max(2000).optional(),
  targetLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resourceId: string; lessonId: string }> }
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

  const { resourceId, lessonId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = improveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const [resource] = await db
    .select({ id: studyMaterials.id, sourceContent: studyMaterials.sourceContent })
    .from(studyMaterials)
    .where(
      and(eq(studyMaterials.id, resourceId), eq(studyMaterials.userId, session.user.id))
    );
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [lesson] = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.studyMaterialId, resourceId)));
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const existingSteps = await db
    .select()
    .from(lessonSteps)
    .where(eq(lessonSteps.lessonId, lessonId))
    .orderBy(lessonSteps.order);

  const validLevels: UserLevel[] = ["beginner", "intermediate", "advanced"];
  const targetLevel: UserLevel | undefined = validLevels.includes(data.targetLevel as UserLevel)
    ? (data.targetLevel as UserLevel)
    : (lesson.targetLevel as UserLevel | undefined);

  const { stream: aiStream, getUsage } = await improveLessonStream(
    {
      title: lesson.title,
      description: lesson.description,
      steps: existingSteps.map((s) => ({
        stepType: s.stepType,
        content: s.content,
        answerData: s.answerData,
        explanation: s.explanation,
        hint: s.hint,
      })),
    },
    {
      sourceContent: resource.sourceContent || undefined,
      customInstructions: data.customInstructions,
      locale: data.locale,
      targetLevel,
    }
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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        send({ type: "meta", existingStepCount: existingSteps.length });

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

        await logTokenUsage(userId, getUsage(), "improve_lesson_stream", MODEL);

        if (collected.steps.length === 0) {
          send({ type: "error", message: "No steps were generated" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        send({ type: "saving" });

        await db.transaction(async (tx) => {
          await tx
            .update(lessons)
            .set({
              title: collected.title || lesson.title,
              description: collected.description || lesson.description,
              updatedAt: new Date(),
            })
            .where(eq(lessons.id, lessonId));

          await tx.delete(lessonSteps).where(eq(lessonSteps.lessonId, lessonId));

          const normalizedSteps = collected.steps.map((step) => {
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
            await tx.insert(lessonSteps).values(
              normalizedSteps.map((step, index) => ({
                lessonId,
                order: index,
                stepType: step.stepType,
                content: step.content,
                answerData: step.answerData,
                explanation: step.explanation,
                hint: step.hint,
              }))
            );
          }
        });

        send({
          type: "saved",
          lessonId,
          stepCount: collected.steps.length,
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Error streaming lesson improve:", err);
        try {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Failed to improve lesson",
          });
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
