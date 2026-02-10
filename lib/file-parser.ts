import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".txt",
  ".md",
  ".csv",
] as const;

export type AcceptedExtension = (typeof ACCEPTED_EXTENSIONS)[number];

const MIME_TO_EXTENSION: Record<string, AcceptedExtension> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
};

export const ACCEPTED_MIME_TYPES = Object.keys(MIME_TO_EXTENSION);

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}

export function isAcceptedExtension(ext: string): ext is AcceptedExtension {
  return ACCEPTED_EXTENSIONS.includes(ext as AcceptedExtension);
}

interface ParseResult {
  text: string;
  pageCount?: number;
}

async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const textResult = await pdf.getText();
    const infoResult = await pdf.getInfo();
    return {
      text: textResult.text.trim(),
      pageCount: infoResult.total,
    };
  } finally {
    await pdf.destroy();
  }
}

async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value.trim() };
}

async function parsePptx(buffer: Buffer): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles: string[] = [];

  zip.forEach((path) => {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(path)) {
      slideFiles.push(path);
    }
  });

  // Sort slides numerically
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
    const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
    return numA - numB;
  });

  const texts: string[] = [];
  for (const slidePath of slideFiles) {
    const xml = await zip.file(slidePath)?.async("text");
    if (xml) {
      // Extract text from <a:t> tags
      const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g);
      if (matches) {
        const slideText = matches
          .map((m) => m.replace(/<\/?a:t>/g, ""))
          .join(" ");
        texts.push(slideText);
      }
    }
  }

  return {
    text: texts.join("\n\n").trim(),
    pageCount: slideFiles.length,
  };
}

function parsePlainText(buffer: Buffer): ParseResult {
  return { text: buffer.toString("utf-8").trim() };
}

export async function parseFileToText(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ParseResult> {
  let ext = getFileExtension(fileName);

  // Fall back to MIME type if extension is missing
  if (!ext && mimeType && MIME_TO_EXTENSION[mimeType]) {
    ext = MIME_TO_EXTENSION[mimeType];
  }

  switch (ext) {
    case ".pdf":
      return parsePdf(buffer);
    case ".docx":
      return parseDocx(buffer);
    case ".pptx":
      return parsePptx(buffer);
    case ".txt":
    case ".md":
    case ".csv":
      return parsePlainText(buffer);
    default:
      throw new Error(`Unsupported file type: ${ext || "unknown"}`);
  }
}
