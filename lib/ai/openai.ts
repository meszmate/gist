import OpenAI from "openai";
import type {
  QuestionTypeSlug,
  QuestionConfig,
  CorrectAnswerData,
} from "@/lib/types/quiz";
import type { StepContent, StepAnswerData, StepType } from "@/lib/types/lesson";

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
  correctAnswerData: { isTrue: true }

text_input:
  questionConfig: { caseSensitive: false, acceptedKeywords: ["keyword1", "keyword2"], minLength: 1 }
  correctAnswerData: { exactMatch: "correct answer", keywords: ["key", "words"] }

year_range:
  questionConfig: { minYear: 1900, maxYear: 2024, toleranceYears: 5 }
  correctAnswerData: { exactYear: 1969, toleranceYears: 5 }

numeric_range:
  questionConfig: { minValue: 0, maxValue: 1000, tolerancePercent: 10, unit: "km" }
  correctAnswerData: { exactValue: 384400, tolerancePercent: 5 }

matching:
  questionConfig: { leftColumn: ["Term1", "Term2"], rightColumn: ["Def1", "Def2"], shuffleRight: true }
  correctAnswerData: { correctPairs: [[0, 0], [1, 1]] }

fill_blank:
  question: "Fill in the blank to complete the sentence:"
  questionConfig: { template: "The {{blank}} is the capital of France.", blanks: [{ id: "blank_0", acceptedAnswers: ["Paris", "paris"] }], caseSensitive: false }
  correctAnswerData: { blanks: { "blank_0": ["Paris", "paris"] } }
  NOTE: Use {{blank}} as placeholder in template, NOT ___ or other formats. The question field should be instructions, template goes in questionConfig.

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

    // Validate and clean up questions
    const validQuestions = questions
      .filter(isExtendedQuizQuestion)
      .map((q) => ({
        ...q,
        points: q.points || 1,
        explanation: q.explanation || "",
      }));

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
  if (step.stepType !== "drag_match") return step;

  const rawContent = (step.content as unknown as Record<string, unknown>) || {};
  const rawPairs = Array.isArray(rawContent.pairs) ? rawContent.pairs : [];

  const pairs = rawPairs
    .map((pair, index) => {
      const rawPair = (pair || {}) as Record<string, unknown>;
      return {
        id: String(rawPair.id ?? `${index + 1}`),
        left: String(rawPair.left ?? rawPair.term ?? rawPair.concept ?? rawPair.title ?? ""),
        right: String(
          rawPair.right ??
          rawPair.definition ??
          rawPair.match ??
          rawPair.value ??
          rawPair.explanation ??
          ""
        ),
      };
    })
    .filter((pair) => pair.left.trim().length > 0 || pair.right.trim().length > 0);

  const rawAnswerData = (step.answerData || {}) as Record<string, unknown>;
  const existingCorrectPairs =
    rawAnswerData.correctPairs && typeof rawAnswerData.correctPairs === "object"
      ? (rawAnswerData.correctPairs as Record<string, unknown>)
      : {};

  const normalizedCorrectPairs: Record<string, string> = {};
  for (const [key, value] of Object.entries(existingCorrectPairs)) {
    normalizedCorrectPairs[String(key)] = String(value ?? "");
  }
  for (const pair of pairs) {
    if (pair.right.trim().length > 0 && !normalizedCorrectPairs[pair.id]) {
      normalizedCorrectPairs[pair.id] = pair.right;
    }
  }

  return {
    ...step,
    content: {
      type: "drag_match",
      instruction: String(rawContent.instruction ?? "Match each item with its definition"),
      pairs,
    },
    answerData: { correctPairs: normalizedCorrectPairs },
  };
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
    const parsed = JSON.parse(result);
    return {
      result: {
        stepType: parsed.stepType || step.stepType,
        content: parsed.content || step.content,
        answerData: parsed.answerData ?? step.answerData,
        explanation: parsed.explanation ?? step.explanation,
        hint: parsed.hint ?? step.hint,
      },
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
