import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { generateSummaryStream, MODEL } from "@/lib/ai/openai";
import { checkTokenLimit, logTokenUsage } from "@/lib/ai/token-usage";

const streamSchema = z.object({
  sourceContent: z.string().min(1),
  locale: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
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
    const body = await req.json();
    const data = streamSchema.parse(body);

    const [resource] = await db
      .select()
      .from(studyMaterials)
      .where(
        and(
          eq(studyMaterials.id, resourceId),
          eq(studyMaterials.userId, session.user.id)
        )
      );

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const { stream, getUsage } = await generateSummaryStream(data.sourceContent, data.locale);

    // Log token usage and save summary after stream completes
    const [readable1, readable2] = stream.tee();
    const decoder = new TextDecoder();
    let fullContent = "";

    // Process the second stream to collect full content and log usage
    (async () => {
      try {
        const reader = readable2.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.content) fullContent += parsed.content;
              } catch {
                // skip
              }
            }
          }
        }

        // Save summary and log usage
        if (fullContent.trim()) {
          await db
            .update(studyMaterials)
            .set({ summary: fullContent, updatedAt: new Date() })
            .where(eq(studyMaterials.id, resourceId));
        }
        await logTokenUsage(session.user!.id!, getUsage(), "generate_summary_stream", MODEL);
      } catch (error) {
        console.error("Error processing stream:", error);
      }
    })();

    return new Response(readable1, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error streaming summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
