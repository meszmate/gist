// ============== QUESTION TYPES ==============

export type QuestionTypeSlug =
  | 'multiple_choice'
  | 'true_false'
  | 'text_input'
  | 'year_range'
  | 'numeric_range'
  | 'matching'
  | 'fill_blank'
  | 'multi_select'
  | string; // Allow custom types

// Base question configuration - shared by all types
export interface BaseQuestionConfig {
  hint?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
}

// ============== QUESTION CONFIG BY TYPE ==============

export interface MultipleChoiceConfig extends BaseQuestionConfig {
  options: string[];
  shuffleOptions?: boolean;
}

export interface TrueFalseConfig extends BaseQuestionConfig {
  trueLabel?: string;
  falseLabel?: string;
}

export interface TextInputConfig extends BaseQuestionConfig {
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export interface YearRangeConfig extends BaseQuestionConfig {
  tolerance?: number; // Years allowed for partial credit
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
}

export interface NumericRangeConfig extends BaseQuestionConfig {
  tolerance?: number; // Numeric tolerance for partial credit
  toleranceType?: 'absolute' | 'percentage';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}

export interface MatchingConfig extends BaseQuestionConfig {
  leftColumn: string[];
  rightColumn: string[];
  shuffleRight?: boolean;
  leftColumnLabel?: string;
  rightColumnLabel?: string;
}

export interface FillBlankConfig extends BaseQuestionConfig {
  caseSensitive?: boolean;
  template: string; // Text with {{blank}} placeholders
  blanks: Array<{
    id: string;
    acceptedAnswers: string[];
  }>;
}

export interface MultiSelectConfig extends BaseQuestionConfig {
  options: string[];
  shuffleOptions?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

// Custom type config is just the base with additional properties
export interface CustomTypeConfig extends BaseQuestionConfig {
  [key: string]: unknown;
}

export type QuestionConfig =
  | MultipleChoiceConfig
  | TrueFalseConfig
  | TextInputConfig
  | YearRangeConfig
  | NumericRangeConfig
  | MatchingConfig
  | FillBlankConfig
  | MultiSelectConfig
  | CustomTypeConfig;

// ============== ANSWER DATA BY TYPE ==============

export interface MultipleChoiceAnswer {
  correctIndex: number;
}

export interface TrueFalseAnswer {
  correctValue: boolean;
}

export interface TextInputAnswer {
  acceptedAnswers: string[];
  keywords?: string[]; // Partial credit keywords
  keywordMatchThreshold?: number; // Min keywords for partial credit
}

export interface YearRangeAnswer {
  correctYear: number;
  partialCreditRanges?: Array<{
    tolerance: number;
    creditPercent: number;
  }>;
}

export interface NumericRangeAnswer {
  correctValue: number;
  partialCreditRanges?: Array<{
    tolerance: number;
    toleranceType: 'absolute' | 'percentage';
    creditPercent: number;
  }>;
}

export interface MatchingAnswer {
  correctPairs: Record<string, string>; // leftItem -> rightItem
  partialCreditPerPair?: boolean;
}

export interface FillBlankAnswer {
  blanks: Record<string, string[]>; // blankId -> accepted answers
}

export interface MultiSelectAnswer {
  correctIndices: number[];
  partialCredit?: boolean;
}

export interface CustomTypeAnswer {
  [key: string]: unknown;
}

export type CorrectAnswerData =
  | MultipleChoiceAnswer
  | TrueFalseAnswer
  | TextInputAnswer
  | YearRangeAnswer
  | NumericRangeAnswer
  | MatchingAnswer
  | FillBlankAnswer
  | MultiSelectAnswer
  | CustomTypeAnswer;

// ============== USER ANSWER FORMATS ==============

export interface MultipleChoiceUserAnswer {
  selectedIndex: number;
}

export interface TrueFalseUserAnswer {
  selectedValue: boolean;
}

export interface TextInputUserAnswer {
  text: string;
}

export interface YearRangeUserAnswer {
  year: number;
}

export interface NumericRangeUserAnswer {
  value: number;
}

export interface MatchingUserAnswer {
  pairs: Record<string, string>; // leftItem -> rightItem
}

export interface FillBlankUserAnswer {
  blanks: Record<string, string>; // blankId -> user's answer
}

export interface MultiSelectUserAnswer {
  selectedIndices: number[];
}

export interface CustomTypeUserAnswer {
  [key: string]: unknown;
}

export type UserAnswer =
  | MultipleChoiceUserAnswer
  | TrueFalseUserAnswer
  | TextInputUserAnswer
  | YearRangeUserAnswer
  | NumericRangeUserAnswer
  | MatchingUserAnswer
  | FillBlankUserAnswer
  | MultiSelectUserAnswer
  | CustomTypeUserAnswer
  | number; // Legacy support for old multiple choice (index only)

// ============== GRADING ==============

export type GradingType = 'percentage' | 'letter' | 'pass_fail' | 'points';

export interface LetterGradeThreshold {
  grade: string;
  minPercentage: number;
  description?: string;
}

export interface GradingConfig {
  id: string;
  studyMaterialId: string;
  gradingType: GradingType;
  passThreshold: number;
  letterGrades: LetterGradeThreshold[] | null;
  showGradeOnCompletion: boolean;
  showPointValues: boolean;
  partialCreditEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionResult {
  questionId: string;
  questionType: QuestionTypeSlug;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  creditPercent: number;
  userAnswer: UserAnswer;
  correctAnswer: CorrectAnswerData;
  feedback?: string;
}

export interface GradeResult {
  score: number; // Percentage 0-100
  pointsEarned: number;
  pointsPossible: number;
  grade: string | null; // Letter grade or pass/fail
  passed: boolean | null;
  questionResults: QuestionResult[];
}

// ============== QUESTION TYPE REGISTRY ==============

export interface QuestionTypeSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  description?: string;
  default?: unknown;
  items?: QuestionTypeSchema; // For arrays
  properties?: Record<string, QuestionTypeSchema>; // For objects
  enum?: unknown[]; // For enums
  min?: number;
  max?: number;
}

export interface QuestionTypeDefinition {
  id: string;
  slug: QuestionTypeSlug;
  name: string;
  description: string | null;
  configSchema: Record<string, QuestionTypeSchema>;
  answerSchema: Record<string, QuestionTypeSchema>;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============== ENHANCED QUIZ QUESTION ==============

export interface QuizQuestionExtended {
  id: string;
  studyMaterialId: string;
  question: string;
  questionType: QuestionTypeSlug;
  questionConfig: QuestionConfig;
  correctAnswerData: CorrectAnswerData | null;
  points: number;
  order: number | null;
  explanation: string | null;
  // Legacy fields for backward compatibility
  options: string[] | null;
  correctAnswer: number | null;
  createdAt: Date;
  updatedAt: Date | null;
}

// ============== QUIZ ATTEMPT EXTENDED ==============

export interface AnswersData {
  [questionId: string]: UserAnswer;
}

export interface QuizAttemptExtended {
  id: string;
  studyMaterialId: string;
  userId: string | null;
  guestEmail: string | null;
  participantName: string | null;
  startedAt: Date;
  completedAt: Date | null;
  score: number | null;
  pointsEarned: number | null;
  pointsPossible: number | null;
  grade: string | null;
  answers: Record<string, number> | null; // Legacy
  answersData: AnswersData | null;
  questionResults: QuestionResult[] | null;
  timeSpentSeconds: number | null;
  attemptNumber: number;
}

// ============== PARTICIPANT TRACKING ==============

export interface ParticipantSummary {
  id: string;
  attemptId: string;
  name: string | null;
  email: string | null;
  userId: string | null;
  score: number;
  grade: string | null;
  pointsEarned: number;
  pointsPossible: number;
  timeSpentSeconds: number | null;
  completedAt: Date;
  attemptNumber: number;
  questionCount: number;
  correctCount: number;
}

export interface ParticipantDetails extends ParticipantSummary {
  questionResults: QuestionResult[];
  userAgent?: string;
  ipAddress?: string;
}

export interface ParticipantFilters {
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  scoreMin?: number;
  scoreMax?: number;
  grade?: string;
  sortBy?: 'name' | 'score' | 'date' | 'time';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ParticipantStats {
  totalParticipants: number;
  completedCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageTimeSeconds: number;
  gradeDistribution: Record<string, number>;
  scoreDistribution: {
    range: string;
    count: number;
  }[];
}

// ============== API REQUEST/RESPONSE TYPES ==============

export interface SubmitQuizRequest {
  answers: AnswersData;
  timeSpentSeconds?: number;
  participantName?: string;
  guestEmail?: string;
}

export interface SubmitQuizResponse {
  score: number;
  total: number;
  percentage: number;
  pointsEarned: number;
  pointsPossible: number;
  grade: string | null;
  passed: boolean | null;
  answers: Array<{
    questionId: string;
    question: string;
    questionType: QuestionTypeSlug;
    selectedAnswer: UserAnswer;
    correctAnswer: CorrectAnswerData;
    isCorrect: boolean;
    pointsEarned: number;
    pointsPossible: number;
    explanation: string | null;
  }>;
}

export interface CreateQuestionRequest {
  question: string;
  questionType: QuestionTypeSlug;
  questionConfig: QuestionConfig;
  correctAnswerData: CorrectAnswerData;
  points?: number;
  order?: number;
  explanation?: string;
  // Legacy support
  options?: string[];
  correctAnswer?: number;
}

export interface UpdateQuestionRequest extends Partial<CreateQuestionRequest> {
  id: string;
}

export interface ReorderQuestionsRequest {
  questionOrders: Array<{
    id: string;
    order: number;
  }>;
}

export interface CreateGradingConfigRequest {
  gradingType: GradingType;
  passThreshold?: number;
  letterGrades?: LetterGradeThreshold[];
  showGradeOnCompletion?: boolean;
  showPointValues?: boolean;
  partialCreditEnabled?: boolean;
}

export interface CreateQuestionTypeRequest {
  slug: string;
  name: string;
  description?: string;
  configSchema: Record<string, QuestionTypeSchema>;
  answerSchema: Record<string, QuestionTypeSchema>;
}

// ============== AI GENERATION ==============

export interface GenerateQuestionsRequest {
  sourceContent: string;
  count: number;
  questionTypes?: QuestionTypeSlug[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}

export interface GeneratedQuestion {
  question: string;
  questionType: QuestionTypeSlug;
  questionConfig: QuestionConfig;
  correctAnswerData: CorrectAnswerData;
  points: number;
  explanation: string;
}

// ============== BUILT-IN TYPE DEFINITIONS ==============

export const BUILT_IN_QUESTION_TYPES: Record<string, Omit<QuestionTypeDefinition, 'id' | 'createdAt' | 'updatedAt'>> = {
  multiple_choice: {
    slug: 'multiple_choice',
    name: 'Multiple Choice',
    description: 'Traditional multiple choice question with one correct answer',
    configSchema: {
      options: { type: 'array', required: true, description: 'Answer options' },
      shuffleOptions: { type: 'boolean', default: false, description: 'Shuffle option order' },
    },
    answerSchema: {
      correctIndex: { type: 'number', required: true, description: 'Index of correct answer' },
    },
    isSystem: true,
    isActive: true,
  },
  true_false: {
    slug: 'true_false',
    name: 'True/False',
    description: 'Binary true or false question',
    configSchema: {
      trueLabel: { type: 'string', default: 'True', description: 'Label for true option' },
      falseLabel: { type: 'string', default: 'False', description: 'Label for false option' },
    },
    answerSchema: {
      correctValue: { type: 'boolean', required: true, description: 'The correct answer' },
    },
    isSystem: true,
    isActive: true,
  },
  text_input: {
    slug: 'text_input',
    name: 'Text Input',
    description: 'Free text answer with keyword matching',
    configSchema: {
      caseSensitive: { type: 'boolean', default: false, description: 'Case sensitive matching' },
      trimWhitespace: { type: 'boolean', default: true, description: 'Trim whitespace' },
      placeholder: { type: 'string', description: 'Input placeholder text' },
      maxLength: { type: 'number', description: 'Maximum answer length' },
    },
    answerSchema: {
      acceptedAnswers: { type: 'array', required: true, description: 'List of accepted answers' },
      keywords: { type: 'array', description: 'Keywords for partial credit' },
      keywordMatchThreshold: { type: 'number', description: 'Min keywords for partial credit' },
    },
    isSystem: true,
    isActive: true,
  },
  year_range: {
    slug: 'year_range',
    name: 'Year',
    description: 'Year answer with tolerance for partial credit',
    configSchema: {
      tolerance: { type: 'number', default: 0, description: 'Years tolerance for partial credit' },
      minYear: { type: 'number', description: 'Minimum allowed year' },
      maxYear: { type: 'number', description: 'Maximum allowed year' },
      placeholder: { type: 'string', description: 'Input placeholder' },
    },
    answerSchema: {
      correctYear: { type: 'number', required: true, description: 'The correct year' },
      partialCreditRanges: { type: 'array', description: 'Partial credit ranges' },
    },
    isSystem: true,
    isActive: true,
  },
  numeric_range: {
    slug: 'numeric_range',
    name: 'Numeric',
    description: 'Numeric answer with tolerance for partial credit',
    configSchema: {
      tolerance: { type: 'number', default: 0, description: 'Tolerance for partial credit' },
      toleranceType: { type: 'string', enum: ['absolute', 'percentage'], default: 'absolute' },
      min: { type: 'number', description: 'Minimum value' },
      max: { type: 'number', description: 'Maximum value' },
      step: { type: 'number', description: 'Step increment' },
      unit: { type: 'string', description: 'Unit label' },
      placeholder: { type: 'string', description: 'Input placeholder' },
    },
    answerSchema: {
      correctValue: { type: 'number', required: true, description: 'The correct value' },
      partialCreditRanges: { type: 'array', description: 'Partial credit ranges' },
    },
    isSystem: true,
    isActive: true,
  },
  matching: {
    slug: 'matching',
    name: 'Matching',
    description: 'Match items from two columns',
    configSchema: {
      leftColumn: { type: 'array', required: true, description: 'Left column items' },
      rightColumn: { type: 'array', required: true, description: 'Right column items' },
      shuffleRight: { type: 'boolean', default: true, description: 'Shuffle right column' },
      leftColumnLabel: { type: 'string', description: 'Left column header' },
      rightColumnLabel: { type: 'string', description: 'Right column header' },
    },
    answerSchema: {
      correctPairs: { type: 'object', required: true, description: 'Correct pair mappings' },
      partialCreditPerPair: { type: 'boolean', default: true, description: 'Give partial credit per pair' },
    },
    isSystem: true,
    isActive: true,
  },
  fill_blank: {
    slug: 'fill_blank',
    name: 'Fill in the Blank',
    description: 'Complete sentences with blanks',
    configSchema: {
      caseSensitive: { type: 'boolean', default: false, description: 'Case sensitive matching' },
      template: { type: 'string', required: true, description: 'Template with {{blank}} placeholders' },
      blanks: { type: 'array', required: true, description: 'Blank definitions with accepted answers' },
    },
    answerSchema: {
      blanks: { type: 'object', required: true, description: 'Blank ID to accepted answers mapping' },
    },
    isSystem: true,
    isActive: true,
  },
  multi_select: {
    slug: 'multi_select',
    name: 'Multi-Select',
    description: 'Select all correct answers',
    configSchema: {
      options: { type: 'array', required: true, description: 'Answer options' },
      shuffleOptions: { type: 'boolean', default: false, description: 'Shuffle option order' },
      minSelections: { type: 'number', description: 'Minimum selections required' },
      maxSelections: { type: 'number', description: 'Maximum selections allowed' },
    },
    answerSchema: {
      correctIndices: { type: 'array', required: true, description: 'Indices of correct answers' },
      partialCredit: { type: 'boolean', default: true, description: 'Allow partial credit' },
    },
    isSystem: true,
    isActive: true,
  },
};

// Default letter grades
export const DEFAULT_LETTER_GRADES: LetterGradeThreshold[] = [
  { grade: 'A+', minPercentage: 97, description: 'Exceptional' },
  { grade: 'A', minPercentage: 93, description: 'Excellent' },
  { grade: 'A-', minPercentage: 90, description: 'Very Good' },
  { grade: 'B+', minPercentage: 87, description: 'Good' },
  { grade: 'B', minPercentage: 83, description: 'Above Average' },
  { grade: 'B-', minPercentage: 80, description: 'Satisfactory' },
  { grade: 'C+', minPercentage: 77, description: 'Average' },
  { grade: 'C', minPercentage: 73, description: 'Below Average' },
  { grade: 'C-', minPercentage: 70, description: 'Poor' },
  { grade: 'D+', minPercentage: 67, description: 'Minimal Pass' },
  { grade: 'D', minPercentage: 63, description: 'Barely Passing' },
  { grade: 'D-', minPercentage: 60, description: 'Lowest Passing' },
  { grade: 'F', minPercentage: 0, description: 'Failing' },
];
