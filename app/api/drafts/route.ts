import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { drafts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const draftSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().uuid().nullable(),
  data: z.record(z.string(), z.any()),
});

// Upsert draft
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = draftSchema.parse(body);

    // Check if draft exists
    const conditions = [
      eq(drafts.userId, session.user.id),
      eq(drafts.entityType, data.entityType),
    ];
    if (data.entityId) {
      conditions.push(eq(drafts.entityId, data.entityId));
    }

    const [existing] = await db
      .select({ id: drafts.id })
      .from(drafts)
      .where(and(...conditions));

    if (existing) {
      await db
        .update(drafts)
        .set({ data: data.data, updatedAt: new Date() })
        .where(eq(drafts.id, existing.id));
    } else {
      await db.insert(drafts).values({
        userId: session.user.id,
        entityType: data.entityType,
        entityId: data.entityId,
        data: data.data,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error saving draft:", error);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}

// Get draft
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType) {
      return NextResponse.json({ error: "entityType required" }, { status: 400 });
    }

    const conditions = [
      eq(drafts.userId, session.user.id),
      eq(drafts.entityType, entityType),
    ];
    if (entityId) {
      conditions.push(eq(drafts.entityId, entityId));
    }

    const [draft] = await db
      .select()
      .from(drafts)
      .where(and(...conditions));

    return NextResponse.json({ draft: draft || null });
  } catch (error) {
    console.error("Error fetching draft:", error);
    return NextResponse.json({ error: "Failed to fetch draft" }, { status: 500 });
  }
}

// Delete draft
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType) {
      return NextResponse.json({ error: "entityType required" }, { status: 400 });
    }

    const conditions = [
      eq(drafts.userId, session.user.id),
      eq(drafts.entityType, entityType),
    ];
    if (entityId) {
      conditions.push(eq(drafts.entityId, entityId));
    }

    await db.delete(drafts).where(and(...conditions));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting draft:", error);
    return NextResponse.json({ error: "Failed to delete draft" }, { status: 500 });
  }
}
