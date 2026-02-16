import JSZip from "jszip";

const DOCX_LIKE_EXTENSIONS = new Set([
  ".docx",
  ".docm",
  ".dotx",
  ".dotm",
]);

const PPTX_LIKE_EXTENSIONS = new Set([
  ".pptx",
  ".pptm",
  ".ppsx",
  ".ppsm",
  ".potx",
  ".potm",
]);

const DOCX_LIKE_MIME_TO_EXTENSION: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-word.document.macroenabled.12": ".docm",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": ".dotx",
  "application/vnd.ms-word.template.macroenabled.12": ".dotm",
};

const PPTX_LIKE_MIME_TO_EXTENSION: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": ".pptm",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": ".ppsx",
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": ".ppsm",
  "application/vnd.openxmlformats-officedocument.presentationml.template": ".potx",
  "application/vnd.ms-powerpoint.template.macroenabled.12": ".potm",
};

const CLIENT_OFFICE_MIME_TO_EXTENSION = {
  ...DOCX_LIKE_MIME_TO_EXTENSION,
  ...PPTX_LIKE_MIME_TO_EXTENSION,
};

export type ClientOfficeExtension =
  | ".docx"
  | ".docm"
  | ".dotx"
  | ".dotm"
  | ".pptx"
  | ".pptm"
  | ".ppsx"
  | ".ppsm"
  | ".potx"
  | ".potm";

export interface ClientOfficeParseResult {
  text: string;
  detectedType: ClientOfficeExtension;
  pageCount?: number;
}

function normalizeMimeType(mimeType?: string): string | undefined {
  if (!mimeType) return undefined;
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase();
  return normalized || undefined;
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
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

function resolveClientOfficeType(
  fileName: string,
  mimeType?: string
): ClientOfficeExtension | null {
  const ext = getFileExtension(fileName);
  if (DOCX_LIKE_EXTENSIONS.has(ext) || PPTX_LIKE_EXTENSIONS.has(ext)) {
    return ext as ClientOfficeExtension;
  }

  const normalizedMime = normalizeMimeType(mimeType);
  if (!normalizedMime) return null;

  const fromMime = CLIENT_OFFICE_MIME_TO_EXTENSION[normalizedMime];
  return (fromMime as ClientOfficeExtension | undefined) ?? null;
}

async function parseDocxLike(
  zip: JSZip,
  detectedType: Extract<ClientOfficeExtension, ".docx" | ".docm" | ".dotx" | ".dotm">
): Promise<ClientOfficeParseResult> {
  const partPaths: string[] = [];
  zip.forEach((path) => {
    if (
      /^word\/document\.xml$/i.test(path) ||
      /^word\/header\d+\.xml$/i.test(path) ||
      /^word\/footer\d+\.xml$/i.test(path) ||
      /^word\/(?:footnotes|endnotes|comments|commentsextended|commentsids)\.xml$/i.test(path)
    ) {
      partPaths.push(path);
    }
  });

  partPaths.sort((a, b) => {
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

  const chunks: string[] = [];
  for (const path of partPaths) {
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
      chunks.push(text);
    }
  }

  return {
    text: normalizeExtractedText(chunks.join("\n\n")),
    detectedType,
  };
}

async function parsePptxLike(
  zip: JSZip,
  detectedType: Extract<ClientOfficeExtension, ".pptx" | ".pptm" | ".ppsx" | ".ppsm" | ".potx" | ".potm">
): Promise<ClientOfficeParseResult> {
  const slidePaths: string[] = [];
  zip.forEach((path) => {
    if (/^ppt\/slides\/slide\d+\.xml$/i.test(path)) {
      slidePaths.push(path);
    }
  });

  slidePaths.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)/i)?.[1] || "0", 10);
    const numB = parseInt(b.match(/slide(\d+)/i)?.[1] || "0", 10);
    return numA - numB;
  });

  const slideTexts: string[] = [];
  for (const path of slidePaths) {
    const xml = await zip.file(path)?.async("text");
    if (!xml) continue;

    const xmlWithBreaks = xml
      .replace(/<a:br(?:\s[^>]*)?\/>/gi, "\n")
      .replace(/<\/a:p>/gi, "\n")
      .replace(/<\/a:tr>/gi, "\n");

    const segments = [...xmlWithBreaks.matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi)]
      .map((match) => decodeOpenXmlText(match[1] || "").trim())
      .filter(Boolean);

    const text = segments.length
      ? normalizeExtractedText(segments.join(" "))
      : normalizeExtractedText(
          decodeOpenXmlText(xmlWithBreaks.replace(/<[^>]+>/g, " "))
        );

    if (text) {
      slideTexts.push(text);
    }
  }

  if (!slideTexts.length) {
    const notesPaths: string[] = [];
    zip.forEach((path) => {
      if (/^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(path)) {
        notesPaths.push(path);
      }
    });

    notesPaths.sort((a, b) => {
      const numA = parseInt(a.match(/notesSlide(\d+)/i)?.[1] || "0", 10);
      const numB = parseInt(b.match(/notesSlide(\d+)/i)?.[1] || "0", 10);
      return numA - numB;
    });

    for (const path of notesPaths) {
      const xml = await zip.file(path)?.async("text");
      if (!xml) continue;

      const text = normalizeExtractedText(
        decodeOpenXmlText(
          xml
            .replace(/<a:br(?:\s[^>]*)?\/>/gi, "\n")
            .replace(/<\/a:p>/gi, "\n")
            .replace(/<[^>]+>/g, " ")
        )
      );

      if (text) {
        slideTexts.push(text);
      }
    }
  }

  return {
    text: normalizeExtractedText(slideTexts.join("\n\n")),
    detectedType,
    pageCount: slidePaths.length || undefined,
  };
}

export async function parseOfficeFileInBrowser(
  file: File
): Promise<ClientOfficeParseResult | null> {
  const detectedType = resolveClientOfficeType(file.name, file.type);
  if (!detectedType) return null;

  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  if (DOCX_LIKE_EXTENSIONS.has(detectedType)) {
    return parseDocxLike(
      zip,
      detectedType as Extract<ClientOfficeExtension, ".docx" | ".docm" | ".dotx" | ".dotm">
    );
  }

  if (PPTX_LIKE_EXTENSIONS.has(detectedType)) {
    return parsePptxLike(
      zip,
      detectedType as Extract<
        ClientOfficeExtension,
        ".pptx" | ".pptm" | ".ppsx" | ".ppsm" | ".potx" | ".potm"
      >
    );
  }

  return null;
}
