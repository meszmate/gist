import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".docm",
  ".dotx",
  ".dotm",
  ".pptx",
  ".pptm",
  ".ppsx",
  ".ppsm",
  ".potx",
  ".potm",
  ".xlsx",
  ".xlsm",
  ".odt",
  ".ods",
  ".odp",
  ".txt",
  ".text",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".jsonl",
  ".xml",
  ".html",
  ".htm",
  ".rtf",
  ".yaml",
  ".yml",
  ".log",
  ".sql",
] as const;

export type AcceptedExtension = (typeof ACCEPTED_EXTENSIONS)[number];

const MIME_TO_EXTENSION: Record<string, AcceptedExtension> = {
  "application/pdf": ".pdf",
  "application/x-pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-word.document.macroenabled.12": ".docm",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": ".dotx",
  "application/vnd.ms-word.template.macroenabled.12": ".dotm",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": ".pptm",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": ".ppsx",
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": ".ppsm",
  "application/vnd.openxmlformats-officedocument.presentationml.template": ".potx",
  "application/vnd.ms-powerpoint.template.macroenabled.12": ".potm",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel.sheet.macroenabled.12": ".xlsm",
  "application/vnd.oasis.opendocument.text": ".odt",
  "application/vnd.oasis.opendocument.spreadsheet": ".ods",
  "application/vnd.oasis.opendocument.presentation": ".odp",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/x-markdown": ".md",
  "text/csv": ".csv",
  "text/tab-separated-values": ".tsv",
  "application/json": ".json",
  "application/ld+json": ".json",
  "application/x-ndjson": ".jsonl",
  "application/xml": ".xml",
  "text/xml": ".xml",
  "text/html": ".html",
  "application/xhtml+xml": ".html",
  "application/rtf": ".rtf",
  "text/rtf": ".rtf",
  "application/x-rtf": ".rtf",
  "application/x-yaml": ".yaml",
  "application/yaml": ".yaml",
  "text/yaml": ".yaml",
  "text/x-yaml": ".yaml",
};

const TEXT_LIKE_EXTENSIONS = new Set<string>([
  ".txt",
  ".text",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".jsonl",
  ".xml",
  ".html",
  ".htm",
  ".rtf",
  ".yaml",
  ".yml",
  ".log",
  ".sql",
]);

export const ACCEPTED_MIME_TYPES = Object.keys(MIME_TO_EXTENSION);

export class UnsupportedFileTypeError extends Error {
  constructor(fileName: string, mimeType?: string) {
    const normalizedMime = normalizeMimeType(mimeType);
    const ext = getFileExtension(fileName);
    super(
      `Unsupported file type: ${ext || "unknown"}${
        normalizedMime ? ` (${normalizedMime})` : ""
      }`
    );
    this.name = "UnsupportedFileTypeError";
  }
}

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
  detectedType: AcceptedExtension;
}

function normalizeMimeType(mimeType?: string): string | undefined {
  if (!mimeType) return undefined;
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase();
  return normalized || undefined;
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function isZipBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  );
}

function decodeTextBuffer(buffer: Buffer): string {
  if (
    buffer.length >= 2 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xfe
  ) {
    return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  }

  if (
    buffer.length >= 2 &&
    buffer[0] === 0xfe &&
    buffer[1] === 0xff
  ) {
    const littleEndian = Buffer.alloc(Math.max(buffer.length - 2, 0));
    for (let i = 2; i + 1 < buffer.length; i += 2) {
      littleEndian[i - 2] = buffer[i + 1];
      littleEndian[i - 1] = buffer[i];
    }
    return new TextDecoder("utf-16le").decode(littleEndian);
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return buffer.subarray(3).toString("utf-8");
  }

  return buffer.toString("utf-8");
}

function isProbablyTextBuffer(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  if (!sample.length) return true;

  // UTF-16 BOM is valid text even though it contains null bytes.
  if (sample.length >= 2 && ((sample[0] === 0xff && sample[1] === 0xfe) || (sample[0] === 0xfe && sample[1] === 0xff))) {
    return true;
  }

  let controlCount = 0;

  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte >= 32) continue;
    controlCount += 1;
  }

  return controlCount / sample.length < 0.02;
}

