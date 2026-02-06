import OpenAI from "openai";
import type {
  QuestionTypeSlug,
  QuestionConfig,
  CorrectAnswerData,
} from "@/lib/types/quiz";

export const openai = new OpenAI();

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

export async function generateSummary(content: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SUMMARY_SYSTEM_PROMPT },
      { role: "user", content: `Please summarize the following content:\n\n${content}` },
    ],
    max_tokens: 2000,
  });

  return completion.choices[0].message.content || "";
}

export async function generateFlashcards(
  content: string,
  count: number = 10
): Promise<GeneratedFlashcard[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: FLASHCARD_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Generate ${count} flashcards from the following content. Return ONLY a JSON array, no other text:\n\n${content}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 3000,
  });

  const result = completion.choices[0].message.content;
  if (!result) return [];

  try {
    const parsed = JSON.parse(result);
    // Handle both { flashcards: [...] } and direct array formats
    const flashcards = Array.isArray(parsed) ? parsed : parsed.flashcards || [];
    return flashcards.slice(0, count);
  } catch {
    console.error("Failed to parse flashcards:", result);
    return [];
  }
}

export async function generateQuizQuestions(
  content: string,
  count: number = 5
): Promise<GeneratedQuizQuestion[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: QUIZ_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Generate ${count} multiple-choice quiz questions from the following content. Return ONLY a JSON array, no other text:\n\n${content}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 3000,
  });

  const result = completion.choices[0].message.content;
  if (!result) return [];

  try {
    const parsed = JSON.parse(result);
    // Handle both { questions: [...] } and direct array formats
    const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
    return questions.slice(0, count);
  } catch {
    console.error("Failed to parse quiz questions:", result);
    return [];
  }
}

/**
 * Generate quiz questions with diverse question types
 */
export async function generateExtendedQuizQuestions(
  content: string,
  count: number = 10,
  questionTypes: QuestionTypeFilter = "mixed"
): Promise<ExtendedQuizQuestion[]> {
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
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EXTENDED_QUIZ_SYSTEM_PROMPT },
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
${content}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  });

  const result = completion.choices[0].message.content;
  if (!result) return [];

  try {
    const parsed = JSON.parse(result);
    const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

    // Validate and clean up questions
    const validQuestions = questions
      .filter((q: ExtendedQuizQuestion) =>
        q.question &&
        q.questionType &&
        q.questionConfig &&
        q.correctAnswerData
      )
      .map((q: ExtendedQuizQuestion) => ({
        ...q,
        points: q.points || 1,
        explanation: q.explanation || "",
      }));

    return validQuestions.slice(0, count);
  } catch (error) {
    console.error("Failed to parse extended quiz questions:", result, error);
    return [];
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
