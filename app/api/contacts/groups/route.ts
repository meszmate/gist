import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { contactGroups, contacts } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { z } from "zod";

const addGroupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await db
      .select({
        id: contactGroups.id,
        name: contactGroups.name,
        color: contactGroups.color,
      })
      .from(contactGroups)
      .where(eq(contactGroups.teacherId, session.user.id))
      .orderBy(contactGroups.name);

    // Get contact counts for each group
    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const [contactCount] = await db
          .select({ count: count() })
          .from(contacts)
          .where(eq(contacts.groupId, group.id));

        return {
          ...group,
          contactCount: contactCount?.count ?? 0,
        };
      })
    );

    return NextResponse.json(groupsWithCounts);
  } catch (error) {
    console.error("Error fetching contact groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact groups" },
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
    const data = addGroupSchema.parse(body);

    const [group] = await db
      .insert(contactGroups)
      .values({
        teacherId: session.user.id,
        name: data.name,
        color: data.color || null,
      })
      .returning();

    return NextResponse.json(group);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating contact group:", error);
    return NextResponse.json(
      { error: "Failed to create contact group" },
      { status: 500 }
    );
  }
}
