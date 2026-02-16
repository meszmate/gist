import OpenAI from "openai";
import type {
  QuestionTypeSlug,
  QuestionConfig,
  CorrectAnswerData,
} from "@/lib/types/quiz";
import type { StepContent, StepAnswerData, StepType } from "@/lib/types/lesson";
import { extractFillBlankIds, replaceGenericBlankPlaceholders } from "@/lib/quiz/fill-blank-template";

export const openai = new OpenAI();

export const MODEL = process.env.OPENAI_MODEL || "o4-mini";

export interface TokenUsageData {
  total_tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

function extractUsage(completion: { usage?: { total_tokens: number; prompt_tokens: number; completion_tokens: number } | null }): TokenUsageData | null {
  if (!completion.usage) return null;
  return {
    total_tokens: completion.usage.total_tokens,
    prompt_tokens: completion.usage.prompt_tokens,
    completion_tokens: completion.usage.completion_tokens,
  };
}

const LANGUAGE_NAMES: Record<string, string> = { en: "English", hu: "Hungarian" };
const GENERATION_INPUT_MAX_CHARS = 24000;

function getLanguageInstruction(locale?: string): string {
  const lang = LANGUAGE_NAMES[locale || "en"] || "English";
  return `\nIMPORTANT: Generate ALL content in ${lang}.`;
}

function prepareGenerationContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= GENERATION_INPUT_MAX_CHARS) return trimmed;

  const half = Math.floor(GENERATION_INPUT_MAX_CHARS / 2);
  const head = trimmed.slice(0, half);
  const tail = trimmed.slice(-half);
  return `${head}\n\n[... middle section omitted due to length ...]\n\n${tail}`;
}

