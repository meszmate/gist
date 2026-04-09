import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { resourceCollaborators, users, studyMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

// List collaborators
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;
    const { allowed } = await requirePermission(session.user.id, resourceId, "owner");
    if (!allowed) {
      return NextResponse.json({ error: "Only the owner can manage collaborators" }, { status: 403 });
    }

    const collaborators = await db
      .select({
        id: resourceCollaborators.id,
        role: resourceCollaborators.role,
        invitedAt: resourceCollaborators.invitedAt,
        acceptedAt: resourceCollaborators.acceptedAt,
        userId: resourceCollaborators.userId,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(resourceCollaborators)
      .innerJoin(users, eq(resourceCollaborators.userId, users.id))
      .where(eq(resourceCollaborators.resourceId, resourceId));

    return NextResponse.json({ collaborators });
  } catch (error) {
    console.error("Error listing collaborators:", error);
    return NextResponse.json({ error: "Failed to list collaborators" }, { status: 500 });
  }
}

// Invite collaborator
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
    const { allowed } = await requirePermission(session.user.id, resourceId, "owner");
    if (!allowed) {
      return NextResponse.json({ error: "Only the owner can invite collaborators" }, { status: 403 });
    }

    const body = await req.json();
    const data = inviteSchema.parse(body);

    // Find user by email
    const [invitedUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email));

    if (!invitedUser) {
      return NextResponse.json({ error: "User not found with this email" }, { status: 404 });
    }

    // Check if already a collaborator
    const [existing] = await db
      .select({ id: resourceCollaborators.id })
      .from(resourceCollaborators)
      .where(
        and(
          eq(resourceCollaborators.resourceId, resourceId),
          eq(resourceCollaborators.userId, invitedUser.id)
        )
      );

    if (existing) {
      return NextResponse.json({ error: "User is already a collaborator" }, { status: 409 });
    }

    // Check not inviting self
    const [resource] = await db
      .select({ userId: studyMaterials.userId })
      .from(studyMaterials)
      .where(eq(studyMaterials.id, resourceId));

    if (resource?.userId === invitedUser.id) {
      return NextResponse.json({ error: "Cannot add the owner as a collaborator" }, { status: 400 });
    }

    await db.insert(resourceCollaborators).values({
      resourceId,
      userId: invitedUser.id,
      role: data.role,
      invitedBy: session.user.id,
      acceptedAt: new Date(), // Auto-accept for now
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Error inviting collaborator:", error);
    return NextResponse.json({ error: "Failed to invite collaborator" }, { status: 500 });
  }
}

// Remove collaborator
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
    const { allowed } = await requirePermission(session.user.id, resourceId, "owner");
    if (!allowed) {
      return NextResponse.json({ error: "Only the owner can remove collaborators" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const collaboratorId = searchParams.get("id");

    if (!collaboratorId) {
      return NextResponse.json({ error: "Collaborator ID required" }, { status: 400 });
    }

    await db
      .delete(resourceCollaborators)
      .where(
        and(
          eq(resourceCollaborators.id, collaboratorId),
          eq(resourceCollaborators.resourceId, resourceId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    return NextResponse.json({ error: "Failed to remove collaborator" }, { status: 500 });
  }
}
