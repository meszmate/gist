import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { studyMaterials, flashcards, quizQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseCSV } from "@/lib/csv";

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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    if (!file || !type) {
      return NextResponse.json({ error: "File and type required" }, { status: 400 });
    }

    // Verify ownership
    const [resource] = await db
      .select({ id: studyMaterials.id })
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

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const dataRows = rows.slice(1);
    const skipped: string[] = [];
    let imported = 0;

    if (type === "flashcards") {
      const frontIdx = headers.indexOf("front");
      const backIdx = headers.indexOf("back");

      if (frontIdx === -1 || backIdx === -1) {
        return NextResponse.json({ error: "CSV must have 'front' and 'back' columns" }, { status: 400 });
      }

      const validCards = dataRows
        .map((row, i) => {
          const front = row[frontIdx]?.trim();
          const back = row[backIdx]?.trim();
          if (!front || !back) {
            skipped.push(`Row ${i + 2}: missing front or back`);
            return null;
          }
          return { studyMaterialId: resourceId, front, back };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      if (validCards.length > 0) {
        await db.insert(flashcards).values(validCards);
        imported = validCards.length;
      }
    } else if (type === "questions") {
      const questionIdx = headers.indexOf("question");
      if (questionIdx === -1) {
        return NextResponse.json({ error: "CSV must have a 'question' column" }, { status: 400 });
      }

      const typeIdx = headers.indexOf("questiontype");
      const pointsIdx = headers.indexOf("points");
      const explanationIdx = headers.indexOf("explanation");

      const validQuestions = dataRows
        .map((row, i) => {
          const question = row[questionIdx]?.trim();
          if (!question) {
            skipped.push(`Row ${i + 2}: missing question`);
            return null;
          }
          return {
            studyMaterialId: resourceId,
            question,
            questionType: typeIdx >= 0 ? row[typeIdx]?.trim() || "text_input" : "text_input",
            points: pointsIdx >= 0 ? row[pointsIdx]?.trim() || "1" : "1",
            explanation: explanationIdx >= 0 ? row[explanationIdx]?.trim() || null : null,
            order: i,
          };
        })
        .filter((q): q is NonNullable<typeof q> => q !== null);

      if (validQuestions.length > 0) {
        await db.insert(quizQuestions).values(validQuestions);
        imported = validQuestions.length;
      }
    } else {
      return NextResponse.json({ error: "Invalid type. Use 'flashcards' or 'questions'" }, { status: 400 });
    }

    return NextResponse.json({ imported, skipped, total: dataRows.length });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