function isLikelyTextMimeType(mimeType?: string): boolean {
  const mime = normalizeMimeType(mimeType);
  if (!mime) return false;

  return (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("yaml") ||
    mime.includes("rtf") ||
    mime.includes("javascript")
  );
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(parseInt(decimal, 10))
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function decodeOpenXmlEscapes(value: string): string {
  return value.replace(/_x([0-9a-fA-F]{4})_/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function decodeOpenXmlText(value: string): string {
  return decodeOpenXmlEscapes(decodeEntities(value));
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const textResult = await pdf.getText();
    const infoResult = await pdf.getInfo();
    return {
      text: normalizeExtractedText(textResult.text),
      pageCount: infoResult.total,
      detectedType: ".pdf",
    };
  } finally {
    await pdf.destroy();
  }
}

async function parseDocx(
  buffer: Buffer,
  detectedType: ".docx" | ".docm" | ".dotx" | ".dotm" = ".docx"
): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = normalizeExtractedText(result.value);
    if (text) {
      return {
        text,
        detectedType,
      };
    }
  } catch {
    // Fall back to direct OpenXML extraction below.
  }

  const zip = await JSZip.loadAsync(buffer);
  const docxPartPaths: string[] = [];
  zip.forEach((path) => {
    if (
      /^word\/document\.xml$/i.test(path) ||
      /^word\/header\d+\.xml$/i.test(path) ||
      /^word\/footer\d+\.xml$/i.test(path) ||
      /^word\/(?:footnotes|endnotes|comments|commentsextended|commentsids)\.xml$/i.test(path)
    ) {
      docxPartPaths.push(path);
    }
  });

  docxPartPaths.sort((a, b) => {
    const rank = (path: string) => {
      if (/^word\/document\.xml$/i.test(path)) return 0;
      if (/^word\/header\d+\.xml$/i.test(path)) return 1;
      if (/^word\/footer\d+\.xml$/i.test(path)) return 2;
      if (/^word\/footnotes\.xml$/i.test(path)) return 3;
      if (/^word\/endnotes\.xml$/i.test(path)) return 4;
      if (/^word\/comments/i.test(path)) return 5;
      return 99;
    };

    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;

    const numA = parseInt(a.match(/(\d+)/)?.[1] || "0", 10);
    const numB = parseInt(b.match(/(\d+)/)?.[1] || "0", 10);
    if (numA !== numB) return numA - numB;

    return a.localeCompare(b);
  });

  const texts: string[] = [];
  for (const path of docxPartPaths) {
    const xml = await zip.file(path)?.async("text");
    if (!xml) continue;

    const xmlWithBreaks = xml
      .replace(/<w:tab(?:\s[^>]*)?\/>/gi, "\t")
      .replace(/<w:(?:br|cr)(?:\s[^>]*)?\/>/gi, "\n")
      .replace(/<\/w:p>/gi, "\n")
      .replace(/<\/w:tr>/gi, "\n");

    const segments = [...xmlWithBreaks.matchAll(/<w:(?:t|delText|instrText)\b[^>]*>([\s\S]*?)<\/w:(?:t|delText|instrText)>/gi)]
      .map((match) => decodeOpenXmlText(match[1] || "").trim())
      .filter(Boolean);

    const text = segments.length
      ? normalizeExtractedText(segments.join(" "))
      : normalizeExtractedText(
          decodeOpenXmlText(xmlWithBreaks.replace(/<[^>]+>/g, " "))
        );

    if (text) {
      texts.push(text);
    }
  }

  return {
    text: normalizeExtractedText(texts.join("\n\n")),
    detectedType,
  };
}

