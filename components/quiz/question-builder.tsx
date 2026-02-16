"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import type {
  QuestionTypeSlug,
  QuestionConfig,
  CorrectAnswerData,
  MultipleChoiceConfig,
  MultipleChoiceAnswer,
  TrueFalseConfig,
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
import { extractFillBlankIds } from "@/lib/quiz/fill-blank-template";

interface QuestionBuilderProps {
  onSave: (question: {
    question: string;
    questionType: QuestionTypeSlug;
    questionConfig: QuestionConfig;
    correctAnswerData: CorrectAnswerData;
    points: number;
    explanation?: string;
  }) => void;
  onCancel?: () => void;
  initialData?: {
    question: string;
    questionType: QuestionTypeSlug;
    questionConfig: QuestionConfig;
    correctAnswerData: CorrectAnswerData;
    points: number;
    explanation?: string;
  };
}

const QUESTION_TYPE_SLUGS: QuestionTypeSlug[] = [
  'multiple_choice', 'true_false', 'text_input', 'year_range',
  'numeric_range', 'matching', 'fill_blank', 'multi_select',
];

export function QuestionBuilder({ onSave, onCancel, initialData }: QuestionBuilderProps) {
  const { t } = useLocale();
  const [questionText, setQuestionText] = useState(initialData?.question || '');
  const [questionType, setQuestionType] = useState<QuestionTypeSlug>(initialData?.questionType || 'multiple_choice');
  const [points, setPoints] = useState(initialData?.points || 1);
  const [explanation, setExplanation] = useState(initialData?.explanation || '');

  // Multiple choice state
  const [mcOptions, setMcOptions] = useState<string[]>(
    (initialData?.questionConfig as MultipleChoiceConfig)?.options || ['', '', '', '']
  );
  const [mcCorrectIndex, setMcCorrectIndex] = useState<number>(
    (initialData?.correctAnswerData as MultipleChoiceAnswer)?.correctIndex || 0
  );

  // True/False state
  const [tfCorrect, setTfCorrect] = useState<boolean>(
    (initialData?.correctAnswerData as TrueFalseAnswer)?.correctValue ?? true
  );

  // Text input state
  const [textAcceptedAnswers, setTextAcceptedAnswers] = useState<string[]>(
    (initialData?.correctAnswerData as TextInputAnswer)?.acceptedAnswers || ['']
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [textKeywords, _setTextKeywords] = useState<string[]>(
    (initialData?.correctAnswerData as TextInputAnswer)?.keywords || []
  );
  const [textCaseSensitive, setTextCaseSensitive] = useState(
    (initialData?.questionConfig as TextInputConfig)?.caseSensitive || false
  );

  // Year range state
  const [yearCorrect, setYearCorrect] = useState<number>(
    (initialData?.correctAnswerData as YearRangeAnswer)?.correctYear || new Date().getFullYear()
  );
  const [yearTolerance, setYearTolerance] = useState<number>(
    (initialData?.questionConfig as YearRangeConfig)?.tolerance || 0
  );

  // Numeric range state
  const [numericCorrect, setNumericCorrect] = useState<number>(
    (initialData?.correctAnswerData as NumericRangeAnswer)?.correctValue || 0
  );
  const [numericTolerance, setNumericTolerance] = useState<number>(
    (initialData?.questionConfig as NumericRangeConfig)?.tolerance || 0
  );
  const [numericUnit, setNumericUnit] = useState<string>(
    (initialData?.questionConfig as NumericRangeConfig)?.unit || ''
  );

  // Matching state
  const [matchingLeft, setMatchingLeft] = useState<string[]>(
    (initialData?.questionConfig as MatchingConfig)?.leftColumn || ['', '']
  );
  const [matchingRight, setMatchingRight] = useState<string[]>(
    (initialData?.questionConfig as MatchingConfig)?.rightColumn || ['', '']
  );

  // Fill blank state
  const [fillBlankTemplate, setFillBlankTemplate] = useState<string>(
    (initialData?.questionConfig as FillBlankConfig)?.template || ''
  );
  const [fillBlankAnswers, setFillBlankAnswers] = useState<Record<string, string[]>>(() => {
    const fromAnswerData = (initialData?.correctAnswerData as FillBlankAnswer)?.blanks || {};
    if (Object.keys(fromAnswerData).length > 0) {
      return fromAnswerData;
    }

    const fromConfig = (initialData?.questionConfig as FillBlankConfig)?.blanks || [];
    const mapped: Record<string, string[]> = {};
    for (const blank of fromConfig) {
      mapped[blank.id] = blank.acceptedAnswers || [];
    }
    return mapped;
  });

  // Multi-select state
  const [msOptions, setMsOptions] = useState<string[]>(
    (initialData?.questionConfig as MultiSelectConfig)?.options || ['', '', '', '']
  );
  const [msCorrectIndices, setMsCorrectIndices] = useState<number[]>(
    (initialData?.correctAnswerData as MultiSelectAnswer)?.correctIndices || []
  );

  const buildQuestionData = () => {
    let config: QuestionConfig = {};
    let correctAnswer: CorrectAnswerData;

    switch (questionType) {
      case 'multiple_choice':
        config = { options: mcOptions.filter(o => o.trim()) } as MultipleChoiceConfig;
        correctAnswer = { correctIndex: mcCorrectIndex } as MultipleChoiceAnswer;
        break;

      case 'true_false':
        config = {} as TrueFalseConfig;
        correctAnswer = { correctValue: tfCorrect } as TrueFalseAnswer;
        break;

      case 'text_input':
        config = { caseSensitive: textCaseSensitive } as TextInputConfig;
        correctAnswer = {
          acceptedAnswers: textAcceptedAnswers.filter(a => a.trim()),
          keywords: textKeywords.filter(k => k.trim()),
        } as TextInputAnswer;
        break;

      case 'year_range':
        config = { tolerance: yearTolerance } as YearRangeConfig;
        correctAnswer = { correctYear: yearCorrect } as YearRangeAnswer;
        break;

      case 'numeric_range':
        config = { tolerance: numericTolerance, unit: numericUnit || undefined } as NumericRangeConfig;
        correctAnswer = { correctValue: numericCorrect } as NumericRangeAnswer;
        break;

      case 'matching':
        config = { leftColumn: matchingLeft, rightColumn: matchingRight } as MatchingConfig;
        const pairs: Record<string, string> = {};
        matchingLeft.forEach((left, i) => {
          if (left && matchingRight[i]) {
            pairs[left] = matchingRight[i];
          }
        });
        correctAnswer = { correctPairs: pairs } as MatchingAnswer;
        break;

      case 'fill_blank':
        const blankDefinitions = Object.keys(fillBlankAnswers).map((id) => ({ id }));
        const parsedBlankIds = extractFillBlankIds(
          fillBlankTemplate,
          blankDefinitions
        );
        const blankIds = parsedBlankIds.length > 0
          ? parsedBlankIds
          : Object.keys(fillBlankAnswers);
        const blanks: FillBlankConfig['blanks'] = blankIds.map((id) => ({
          id,
          acceptedAnswers: (fillBlankAnswers[id] || []).filter((answer) => answer.trim()),
        }));

        const normalizedBlankAnswers: Record<string, string[]> = {};
        blanks.forEach((blank) => {
          normalizedBlankAnswers[blank.id] = blank.acceptedAnswers;
        });

        config = { template: fillBlankTemplate, blanks } as FillBlankConfig;
        correctAnswer = { blanks: normalizedBlankAnswers } as FillBlankAnswer;
        break;

      case 'multi_select':
        config = { options: msOptions.filter(o => o.trim()) } as MultiSelectConfig;
        correctAnswer = { correctIndices: msCorrectIndices } as MultiSelectAnswer;
        break;

      default:
        config = {};
        correctAnswer = {};
    }

    return {
      question: questionText,
      questionType,
      questionConfig: config,
      correctAnswerData: correctAnswer,
      points,
      explanation: explanation || undefined,
    };
  };

  const handleSave = () => {
    if (!questionText.trim()) return;
    onSave(buildQuestionData());
  };

  const renderTypeSpecificFields = () => {
    switch (questionType) {
      case 'multiple_choice':
        return (
          <div className="space-y-4">
            <Label>{t("questionBuilder.answerOptions")}</Label>
            {mcOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMcCorrectIndex(index)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                    mcCorrectIndex === index
                      ? "bg-green-500 text-white"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {index + 1}
                </button>
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...mcOptions];
                    newOptions[index] = e.target.value;
                    setMcOptions(newOptions);
                  }}
                  placeholder={t("questionBuilder.option", { index: index + 1 })}
                />
                {mcOptions.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newOptions = mcOptions.filter((_, i) => i !== index);
                      setMcOptions(newOptions);
                      if (mcCorrectIndex >= newOptions.length) {
                        setMcCorrectIndex(newOptions.length - 1);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {mcOptions.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMcOptions([...mcOptions, ''])}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("questionBuilder.addOption")}
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              {t("questionBuilder.clickToMark")}
            </p>
          </div>
        );

      case 'true_false':
        return (
          <div className="space-y-4">
            <Label>{t("questionBuilder.correctAnswer")}</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={tfCorrect ? "default" : "outline"}
                onClick={() => setTfCorrect(true)}
              >
                {t("questionBuilder.true")}
              </Button>
              <Button
                type="button"
                variant={!tfCorrect ? "default" : "outline"}
                onClick={() => setTfCorrect(false)}
              >
                {t("questionBuilder.false")}
              </Button>
            </div>
          </div>
        );

      case 'text_input':
        return (
          <div className="space-y-4">
            <div>
              <Label>{t("questionBuilder.acceptedAnswers")}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {t("questionBuilder.acceptedDesc")}
              </p>
              {textAcceptedAnswers.map((answer, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <Input
                    value={answer}
                    onChange={(e) => {
                      const newAnswers = [...textAcceptedAnswers];
                      newAnswers[index] = e.target.value;
                      setTextAcceptedAnswers(newAnswers);
                    }}
                    placeholder={t("questionBuilder.acceptedAnswer")}
                  />
                  {textAcceptedAnswers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setTextAcceptedAnswers(textAcceptedAnswers.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTextAcceptedAnswers([...textAcceptedAnswers, ''])}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("questionBuilder.addAnswer")}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={textCaseSensitive}
                onCheckedChange={setTextCaseSensitive}
              />
              <Label>{t("questionBuilder.caseSensitive")}</Label>
            </div>
          </div>
        );

      case 'year_range':
        return (
          <div className="space-y-4">
            <div>
              <Label>{t("questionBuilder.correctYear")}</Label>
              <Input
                type="number"
                value={yearCorrect}
                onChange={(e) => setYearCorrect(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>{t("questionBuilder.tolerance")}</Label>
              <Input
                type="number"
                min={0}
                value={yearTolerance}
                onChange={(e) => setYearTolerance(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        );

      case 'numeric_range':
        return (
          <div className="space-y-4">
            <div>
              <Label>{t("questionBuilder.correctValue")}</Label>
              <Input
                type="number"
                step="any"
                value={numericCorrect}
                onChange={(e) => setNumericCorrect(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>{t("questionBuilder.numericTolerance")}</Label>
              <Input
                type="number"
                step="any"
                min={0}
                value={numericTolerance}
                onChange={(e) => setNumericTolerance(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>{t("questionBuilder.unit")}</Label>
              <Input
                value={numericUnit}
                onChange={(e) => setNumericUnit(e.target.value)}
                placeholder={t("questionBuilder.unitPlaceholder")}
              />
            </div>
          </div>
        );

      case 'matching':
        return (
          <div className="space-y-4">
            <Label>{t("questionBuilder.matchingPairs")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("questionBuilder.matchingDesc")}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="font-medium text-sm">{t("questionBuilder.leftColumn")}</div>
              <div className="font-medium text-sm">{t("questionBuilder.rightColumn")}</div>
            </div>
            {matchingLeft.map((left, index) => (
              <div key={index} className="grid grid-cols-2 gap-4">
                <Input
                  value={left}
                  onChange={(e) => {
                    const newLeft = [...matchingLeft];
                    newLeft[index] = e.target.value;
                    setMatchingLeft(newLeft);
                  }}
                  placeholder={t("questionBuilder.item", { index: index + 1 })}
                />
                <div className="flex gap-2">
                  <Input
                    value={matchingRight[index] || ''}
                    onChange={(e) => {
                      const newRight = [...matchingRight];
                      newRight[index] = e.target.value;
                      setMatchingRight(newRight);
                    }}
                    placeholder={t("questionBuilder.match", { index: index + 1 })}
                  />
                  {matchingLeft.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setMatchingLeft(matchingLeft.filter((_, i) => i !== index));
                        setMatchingRight(matchingRight.filter((_, i) => i !== index));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setMatchingLeft([...matchingLeft, '']);
                setMatchingRight([...matchingRight, '']);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("questionBuilder.addPair")}
            </Button>
          </div>
        );

      case 'fill_blank':
        const blankDefinitions = Object.keys(fillBlankAnswers).map((id) => ({ id }));
        const parsedBlankIds = extractFillBlankIds(
          fillBlankTemplate,
          blankDefinitions
        );
        const blankIds = parsedBlankIds.length > 0
          ? parsedBlankIds
          : Object.keys(fillBlankAnswers);
        return (
          <div className="space-y-4">
            <div>
              <Label>{t("questionBuilder.template")}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {t("questionBuilder.templateDesc")}
              </p>
              <Textarea
                value={fillBlankTemplate}
                onChange={(e) => setFillBlankTemplate(e.target.value)}
                placeholder={t("questionBuilder.templatePlaceholder")}
                rows={3}
              />
            </div>
            {blankIds.length > 0 && (
              <div className="space-y-3">
                <Label>{t("questionBuilder.blanksAnswers")}</Label>
                {blankIds.map((blankId, index) => (
                  <div key={blankId} className="space-y-2">
                    <Label className="text-sm">{t("questionBuilder.blankIndex", { index: index + 1 })}</Label>
                    <Input
                      value={(fillBlankAnswers[blankId] || []).join(', ')}
                      onChange={(e) => {
                        setFillBlankAnswers({
                          ...fillBlankAnswers,
                          [blankId]: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                        });
                      }}
                      placeholder={t("questionBuilder.separateCommas")}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'multi_select':
        return (
          <div className="space-y-4">
            <Label>{t("questionBuilder.answerOptions")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("questionBuilder.checkAll")}
            </p>
            {msOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={msCorrectIndices.includes(index)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMsCorrectIndices([...msCorrectIndices, index]);
                    } else {
                      setMsCorrectIndices(msCorrectIndices.filter(i => i !== index));
                    }
                  }}
                  className="h-4 w-4"
                />
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...msOptions];
                    newOptions[index] = e.target.value;
                    setMsOptions(newOptions);
                  }}
                  placeholder={t("questionBuilder.option", { index: index + 1 })}
                />
                {msOptions.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newOptions = msOptions.filter((_, i) => i !== index);
                      setMsOptions(newOptions);
                      setMsCorrectIndices(msCorrectIndices.filter(i => i !== index).map(i => i > index ? i - 1 : i));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {msOptions.length < 8 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMsOptions([...msOptions, ''])}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("questionBuilder.addOption")}
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? t("questionBuilder.editQuestion") : t("questionBuilder.createQuestion")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question Type */}
        <div className="space-y-2">
          <Label>{t("questionBuilder.questionType")}</Label>
          <Select
            value={questionType}
            onValueChange={(value) => setQuestionType(value as QuestionTypeSlug)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPE_SLUGS.map((slug) => (
                <SelectItem key={slug} value={slug}>
                  <div className="flex flex-col">
                    <span>{t(`questionBuilder.types.${slug}`)}</span>
                    <span className="text-xs text-muted-foreground">{t(`questionBuilder.types.${slug}_desc`)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Question Text */}
        <div className="space-y-2">
          <Label>{t("questionBuilder.question")}</Label>
          <Textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder={t("questionBuilder.enterQuestion")}
            rows={3}
          />
        </div>

        {/* Type-specific fields */}
        {renderTypeSpecificFields()}

        {/* Points */}
        <div className="space-y-2">
          <Label>{t("questionBuilder.points")}</Label>
          <Input
            type="number"
            min={0.5}
            step={0.5}
            value={points}
            onChange={(e) => setPoints(parseFloat(e.target.value) || 1)}
            className="w-24"
          />
        </div>

        {/* Explanation */}
        <div className="space-y-2">
          <Label>{t("questionBuilder.explanation")}</Label>
          <Textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder={t("questionBuilder.explainWhy")}
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("questionBuilder.cancel")}
            </Button>
          )}
          <Button onClick={handleSave} disabled={!questionText.trim()}>
            {initialData ? t("questionBuilder.updateQuestion") : t("questionBuilder.addQuestion")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
