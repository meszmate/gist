// ============== LESSON STEP TYPES ==============

export const STEP_TYPES = [
  "explanation",
  "concept",
  "multiple_choice",
  "true_false",
  "drag_sort",
  "drag_match",
  "drag_categorize",
  "fill_blanks",
  "type_answer",
  "select_many",
  "reveal",
] as const;

export type StepType = (typeof STEP_TYPES)[number];

export const CONTENT_STEP_TYPES: StepType[] = [
  "explanation",
  "concept",
  "reveal",
];
export const INTERACTIVE_STEP_TYPES: StepType[] = [
  "multiple_choice",
  "true_false",
  "drag_sort",
  "drag_match",
  "drag_categorize",
  "fill_blanks",
  "type_answer",
  "select_many",
];

export function isInteractiveStep(type: StepType): boolean {
  return INTERACTIVE_STEP_TYPES.includes(type);
}

// ============== STEP TYPE METADATA ==============

export interface StepTypeMeta {
  type: StepType;
  label: string;
  description: string;
  category: "content" | "interactive";
  icon: string; // lucide icon name
}

export const STEP_TYPE_META: Record<StepType, StepTypeMeta> = {
  explanation: {
    type: "explanation",
    label: "Explanation",
    description: "Rich text with optional tap-to-reveal sections",
    category: "content",
    icon: "FileText",
  },
  concept: {
    type: "concept",
    label: "Key Concept",
    description: "Highlighted concept card with title and description",
    category: "content",
    icon: "Lightbulb",
  },
  multiple_choice: {
    type: "multiple_choice",
    label: "Multiple Choice",
    description: "Choose one correct answer from options",
    category: "interactive",
    icon: "CircleDot",
  },
  true_false: {
    type: "true_false",
    label: "True / False",
    description: "Decide if a statement is true or false",
    category: "interactive",
    icon: "ToggleLeft",
  },
  drag_sort: {
    type: "drag_sort",
    label: "Drag & Sort",
    description: "Put items in the correct order",
    category: "interactive",
    icon: "ArrowUpDown",
  },
  drag_match: {
    type: "drag_match",
    label: "Drag & Match",
    description: "Match left items to right items",
    category: "interactive",
    icon: "GitCompareArrows",
  },
  drag_categorize: {
    type: "drag_categorize",
    label: "Categorize",
    description: "Sort items into categories",
    category: "interactive",
    icon: "LayoutGrid",
  },
  fill_blanks: {
    type: "fill_blanks",
    label: "Fill in the Blanks",
    description: "Complete a sentence with missing words",
    category: "interactive",
    icon: "TextCursorInput",
  },
  type_answer: {
    type: "type_answer",
    label: "Type Answer",
    description: "Free text input with accepted answers",
    category: "interactive",
    icon: "Keyboard",
  },
  select_many: {
    type: "select_many",
    label: "Select All",
    description: "Select all correct items from a list",
    category: "interactive",
    icon: "CheckSquare",
  },
  reveal: {
    type: "reveal",
    label: "Progressive Reveal",
    description: "Tap to reveal content step by step",
    category: "content",
    icon: "Eye",
  },
};

// ============== STEP CONTENT SCHEMAS ==============

export interface ExplanationContent {
  type: "explanation";
  markdown: string;
  revealSections?: { label: string; content: string }[];
}

export interface ConceptContent {
  type: "concept";
  title: string;
  description: string;
  highlightStyle?: "info" | "warning" | "success" | "default";
}

export interface MultipleChoiceContent {
  type: "multiple_choice";
  question: string;
  options: { id: string; text: string; explanation?: string }[];
}

export interface TrueFalseContent {
  type: "true_false";
  statement: string;
  trueExplanation?: string;
  falseExplanation?: string;
}

export interface DragSortContent {
  type: "drag_sort";
  instruction: string;
  items: { id: string; text: string }[];
}

export interface DragMatchContent {
  type: "drag_match";
  instruction: string;
  pairs: { id: string; left: string; right: string }[];
}

export interface DragCategorizeContent {
  type: "drag_categorize";
  instruction: string;
  categories: { id: string; name: string }[];
  items: { id: string; text: string; categoryId: string }[];
}

export interface FillBlanksContent {
  type: "fill_blanks";
  template: string; // Text with {{blank_id}} placeholders
  blanks: { id: string; acceptedAnswers: string[] }[];
}

