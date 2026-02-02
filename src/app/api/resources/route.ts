import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, flashcards, quizQuestions, folders } from "@/lib/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { z } from "zod";

const createResourceSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  folderId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resources = await db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        description: studyMaterials.description,
        difficulty: studyMaterials.difficulty,
        createdAt: studyMaterials.createdAt,
        folder: {
          id: folders.id,
          name: folders.name,
          color: folders.color,
        },
      })
      .from(studyMaterials)
      .leftJoin(folders, eq(studyMaterials.folderId, folders.id))
      .where(eq(studyMaterials.userId, session.user.id))
      .orderBy(desc(studyMaterials.createdAt));

    // Get counts for each resource
    const resourcesWithCounts = await Promise.all(
      resources.map(async (resource) => {
        const [flashcardCount] = await db
          .select({ count: count() })
          .from(flashcards)
          .where(eq(flashcards.studyMaterialId, resource.id));

        const [quizCount] = await db
          .select({ count: count() })
          .from(quizQuestions)
          .where(eq(quizQuestions.studyMaterialId, resource.id));

        return {
          ...resource,
          flashcardCount: flashcardCount?.count ?? 0,
          quizQuestionCount: quizCount?.count ?? 0,
        };
      })
    );

    return NextResponse.json(resourcesWithCounts);
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createResourceSchema.parse(body);

    const [resource] = await db
      .insert(studyMaterials)
      .values({
        userId: session.user.id,
        title: data.title,
        description: data.description || null,
        difficulty: data.difficulty || null,
        folderId: data.folderId || null,
      })
      .returning();

    return NextResponse.json(resource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating resource:", error);
    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 }
    );
  }
}