async function parsePptx(
  buffer: Buffer,
  detectedType:
    | ".pptx"
    | ".pptm"
    | ".ppsx"
    | ".ppsm"
    | ".potx"
    | ".potm" = ".pptx"
): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles: string[] = [];

  zip.forEach((path) => {
    if (/^ppt\/slides\/slide\d+\.xml$/i.test(path)) {
      slideFiles.push(path);
    }
  });

  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0", 10);
    const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0", 10);
    return numA - numB;
  });

  const texts: string[] = [];

  for (const slidePath of slideFiles) {
    const xml = await zip.file(slidePath)?.async("text");
    if (!xml) continue;

    const xmlWithBreaks = xml
      .replace(/<a:br(?:\s[^>]*)?\/>/gi, "\n")
      .replace(/<\/a:p>/gi, "\n")
      .replace(/<\/a:tr>/gi, "\n");

    const segments = [...xmlWithBreaks.matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi)]
      .map((match) => decodeOpenXmlText(match[1] || "").trim())
      .filter(Boolean);

    const slideText = segments.length
      ? normalizeExtractedText(segments.join(" "))
      : normalizeExtractedText(
          decodeOpenXmlText(xmlWithBreaks.replace(/<[^>]+>/g, " "))
        );

    if (slideText.trim()) {
      texts.push(slideText);
    }
  }

  if (!texts.length) {
    const notesFiles: string[] = [];
    zip.forEach((path) => {
      if (/^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(path)) {
        notesFiles.push(path);
      }
    });

    notesFiles.sort((a, b) => {
      const numA = parseInt(a.match(/notesSlide(\d+)/i)?.[1] || "0", 10);
      const numB = parseInt(b.match(/notesSlide(\d+)/i)?.[1] || "0", 10);
      return numA - numB;
    });

    for (const notesPath of notesFiles) {
      const xml = await zip.file(notesPath)?.async("text");
      if (!xml) continue;

      const noteText = normalizeExtractedText(
        decodeOpenXmlText(
          xml
            .replace(/<a:br(?:\s[^>]*)?\/>/gi, "\n")
            .replace(/<\/a:p>/gi, "\n")
            .replace(/<[^>]+>/g, " ")
        )
      );
      if (noteText) {
        texts.push(noteText);
      }
    }
  }

  return {
    text: normalizeExtractedText(texts.join("\n\n")),
    pageCount: slideFiles.length || undefined,
    detectedType,
  };
}

function extractOdfText(contentXml: string): string {
  const blocks: string[] = [];
  const textBlockRegex = /<text:(?:h|p)[^>]*>([\s\S]*?)<\/text:(?:h|p)>/g;

  for (const match of contentXml.matchAll(textBlockRegex)) {
    const inner = match[1] || "";
    const withoutTags = inner.replace(/<[^>]+>/g, " ");
    const normalized = decodeEntities(withoutTags).replace(/\s+/g, " ").trim();
    if (normalized) {
      blocks.push(normalized);
    }
  }

  if (!blocks.length) {
    const fallback = decodeEntities(contentXml.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    return fallback;
  }

  return blocks.join("\n\n");
}

async function parseOdfTextDocument(
  buffer: Buffer,
  detectedType: ".odt" | ".ods"
): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(buffer);
  const contentXml = await zip.file("content.xml")?.async("text");

  if (!contentXml) {
    throw new Error(`Invalid ${detectedType.toUpperCase()} file: missing content.xml`);
  }

  return {
    text: normalizeExtractedText(extractOdfText(contentXml)),
    detectedType,
  };
}

async function parseOdt(buffer: Buffer): Promise<ParseResult> {
  return parseOdfTextDocument(buffer, ".odt");
}

async function parseOds(buffer: Buffer): Promise<ParseResult> {
  return parseOdfTextDocument(buffer, ".ods");
}

async function parseOdp(buffer: Buffer): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(buffer);
  const contentXml = await zip.file("content.xml")?.async("text");

  if (!contentXml) {
    throw new Error("Invalid ODP file: missing content.xml");
  }

  const pageCount = contentXml.match(/<draw:page\b/g)?.length;

  return {
    text: normalizeExtractedText(extractOdfText(contentXml)),
    pageCount,
    detectedType: ".odp",
  };
}

