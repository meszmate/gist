import type {
  QuestionTypeSlug,
  QuestionConfig,
  CorrectAnswerData,
  UserAnswer,
} from '@/lib/types/quiz';

export interface QuestionRendererProps {
  questionId: string;
  questionText: string;
  questionType: QuestionTypeSlug;
  config: QuestionConfig;
  correctAnswerData?: CorrectAnswerData | null;
  userAnswer?: UserAnswer;
  onAnswer: (answer: UserAnswer) => void;
  disabled?: boolean;
  showResult?: boolean;
  isCorrect?: boolean;
  feedback?: string;
  points?: number;
  showPoints?: boolean;
}

export interface ResultRendererProps {
  questionId: string;
  questionText: string;
  questionType: QuestionTypeSlug;
  config: QuestionConfig;
  correctAnswerData: CorrectAnswerData;
  userAnswer: UserAnswer;
  isCorrect: boolean;
  creditPercent: number;
  feedback?: string;
  explanation?: string | null;
  points: number;
  pointsEarned: number;
  showPoints?: boolean;
}
