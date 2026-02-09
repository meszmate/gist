"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, RotateCcw, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LessonWithSteps,
  StepUserAnswer,
  StepResult,
  StepType,
} from "@/lib/types/lesson";
import { isInteractiveStep, checkStepAnswer } from "@/lib/types/lesson";
import { LessonPlayerProgressBar } from "./lesson-player-progress-bar";
import { LessonPlayerIntro } from "./lesson-player-intro";
import { LessonPlayerSummary } from "./lesson-player-summary";
import { LessonPlayerFeedback } from "./lesson-player-feedback";
import { STEP_RENDERERS } from "./step-renderers";

interface LessonPlayerProps {
  lesson: LessonWithSteps;
  onExit: () => void;
  onComplete?: (data: {
    correctCount: number;
    interactiveSteps: number;
    score: number;
    stepResults: Record<string, StepResult>;
    answers: Record<string, StepUserAnswer>;
    timeSpentSeconds: number;
  }) => void;
  attemptId?: string;
  resourceId?: string;
}

type Phase = "intro" | "playing" | "summary";

export function LessonPlayer({
  lesson,
  onExit,
  onComplete,
  attemptId,
  resourceId,
}: LessonPlayerProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StepUserAnswer>>({});
  const [stepResults, setStepResults] = useState<Record<string, StepResult>>({});
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [finalTimeSpent, setFinalTimeSpent] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [stepKey, setStepKey] = useState(0);

  const steps = lesson.steps;
  const currentStep = steps[stepIndex];
  const isInteractive = currentStep ? isInteractiveStep(currentStep.stepType as StepType) : false;
  const userAnswer = currentStep ? answers[currentStep.id] || null : null;
  const totalInteractive = steps.filter((s) => isInteractiveStep(s.stepType as StepType)).length;
  const correctCount = Object.values(stepResults).filter((r) => r.isCorrect).length;

  const handleStart = () => {
    setPhase("playing");
    setStartTime(performance.now());
  };

  const handleCheck = useCallback(() => {
    if (!currentStep || !userAnswer) return;

    const correct = checkStepAnswer(
      currentStep.stepType as StepType,
      currentStep.content,
      currentStep.answerData,
      userAnswer
    );

    setIsChecked(true);
    setIsCorrect(correct);
    setAttemptCount((c) => c + 1);

    if (correct || attemptCount >= 1) {
      // Record result
      setStepResults((prev) => ({
        ...prev,
        [currentStep.id]: {
          isCorrect: correct,
          attempts: attemptCount + 1,
          firstAttemptCorrect: attemptCount === 0 && correct,
        },
      }));
    }
  }, [currentStep, userAnswer, attemptCount]);

  const handleContinue = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      // Complete
      const timeSpent = Math.floor((performance.now() - startTime) / 1000);
      setFinalTimeSpent(timeSpent);
      const finalCorrect = Object.values(stepResults).filter((r) => r.isCorrect).length;
      const score = totalInteractive > 0 ? Math.round((finalCorrect / totalInteractive) * 100) : 100;

      // Save progress
      if (attemptId && resourceId) {
        fetch(`/api/resources/${resourceId}/lessons/${lesson.id}/attempts/${attemptId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completedAt: new Date().toISOString(),
            correctCount: finalCorrect,
            score,
            answers,
            stepResults,
            timeSpentSeconds: timeSpent,
            currentStepIndex: stepIndex,
            completedStepIds: steps.map((s) => s.id),
          }),
        }).catch(console.error);
      }

      onComplete?.({
        correctCount: finalCorrect,
        interactiveSteps: totalInteractive,
        score,
        stepResults,
        answers,
        timeSpentSeconds: timeSpent,
      });

      setPhase("summary");
    } else {
      setDirection("right");
      setStepKey((k) => k + 1);
      setStepIndex((i) => i + 1);
      setIsChecked(false);
      setIsCorrect(null);
      setAttemptCount(0);
      setShowHint(false);
    }
  }, [stepIndex, steps, stepResults, totalInteractive, attemptId, resourceId, lesson.id, answers, onComplete, startTime]);

  const handleTryAgain = () => {
    setIsChecked(false);
    setIsCorrect(null);
  };

  const handleAnswer = useCallback((answer: StepUserAnswer) => {
    if (!currentStep) return;
    setAnswers((prev) => ({ ...prev, [currentStep.id]: answer }));
  }, [currentStep]);

  const handleRetake = () => {
    setPhase("intro");
    setStepIndex(0);
    setAnswers({});
    setStepResults({});
    setIsChecked(false);
    setIsCorrect(null);
    setAttemptCount(0);
    setShowHint(false);
    setStepKey(0);
  };

  // Keyboard navigation
  useEffect(() => {
    if (phase !== "playing") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "Escape") {
        onExit();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isChecked) {
          handleContinue();
        } else if (!isInteractive) {
          handleContinue();
        } else if (userAnswer) {
          handleCheck();
        }
      } else if (isInteractive && !isChecked && currentStep?.stepType === "multiple_choice") {
        // Quick select with number keys
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4) {
          const content = currentStep.content as { options?: { id: string }[] };
          const option = content.options?.[num - 1];
          if (option) handleAnswer({ selectedOptionId: option.id });
        }
      } else if (isInteractive && !isChecked && currentStep?.stepType === "true_false") {
        if (e.key === "t" || e.key === "T") handleAnswer({ selectedValue: true });
        if (e.key === "f" || e.key === "F") handleAnswer({ selectedValue: false });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, isChecked, isInteractive, userAnswer, handleCheck, handleContinue, handleAnswer, currentStep, onExit]);

  // Auto-save progress
  useEffect(() => {
    if (phase !== "playing" || !attemptId || !resourceId) return;

    const timer = setTimeout(() => {
      fetch(`/api/resources/${resourceId}/lessons/${lesson.id}/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStepIndex: stepIndex,
          completedStepIds: Object.keys(stepResults),
          answers,
          stepResults,
          correctCount,
        }),
      }).catch(console.error);
    }, 3000);

    return () => clearTimeout(timer);
  }, [phase, stepIndex, stepResults, answers, correctCount, attemptId, resourceId, lesson.id]);

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center justify-end p-4">
          <Button variant="ghost" size="icon" onClick={onExit}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 container max-w-2xl mx-auto px-4">
          <LessonPlayerIntro lesson={lesson} onStart={handleStart} />
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center justify-end p-4">
          <Button variant="ghost" size="icon" onClick={onExit}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 container max-w-2xl mx-auto px-4">
          <LessonPlayerSummary
            steps={steps}
            stepResults={stepResults}
            correctCount={correctCount}
            interactiveSteps={totalInteractive}
            timeSpentSeconds={finalTimeSpent}
            onRetake={handleRetake}
            onBack={onExit}
          />
        </div>
      </div>
    );
  }

  // Playing phase
  const StepRenderer = currentStep ? STEP_RENDERERS[currentStep.stepType as StepType] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm truncate">{lesson.title}</h2>
          <Button variant="ghost" size="icon" onClick={onExit}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <LessonPlayerProgressBar
          current={Object.keys(stepResults).length + (isChecked || !isInteractive ? 0 : 0)}
          total={steps.length}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 container max-w-2xl mx-auto px-4 py-8">
        {currentStep && StepRenderer && (
          <div
            key={stepKey}
            className={cn(
              direction === "right" ? "animate-slide-in-right" : "animate-slide-in-left"
            )}
          >
            <StepRenderer
              step={currentStep}
              onAnswer={handleAnswer}
              userAnswer={userAnswer}
              isChecked={isChecked}
              isCorrect={isCorrect ?? false}
              disabled={isChecked}
            />
          </div>
        )}

        {/* Hint */}
        {isInteractive && !isChecked && currentStep?.hint && (
          <div className="mt-4">
            {showHint ? (
              <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-sm flex items-start gap-2 animate-slide-up">
                <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                <span>{currentStep.hint}</span>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(true)}
                className="text-muted-foreground"
              >
                <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
                Show Hint
              </Button>
            )}
          </div>
        )}

        {/* Feedback */}
        {isChecked && isCorrect !== null && (
          <div className="mt-6">
            <LessonPlayerFeedback
              isCorrect={isCorrect}
              explanation={currentStep?.explanation}
            />
          </div>
        )}
      </div>

      {/* Bottom actions — always visible */}
      <div className="border-t p-4">
        <div className="container max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">
              Step {stepIndex + 1} of {steps.length}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {isChecked ? (
                <><kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">↵</kbd> Enter to continue</>
              ) : isInteractive ? (
                <><kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">↵</kbd> Enter to check</>
              ) : (
                <><kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">↵</kbd> Enter to continue</>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isChecked ? (
              <>
                {!isCorrect && attemptCount <= 1 && (
                  <Button variant="outline" onClick={handleTryAgain} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Try Again
                  </Button>
                )}
                <Button onClick={handleContinue} className="gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : isInteractive ? (
              <Button
                onClick={handleCheck}
                disabled={!userAnswer}
                className="gap-2"
              >
                Check
              </Button>
            ) : (
              <Button onClick={handleContinue} className="gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
