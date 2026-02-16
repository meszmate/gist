import type { StepAnswerData, StepContent, StepType } from "@/lib/types/lesson";
import {
  extractFillBlankIds,
  replaceGenericBlankPlaceholders,
} from "@/lib/quiz/fill-blank-template";

interface NormalizeLessonStepInput {
  stepType: StepType | string;
  content: unknown;
  answerData: unknown;
}

export interface NormalizedLessonStepPayload {
  stepType: StepType | string;
  content: StepContent;
  answerData: StepAnswerData;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim();
    return normalized.length > 0 ? [normalized] : [];
  }
  return [];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function detectOneBasedIndexing(
  rawPairs: unknown[],
  position: 0 | 1,
  listLength: number
): boolean {
  if (listLength <= 0) return false;
  const numericValues = rawPairs
    .filter((entry) => Array.isArray(entry) && entry.length > position)
    .map((entry) => toNumber((entry as unknown[])[position]))
    .filter((value): value is number => value !== null)
    .map((value) => Math.round(value));

  if (numericValues.length === 0) return false;
  const hasZero = numericValues.some((value) => value === 0);
  const allWithinOneBased = numericValues.every(
    (value) => value >= 1 && value <= listLength
  );
  return allWithinOneBased && !hasZero;
}

function resolveListIndex(
  value: unknown,
  listLength: number,
  preferOneBased: boolean
): number | null {
  const numeric = toNumber(value);
  if (numeric === null || listLength <= 0) return null;

  const rounded = Math.round(numeric);
  if (preferOneBased && rounded >= 1 && rounded <= listLength) {
    return rounded - 1;
  }
  if (rounded >= 0 && rounded < listLength) {
    return rounded;
  }
  if (!preferOneBased && rounded >= 1 && rounded <= listLength) {
    return rounded - 1;
  }
  return null;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function normalizeDragMatch(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): { content: StepContent; answerData: StepAnswerData } {
  const rawPairs = Array.isArray(content.pairs)
    ? content.pairs
    : Array.isArray(content.items)
      ? content.items
      : [];

  let pairs = rawPairs
    .map((pair, index) => {
      const rawPair = asRecord(pair);
      return {
        id: String(rawPair.id ?? `${index + 1}`),
        left: String(
          rawPair.left ?? rawPair.term ?? rawPair.concept ?? rawPair.title ?? ""
        ).trim(),
        right: String(
          rawPair.right ??
            rawPair.definition ??
            rawPair.match ??
            rawPair.value ??
            rawPair.explanation ??
            ""
        ).trim(),
      };
    })
    .filter((pair) => pair.left.length > 0 || pair.right.length > 0);

  if (pairs.length === 0) {
    const leftItems = toStringArray(content.leftItems);
    const rightItems = toStringArray(content.rightItems);
    pairs = leftItems.map((left, index) => ({
      id: String(index + 1),
      left,
      right: rightItems[index] || "",
    }));
  }

  const rightPool = [
    ...pairs.map((pair) => pair.right).filter((value) => value.length > 0),
    ...toStringArray(content.rightItems),
  ];
  const rawCorrectPairs = answerData.correctPairs ?? answerData.pairs;
  const normalizedCorrectPairs: Record<string, string> = {};
  const rawCorrectPairsArray = Array.isArray(rawCorrectPairs)
    ? rawCorrectPairs
    : [];
  const useOneBasedLeft = detectOneBasedIndexing(
    rawCorrectPairsArray,
    0,
    pairs.length
  );
  const useOneBasedRight = detectOneBasedIndexing(
    rawCorrectPairsArray,
    1,
    rightPool.length
  );

  if (Array.isArray(rawCorrectPairs)) {
    for (const entry of rawCorrectPairs) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const leftIndex = resolveListIndex(
          entry[0],
          pairs.length,
          useOneBasedLeft
        );
        const rightIndex = resolveListIndex(
          entry[1],
          rightPool.length,
          useOneBasedRight
        );

        let pairId: string | null = null;
        if (leftIndex !== null && pairs[leftIndex]) {
          pairId = pairs[leftIndex].id;
        } else {
          const leftText = String(entry[0] ?? "").trim();
          const foundPair = pairs.find(
            (pair) => pair.id === leftText || pair.left === leftText
          );
          pairId = foundPair?.id || (leftText.length > 0 ? leftText : null);
        }

        let rightText = "";
        if (rightIndex !== null && rightPool[rightIndex] !== undefined) {
          rightText = rightPool[rightIndex];
        } else {
          rightText = String(entry[1] ?? "").trim();
        }

        if (pairId && rightText) {
          normalizedCorrectPairs[pairId] = rightText;
        }
        continue;
      }

      const rawPair = asRecord(entry);
      const leftText = String(
        rawPair.left ?? rawPair.leftId ?? rawPair.from ?? ""
      ).trim();
      const rightText = String(
        rawPair.right ?? rawPair.rightText ?? rawPair.to ?? ""
      ).trim();
      if (leftText && rightText) normalizedCorrectPairs[leftText] = rightText;
    }
  } else if (rawCorrectPairs && typeof rawCorrectPairs === "object") {
    for (const [rawLeft, rawRight] of Object.entries(
      rawCorrectPairs as Record<string, unknown>
    )) {
      const leftIndex = resolveListIndex(
        rawLeft,
        pairs.length,
        useOneBasedLeft
      );
      const leftKey =
        leftIndex !== null && pairs[leftIndex]
          ? pairs[leftIndex].id
          : String(rawLeft ?? "").trim();
      const rightIndex = resolveListIndex(
        rawRight,
        rightPool.length,
        useOneBasedRight
      );
      const rightValue =
        rightIndex !== null && rightPool[rightIndex] !== undefined
          ? rightPool[rightIndex]
          : String(rawRight ?? "").trim();
      if (leftKey && rightValue) normalizedCorrectPairs[leftKey] = rightValue;
    }
  }

  const reconciledCorrectPairs: Record<string, string> = {};
  for (const [rawKey, rightText] of Object.entries(normalizedCorrectPairs)) {
    if (!rightText) continue;

    const byId = pairs.find((pair) => pair.id === rawKey);
    if (byId) {
      reconciledCorrectPairs[byId.id] = rightText;
      continue;
    }

    const byLeft = pairs.find((pair) => pair.left === rawKey);
    if (byLeft) {
      reconciledCorrectPairs[byLeft.id] = rightText;
      continue;
    }

    const generatedId = rawKey || String(pairs.length + 1);
    pairs.push({
      id: generatedId,
      left: rawKey || generatedId,
      right: rightText,
    });
    reconciledCorrectPairs[generatedId] = rightText;
  }

  pairs = pairs
    .map((pair) => {
      const right = pair.right || reconciledCorrectPairs[pair.id] || "";
      return { ...pair, right };
    })
    .filter((pair) => pair.left.trim().length > 0 && pair.right.trim().length > 0);

  for (const pair of pairs) {
    if (!reconciledCorrectPairs[pair.id]) {
      reconciledCorrectPairs[pair.id] = pair.right;
    }
  }

  return {
    content: {
      type: "drag_match",
      instruction: String(
        content.instruction ?? "Match each item with its definition"
      ),
      pairs,
    },
    answerData: { correctPairs: reconciledCorrectPairs },
  };
}

