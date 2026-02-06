import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import {
  parseFileToText,
  getFileExtension,
  isAcceptedExtension,
  MAX_FILE_SIZE,
  ACCEPTED_EXTENSIONS,
} from "@/lib/file-parser";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file extension
    const ext = getFileExtension(file.name);
    if (!isAcceptedExtension(ext)) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Accepted types: ${ACCEPTED_EXTENSIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseFileToText(buffer, file.name, file.type);

    if (!result.text) {
      return NextResponse.json(
        { error: "No text could be extracted from this file. It may contain only images or be empty." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text: result.text,
      fileName: file.name,
      fileType: ext,
      characterCount: result.text.length,
      pageCount: result.pageCount,
    });
  } catch (error) {
    console.error("File parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse file" },
      { status: 500 }
    );
  }
}