function parseSharedStrings(sharedStringsXml: string | undefined): string[] {
  if (!sharedStringsXml) return [];

  const strings: string[] = [];
  for (const match of sharedStringsXml.matchAll(/<si[\s\S]*?<\/si>/g)) {
    const value = [...match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((entry) => entry[1] || "")
      .map((part) => decodeEntities(part))
      .join("")
      .trim();

    strings.push(value);
  }

  return strings;
}

function extractWorksheetValues(xml: string, sharedStrings: string[]): string[] {
  const values: string[] = [];

  for (const cellMatch of xml.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attributes = cellMatch[1] || "";
    const cellContent = cellMatch[2] || "";
    const cellType = attributes.match(/\bt="([^"]+)"/)?.[1];

    let value = "";

    if (cellType === "s") {
      const index = Number(cellContent.match(/<v>(-?\d+)<\/v>/)?.[1] || "-1");
      value = index >= 0 ? sharedStrings[index] || "" : "";
    } else if (cellType === "inlineStr") {
      value = [...cellContent.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((entry) => entry[1] || "")
        .map((part) => decodeEntities(part))
        .join("")
        .trim();
    } else if (cellType === "b") {
      const boolValue = cellContent.match(/<v>([01])<\/v>/)?.[1];
      value = boolValue === "1" ? "TRUE" : boolValue === "0" ? "FALSE" : "";
    } else {
      value = decodeEntities(cellContent.match(/<v>([\s\S]*?)<\/v>/)?.[1] || "").trim();
    }

    if (value) {
      values.push(value);
    }
  }

  return values;
}

async function parseXlsx(
  buffer: Buffer,
  detectedType: ".xlsx" | ".xlsm" = ".xlsx"
): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(buffer);
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("text");
  const sharedStrings = parseSharedStrings(sharedStringsXml);

  const sheetFiles: string[] = [];
  zip.forEach((path) => {
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) {
      sheetFiles.push(path);
    }
  });

  sheetFiles.sort((a, b) => {
    const numA = parseInt(a.match(/sheet(\d+)/)?.[1] || "0", 10);
    const numB = parseInt(b.match(/sheet(\d+)/)?.[1] || "0", 10);
    return numA - numB;
  });

  const texts: string[] = [];
  for (const sheetPath of sheetFiles) {
    const sheetXml = await zip.file(sheetPath)?.async("text");
    if (!sheetXml) continue;

    const values = extractWorksheetValues(sheetXml, sharedStrings);
    if (values.length) {
      texts.push(values.join("\n"));
    }
  }

  return {
    text: normalizeExtractedText(texts.join("\n\n")),
    pageCount: sheetFiles.length || undefined,
    detectedType,
  };
}

function parseHtml(buffer: Buffer, detectedType: ".html" | ".htm"): ParseResult {
  const raw = decodeTextBuffer(buffer);
  const withoutScripts = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  const withBreaks = withoutScripts.replace(/<\/(?:p|div|li|h[1-6]|tr|br)>/gi, "\n");
  const withoutTags = withBreaks.replace(/<[^>]+>/g, " ");
  const text = decodeEntities(withoutTags);

  return {
    text: normalizeExtractedText(text),
    detectedType,
  };
}

function parseXml(buffer: Buffer): ParseResult {
  const raw = decodeTextBuffer(buffer);
  const withBreaks = raw.replace(/<\/(?:item|entry|row|p|h\d)>/gi, "\n");
  const withoutTags = withBreaks.replace(/<[^>]+>/g, " ");

  return {
    text: normalizeExtractedText(decodeEntities(withoutTags)),
    detectedType: ".xml",
  };
}

function parseRtf(buffer: Buffer): ParseResult {
  const raw = decodeTextBuffer(buffer);
  const decodedHex = raw.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  const text = decodedHex
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\\\\/g, "\\");

  return {
    text: normalizeExtractedText(text),
    detectedType: ".rtf",
  };
}

function parsePlainText(
  buffer: Buffer,
  detectedType: Extract<
    AcceptedExtension,
    | ".txt"
    | ".text"
    | ".md"
    | ".markdown"
    | ".csv"
    | ".tsv"
    | ".json"
    | ".jsonl"
    | ".yaml"
    | ".yml"
    | ".log"
    | ".sql"
  > = ".txt"
): ParseResult {
  return {
    text: normalizeExtractedText(decodeTextBuffer(buffer)),
    detectedType,
  };
}

