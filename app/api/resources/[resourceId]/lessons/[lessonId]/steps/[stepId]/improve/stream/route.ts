import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { lessonSteps, studyMaterials, lessons } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { improveLessonStepStream, MODEL } from "@/lib/ai/openai";
import { checkTokenLimit, logTokenUsage } from "@/lib/ai/token-usage";
import { normalizeLessonStepPayload } from "@/lib/lesson/step-normalizer";
import { parseJsonWithFallback } from "@/lib/ai/parsing";

const improveSchema = z.object({
  locale: z.string().optional(),
  customInstructions: z.string().max(2000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resourceId: string; lessonId: string; stepId: string }> }
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

  const { resourceId, lessonId, stepId } = await params;
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
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.studyMaterialId, resourceId)));
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const [step] = await db
    .select()
    .from(lessonSteps)
    .where(and(eq(lessonSteps.id, stepId), eq(lessonSteps.lessonId, lessonId)));
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  const { stream: aiStream, getUsage } = await improveLessonStepStream(
    {
      stepType: step.stepType,
      content: step.content,
      answerData: step.answerData,
      explanation: step.explanation,
      hint: step.hint,
    },
    {
      sourceContent: resource.sourceContent || undefined,
      customInstructions: data.customInstructions,
      locale: data.locale,
    }
  );

  const encoder = new TextEncoder();
  const userId = session.user.id;

  const sse = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      let buffer = "";
      let chars = 0;

      try {
        for await (const chunk of aiStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (!delta) continue;
          buffer += delta;
          chars += delta.length;
          send({ type: "delta", text: delta, chars });
        }

        await logTokenUsage(userId, getUsage(), "improve_lesson_step_stream", MODEL);

        const parsedResult = parseJsonWithFallback(buffer) as Record<string, unknown> | null;
        if (!parsedResult) throw new Error("Failed to parse improved step");

        const normalized = normalizeLessonStepPayload({
          stepType: parsedResult.stepType ?? step.stepType,
          content: parsedResult.content ?? step.content,
          answerData: parsedResult.answerData ?? step.answerData,
        });

        const explanation =
          typeof parsedResult.explanation === "string"
            ? parsedResult.explanation
            : step.explanation;
        const hint =
          typeof parsedResult.hint === "string" ? parsedResult.hint : step.hint;

        send({ type: "saving" });

        const [updated] = await db
          .update(lessonSteps)
          .set({
            stepType: normalized.stepType,
            content: normalized.content,
            answerData: normalized.answerData,
            explanation,
            hint,
            updatedAt: new Date(),
          })
          .where(and(eq(lessonSteps.id, stepId), eq(lessonSteps.lessonId, lessonId)))
          .returning();

        send({ type: "saved", step: updated });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Error streaming step improve:", err);
        try {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Failed to improve step",
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
