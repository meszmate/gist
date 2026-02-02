import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { contacts, contactGroups, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const addContactSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  groupId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactsList = await db
      .select({
        id: contacts.id,
        email: contacts.email,
        name: contacts.name,
        hasAccount: contacts.hasAccount,
        notes: contacts.notes,
        group: {
          id: contactGroups.id,
          name: contactGroups.name,
          color: contactGroups.color,
        },
      })
      .from(contacts)
      .leftJoin(contactGroups, eq(contacts.groupId, contactGroups.id))
      .where(eq(contacts.teacherId, session.user.id))
      .orderBy(contacts.name, contacts.email);

    return NextResponse.json(contactsList);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
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
    const data = addContactSchema.parse(body);

    // Check if contact already exists
    const [existing] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.teacherId, session.user.id),
          eq(contacts.email, data.email)
        )
      );

    if (existing) {
      return NextResponse.json(
        { error: "Contact with this email already exists" },
        { status: 400 }
      );
    }

    // Check if user has an account
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email));

    const [contact] = await db
      .insert(contacts)
      .values({
        teacherId: session.user.id,
        email: data.email,
        name: data.name || null,
        groupId: data.groupId || null,
        notes: data.notes || null,
        hasAccount: !!existingUser,
      })
      .returning();

    return NextResponse.json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error adding contact:", error);
    return NextResponse.json(
      { error: "Failed to add contact" },
      { status: 500 }
    );
  }
}
