import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
]);

export interface UploadResult {
  url: string;
  filename: string;
}

export async function saveUploadedImage(
  file: File,
  userId: string
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: png, jpg, gif, webp`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const ext = file.name.split(".").pop() || "png";
  const filename = `${uuidv4()}.${ext}`;
  const userDir = path.join(UPLOAD_DIR, userId);

  await mkdir(userDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(userDir, filename);
  await writeFile(filePath, buffer);

  return {
    url: `/uploads/${userId}/${filename}`,
    filename,
  };
}
