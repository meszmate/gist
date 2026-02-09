import type { LessonStep, StepUserAnswer } from "@/lib/types/lesson";

export interface StepRendererProps {
  step: LessonStep;
  onAnswer: (answer: StepUserAnswer) => void;
  userAnswer: StepUserAnswer | null;
  isChecked: boolean;
  isCorrect: boolean | null;
  disabled: boolean;
}
