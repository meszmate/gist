/**
 * JSON parsing utilities for AI-generated content.
 * Extracted from openai.ts for testability.
 */

export function parseJsonWithFallback(result: string): unknown {
  try {
    return JSON.parse(result);
  } catch {
    const objectStart = result.indexOf("{");
    const objectEnd = result.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        return JSON.parse(result.slice(objectStart, objectEnd + 1));
      } catch {
        // Continue to array fallback
      }
    }

    const arrayStart = result.indexOf("[");
    const arrayEnd = result.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        return JSON.parse(result.slice(arrayStart, arrayEnd + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function extractArray(parsed: unknown, keys: string[]): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const asRecord = parsed as Record<string, unknown>;
    for (const key of keys) {
      const value = asRecord[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

export function extractArrayDeep(parsed: unknown, keys: string[]): unknown[] {
  const direct = extractArray(parsed, keys);
  if (direct.length > 0) return direct;

  if (parsed && typeof parsed === "object") {
    for (const value of Object.values(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        const nested = extractArrayDeep(value, keys);
        if (nested.length > 0) return nested;
      }
    }
  }

  return [];
}

export interface NormalizedFlashcard {
  front: string;
  back: string;
}

export function normalizeFlashcards(values: unknown[]): NormalizedFlashcard[] {
  return values
    .filter((card): card is Record<string, unknown> => !!card && typeof card === "object")
    .map((card) => {
      const front = String(
        card.front ??
        card.question ??
        card.prompt ??
        card.term ??
        card.title ??
        ""
      ).trim();
      const back = String(
        card.back ??
        card.answer ??
        card.definition ??
        card.explanation ??
        card.description ??
        ""
      ).trim();
      return { front, back };
    })
    .filter((card) => card.front.length > 0 && card.back.length > 0);
}
