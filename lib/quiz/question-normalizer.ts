import type {
  CorrectAnswerData,
  QuestionConfig,
  QuestionTypeSlug,
} from "@/lib/types/quiz";
import {
  extractFillBlankIds,
  replaceGenericBlankPlaceholders,
} from "@/lib/quiz/fill-blank-template";

interface NormalizeQuestionInput {
  questionType?: unknown;
  questionConfig?: unknown;
  correctAnswerData?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
}

export interface NormalizedQuestionPayload {
  questionType: QuestionTypeSlug;
  questionConfig: QuestionConfig;
  correctAnswerData: CorrectAnswerData | null;
  options: string[] | null;
  correctAnswer: number | null;
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

function resolveListValue(
  value: unknown,
  values: string[],
  preferOneBased: boolean
): string | null {
  const index = resolveListIndex(value, values.length, preferOneBased);
  if (index !== null && values[index] !== undefined) {
    return values[index];
  }
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
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

export function normalizeQuestionType(questionType: unknown): QuestionTypeSlug {
  const raw = String(questionType ?? "multiple_choice").trim().toLowerCase();
  switch (raw) {
    case "multiple choice":
    case "multiple-choice":
    case "multi_choice":
    case "mcq":
      return "multiple_choice";
    case "truefalse":
    case "boolean":
      return "true_false";
    case "text":
    case "free_text":
    case "short_answer":
    case "shortanswer":
      return "text_input";
    case "year":
      return "year_range";
    case "number":
    case "numeric":
    case "number_range":
      return "numeric_range";
    case "match":
    case "matching_pairs":
      return "matching";
    case "fill_blanks":
    case "fill_in_blank":
    case "fill-in-the-blank":
      return "fill_blank";
    case "multi-select":
    case "multi select":
    case "multiple_select":
      return "multi_select";
    default:
      return raw as QuestionTypeSlug;
  }
}

function normalizeMultipleChoice(
  config: Record<string, unknown>,
  answerData: Record<string, unknown>,
  input: NormalizeQuestionInput
): NormalizedQuestionPayload {
  const options = uniqueStrings(
    toStringArray(config.options ?? config.choices ?? input.options)
  );

  let correctIndex = toNumber(
    answerData.correctIndex ??
      answerData.correctAnswer ??
      answerData.answerIndex ??
      input.correctAnswer
  );
  if (correctIndex === null && typeof answerData.correctOption === "string") {
    correctIndex = options.indexOf(answerData.correctOption);
  }
  if (correctIndex === null) correctIndex = 0;
  if (options.length > 0) {
    correctIndex = Math.max(0, Math.min(options.length - 1, Math.round(correctIndex)));
  } else {
    correctIndex = 0;
  }

  return {
    questionType: "multiple_choice",
    questionConfig: {
      options,
      shuffleOptions: toBoolean(config.shuffleOptions) ?? false,
    },
    correctAnswerData: { correctIndex },
    options,
    correctAnswer: correctIndex,
  };
}

function normalizeTrueFalse(
  config: Record<string, unknown>,
  answerData: Record<string, unknown>,
  input: NormalizeQuestionInput
): NormalizedQuestionPayload {
  const fallbackFromLegacyIndex = toNumber(input.correctAnswer);
  const fallbackBool =
    fallbackFromLegacyIndex === 1
      ? true
      : fallbackFromLegacyIndex === 0
        ? false
        : null;

  const correctValue =
    toBoolean(answerData.correctValue ?? answerData.isTrue ?? answerData.answer) ??
    fallbackBool ??
    true;

  return {
    questionType: "true_false",
    questionConfig: {
      trueLabel:
        typeof config.trueLabel === "string" ? config.trueLabel : "True",
      falseLabel:
        typeof config.falseLabel === "string" ? config.falseLabel : "False",
    },
    correctAnswerData: { correctValue },
    options: null,
    correctAnswer: null,
  };
}

function normalizeTextInput(
  config: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedQuestionPayload {
  const acceptedAnswers = uniqueStrings(
    toStringArray(
      answerData.acceptedAnswers ??
        answerData.answers ??
        answerData.correctAnswers ??
        (typeof answerData.exactMatch === "string"
          ? [answerData.exactMatch]
          : [])
    )
  );
  const keywords = uniqueStrings(
    toStringArray(answerData.keywords ?? config.acceptedKeywords)
  );

  const normalizedConfig: Record<string, unknown> = {
    caseSensitive: toBoolean(config.caseSensitive) ?? false,
    trimWhitespace: toBoolean(config.trimWhitespace) ?? true,
  };
  if (typeof config.placeholder === "string") {
    normalizedConfig.placeholder = config.placeholder;
  }
  const maxLength = toNumber(config.maxLength);
  if (maxLength !== null && maxLength > 0) {
    normalizedConfig.maxLength = Math.round(maxLength);
  }

  const normalizedAnswerData: Record<string, unknown> = {
    acceptedAnswers,
  };
  if (keywords.length > 0) {
    normalizedAnswerData.keywords = keywords;
  }

  return {
    questionType: "text_input",
    questionConfig: normalizedConfig as QuestionConfig,
    correctAnswerData: normalizedAnswerData as CorrectAnswerData,
    options: null,
    correctAnswer: null,
  };
}

function normalizeYearRange(
  config: Record<string, unknown>,
  answerData: Record<string, unknown>,
  input: NormalizeQuestionInput
): NormalizedQuestionPayload {
  const minYear = toNumber(config.minYear ?? config.min);
  const maxYear = toNumber(config.maxYear ?? config.max);
  const tolerance = toNumber(config.tolerance ?? config.toleranceYears);
  const fallbackYear = toNumber(input.correctAnswer);
  const correctYear = toNumber(
    answerData.correctYear ?? answerData.exactYear ?? answerData.year
  );

  const normalizedConfig: Record<string, unknown> = {};
  if (minYear !== null) normalizedConfig.minYear = Math.round(minYear);
  if (maxYear !== null) normalizedConfig.maxYear = Math.round(maxYear);
  if (tolerance !== null) normalizedConfig.tolerance = Math.max(0, Math.round(tolerance));
  if (typeof config.placeholder === "string") {
    normalizedConfig.placeholder = config.placeholder;
  }

  return {
    questionType: "year_range",
    questionConfig: normalizedConfig as QuestionConfig,
    correctAnswerData: {
      correctYear: Math.round(correctYear ?? fallbackYear ?? new Date().getUTCFullYear()),
    },
    options: null,
    correctAnswer: null,
  };
}

function normalizeNumericRange(
  config: Record<string, unknown>,
  answerData: Record<string, unknown>,
  input: NormalizeQuestionInput
): NormalizedQuestionPayload {
  let tolerance = toNumber(config.tolerance);
  let toleranceType =
    config.toleranceType === "absolute" || config.toleranceType === "percentage"
      ? config.toleranceType
      : undefined;

  const tolerancePercent = toNumber(config.tolerancePercent ?? answerData.tolerancePercent);
  if (tolerance === null && tolerancePercent !== null) {
    tolerance = tolerancePercent;
    toleranceType = "percentage";
  }

  const min = toNumber(config.min ?? config.minValue);
  const max = toNumber(config.max ?? config.maxValue);
  const step = toNumber(config.step);
  const fallbackValue = toNumber(input.correctAnswer);
  const correctValue = toNumber(
    answerData.correctValue ?? answerData.exactValue ?? answerData.value
  );

  const normalizedConfig: Record<string, unknown> = {};
  if (tolerance !== null) normalizedConfig.tolerance = Math.max(0, tolerance);
  if (tolerance !== null) normalizedConfig.toleranceType = toleranceType ?? "absolute";
  if (min !== null) normalizedConfig.min = min;
  if (max !== null) normalizedConfig.max = max;
  if (step !== null && step > 0) normalizedConfig.step = step;
  if (typeof config.unit === "string") normalizedConfig.unit = config.unit;
  if (typeof config.placeholder === "string") normalizedConfig.placeholder = config.placeholder;

  return {
    questionType: "numeric_range",
    questionConfig: normalizedConfig as QuestionConfig,
    correctAnswerData: { correctValue: correctValue ?? fallbackValue ?? 0 },
    options: null,
    correctAnswer: null,
  };
}

function normalizeMatching(
  config: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedQuestionPayload {
  const leftColumn = uniqueStrings(
    toStringArray(config.leftColumn ?? config.leftItems ?? config.left)
  );
  const rightColumn = uniqueStrings(
    toStringArray(config.rightColumn ?? config.rightItems ?? config.right)
  );

  const configPairs = Array.isArray(config.pairs) ? config.pairs : [];
  for (const pair of configPairs) {
    const rawPair = asRecord(pair);
    const left = String(rawPair.left ?? rawPair.term ?? "").trim();
    const right = String(rawPair.right ?? rawPair.match ?? rawPair.definition ?? "").trim();
    if (left && !leftColumn.includes(left)) leftColumn.push(left);
    if (right && !rightColumn.includes(right)) rightColumn.push(right);
  }

  const rawCorrectPairs = answerData.correctPairs ?? answerData.pairs ?? answerData.matches;
  const rawCorrectPairsArray = Array.isArray(rawCorrectPairs)
    ? rawCorrectPairs
    : [];
  const useOneBasedLeft = detectOneBasedIndexing(
    rawCorrectPairsArray,
    0,
    leftColumn.length
  );
  const useOneBasedRight = detectOneBasedIndexing(
    rawCorrectPairsArray,
    1,
    rightColumn.length
  );

  const resolveLeft = (value: unknown): string | null =>
    resolveListValue(value, leftColumn, useOneBasedLeft);
  const resolveRight = (value: unknown): string | null =>
    resolveListValue(value, rightColumn, useOneBasedRight);

  const correctPairs: Record<string, string> = {};

  if (Array.isArray(rawCorrectPairs)) {
    for (const entry of rawCorrectPairs) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const left = resolveLeft(entry[0]);
        const right = resolveRight(entry[1]);
        if (left && right) correctPairs[left] = right;
        continue;
      }
      const pair = asRecord(entry);
      const left = resolveLeft(pair.left ?? pair.leftItem ?? pair.from);
      const right = resolveRight(pair.right ?? pair.rightItem ?? pair.to);
      if (left && right) correctPairs[left] = right;
    }
  } else if (rawCorrectPairs && typeof rawCorrectPairs === "object") {
    for (const [leftRaw, rightRaw] of Object.entries(rawCorrectPairs as Record<string, unknown>)) {
      const left = resolveLeft(leftRaw);
      const right = resolveRight(rightRaw);
      if (left && right) correctPairs[left] = right;
    }
  }

  if (Object.keys(correctPairs).length === 0 && leftColumn.length === rightColumn.length) {
    for (let index = 0; index < leftColumn.length; index += 1) {
      if (rightColumn[index]) {
        correctPairs[leftColumn[index]] = rightColumn[index];
      }
    }
  }

  for (const [left, right] of Object.entries(correctPairs)) {
    if (!leftColumn.includes(left)) leftColumn.push(left);
    if (!rightColumn.includes(right)) rightColumn.push(right);
  }

  return {
    questionType: "matching",
    questionConfig: {
      leftColumn,
      rightColumn,
      shuffleRight: toBoolean(config.shuffleRight) ?? true,
      leftColumnLabel:
        typeof config.leftColumnLabel === "string"
          ? config.leftColumnLabel
          : undefined,
      rightColumnLabel:
        typeof config.rightColumnLabel === "string"
          ? config.rightColumnLabel
          : undefined,
    },
    correctAnswerData: { correctPairs },
    options: null,
    correctAnswer: null,
  };
}

function normalizeFillBlank(
  config: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedQuestionPayload {
  const rawTemplate = String(config.template ?? "").trim();
  const rawBlanks = Array.isArray(config.blanks) ? config.blanks : [];

  const acceptedById: Record<string, string[]> = {};
  const configBlanks = rawBlanks.map((blank, index) => {
    const rawBlank = asRecord(blank);
    const id = String(rawBlank.id ?? `blank_${index}`).trim();
    const acceptedAnswers = uniqueStrings(
      toStringArray(rawBlank.acceptedAnswers ?? rawBlank.answers ?? rawBlank.answer)
    );
    if (id.length > 0) acceptedById[id] = acceptedAnswers;
    return { id, acceptedAnswers };
  });

  const answerBlanks = asRecord(answerData.blanks ?? answerData.correctBlanks);
  for (const [id, answers] of Object.entries(answerBlanks)) {
    acceptedById[id] = uniqueStrings(toStringArray(answers));
  }

  let blankIds = extractFillBlankIds(rawTemplate, configBlanks.map((blank) => ({ id: blank.id })));
  if (blankIds.length === 0) blankIds = configBlanks.map((blank) => blank.id);
  if (blankIds.length === 0) blankIds = Object.keys(acceptedById);
  if (blankIds.length === 0) blankIds = ["blank_0"];

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
      configBlanks.find((blank) => blank.id === id)?.acceptedAnswers ||
      configBlanks[index]?.acceptedAnswers ||
      [],
  }));

