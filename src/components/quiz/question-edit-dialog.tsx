"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import type {
  QuestionConfig,
  CorrectAnswerData,
  QuestionTypeSlug,
  MultipleChoiceConfig,
  MultipleChoiceAnswer,
  TrueFalseAnswer,
  TextInputConfig,
  TextInputAnswer,
  YearRangeConfig,
  YearRangeAnswer,
  NumericRangeConfig,
  NumericRangeAnswer,
  MatchingConfig,
  MatchingAnswer,
  FillBlankConfig,
  FillBlankAnswer,
  MultiSelectConfig,
  MultiSelectAnswer,
} from "@/lib/types/quiz";

const QUESTION_TYPE_OPTIONS = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True/False" },
  { value: "text_input", label: "Text Input" },
  { value: "year_range", label: "Year" },
  { value: "numeric_range", label: "Numeric" },
  { value: "matching", label: "Matching" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "multi_select", label: "Multi-Select" },
];

interface QuestionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    question: string;
    questionType: string;
    questionConfig: QuestionConfig;
    correctAnswerData: CorrectAnswerData;
    points: number;
    explanation?: string;
    options?: string[];
    correctAnswer?: number;
  }) => void;
  isSaving?: boolean;
  initialData?: {
    question: string;
    questionType: string;
    questionConfig: QuestionConfig;
    correctAnswerData: CorrectAnswerData | null;
    points: number;
    explanation?: string | null;
    options?: string[] | null;
    correctAnswer?: number | null;
  };
  mode: "create" | "edit";
}

