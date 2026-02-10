"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag, AlertCircle } from "lucide-react";
import { questionRenderers } from "./question-renderers";
import type {
  QuestionTypeSlug,
  QuestionConfig,
  CorrectAnswerData,
  UserAnswer,
} from "@/lib/types/quiz";

interface QuestionCardProps {
  questionId: string;
  questionNumber: number;
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
  pointsEarned?: number;
  showPoints?: boolean;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
  showFlagButton?: boolean;
  className?: string;
}

// Map question types to display names
const questionTypeLabels: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True/False',
  text_input: 'Text Input',
  year_range: 'Year',
  numeric_range: 'Numeric',
  matching: 'Matching',
  fill_blank: 'Fill in the Blank',
  multi_select: 'Multi-Select',
};

export function QuestionCard({
  questionId,
  questionNumber,
  questionText,
  questionType,
  config,
  correctAnswerData,
  userAnswer,
  onAnswer,
  disabled = false,
  showResult = false,
  isCorrect,
  feedback,
  points,
  pointsEarned,
  showPoints = false,
  isFlagged = false,
  onToggleFlag,
  showFlagButton = false,
  className,
}: QuestionCardProps) {
  const Renderer = questionRenderers[questionType];

  const typeLabel = questionTypeLabels[questionType] || questionType;

  return (
    <Card className={cn("animate-fade-in", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Q{questionNumber}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {typeLabel}
            </Badge>
            {showPoints && points !== undefined && (
              <Badge variant="outline" className="text-xs">
                {showResult && pointsEarned !== undefined
                  ? `${pointsEarned.toFixed(1)} / ${points} pts`
                  : `${points} pts`}
              </Badge>
            )}
          </div>
          {showFlagButton && onToggleFlag && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFlag}
              className={cn(
                "shrink-0",
                isFlagged && "text-yellow-500"
              )}
            >
              <Flag className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Question Text */}
        <p className="text-lg font-medium leading-relaxed mb-6">
          {questionText}
        </p>

        {/* Hint from config */}
        {config && 'hint' in config && config.hint && !showResult && (
          <div className="mb-4 p-3 rounded-lg bg-blue-500/10 text-blue-700 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{config.hint}</span>
          </div>
        )}

        {/* Question Renderer */}
        {Renderer ? (
          <Renderer
            questionId={questionId}
            questionText={questionText}
            questionType={questionType}
            config={config}
            correctAnswerData={correctAnswerData}
            userAnswer={userAnswer}
            onAnswer={onAnswer}
            disabled={disabled}
            showResult={showResult}
            isCorrect={isCorrect}
            feedback={feedback}
            points={points}
            showPoints={showPoints}
          />
        ) : (
          <div className="p-4 rounded-lg bg-amber-500/10 text-amber-700">
            <p>Unknown question type: {questionType}</p>
            <p className="text-sm">This question type is not supported yet.</p>
          </div>
        )}

        {/* Feedback (if not shown by renderer) */}
        {showResult && feedback && questionType === 'multiple_choice' && (
          <div className={cn(
            "mt-4 p-3 rounded-lg text-sm",
            isCorrect ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700"
          )}>
            {feedback}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