export interface TypeAnswerContent {
  type: "type_answer";
  question: string;
  placeholder?: string;
  caseSensitive?: boolean;
}

export interface SelectManyContent {
  type: "select_many";
  question: string;
  options: { id: string; text: string; explanation?: string }[];
}

export interface RevealContent {
  type: "reveal";
  title?: string;
  steps: { id: string; content: string }[];
}

export type StepContent =
  | ExplanationContent
  | ConceptContent
  | MultipleChoiceContent
  | TrueFalseContent
  | DragSortContent
  | DragMatchContent
  | DragCategorizeContent
  | FillBlanksContent
  | TypeAnswerContent
  | SelectManyContent
  | RevealContent;

// ============== ANSWER DATA SCHEMAS (correct answers) ==============

export interface MultipleChoiceAnswerData {
  correctOptionId: string;
}

export interface TrueFalseAnswerData {
  correctValue: boolean;
}

export interface DragSortAnswerData {
  correctOrder: string[]; // item ids in correct order
}

export interface DragMatchAnswerData {
  correctPairs: Record<string, string>; // leftId -> rightText
}

export interface DragCategorizeAnswerData {
  correctMapping: Record<string, string>; // itemId -> categoryId
}

export interface FillBlanksAnswerData {
  correctBlanks: Record<string, string[]>; // blankId -> accepted answers
}

export interface TypeAnswerAnswerData {
  acceptedAnswers: string[];
}

export interface SelectManyAnswerData {
  correctOptionIds: string[];
}

export type StepAnswerData =
  | MultipleChoiceAnswerData
  | TrueFalseAnswerData
  | DragSortAnswerData
  | DragMatchAnswerData
  | DragCategorizeAnswerData
  | FillBlanksAnswerData
  | TypeAnswerAnswerData
  | SelectManyAnswerData
  | null; // null for content steps

// ============== USER ANSWER SCHEMAS ==============

export interface MultipleChoiceUserAnswer {
  selectedOptionId: string;
}

export interface TrueFalseUserAnswer {
  selectedValue: boolean;
}

export interface DragSortUserAnswer {
  orderedIds: string[];
}

export interface DragMatchUserAnswer {
  pairs: Record<string, string>; // leftId -> rightText
}

export interface DragCategorizeUserAnswer {
  mapping: Record<string, string>; // itemId -> categoryId
}

export interface FillBlanksUserAnswer {
  blanks: Record<string, string>; // blankId -> answer
}

export interface TypeAnswerUserAnswer {
  text: string;
}

export interface SelectManyUserAnswer {
  selectedOptionIds: string[];
}

export type StepUserAnswer =
  | MultipleChoiceUserAnswer
  | TrueFalseUserAnswer
  | DragSortUserAnswer
  | DragMatchUserAnswer
  | DragCategorizeUserAnswer
  | FillBlanksUserAnswer
  | TypeAnswerUserAnswer
  | SelectManyUserAnswer;

// ============== LESSON SETTINGS ==============

export interface LessonSettings {
  allowSkip?: boolean;
  showProgressBar?: boolean;
  transitionStyle?: "slide" | "fade";
}

// ============== LESSON & STEP TYPES ==============

