export interface FillBlankDefinition {
  id: string;
}

export interface FillBlankTemplatePart {
  type: "text" | "blank";
  content: string;
  blankId?: string;
}

const PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/g;
const BLANK_TOKEN_REGEX = /^blank(?:[_-]?\d+)?$/i;

function isBlankToken(token: string): boolean {
  return BLANK_TOKEN_REGEX.test(token.trim());
}

export function parseFillBlankTemplate(
  template: string,
  blanks: FillBlankDefinition[] = []
): FillBlankTemplatePart[] {
  const safeTemplate =
    typeof template === "string" ? template : String(template ?? "");
  const parts: FillBlankTemplatePart[] = [];
  const blanksById = new Map(blanks.map((blank) => [blank.id, blank]));
  let currentIndex = 0;
  let sequentialBlankIndex = 0;
  PLACEHOLDER_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_REGEX.exec(safeTemplate)) !== null) {
    if (match.index > currentIndex) {
      parts.push({
        type: "text",
        content: safeTemplate.slice(currentIndex, match.index),
      });
    }

    const rawToken = (match[1] || "").trim();
    const isGenericBlank = rawToken.toLowerCase() === "blank";
    const mappedBlank = isGenericBlank
      ? blanks[sequentialBlankIndex]
      : blanksById.get(rawToken);

    let blankId: string | null = null;
    if (mappedBlank?.id) {
      blankId = mappedBlank.id;
    } else if (isGenericBlank) {
      blankId = `blank_${sequentialBlankIndex}`;
    } else if (isBlankToken(rawToken)) {
      blankId = rawToken;
    } else if (rawToken.length > 0) {
      blankId = rawToken;
    }

    if (blankId) {
      parts.push({ type: "blank", content: "", blankId });
    } else {
      parts.push({ type: "text", content: match[0] });
    }

    if (isGenericBlank) {
      sequentialBlankIndex += 1;
    }

    currentIndex = match.index + match[0].length;
  }

  if (currentIndex < safeTemplate.length) {
    parts.push({
      type: "text",
      content: safeTemplate.slice(currentIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: safeTemplate }];
}

export function extractFillBlankIds(
  template: string,
  blanks: FillBlankDefinition[] = []
): string[] {
  const seen = new Set<string>();
  const orderedIds: string[] = [];

  for (const part of parseFillBlankTemplate(template, blanks)) {
    if (part.type !== "blank" || !part.blankId || seen.has(part.blankId)) {
      continue;
    }
    seen.add(part.blankId);
    orderedIds.push(part.blankId);
  }

  return orderedIds;
}

/**
 * Strip raw `{{placeholder}}` syntax from text meant for display to a
 * reader (a question prompt, statement, or instruction). Replaces every
 * `{{…}}` token with a visible blank line (four underscores) so the
 * learner sees a gap where the missing content belongs instead of the
 * literal template syntax.
 *
 * Do NOT use this on the actual fill-blank template that gets parsed into
 * input fields — those should flow through `parseFillBlankTemplate`.
 * Use this only on prompt / heading text that accidentally contains
 * placeholders (e.g. when the AI leaks a template into the wrong field).
 */
export function sanitizeQuestionText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\{\{[^}]+\}\}/g, "____");
}

export function replaceGenericBlankPlaceholders(
  template: string,
  blankIds: string[]
): string {
  let index = 0;
  return template.replace(/\{\{\s*blank\s*\}\}/gi, () => {
    const id = blankIds[index] || `blank_${index}`;
    index += 1;
    return `{{${id}}}`;
  });
}