  const normalizedAnswerBlanks: Record<string, string[]> = {};
  for (const blank of blanks) {
    normalizedAnswerBlanks[blank.id] = blank.acceptedAnswers;
  }

  return {
    questionType: "fill_blank",
    questionConfig: {
      template,
      blanks,
      caseSensitive: toBoolean(config.caseSensitive) ?? false,
    },
    correctAnswerData: { blanks: normalizedAnswerBlanks },
    options: null,
    correctAnswer: null,
  };
}

function normalizeMultiSelect(
  config: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedQuestionPayload {
  const options = uniqueStrings(toStringArray(config.options ?? config.choices));
  const rawIndices = Array.isArray(answerData.correctIndices)
    ? answerData.correctIndices
    : Array.isArray(answerData.indices)
      ? answerData.indices
      : [];

  const correctIndices = uniqueStrings(
    rawIndices
      .map((value) => {
        const numeric = toNumber(value);
        return numeric === null ? "" : String(Math.round(numeric));
      })
      .filter((value) => value.length > 0)
  )
    .map((value) => Number(value))
    .filter((index) => index >= 0 && index < options.length);

  if (correctIndices.length === 0 && Array.isArray(answerData.correctAnswers)) {
    for (const answerOption of toStringArray(answerData.correctAnswers)) {
      const optionIndex = options.indexOf(answerOption);
      if (optionIndex >= 0 && !correctIndices.includes(optionIndex)) {
        correctIndices.push(optionIndex);
      }
    }
  }

  const normalizedConfig: Record<string, unknown> = { options };
  const shuffleOptions = toBoolean(config.shuffleOptions);
  const minSelections = toNumber(config.minSelections);
  const maxSelections = toNumber(config.maxSelections);
  if (shuffleOptions !== null) normalizedConfig.shuffleOptions = shuffleOptions;
  if (minSelections !== null) normalizedConfig.minSelections = Math.max(0, Math.round(minSelections));
  if (maxSelections !== null) normalizedConfig.maxSelections = Math.max(1, Math.round(maxSelections));

  return {
    questionType: "multi_select",
    questionConfig: normalizedConfig as QuestionConfig,
    correctAnswerData: { correctIndices },
    options: null,
    correctAnswer: null,
  };
}

export function normalizeQuestionPayload(
  input: NormalizeQuestionInput
): NormalizedQuestionPayload {
  const questionType = normalizeQuestionType(input.questionType);
  const config = asRecord(input.questionConfig);
  const answerData = asRecord(input.correctAnswerData);

  switch (questionType) {
    case "multiple_choice":
      return normalizeMultipleChoice(config, answerData, input);
    case "true_false":
      return normalizeTrueFalse(config, answerData, input);
    case "text_input":
      return normalizeTextInput(config, answerData);
    case "year_range":
      return normalizeYearRange(config, answerData, input);
    case "numeric_range":
      return normalizeNumericRange(config, answerData, input);
    case "matching":
      return normalizeMatching(config, answerData);
    case "fill_blank":
      return normalizeFillBlank(config, answerData);
    case "multi_select":
      return normalizeMultiSelect(config, answerData);
    default:
      return {
        questionType,
        questionConfig: (config as QuestionConfig) || {},
        correctAnswerData:
          Object.keys(answerData).length > 0
            ? (answerData as CorrectAnswerData)
            : null,
        options: Array.isArray(input.options) ? toStringArray(input.options) : null,
        correctAnswer: toNumber(input.correctAnswer),
      };
  }
}