export interface Lesson {
  id: string;
  studyMaterialId: string;
  title: string;
  description: string | null;
  order: number;
  settings: LessonSettings | null;
  status: "draft" | "published";
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonStep {
  id: string;
  lessonId: string;
  order: number;
  stepType: StepType;
  content: StepContent;
  answerData: StepAnswerData;
  explanation: string | null;
  hint: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LessonWithSteps extends Lesson {
  steps: LessonStep[];
}

// ============== ATTEMPT TYPES ==============

export interface StepResult {
  isCorrect: boolean;
  attempts: number;
  firstAttemptCorrect: boolean;
}

export interface LessonAttempt {
  id: string;
  lessonId: string;
  userId: string | null;
  guestIdentifier: string | null;
  currentStepIndex: number;
  completedStepIds: string[];
  answers: Record<string, StepUserAnswer>;
  stepResults: Record<string, StepResult>;
  totalSteps: number;
  interactiveSteps: number;
  correctCount: number;
  score: number | null;
  startedAt: string;
  completedAt: string | null;
  timeSpentSeconds: number | null;
}

// ============== CHECKING ANSWERS ==============

export function checkStepAnswer(
  stepType: StepType,
  content: StepContent,
  answerData: StepAnswerData,
  userAnswer: StepUserAnswer
): boolean {
  if (!answerData) return true; // Content steps are always "correct"

  switch (stepType) {
    case "multiple_choice": {
      const ua = userAnswer as MultipleChoiceUserAnswer;
      const ad = answerData as MultipleChoiceAnswerData;
      return ua.selectedOptionId === ad.correctOptionId;
    }
    case "true_false": {
      const ua = userAnswer as TrueFalseUserAnswer;
      const ad = answerData as TrueFalseAnswerData;
      return ua.selectedValue === ad.correctValue;
    }
    case "drag_sort": {
      const ua = userAnswer as DragSortUserAnswer;
      const ad = answerData as DragSortAnswerData;
      return JSON.stringify(ua.orderedIds) === JSON.stringify(ad.correctOrder);
    }
    case "drag_match": {
      const ua = userAnswer as DragMatchUserAnswer;
      const ad = answerData as DragMatchAnswerData;
      const correctPairs = ad.correctPairs;
      return Object.entries(correctPairs).every(
        ([key, val]) => ua.pairs[key] === val
      );
    }
    case "drag_categorize": {
      const ua = userAnswer as DragCategorizeUserAnswer;
      const ad = answerData as DragCategorizeAnswerData;
      return Object.entries(ad.correctMapping).every(
        ([itemId, catId]) => ua.mapping[itemId] === catId
      );
    }
    case "fill_blanks": {
      const ua = userAnswer as FillBlanksUserAnswer;
      const ad = answerData as FillBlanksAnswerData;
      const caseSensitive = (content as FillBlanksContent).blanks ? false : false;
      return Object.entries(ad.correctBlanks).every(([blankId, accepted]) => {
        const userVal = ua.blanks[blankId] || "";
        return accepted.some((a) =>
          caseSensitive ? userVal.trim() === a : userVal.trim().toLowerCase() === a.toLowerCase()
        );
      });
    }
    case "type_answer": {
      const ua = userAnswer as TypeAnswerUserAnswer;
      const ad = answerData as TypeAnswerAnswerData;
      const cs = (content as TypeAnswerContent).caseSensitive;
      return ad.acceptedAnswers.some((a) =>
        cs ? ua.text.trim() === a : ua.text.trim().toLowerCase() === a.toLowerCase()
      );
    }
    case "select_many": {
      const ua = userAnswer as SelectManyUserAnswer;
      const ad = answerData as SelectManyAnswerData;
      const selected = new Set(ua.selectedOptionIds);
      const correct = new Set(ad.correctOptionIds);
      return (
        selected.size === correct.size &&
        [...correct].every((id) => selected.has(id))
      );
    }
    default:
      return false;
  }
}

// ============== HELPER: Generate default content for step type ==============

export function getDefaultStepContent(type: StepType): StepContent {
  switch (type) {
    case "explanation":
      return { type: "explanation", markdown: "" };
    case "concept":
      return { type: "concept", title: "", description: "", highlightStyle: "info" };
    case "multiple_choice":
      return {
        type: "multiple_choice",
        question: "",
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
          { id: "c", text: "" },
          { id: "d", text: "" },
        ],
      };
    case "true_false":
      return { type: "true_false", statement: "" };
    case "drag_sort":
      return { type: "drag_sort", instruction: "", items: [] };
    case "drag_match":
      return { type: "drag_match", instruction: "", pairs: [] };
    case "drag_categorize":
      return {
        type: "drag_categorize",
        instruction: "",
        categories: [],
        items: [],
      };
    case "fill_blanks":
      return { type: "fill_blanks", template: "", blanks: [] };
    case "type_answer":
      return { type: "type_answer", question: "" };
    case "select_many":
      return { type: "select_many", question: "", options: [] };
    case "reveal":
      return { type: "reveal", steps: [] };
  }
}

export function getDefaultAnswerData(type: StepType): StepAnswerData {
  switch (type) {
    case "explanation":
    case "concept":
    case "reveal":
      return null;
    case "multiple_choice":
      return { correctOptionId: "a" };
    case "true_false":
      return { correctValue: true };
    case "drag_sort":
      return { correctOrder: [] };
    case "drag_match":
      return { correctPairs: {} };
    case "drag_categorize":
      return { correctMapping: {} };
    case "fill_blanks":
      return { correctBlanks: {} };
    case "type_answer":
      return { acceptedAnswers: [] };
    case "select_many":
      return { correctOptionIds: [] };
  }
}