async function detectZipContainerType(
  buffer: Buffer
): Promise<".docx" | ".pptx" | ".xlsx" | ".odt" | ".ods" | ".odp" | null> {
  try {
    const zip = await JSZip.loadAsync(buffer);

    if (zip.file("word/document.xml")) {
      return ".docx";
    }

    if (zip.file("ppt/presentation.xml")) {
      return ".pptx";
    }

    if (zip.file("xl/workbook.xml")) {
      return ".xlsx";
    }

    const mimeContent = await zip.file("mimetype")?.async("text");

    if (mimeContent?.trim() === "application/vnd.oasis.opendocument.text") {
      return ".odt";
    }

    if (
      mimeContent?.trim() ===
      "application/vnd.oasis.opendocument.spreadsheet"
    ) {
      return ".ods";
    }

    if (
      mimeContent?.trim() ===
      "application/vnd.oasis.opendocument.presentation"
    ) {
      return ".odp";
    }

    return null;
  } catch {
    return null;
  }
}

async function resolveFileType(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<AcceptedExtension | null> {
  const ext = getFileExtension(fileName);
  const normalizedMime = normalizeMimeType(mimeType);

  if (isAcceptedExtension(ext)) {
    return ext;
  }

  if (normalizedMime && MIME_TO_EXTENSION[normalizedMime]) {
    return MIME_TO_EXTENSION[normalizedMime];
  }

  if (isPdfBuffer(buffer)) {
    return ".pdf";
  }

  if (isZipBuffer(buffer)) {
    const zipType = await detectZipContainerType(buffer);
    if (zipType) return zipType;
  }

  if (TEXT_LIKE_EXTENSIONS.has(ext)) {
    return ext as AcceptedExtension;
  }

  if (isLikelyTextMimeType(normalizedMime) || isProbablyTextBuffer(buffer)) {
    return ".txt";
  }

  return null;
}

export async function parseFileToText(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ParseResult> {
  const type = await resolveFileType(buffer, fileName, mimeType);

  if (!type) {
    throw new UnsupportedFileTypeError(fileName, mimeType);
  }

  try {
    return await parseByType(type, buffer);
  } catch (error) {
    // If extension-based detection was wrong, retry with content-first detection.
    const fallbackType = await resolveFileType(buffer, "", mimeType);
    if (fallbackType && fallbackType !== type) {
      try {
        return await parseByType(fallbackType, buffer);
      } catch {
        // Keep the original parse error.
      }
    }

    // Last resort for text-like payloads mislabeled with binary extensions.
    if (
      type !== ".txt" &&
      (isLikelyTextMimeType(mimeType) || isProbablyTextBuffer(buffer))
    ) {
      return parsePlainText(buffer, ".txt");
    }

    throw error;
  }
}

async function parseByType(
  type: AcceptedExtension,
  buffer: Buffer
): Promise<ParseResult> {
  switch (type) {
    case ".pdf":
      return parsePdf(buffer);
    case ".docx":
      return parseDocx(buffer, ".docx");
    case ".docm":
      return parseDocx(buffer, ".docm");
    case ".dotx":
      return parseDocx(buffer, ".dotx");
    case ".dotm":
      return parseDocx(buffer, ".dotm");
    case ".pptx":
      return parsePptx(buffer, ".pptx");
    case ".pptm":
      return parsePptx(buffer, ".pptm");
    case ".ppsx":
      return parsePptx(buffer, ".ppsx");
    case ".ppsm":
      return parsePptx(buffer, ".ppsm");
    case ".potx":
      return parsePptx(buffer, ".potx");
    case ".potm":
      return parsePptx(buffer, ".potm");
    case ".xlsx":
      return parseXlsx(buffer, ".xlsx");
    case ".xlsm":
      return parseXlsx(buffer, ".xlsm");
    case ".odt":
      return parseOdt(buffer);
    case ".ods":
      return parseOds(buffer);
    case ".odp":
      return parseOdp(buffer);
    case ".html":
    case ".htm":
      return parseHtml(buffer, type);
    case ".xml":
      return parseXml(buffer);
    case ".rtf":
      return parseRtf(buffer);
    case ".text":
    case ".txt":
    case ".md":
    case ".markdown":
    case ".csv":
    case ".tsv":
    case ".json":
    case ".jsonl":
    case ".yaml":
    case ".yml":
    case ".log":
    case ".sql":
      return parsePlainText(buffer, type);
    default:
      return parsePlainText(buffer, ".txt");
  }
}
