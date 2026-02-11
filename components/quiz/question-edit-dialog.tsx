"use client";

import { useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import type {
  QuestionConfig,
  CorrectAnswerData,
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {open && (
          <QuestionEditDialogContent
            onOpenChange={onOpenChange}
            onSave={onSave}
            isSaving={isSaving}
            initialData={initialData}
            mode={mode}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuestionEditDialogContent({
  onOpenChange,
  onSave,
  isSaving,
  initialData,
  mode,
}: Omit<QuestionEditDialogProps, "open">) {
  const { t } = useLocale();

  const QUESTION_TYPE_OPTIONS = [
    { value: "multiple_choice", label: t("quiz.questionTypes.multiple_choice") },
    { value: "true_false", label: t("quiz.questionTypes.true_false") },
    { value: "text_input", label: t("quiz.questionTypes.text_input") },
    { value: "year_range", label: t("quiz.questionTypes.year_range") },
    { value: "numeric_range", label: t("quiz.questionTypes.numeric_range") },
    { value: "matching", label: t("quiz.questionTypes.matching") },
    { value: "fill_blank", label: t("quiz.questionTypes.fill_blank") },
    { value: "multi_select", label: t("quiz.questionTypes.multi_select") },
  ];

  const [questionType, setQuestionType] = useState<string>(
    initialData?.questionType || "multiple_choice"
  );
  const [questionText, setQuestionText] = useState(initialData?.question || "");
  const [explanation, setExplanation] = useState(initialData?.explanation || "");
  const [points, setPoints] = useState(initialData?.points ?? 1);

  // MC / Multi-select state
  const [options, setOptions] = useState<string[]>(() => {
    const config = initialData?.questionConfig;
    if (initialData?.questionType === "multi_select") {
      return (config as MultiSelectConfig)?.options || ["", "", "", ""];
    }
    return (
      (config as MultipleChoiceConfig)?.options ||
      initialData?.options ||
      ["", "", "", ""]
    );
  });
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
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? t("quiz.editDialog.addQuestion") : t("quiz.editDialog.editQuestion")}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("quiz.editDialog.questionType")}</Label>
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
            <Label>{t("quiz.editDialog.points")}</Label>
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
          <Label>{t("quiz.editDialog.question")}</Label>
          <Textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder={t("quiz.editDialog.questionPlaceholder")}
            rows={2}
          />
        </div>

        {/* Type-specific fields */}
        {(questionType === "multiple_choice" ||
          questionType === "multi_select") && (
          <div className="space-y-2">
            <Label>{t("quiz.editDialog.options")}</Label>
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
              {t("quiz.editDialog.addOption")}
            </Button>
          </div>
        )}

        {questionType === "true_false" && (
          <div className="space-y-2">
            <Label>{t("quiz.editDialog.correctAnswer")}</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={correctBool === true}
                  onChange={() => setCorrectBool(true)}
                />
                {t("quiz.editDialog.true")}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={correctBool === false}
                  onChange={() => setCorrectBool(false)}
                />
                {t("quiz.editDialog.false")}
              </label>
            </div>
          </div>
        )}

        {questionType === "text_input" && (
          <div className="space-y-2">
            <Label>{t("quiz.editDialog.acceptedAnswers")}</Label>
            {acceptedAnswers.map((ans, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={ans}
                  onChange={(e) => {
                    const newAns = [...acceptedAnswers];
                    newAns[i] = e.target.value;
                    setAcceptedAnswers(newAns);
                  }}
                  placeholder={t("quiz.editDialog.acceptedAnswer")}
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
              {t("quiz.editDialog.addAnswer")}
            </Button>
          </div>
        )}

        {questionType === "year_range" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("quiz.editDialog.correctYear")}</Label>
              <Input
                type="number"
                value={correctYear}
                onChange={(e) => setCorrectYear(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("quiz.editDialog.toleranceYears")}</Label>
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
              <Label>{t("quiz.editDialog.correctValue")}</Label>
              <Input
                type="number"
                value={correctValue}
                onChange={(e) =>
                  setCorrectValue(parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("quiz.editDialog.tolerance")}</Label>
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
              <Label>{t("quiz.editDialog.unit")}</Label>
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
            <Label>{t("quiz.editDialog.pairs")}</Label>
            {leftColumn.map((left, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={left}
                  onChange={(e) => {
                    const newLeft = [...leftColumn];
                    newLeft[i] = e.target.value;
                    setLeftColumn(newLeft);
                  }}
                  placeholder={t("quiz.editDialog.leftItem")}
                />
                <span className="text-muted-foreground shrink-0">&rarr;</span>
                <Input
                  value={rightColumn[i] || ""}
                  onChange={(e) => {
                    const newRight = [...rightColumn];
                    newRight[i] = e.target.value;
                    setRightColumn(newRight);
                  }}
                  placeholder={t("quiz.editDialog.rightItem")}
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
              {t("quiz.editDialog.addPair")}
            </Button>
          </div>
        )}

        {questionType === "fill_blank" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("quiz.editDialog.templateLabel")}</Label>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder={t("quiz.editDialog.templatePlaceholder")}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("quiz.editDialog.blankAnswers")}</Label>
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
                        placeholder={t("quiz.editDialog.acceptedAnswer")}
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
                    {t("quiz.editDialog.addAcceptedAnswer")}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("quiz.editDialog.explanation")}</Label>
          <Textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder={t("quiz.editDialog.explanationPlaceholder")}
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!questionText.trim() || isSaving}
        >
          {isSaving
            ? t("common.saving")
            : mode === "create"
            ? t("quiz.editDialog.addQuestion")
            : t("quiz.editDialog.saveChanges")}
        </Button>
      </DialogFooter>
    </>
  );
}
