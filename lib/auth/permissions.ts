import { db } from "@/lib/db";
import { studyMaterials, resourceCollaborators, savedResources } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type ResourceRole = "owner" | "editor" | "viewer";

const ROLE_HIERARCHY: Record<ResourceRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

export async function getResourcePermission(
  userId: string,
  resourceId: string
): Promise<ResourceRole | null> {
  // Check if owner
  const [resource] = await db
    .select({ userId: studyMaterials.userId })
    .from(studyMaterials)
    .where(eq(studyMaterials.id, resourceId));

  if (!resource) return null;
  if (resource.userId === userId) return "owner";

  // Check collaborator table
  const [collab] = await db
    .select({ role: resourceCollaborators.role })
    .from(resourceCollaborators)
    .where(
      and(
        eq(resourceCollaborators.resourceId, resourceId),
        eq(resourceCollaborators.userId, userId)
      )
    );

  if (collab) return collab.role as ResourceRole;

  // Check saved resources (viewer access)
  const [saved] = await db
    .select({ id: savedResources.id })
    .from(savedResources)
    .where(
      and(
        eq(savedResources.resourceId, resourceId),
        eq(savedResources.userId, userId)
      )
    );

  if (saved) return "viewer";

  return null;
}

export async function requirePermission(
  userId: string,
  resourceId: string,
  minRole: ResourceRole
): Promise<{ allowed: boolean; role: ResourceRole | null }> {
  const role = await getResourcePermission(userId, resourceId);

  if (!role) return { allowed: false, role: null };

  const allowed = ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
  return { allowed, role };
}
