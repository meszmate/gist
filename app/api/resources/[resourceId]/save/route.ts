import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { savedResources, studyMaterials, resourceAccessLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

    // Check resource exists
    const [resource] = await db
      .select({ id: studyMaterials.id })
      .from(studyMaterials)
      .where(eq(studyMaterials.id, resourceId));

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Check if already saved
    const [existing] = await db
      .select({ id: savedResources.id })
      .from(savedResources)
      .where(
        and(
          eq(savedResources.userId, session.user.id),
          eq(savedResources.resourceId, resourceId)
        )
      );

    if (existing) {
      return NextResponse.json({ message: "Already saved" });
    }

    const [saved] = await db
      .insert(savedResources)
      .values({
        userId: session.user.id,
        resourceId,
        permission: "read",
      })
      .returning();

    // Log save
    await db.insert(resourceAccessLogs).values({
      resourceId,
      email: session.user.email,
      userId: session.user.id,
      accessType: "resource_saved",
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Error saving resource:", error);
    return NextResponse.json(
      { error: "Failed to save resource" },
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

    await db
      .delete(savedResources)
      .where(
        and(
          eq(savedResources.userId, session.user.id),
          eq(savedResources.resourceId, resourceId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing saved resource:", error);
    return NextResponse.json(
      { error: "Failed to remove saved resource" },
      { status: 500 }
    );
  }
}
