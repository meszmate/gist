import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;
    const body = await req.json();
    const { completed } = body;

    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Invalid data: 'completed' must be a boolean" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: studyMaterials.id })
      .from(studyMaterials)
      .where(
        and(
          eq(studyMaterials.id, resourceId),
          eq(studyMaterials.userId, session.user.id)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(studyMaterials)
      .set({
        completedAt: completed ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(studyMaterials.id, resourceId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating completion status:", error);
    return NextResponse.json(
      { error: "Failed to update completion status" },
      { status: 500 }
    );
  }
}
