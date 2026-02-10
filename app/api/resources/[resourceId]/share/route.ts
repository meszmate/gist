import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

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

    // Verify ownership
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

    // Generate share token if not exists
    const shareToken = resource.shareToken || uuid();

    const [updated] = await db
      .update(studyMaterials)
      .set({
        shareToken,
        isPublic: true,
        updatedAt: new Date(),
      })
      .where(eq(studyMaterials.id, resourceId))
      .returning();

    return NextResponse.json({ shareToken: updated.shareToken });
  } catch (error) {
    console.error("Error generating share link:", error);
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;

    // Verify ownership
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

    await db
      .update(studyMaterials)
      .set({
        shareToken: null,
        isPublic: false,
        updatedAt: new Date(),
      })
      .where(eq(studyMaterials.id, resourceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing share link:", error);
    return NextResponse.json(
      { error: "Failed to remove share link" },
      { status: 500 }
    );
  }
}
