import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { saveUploadedImage } from "@/lib/upload";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await saveUploadedImage(file, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("Image upload error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