function normalizeFillBlanks(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): { content: StepContent; answerData: StepAnswerData } {
  const rawTemplate = String(content.template ?? content.text ?? "").trim();
  const rawBlanks = Array.isArray(content.blanks) ? content.blanks : [];

  const acceptedById: Record<string, string[]> = {};
  const blankDefinitions = rawBlanks.map((blank, index) => {
    const rawBlank = asRecord(blank);
    const id = String(rawBlank.id ?? `b${index + 1}`).trim();
    const acceptedAnswers = uniqueStrings(
      toStringArray(rawBlank.acceptedAnswers ?? rawBlank.answers ?? rawBlank.answer)
    );
    if (id.length > 0) acceptedById[id] = acceptedAnswers;
    return { id, acceptedAnswers };
  });

  const rawCorrectBlanks = asRecord(answerData.correctBlanks ?? answerData.blanks);
  for (const [id, answers] of Object.entries(rawCorrectBlanks)) {
    acceptedById[id] = uniqueStrings(toStringArray(answers));
  }

  let blankIds = extractFillBlankIds(
    rawTemplate,
    blankDefinitions.map((blank) => ({ id: blank.id }))
  );
  if (blankIds.length === 0) blankIds = blankDefinitions.map((blank) => blank.id);
  if (blankIds.length === 0) blankIds = Object.keys(acceptedById);
  if (blankIds.length === 0) blankIds = ["b1"];

  let template = rawTemplate;
  if (!template) {
    template = blankIds.map((id) => `{{${id}}}`).join(" ");
  } else {
    template = replaceGenericBlankPlaceholders(template, blankIds);
  }

  const blanks = blankIds.map((id, index) => ({
    id,
    acceptedAnswers:
      acceptedById[id] ||
      blankDefinitions.find((blank) => blank.id === id)?.acceptedAnswers ||
      blankDefinitions[index]?.acceptedAnswers ||
      [],
  }));

  const correctBlanks: Record<string, string[]> = {};
  for (const blank of blanks) {
    correctBlanks[blank.id] = blank.acceptedAnswers;
  }

  return {
    content: {
      type: "fill_blanks",
      template,
      blanks,
    },
    answerData: { correctBlanks },
  };
}

function normalizeTypeAnswer(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): { content: StepContent; answerData: StepAnswerData } {
  const acceptedAnswers = uniqueStrings(
    toStringArray(
      answerData.acceptedAnswers ?? answerData.answers ?? answerData.correctAnswers
    )
  );

  return {
    content: {
      type: "type_answer",
      question: String(content.question ?? ""),
      placeholder:
        typeof content.placeholder === "string" ? content.placeholder : undefined,
      caseSensitive:
        typeof content.caseSensitive === "boolean" ? content.caseSensitive : false,
    },
    answerData: { acceptedAnswers },
  };
}

export function normalizeLessonStepPayload(
  input: NormalizeLessonStepInput
): NormalizedLessonStepPayload {
  const content = asRecord(input.content);
  const answerData = asRecord(input.answerData);

  if (input.stepType === "drag_match") {
    const normalized = normalizeDragMatch(content, answerData);
    return {
      stepType: input.stepType,
      content: normalized.content,
      answerData: normalized.answerData,
    };
  }

  if (input.stepType === "fill_blanks") {
    const normalized = normalizeFillBlanks(content, answerData);
    return {
      stepType: input.stepType,
      content: normalized.content,
      answerData: normalized.answerData,
    };
  }

  if (input.stepType === "type_answer") {
    const normalized = normalizeTypeAnswer(content, answerData);
    return {
      stepType: input.stepType,
      content: normalized.content,
      answerData: normalized.answerData,
    };
  }

  return {
    stepType: input.stepType,
    content: input.content as StepContent,
    answerData: (input.answerData as StepAnswerData) ?? null,
  };
}
