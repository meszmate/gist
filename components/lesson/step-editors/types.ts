import type { StepContent, StepAnswerData } from "@/lib/types/lesson";

export interface StepEditorProps {
  content: StepContent;
  answerData: StepAnswerData;
  onChange: (content: StepContent, answerData: StepAnswerData) => void;
}