function parseJsonWithFallback(result: string): unknown {
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

function extractArray(parsed: unknown, keys: string[]): unknown[] {
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

function extractArrayDeep(parsed: unknown, keys: string[]): unknown[] {
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

function normalizeFlashcards(values: unknown[]): GeneratedFlashcard[] {
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

export const SUMMARY_SYSTEM_PROMPT = `You are an expert educator. Generate a clear, well-organized summary of the provided content.
Focus on key concepts, main ideas, and important details.
Use markdown formatting for better readability (headings, bullet points, etc.).
Keep the summary concise but comprehensive.`;

export const FLASHCARD_SYSTEM_PROMPT = `You are an expert educator creating flashcards for spaced repetition learning.
Generate flashcards that test understanding of key concepts.
Each flashcard should have:
- A clear, specific question or prompt on the front
- A concise, accurate answer on the back
Make sure the questions vary in difficulty and cover different aspects of the material.
Return as a JSON array with objects containing "front" and "back" fields.`;

export const QUIZ_SYSTEM_PROMPT = `You are an expert educator creating multiple-choice quiz questions.
Generate questions that test understanding, not just memorization.
Each question should have:
- A clear question
- 4 answer options (one correct, three plausible distractors)
- An explanation of why the correct answer is right
Return as a JSON array with objects containing:
- "question": the question text
- "options": array of 4 answer strings
- "correctAnswer": index (0-3) of the correct option
- "explanation": brief explanation of the answer`;

export const EXTENDED_QUIZ_SYSTEM_PROMPT = `You are an expert educator creating diverse quiz questions.
Generate questions that test understanding using various question types.

Available question types:
1. multiple_choice - Traditional multiple choice with 4 options
2. true_false - Binary true/false questions
3. text_input - Free text answers with keywords to match
4. year_range - Questions asking for a year (with tolerance for partial credit)
5. numeric_range - Questions asking for a number (with tolerance)
6. matching - Match items from two columns
7. fill_blank - Complete sentences with missing words
8. multi_select - Select ALL correct answers from options

Return a JSON object with "questions" array. Each question object MUST have:
- "question": the question text
- "questionType": one of the types above
- "questionConfig": type-specific configuration
- "correctAnswerData": the correct answer(s)
- "points": point value (1-3 based on difficulty)
- "explanation": brief explanation

Type-specific formats:

multiple_choice:
  questionConfig: { options: ["A", "B", "C", "D"], shuffleOptions: true }
  correctAnswerData: { correctIndex: 0 }

true_false:
  questionConfig: { trueLabel: "True", falseLabel: "False" }
  correctAnswerData: { correctValue: true }

text_input:
  questionConfig: { caseSensitive: false, trimWhitespace: true, placeholder: "Type your answer" }
  correctAnswerData: { acceptedAnswers: ["correct answer"], keywords: ["key", "words"] }

year_range:
  questionConfig: { minYear: 1900, maxYear: 2024, tolerance: 5 }
  correctAnswerData: { correctYear: 1969 }

numeric_range:
  questionConfig: { min: 0, max: 1000, tolerance: 10, toleranceType: "percentage", unit: "km" }
  correctAnswerData: { correctValue: 384400 }

matching:
  questionConfig: { leftColumn: ["Term1", "Term2"], rightColumn: ["Def1", "Def2"], shuffleRight: true }
  correctAnswerData: { correctPairs: { "Term1": "Def1", "Term2": "Def2" } }

fill_blank:
  question: "Complete the sentence:"
  questionConfig: { template: "The {{blank_0}} is the capital of France.", blanks: [{ id: "blank_0", acceptedAnswers: ["Paris", "paris"] }], caseSensitive: false }
  correctAnswerData: { blanks: { "blank_0": ["Paris", "paris"] } }
  NOTE: Use {{blank_0}}, {{blank_1}}, etc. as placeholders in template (or {{blank}}). Do NOT use ___ or other formats.

multi_select:
  questionConfig: { options: ["A", "B", "C", "D"], minSelections: 1, maxSelections: 4 }
  correctAnswerData: { correctIndices: [0, 2] }`;

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ExtendedQuizQuestion {
  question: string;
  questionType: QuestionTypeSlug;
  questionConfig: QuestionConfig;
  correctAnswerData: CorrectAnswerData;
  points: number;
  explanation: string;
}

export type QuestionTypeFilter = QuestionTypeSlug | "all" | "mixed";

function isExtendedQuizQuestion(value: unknown): value is ExtendedQuizQuestion {
  if (!value || typeof value !== "object") return false;
  const question = value as Record<string, unknown>;
  return (
    typeof question.question === "string" &&
    typeof question.questionType === "string" &&
    !!question.questionConfig &&
    !!question.correctAnswerData
  );
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

function normalizeQuestionType(questionType: unknown): QuestionTypeSlug {
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
    case "short_answer":
    case "shortanswer":
    case "free_text":
      return "text_input";
    case "year":
      return "year_range";
    case "numeric":
    case "number":
    case "number_range":
      return "numeric_range";
    case "match":
    case "matching_pairs":
      return "matching";
    case "fill_in_blank":
    case "fill_blanks":
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

function normalizeExtendedQuizQuestion(question: ExtendedQuizQuestion): ExtendedQuizQuestion | null {
  const questionText = String(question.question || "").trim();
  if (!questionText) return null;

  const questionType = normalizeQuestionType(question.questionType);
  const config = asRecord(question.questionConfig);
  const answerData = asRecord(question.correctAnswerData);
  const points = Math.max(1, Math.min(3, Math.round(toNumber(question.points) ?? 1)));
  const explanation = typeof question.explanation === "string" ? question.explanation : "";

  switch (questionType) {
    case "multiple_choice": {
      const options = uniqueStrings(
        toStringArray(config.options ?? config.choices ?? config.answers)
      );

      let correctIndex =
        toNumber(answerData.correctIndex ?? answerData.correctAnswer ?? answerData.answerIndex);
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
        question: questionText,
        questionType: "multiple_choice",
        questionConfig: {
          options,
          shuffleOptions: toBoolean(config.shuffleOptions) ?? true,
        },
        correctAnswerData: { correctIndex },
        points,
        explanation,
      };
    }

    case "true_false": {
      const trueLabel = typeof config.trueLabel === "string" ? config.trueLabel : undefined;
      const falseLabel = typeof config.falseLabel === "string" ? config.falseLabel : undefined;

      return {
        question: questionText,
        questionType: "true_false",
        questionConfig: { trueLabel, falseLabel },
        correctAnswerData: {
          correctValue: toBoolean(answerData.correctValue ?? answerData.isTrue ?? answerData.answer) ?? false,
        },
        points,
        explanation,
      };
    }

    case "text_input": {
      const acceptedAnswers = uniqueStrings(
        toStringArray(
          answerData.acceptedAnswers ??
          answerData.answers ??
          answerData.correctAnswers ??
          (typeof answerData.exactMatch === "string" ? [answerData.exactMatch] : [])
        )
      );
      const keywords = uniqueStrings(
        toStringArray(answerData.keywords ?? config.acceptedKeywords)
      );

      const normalizedConfig: Record<string, unknown> = {
        caseSensitive: toBoolean(config.caseSensitive) ?? false,
      };
      const trimWhitespace = toBoolean(config.trimWhitespace);
      if (trimWhitespace !== null) normalizedConfig.trimWhitespace = trimWhitespace;
      if (typeof config.placeholder === "string") normalizedConfig.placeholder = config.placeholder;
      const maxLength = toNumber(config.maxLength);
      if (maxLength !== null && maxLength > 0) normalizedConfig.maxLength = Math.round(maxLength);

      const normalizedAnswers: Record<string, unknown> = {
        acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : (keywords.length > 0 ? [keywords[0]] : []),
      };
      if (keywords.length > 0) normalizedAnswers.keywords = keywords;

      return {
        question: questionText,
        questionType: "text_input",
        questionConfig: normalizedConfig as QuestionConfig,
        correctAnswerData: normalizedAnswers as CorrectAnswerData,
        points,
        explanation,
      };
    }

    case "year_range": {
      const normalizedConfig: Record<string, unknown> = {};
      const minYear = toNumber(config.minYear ?? config.min);
      const maxYear = toNumber(config.maxYear ?? config.max);
      const tolerance = toNumber(config.tolerance ?? config.toleranceYears ?? answerData.toleranceYears);
      if (minYear !== null) normalizedConfig.minYear = Math.round(minYear);
      if (maxYear !== null) normalizedConfig.maxYear = Math.round(maxYear);
      if (tolerance !== null) normalizedConfig.tolerance = Math.max(0, Math.round(tolerance));
      if (typeof config.placeholder === "string") normalizedConfig.placeholder = config.placeholder;

      return {
        question: questionText,
        questionType: "year_range",
        questionConfig: normalizedConfig as QuestionConfig,
        correctAnswerData: {
          correctYear: Math.round(
            toNumber(answerData.correctYear ?? answerData.exactYear ?? answerData.year) ??
            new Date().getUTCFullYear()
          ),
        } as CorrectAnswerData,
        points,
        explanation,
      };
    }

    case "numeric_range": {
      const normalizedConfig: Record<string, unknown> = {};
      let tolerance = toNumber(config.tolerance);
      let toleranceType =
        config.toleranceType === "percentage" || config.toleranceType === "absolute"
          ? config.toleranceType
          : undefined;

      const tolerancePercent = toNumber(config.tolerancePercent ?? answerData.tolerancePercent);
      if (tolerance === null && tolerancePercent !== null) {
        tolerance = tolerancePercent;
        toleranceType = "percentage";
      }

      if (tolerance !== null) {
        normalizedConfig.tolerance = Math.max(0, tolerance);
        normalizedConfig.toleranceType = toleranceType ?? "absolute";
      }

      const min = toNumber(config.min ?? config.minValue);
      const max = toNumber(config.max ?? config.maxValue);
      const stepValue = toNumber(config.step);
      if (min !== null) normalizedConfig.min = min;
      if (max !== null) normalizedConfig.max = max;
      if (stepValue !== null && stepValue > 0) normalizedConfig.step = stepValue;
      if (typeof config.unit === "string") normalizedConfig.unit = config.unit;
      if (typeof config.placeholder === "string") normalizedConfig.placeholder = config.placeholder;

      return {
        question: questionText,
        questionType: "numeric_range",
        questionConfig: normalizedConfig as QuestionConfig,
        correctAnswerData: {
          correctValue: toNumber(answerData.correctValue ?? answerData.exactValue ?? answerData.value) ?? 0,
        } as CorrectAnswerData,
        points,
        explanation,
      };
    }

    case "matching": {
      const leftColumn = uniqueStrings(
        toStringArray(config.leftColumn ?? config.leftItems ?? config.left)
      );
      const rightColumn = uniqueStrings(
        toStringArray(config.rightColumn ?? config.rightItems ?? config.right)
      );

      const rawPairs = Array.isArray(config.pairs) ? config.pairs : [];
      for (const pair of rawPairs) {
        const rawPair = asRecord(pair);
        const left = String(rawPair.left ?? rawPair.term ?? rawPair.prompt ?? "").trim();
        const right = String(rawPair.right ?? rawPair.definition ?? rawPair.match ?? "").trim();
        if (left && !leftColumn.includes(left)) leftColumn.push(left);
        if (right && !rightColumn.includes(right)) rightColumn.push(right);
      }

      const normalizedPairs: Record<string, string> = {};
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

      if (Array.isArray(rawCorrectPairs)) {
        for (const entry of rawCorrectPairs) {
          if (Array.isArray(entry) && entry.length >= 2) {
            const left = resolveLeft(entry[0]);
            const right = resolveRight(entry[1]);
            if (left && right) normalizedPairs[left] = right;
            continue;
          }

          const pair = asRecord(entry);
          const left = resolveLeft(pair.left ?? pair.leftItem ?? pair.from);
          const right = resolveRight(pair.right ?? pair.rightItem ?? pair.to);
          if (left && right) normalizedPairs[left] = right;
        }
      } else if (rawCorrectPairs && typeof rawCorrectPairs === "object") {
        for (const [leftRaw, rightRaw] of Object.entries(rawCorrectPairs as Record<string, unknown>)) {
          const left = resolveLeft(leftRaw);
          const right = resolveRight(rightRaw);
          if (left && right) normalizedPairs[left] = right;
        }
      }

      if (Object.keys(normalizedPairs).length === 0 && leftColumn.length === rightColumn.length) {
        for (let index = 0; index < leftColumn.length; index += 1) {
          if (rightColumn[index]) {
            normalizedPairs[leftColumn[index]] = rightColumn[index];
          }
        }
      }

      for (const [left, right] of Object.entries(normalizedPairs)) {
        if (!leftColumn.includes(left)) leftColumn.push(left);
        if (!rightColumn.includes(right)) rightColumn.push(right);
      }

      return {
        question: questionText,
        questionType: "matching",
        questionConfig: {
          leftColumn,
          rightColumn,
          shuffleRight: toBoolean(config.shuffleRight) ?? true,
        },
        correctAnswerData: { correctPairs: normalizedPairs },
        points,
        explanation,
      };
    }

    case "fill_blank": {
      const rawTemplate = String(config.template ?? "").trim();
      const rawBlanks = Array.isArray(config.blanks) ? config.blanks : [];

      const acceptedById: Record<string, string[]> = {};
      const blankDefinitions = rawBlanks.map((blank, index) => {
        const rawBlank = asRecord(blank);
        const id = String(rawBlank.id ?? `blank_${index}`).trim();
        const acceptedAnswers = uniqueStrings(
          toStringArray(rawBlank.acceptedAnswers ?? rawBlank.answers ?? rawBlank.answer)
        );
        if (id.length > 0) acceptedById[id] = acceptedAnswers;
        return { id, acceptedAnswers };
      });

      const rawAnswerBlanks = asRecord(answerData.blanks ?? answerData.correctBlanks);
      for (const [id, answers] of Object.entries(rawAnswerBlanks)) {
        acceptedById[id] = uniqueStrings(toStringArray(answers));
      }

      let blankIds = extractFillBlankIds(rawTemplate, blankDefinitions.map((blank) => ({ id: blank.id })));
      if (blankIds.length === 0) blankIds = blankDefinitions.map((blank) => blank.id);
      if (blankIds.length === 0) blankIds = Object.keys(acceptedById);
      if (blankIds.length === 0) blankIds = ["blank_0"];

      let normalizedTemplate = rawTemplate;
      if (!normalizedTemplate) {
        normalizedTemplate = blankIds.map((id) => `{{${id}}}`).join(" ");
      } else {
        normalizedTemplate = replaceGenericBlankPlaceholders(normalizedTemplate, blankIds);
      }

      const blanks = blankIds.map((id, index) => ({
        id,
        acceptedAnswers:
          acceptedById[id] ||
          blankDefinitions.find((blank) => blank.id === id)?.acceptedAnswers ||
          blankDefinitions[index]?.acceptedAnswers ||
          [],
      }));

      const normalizedAnswerBlanks: Record<string, string[]> = {};
      for (const blank of blanks) {
        normalizedAnswerBlanks[blank.id] = blank.acceptedAnswers;
      }

      return {
        question: questionText,
        questionType: "fill_blank",
        questionConfig: {
          template: normalizedTemplate,
          blanks,
          caseSensitive: toBoolean(config.caseSensitive) ?? false,
        },
        correctAnswerData: { blanks: normalizedAnswerBlanks },
        points,
        explanation,
      };
    }

    case "multi_select": {
      const options = uniqueStrings(toStringArray(config.options ?? config.choices));
      const correctIndices = Array.isArray(answerData.correctIndices)
        ? answerData.correctIndices
        : Array.isArray(answerData.indices)
          ? answerData.indices
          : [];

      const normalizedCorrectIndices = uniqueStrings(
        correctIndices
          .map((value) => {
            const numeric = toNumber(value);
            return numeric === null ? "" : String(Math.round(numeric));
          })
          .filter((value) => value.length > 0)
      )
        .map((value) => Number(value))
        .filter((index) => index >= 0 && index < options.length);

      if (normalizedCorrectIndices.length === 0 && Array.isArray(answerData.correctAnswers)) {
        for (const answerOption of toStringArray(answerData.correctAnswers)) {
          const index = options.indexOf(answerOption);
          if (index >= 0 && !normalizedCorrectIndices.includes(index)) {
            normalizedCorrectIndices.push(index);
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
        question: questionText,
        questionType: "multi_select",
        questionConfig: normalizedConfig as QuestionConfig,
        correctAnswerData: { correctIndices: normalizedCorrectIndices },
        points,
        explanation,
      };
    }

    default:
      return {
        question: questionText,
        questionType,
        questionConfig: config as QuestionConfig,
        correctAnswerData: answerData as CorrectAnswerData,
        points,
        explanation,
      };
  }
}

export async function generateSummary(content: string, locale?: string): Promise<{ result: string; usage: TokenUsageData | null }> {
  const preparedContent = prepareGenerationContent(content);
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SUMMARY_SYSTEM_PROMPT + getLanguageInstruction(locale) },
      { role: "user", content: `Please summarize the following content:\n\n${preparedContent}` },
    ],
    max_completion_tokens: 16000,
  });

  return {
    result: completion.choices[0].message.content || "",
    usage: extractUsage(completion),
  };
}

export async function generateFlashcards(
  content: string,
  count: number = 10,
  locale?: string
): Promise<{ result: GeneratedFlashcard[]; usage: TokenUsageData | null }> {
  const preparedContent = prepareGenerationContent(content);
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: FLASHCARD_SYSTEM_PROMPT + getLanguageInstruction(locale) },
      {
        role: "user",
        content: `Generate ${count} flashcards from the following content. Return ONLY JSON:\n\n${preparedContent}`,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 16000,
  });

  const usage = extractUsage(completion);
  const result = completion.choices[0].message.content;
  if (!result) return { result: [], usage };

  const parsed = parseJsonWithFallback(result);
  const flashcards = extractArrayDeep(parsed, ["flashcards", "cards", "items", "questions"]);
  const normalized = normalizeFlashcards(flashcards);

  if (normalized.length > 0) {
    return { result: normalized.slice(0, count), usage };
  }

  try {
    // Retry once with stricter output instructions when the first attempt is empty.
    const retryCompletion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            `Return valid JSON ONLY in this exact format: {"flashcards":[{"front":"...","back":"..."}]}. ` +
            `Create exactly ${count} flashcards.` +
            getLanguageInstruction(locale),
        },
        {
          role: "user",
          content: `Create flashcards from this content:\n\n${preparedContent}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 16000,
    });

    const retryResult = retryCompletion.choices[0].message.content;
    if (!retryResult) return { result: [], usage };

    const retryParsed = parseJsonWithFallback(retryResult);
    const retryFlashcards = extractArrayDeep(retryParsed, ["flashcards", "cards", "items", "questions"]);
    const retryNormalized = normalizeFlashcards(retryFlashcards);
    return { result: retryNormalized.slice(0, count), usage };
  } catch {
    console.error("Failed to parse flashcards:", result);
    return { result: [], usage };
  }
}

export async function generateQuizQuestions(
  content: string,
  count: number = 5,
  locale?: string
): Promise<{ result: GeneratedQuizQuestion[]; usage: TokenUsageData | null }> {
  const preparedContent = prepareGenerationContent(content);
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: QUIZ_SYSTEM_PROMPT + getLanguageInstruction(locale) },
      {
        role: "user",
        content: `Generate ${count} multiple-choice quiz questions from the following content. Return ONLY JSON:\n\n${preparedContent}`,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 16000,
  });

  const usage = extractUsage(completion);
  const result = completion.choices[0].message.content;
  if (!result) return { result: [], usage };

  try {
    const parsed = JSON.parse(result);
    // Handle both { questions: [...] } and direct array formats
    const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
    return { result: questions.slice(0, count), usage };
  } catch {
    console.error("Failed to parse quiz questions:", result);
    return { result: [], usage };
  }
}

/**
 * Generate quiz questions with diverse question types
 */
export async function generateExtendedQuizQuestions(
  content: string,
  count: number = 10,
  questionTypes: QuestionTypeFilter = "mixed",
  locale?: string
): Promise<{ result: ExtendedQuizQuestion[]; usage: TokenUsageData | null }> {
  const preparedContent = prepareGenerationContent(content);
  let typeInstruction = "";

  if (questionTypes === "all" || questionTypes === "mixed") {
    typeInstruction = `Use a VARIETY of question types to make the quiz engaging. Include at least 3 different types.
Aim for this distribution:
- 30% multiple_choice
- 15% true_false
- 15% text_input or fill_blank
- 15% numeric_range or year_range (if content contains numbers/dates)
- 15% matching (if content has related concepts)
- 10% multi_select`;
  } else {
    typeInstruction = `Generate ONLY "${questionTypes}" type questions.`;
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: EXTENDED_QUIZ_SYSTEM_PROMPT + getLanguageInstruction(locale) },
      {
        role: "user",
        content: `Generate ${count} quiz questions from the following content.

${typeInstruction}

Important:
- Questions should test understanding, not just memorization
- Vary difficulty (mix of easy, medium, hard questions)
- Assign points based on difficulty (1=easy, 2=medium, 3=hard)
- Provide clear explanations for each answer
- For matching questions, use 3-5 pairs maximum
- For fill_blank, use 1-2 blanks per question

Content to generate questions from:
${preparedContent}`,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 16000,
  });

  const usage = extractUsage(completion);
  const result = completion.choices[0].message.content;
  if (!result) return { result: [], usage };

  try {
    const parsed = parseJsonWithFallback(result);
    const questions = extractArray(parsed, ["questions", "items", "quizQuestions"]);

    const validQuestions = questions
      .filter(isExtendedQuizQuestion)
      .map((q) => normalizeExtendedQuizQuestion(q))
      .filter((q): q is ExtendedQuizQuestion => q !== null);

    return { result: validQuestions.slice(0, count), usage };
  } catch (error) {
    console.error("Failed to parse extended quiz questions:", result, error);
    return { result: [], usage };
  }
}

// ============== LESSON GENERATION ==============

export const LESSON_SYSTEM_PROMPT = `You are an expert instructional designer creating interactive lessons.
Generate a structured lesson with a mix of content and interactive steps.

Step types available:
- explanation: Rich markdown content. Content: { type: "explanation", markdown: "..." }
- concept: Key concept highlight. Content: { type: "concept", title: "...", description: "...", highlightStyle: "info"|"warning"|"success"|"default" }
- multiple_choice: 2-4 options. Content: { type: "multiple_choice", question: "...", options: [{ id: "a", text: "...", explanation: "..." }, ...] }. AnswerData: { correctOptionId: "a" }
- true_false: Statement. Content: { type: "true_false", statement: "...", trueExplanation: "...", falseExplanation: "..." }. AnswerData: { correctValue: true/false }
- drag_sort: Order items. Content: { type: "drag_sort", instruction: "...", items: [{ id: "1", text: "..." }, ...] }. AnswerData: { correctOrder: ["1", "2", "3"] }
- drag_match: Match pairs. Content: { type: "drag_match", instruction: "...", pairs: [{ id: "1", left: "...", right: "..." }, ...] }. AnswerData: { correctPairs: { "1": "right text" } }
- drag_categorize: Sort into categories. Content: { type: "drag_categorize", instruction: "...", categories: [{ id: "cat1", name: "..." }], items: [{ id: "1", text: "...", categoryId: "cat1" }] }. AnswerData: { correctMapping: { "1": "cat1" } }
- fill_blanks: Fill blanks in template. Content: { type: "fill_blanks", template: "The {{b1}} is ...", blanks: [{ id: "b1", acceptedAnswers: ["answer"] }] }. AnswerData: { correctBlanks: { "b1": ["answer"] } }
- type_answer: Free text. Content: { type: "type_answer", question: "..." }. AnswerData: { acceptedAnswers: ["answer1", "answer2"] }
- select_many: Select all correct. Content: { type: "select_many", question: "...", options: [{ id: "a", text: "..." }, ...] }. AnswerData: { correctOptionIds: ["a", "c"] }
- reveal: Progressive disclosure. Content: { type: "reveal", title: "...", steps: [{ id: "1", content: "..." }, ...] }. AnswerData: null

Guidelines:
- Start with an explanation or concept step
- Alternate between content and interactive steps
- Build difficulty progressively
- Use varied question types (at least 4 different types)
- Provide explanations and hints for interactive steps
- End with a challenging question or summary concept
- 40% content steps, 60% interactive steps
- Generate 12-16 steps total

Return JSON: { "steps": [{ "stepType": "...", "content": {...}, "answerData": {...} or null, "explanation": "..." or null, "hint": "..." or null }] }`;

export const LESSON_IMPROVE_PROMPT = `You are an expert instructional designer. Improve the given lesson step to be more engaging, clear, and educationally effective. Maintain the same step type and structure, but enhance the content quality. Return the improved step in the same JSON format.`;

export interface GeneratedLessonStep {
  stepType: StepType;
  content: StepContent;
  answerData: StepAnswerData;
  explanation: string | null;
  hint: string | null;
}

function normalizeGeneratedLessonStep(step: GeneratedLessonStep): GeneratedLessonStep {
  const rawContent = asRecord(step.content);
  const rawAnswerData = asRecord(step.answerData);

  if (step.stepType === "drag_match") {
    const rawPairs = Array.isArray(rawContent.pairs)
      ? rawContent.pairs
      : (Array.isArray(rawContent.items) ? rawContent.items : []);

    let pairs = rawPairs
      .map((pair, index) => {
        const rawPair = asRecord(pair);
        return {
          id: String(rawPair.id ?? `${index + 1}`),
          left: String(rawPair.left ?? rawPair.term ?? rawPair.concept ?? rawPair.title ?? "").trim(),
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
      const leftItems = toStringArray(rawContent.leftItems);
      const rightItems = toStringArray(rawContent.rightItems);
      pairs = leftItems.map((left, index) => ({
        id: String(index + 1),
        left,
        right: rightItems[index] || "",
      }));
    }

    const normalizedCorrectPairs: Record<string, string> = {};
    const rawCorrectPairs = rawAnswerData.correctPairs ?? rawAnswerData.pairs;
    const rightPool = [
      ...pairs.map((pair) => pair.right).filter((value) => value.length > 0),
      ...toStringArray(rawContent.rightItems),
    ];
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
            const foundPair = pairs.find((pair) => pair.id === leftText || pair.left === leftText);
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
        const leftText = String(rawPair.left ?? rawPair.leftId ?? rawPair.from ?? "").trim();
        const rightText = String(rawPair.right ?? rawPair.rightText ?? rawPair.to ?? "").trim();
        if (leftText && rightText) normalizedCorrectPairs[leftText] = rightText;
      }
    } else if (rawCorrectPairs && typeof rawCorrectPairs === "object") {
      for (const [rawLeft, rawRight] of Object.entries(rawCorrectPairs as Record<string, unknown>)) {
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
      ...step,
      content: {
        type: "drag_match",
        instruction: String(rawContent.instruction ?? "Match each item with its definition"),
        pairs,
      },
      answerData: { correctPairs: reconciledCorrectPairs },
    };
  }

  if (step.stepType === "fill_blanks") {
    const rawTemplate = String(rawContent.template ?? rawContent.text ?? "").trim();
    const rawBlanks = Array.isArray(rawContent.blanks) ? rawContent.blanks : [];

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

    const rawCorrectBlanks = asRecord(rawAnswerData.correctBlanks ?? rawAnswerData.blanks);
    for (const [id, answers] of Object.entries(rawCorrectBlanks)) {
      acceptedById[id] = uniqueStrings(toStringArray(answers));
    }

    let blankIds = extractFillBlankIds(rawTemplate, blankDefinitions.map((blank) => ({ id: blank.id })));
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
      ...step,
      content: {
        type: "fill_blanks",
        template,
        blanks,
      },
      answerData: { correctBlanks },
    };
  }

  if (step.stepType === "type_answer") {
    const acceptedAnswers = uniqueStrings(
      toStringArray(rawAnswerData.acceptedAnswers ?? rawAnswerData.answers ?? rawAnswerData.correctAnswers)
    );

    return {
      ...step,
      content: {
        type: "type_answer",
        question: String(rawContent.question ?? ""),
        placeholder: typeof rawContent.placeholder === "string" ? rawContent.placeholder : undefined,
        caseSensitive: toBoolean(rawContent.caseSensitive) ?? false,
      },
      answerData: { acceptedAnswers },
    };
  }

  return step;
}

export async function generateLesson(
  sourceContent: string,
  existingFlashcards?: { front: string; back: string }[],
  existingQuizQuestions?: { question: string; options?: string[] }[],
  options?: { stepCount?: number; title?: string },
  locale?: string
): Promise<{ result: { title: string; description: string; steps: GeneratedLessonStep[] }; usage: TokenUsageData | null }> {
  const stepCount = options?.stepCount || 14;

  let context = `Source material:\n${sourceContent}`;
  if (existingFlashcards?.length) {
    context += `\n\nExisting flashcards for reference (use these concepts):\n${existingFlashcards
      .slice(0, 10)
      .map((f) => `Q: ${f.front} A: ${f.back}`)
      .join("\n")}`;
  }
  if (existingQuizQuestions?.length) {
    context += `\n\nExisting quiz questions for reference:\n${existingQuizQuestions
      .slice(0, 5)
      .map((q) => q.question)
      .join("\n")}`;
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: LESSON_SYSTEM_PROMPT + getLanguageInstruction(locale) },
      {
        role: "user",
        content: `Create a lesson with approximately ${stepCount} steps from this material.${options?.title ? ` Lesson title: "${options.title}"` : ""}\n\nAlso provide a title and short description for the lesson.\n\nReturn JSON: { "title": "...", "description": "...", "steps": [...] }\n\n${context}`,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 25000,
  });

  const usage = extractUsage(completion);
  const result = completion.choices[0].message.content;
  if (!result) return { result: { title: "Untitled Lesson", description: "", steps: [] }, usage };

  try {
    const parsed = parseJsonWithFallback(result) as Record<string, unknown> | null;
    const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    return {
      result: {
        title: String(parsed?.title || options?.title || "Untitled Lesson"),
        description: String(parsed?.description || ""),
        steps: rawSteps.map((rawStep) => {
          const s = (rawStep || {}) as Record<string, unknown>;
          const base: GeneratedLessonStep = {
            stepType: (s.stepType as StepType) || "explanation",
            content: (s.content as StepContent) || ({ type: "explanation", markdown: "" } as StepContent),
            answerData: (s.answerData as StepAnswerData) || null,
            explanation: typeof s.explanation === "string" ? s.explanation : null,
            hint: typeof s.hint === "string" ? s.hint : null,
          };
          return normalizeGeneratedLessonStep(base);
        }),
      },
      usage,
    };
  } catch {
    console.error("Failed to parse lesson:", result);
    return { result: { title: "Untitled Lesson", description: "", steps: [] }, usage };
  }
}

export async function improveLessonStep(
  step: { stepType: string; content: StepContent; answerData: StepAnswerData; explanation: string | null; hint: string | null },
  sourceContent?: string,
  locale?: string
): Promise<{ result: GeneratedLessonStep; usage: TokenUsageData | null }> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: LESSON_IMPROVE_PROMPT + getLanguageInstruction(locale) },
      {
        role: "user",
        content: `Improve this lesson step:\n${JSON.stringify(step)}${sourceContent ? `\n\nOriginal source material for context:\n${sourceContent.slice(0, 2000)}` : ""}\n\nReturn the improved step as JSON with the same structure.`,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 16000,
  });

  const usage = extractUsage(completion);
  const result = completion.choices[0].message.content;
  if (!result) return { result: step as GeneratedLessonStep, usage };

  try {
    const parsed = parseJsonWithFallback(result) as Record<string, unknown> | null;
    const improved: GeneratedLessonStep = {
      stepType: ((parsed?.stepType as StepType) || (step.stepType as StepType)),
      content: (parsed?.content as StepContent) || step.content,
      answerData: (parsed?.answerData as StepAnswerData) ?? step.answerData,
      explanation: typeof parsed?.explanation === "string" ? parsed.explanation : step.explanation,
      hint: typeof parsed?.hint === "string" ? parsed.hint : step.hint,
    };

    return {
      result: normalizeGeneratedLessonStep(improved),
      usage,
    };
  } catch {
    return { result: step as GeneratedLessonStep, usage };
  }
}

/**
 * Convert legacy quiz questions to extended format
 */
export function convertToExtendedFormat(
  questions: GeneratedQuizQuestion[]
): ExtendedQuizQuestion[] {
  return questions.map((q) => ({
    question: q.question,
    questionType: "multiple_choice" as QuestionTypeSlug,
    questionConfig: {
      options: q.options,
      shuffleOptions: false,
    },
    correctAnswerData: {
      correctIndex: q.correctAnswer,
    },
    points: 1,
    explanation: q.explanation,
  }));
}