export function QuestionEditDialog({
  open,
  onOpenChange,
  onSave,
  isSaving,
  initialData,
  mode,
}: QuestionEditDialogProps) {
  const [questionType, setQuestionType] = useState<string>(
    initialData?.questionType || "multiple_choice"
  );
  const [questionText, setQuestionText] = useState(initialData?.question || "");
  const [explanation, setExplanation] = useState(initialData?.explanation || "");
  const [points, setPoints] = useState(initialData?.points ?? 1);

  // MC / Multi-select state
  const [options, setOptions] = useState<string[]>(
    (initialData?.questionConfig as MultipleChoiceConfig)?.options ||
      initialData?.options ||
      ["", "", "", ""]
  );
  const [correctIndex, setCorrectIndex] = useState<number>(
    (initialData?.correctAnswerData as MultipleChoiceAnswer)?.correctIndex ??
      initialData?.correctAnswer ??
      0
  );
  const [correctIndices, setCorrectIndices] = useState<number[]>(
    (initialData?.correctAnswerData as MultiSelectAnswer)?.correctIndices || [0]
  );

  // True/False state
  const [correctBool, setCorrectBool] = useState<boolean>(
    (initialData?.correctAnswerData as TrueFalseAnswer)?.correctValue ?? true
  );

  // Text input state
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>(
    (initialData?.correctAnswerData as TextInputAnswer)?.acceptedAnswers || [""]
  );

  // Year state
  const [correctYear, setCorrectYear] = useState<number>(
    (initialData?.correctAnswerData as YearRangeAnswer)?.correctYear || new Date().getFullYear()
  );
  const [yearTolerance, setYearTolerance] = useState<number>(
    (initialData?.questionConfig as YearRangeConfig)?.tolerance || 0
  );

  // Numeric state
  const [correctValue, setCorrectValue] = useState<number>(
    (initialData?.correctAnswerData as NumericRangeAnswer)?.correctValue || 0
  );
  const [numericTolerance, setNumericTolerance] = useState<number>(
    (initialData?.questionConfig as NumericRangeConfig)?.tolerance || 0
  );
  const [numericUnit, setNumericUnit] = useState(
    (initialData?.questionConfig as NumericRangeConfig)?.unit || ""
  );

  // Matching state
  const [leftColumn, setLeftColumn] = useState<string[]>(
    (initialData?.questionConfig as MatchingConfig)?.leftColumn || ["", ""]
  );
  const [rightColumn, setRightColumn] = useState<string[]>(
    (initialData?.questionConfig as MatchingConfig)?.rightColumn || ["", ""]
  );

  // Fill blank state
  const [template, setTemplate] = useState(
    (initialData?.questionConfig as FillBlankConfig)?.template || ""
  );
  const [blanks, setBlanks] = useState<Array<{ id: string; acceptedAnswers: string[] }>>(
    (initialData?.questionConfig as FillBlankConfig)?.blanks || [
      { id: "blank1", acceptedAnswers: [""] },
    ]
  );

  // Reset state when dialog opens with new data
  useEffect(() => {
    if (open) {
      const qt = initialData?.questionType || "multiple_choice";
      setQuestionType(qt);
      setQuestionText(initialData?.question || "");
      setExplanation(initialData?.explanation || "");
      setPoints(initialData?.points ?? 1);

      const config = initialData?.questionConfig;
      const ansData = initialData?.correctAnswerData;

      switch (qt) {
        case "multiple_choice":
          setOptions(
            (config as MultipleChoiceConfig)?.options ||
              initialData?.options ||
              ["", "", "", ""]
          );
          setCorrectIndex(
            (ansData as MultipleChoiceAnswer)?.correctIndex ??
              initialData?.correctAnswer ??
              0
          );
          break;
        case "multi_select":
          setOptions(
            (config as MultiSelectConfig)?.options || ["", "", "", ""]
          );
          setCorrectIndices(
            (ansData as MultiSelectAnswer)?.correctIndices || [0]
          );
          break;
        case "true_false":
          setCorrectBool(
            (ansData as TrueFalseAnswer)?.correctValue ?? true
          );
          break;
        case "text_input":
          setAcceptedAnswers(
            (ansData as TextInputAnswer)?.acceptedAnswers || [""]
          );
          break;
        case "year_range":
          setCorrectYear(
            (ansData as YearRangeAnswer)?.correctYear || new Date().getFullYear()
          );
          setYearTolerance((config as YearRangeConfig)?.tolerance || 0);
          break;
        case "numeric_range":
          setCorrectValue(
            (ansData as NumericRangeAnswer)?.correctValue || 0
          );
          setNumericTolerance((config as NumericRangeConfig)?.tolerance || 0);
          setNumericUnit((config as NumericRangeConfig)?.unit || "");
          break;
        case "matching":
          setLeftColumn((config as MatchingConfig)?.leftColumn || ["", ""]);
          setRightColumn((config as MatchingConfig)?.rightColumn || ["", ""]);
          break;
        case "fill_blank":
          setTemplate((config as FillBlankConfig)?.template || "");
          setBlanks(
            (config as FillBlankConfig)?.blanks || [
              { id: "blank1", acceptedAnswers: [""] },
            ]
          );
          break;
      }
    }
  }, [open, initialData]);

  const handleSave = () => {
    let questionConfig: QuestionConfig;
    let correctAnswerData: CorrectAnswerData;
    let legacyOptions: string[] | undefined;
    let legacyCorrectAnswer: number | undefined;

    switch (questionType) {
      case "multiple_choice":
        questionConfig = { options } as MultipleChoiceConfig;
        correctAnswerData = { correctIndex } as MultipleChoiceAnswer;
        legacyOptions = options;
        legacyCorrectAnswer = correctIndex;
        break;
      case "true_false":
        questionConfig = {} as QuestionConfig;
        correctAnswerData = { correctValue: correctBool } as TrueFalseAnswer;
        break;
      case "text_input":
        questionConfig = {} as TextInputConfig;
        correctAnswerData = {
          acceptedAnswers: acceptedAnswers.filter((a) => a.trim()),
        } as TextInputAnswer;
        break;
      case "year_range":
        questionConfig = { tolerance: yearTolerance } as YearRangeConfig;
        correctAnswerData = { correctYear } as YearRangeAnswer;
        break;
      case "numeric_range":
        questionConfig = {
          tolerance: numericTolerance,
          unit: numericUnit || undefined,
        } as NumericRangeConfig;
        correctAnswerData = { correctValue } as NumericRangeAnswer;
        break;
      case "matching":
        questionConfig = {
          leftColumn: leftColumn.filter((l) => l.trim()),
          rightColumn: rightColumn.filter((r) => r.trim()),
        } as MatchingConfig;
        const pairs: Record<string, string> = {};
        leftColumn.forEach((l, i) => {
          if (l.trim() && rightColumn[i]?.trim()) {
            pairs[l] = rightColumn[i];
          }
        });
        correctAnswerData = { correctPairs: pairs } as MatchingAnswer;
        break;
      case "fill_blank":
        questionConfig = {
          template,
          blanks: blanks.map((b) => ({
            id: b.id,
            acceptedAnswers: b.acceptedAnswers.filter((a) => a.trim()),
          })),
        } as FillBlankConfig;
        const blankAnswers: Record<string, string[]> = {};
        blanks.forEach((b) => {
          blankAnswers[b.id] = b.acceptedAnswers.filter((a) => a.trim());
        });
        correctAnswerData = { blanks: blankAnswers } as FillBlankAnswer;
        break;
      case "multi_select":
        questionConfig = { options } as MultiSelectConfig;
        correctAnswerData = { correctIndices } as MultiSelectAnswer;
        break;
      default:
        questionConfig = {};
        correctAnswerData = {};
    }

    onSave({
      question: questionText,
      questionType,
      questionConfig,
      correctAnswerData,
      points,
      explanation: explanation || undefined,
      options: legacyOptions,
      correctAnswer: legacyCorrectAnswer,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Question" : "Edit Question"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={points}
                onChange={(e) => setPoints(parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Question</Label>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter the question..."
              rows={2}
            />
          </div>

          {/* Type-specific fields */}
          {(questionType === "multiple_choice" ||
            questionType === "multi_select") && (
            <div className="space-y-2">
              <Label>Options</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  {questionType === "multiple_choice" ? (
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={correctIndex === i}
                      onChange={() => setCorrectIndex(i)}
                      className="shrink-0"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      checked={correctIndices.includes(i)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCorrectIndices([...correctIndices, i]);
                        } else {
                          setCorrectIndices(
                            correctIndices.filter((idx) => idx !== i)
                          );
                        }
                      }}
                      className="shrink-0"
                    />
                  )}
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[i] = e.target.value;
                      setOptions(newOpts);
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        setOptions(options.filter((_, j) => j !== i));
                        if (correctIndex >= i && correctIndex > 0) {
                          setCorrectIndex(correctIndex - 1);
                        }
                        setCorrectIndices(
                          correctIndices
                            .filter((idx) => idx !== i)
                            .map((idx) => (idx > i ? idx - 1 : idx))
                        );
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOptions([...options, ""])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Option
              </Button>
            </div>
          )}

          {questionType === "true_false" && (
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={correctBool === true}
                    onChange={() => setCorrectBool(true)}
                  />
                  True
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={correctBool === false}
                    onChange={() => setCorrectBool(false)}
                  />
                  False
                </label>
              </div>
            </div>
          )}

          {questionType === "text_input" && (
            <div className="space-y-2">
              <Label>Accepted Answers</Label>
              {acceptedAnswers.map((ans, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={ans}
                    onChange={(e) => {
                      const newAns = [...acceptedAnswers];
                      newAns[i] = e.target.value;
                      setAcceptedAnswers(newAns);
                    }}
                    placeholder="Accepted answer"
                  />
                  {acceptedAnswers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() =>
                        setAcceptedAnswers(
                          acceptedAnswers.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAcceptedAnswers([...acceptedAnswers, ""])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Answer
              </Button>
            </div>
          )}

          {questionType === "year_range" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Correct Year</Label>
                <Input
                  type="number"
                  value={correctYear}
                  onChange={(e) => setCorrectYear(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tolerance (years)</Label>
                <Input
                  type="number"
                  min={0}
                  value={yearTolerance}
                  onChange={(e) =>
                    setYearTolerance(parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          )}

          {questionType === "numeric_range" && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Correct Value</Label>
                <Input
                  type="number"
                  value={correctValue}
                  onChange={(e) =>
                    setCorrectValue(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tolerance</Label>
                <Input
                  type="number"
                  min={0}
                  value={numericTolerance}
                  onChange={(e) =>
                    setNumericTolerance(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={numericUnit}
                  onChange={(e) => setNumericUnit(e.target.value)}
                  placeholder="e.g., kg"
                />
              </div>
            </div>
          )}

          {questionType === "matching" && (
            <div className="space-y-2">
              <Label>Pairs (left matches right)</Label>
              {leftColumn.map((left, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={left}
                    onChange={(e) => {
                      const newLeft = [...leftColumn];
                      newLeft[i] = e.target.value;
                      setLeftColumn(newLeft);
                    }}
                    placeholder="Left item"
                  />
                  <span className="text-muted-foreground shrink-0">&rarr;</span>
                  <Input
                    value={rightColumn[i] || ""}
                    onChange={(e) => {
                      const newRight = [...rightColumn];
                      newRight[i] = e.target.value;
                      setRightColumn(newRight);
                    }}
                    placeholder="Right item"
                  />
                  {leftColumn.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        setLeftColumn(leftColumn.filter((_, j) => j !== i));
                        setRightColumn(rightColumn.filter((_, j) => j !== i));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLeftColumn([...leftColumn, ""]);
                  setRightColumn([...rightColumn, ""]);
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Pair
              </Button>
            </div>
          )}

          {questionType === "fill_blank" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Template (use {"{{blank}}"} for blanks)</Label>
                <Textarea
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="The capital of France is {{blank}}."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Blank Answers</Label>
                {blanks.map((blank, i) => (
                  <div key={blank.id} className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Blank {i + 1} ({blank.id})
                    </p>
                    {blank.acceptedAnswers.map((ans, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <Input
                          value={ans}
                          onChange={(e) => {
                            const newBlanks = [...blanks];
                            newBlanks[i].acceptedAnswers[j] = e.target.value;
                            setBlanks(newBlanks);
                          }}
                          placeholder="Accepted answer"
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newBlanks = [...blanks];
                        newBlanks[i].acceptedAnswers.push("");
                        setBlanks(newBlanks);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add accepted answer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Explanation (optional)</Label>
            <Textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain the correct answer..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!questionText.trim() || isSaving}
          >
            {isSaving
              ? "Saving..."
              : mode === "create"
              ? "Add Question"
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
