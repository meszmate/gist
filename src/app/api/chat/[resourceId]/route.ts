import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { openai } from "@/lib/ai/openai";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;
    const { message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get the resource
    const [resource] = await db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        summary: studyMaterials.summary,
        sourceContent: studyMaterials.sourceContent,
      })
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

    // Build context from resource
    const context = resource.summary || resource.sourceContent || "";
    const systemPrompt = `You are a helpful tutor assistant for the study material titled "${resource.title}".

Your role is to:
- Answer questions about the material
- Explain concepts in simple terms
- Provide examples and analogies
- Help the student understand and remember key points
- Quiz the student if they ask

Context from the study material:
${context.slice(0, 8000)}

Be concise, helpful, and encouraging. If you don't know something or it's not in the material, say so.`;

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((msg: { role: string; content: string }) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: message },
      ],
      stream: true,
      max_tokens: 1000,
    });

    // Convert to readable stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error in chat:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
