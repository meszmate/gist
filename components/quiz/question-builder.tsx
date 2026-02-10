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

const QUESTION_TYPES: { value: QuestionTypeSlug; label: string; description: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'Select one correct answer from options' },
  { value: 'true_false', label: 'True/False', description: 'Binary true or false question' },
  { value: 'text_input', label: 'Text Input', description: 'Free text answer with keyword matching' },
  { value: 'year_range', label: 'Year', description: 'Enter a year with tolerance' },
  { value: 'numeric_range', label: 'Numeric', description: 'Enter a number with tolerance' },
  { value: 'matching', label: 'Matching', description: 'Match items from two columns' },
  { value: 'fill_blank', label: 'Fill in the Blank', description: 'Complete sentences with blanks' },
  { value: 'multi_select', label: 'Multi-Select', description: 'Select all correct answers' },
];

export function QuestionBuilder({ onSave, onCancel, initialData }: QuestionBuilderProps) {
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
  const [fillBlankAnswers, setFillBlankAnswers] = useState<Record<string, string[]>>(
    (initialData?.correctAnswerData as FillBlankAnswer)?.blanks || {}
  );

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
        const blankCount = (fillBlankTemplate.match(/\{\{blank\}\}/g) || []).length;
        const blanks: FillBlankConfig['blanks'] = [];
        for (let i = 0; i < blankCount; i++) {
          blanks.push({ id: `blank_${i}`, acceptedAnswers: fillBlankAnswers[`blank_${i}`] || [] });
        }
        config = { template: fillBlankTemplate, blanks } as FillBlankConfig;
        correctAnswer = { blanks: fillBlankAnswers } as FillBlankAnswer;
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
            <Label>Answer Options</Label>
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
                  placeholder={`Option ${index + 1}`}
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
                Add Option
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              Click the number to mark the correct answer
            </p>
          </div>
        );

      case 'true_false':
        return (
          <div className="space-y-4">
            <Label>Correct Answer</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={tfCorrect ? "default" : "outline"}
                onClick={() => setTfCorrect(true)}
              >
                True
              </Button>
              <Button
                type="button"
                variant={!tfCorrect ? "default" : "outline"}
                onClick={() => setTfCorrect(false)}
              >
                False
              </Button>
            </div>
          </div>
        );

      case 'text_input':
        return (
          <div className="space-y-4">
            <div>
              <Label>Accepted Answers</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Add all variations of correct answers
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
                    placeholder="Accepted answer"
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
                Add Answer
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={textCaseSensitive}
                onCheckedChange={setTextCaseSensitive}
              />
              <Label>Case Sensitive</Label>
            </div>
          </div>
        );

      case 'year_range':
        return (
          <div className="space-y-4">
            <div>
              <Label>Correct Year</Label>
              <Input
                type="number"
                value={yearCorrect}
                onChange={(e) => setYearCorrect(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Tolerance (years for partial credit)</Label>
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
              <Label>Correct Value</Label>
              <Input
                type="number"
                step="any"
                value={numericCorrect}
                onChange={(e) => setNumericCorrect(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Tolerance (for partial credit)</Label>
              <Input
                type="number"
                step="any"
                min={0}
                value={numericTolerance}
                onChange={(e) => setNumericTolerance(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Unit (optional)</Label>
              <Input
                value={numericUnit}
                onChange={(e) => setNumericUnit(e.target.value)}
                placeholder="e.g., kg, m, $"
              />
            </div>
          </div>
        );

      case 'matching':
        return (
          <div className="space-y-4">
            <Label>Matching Pairs</Label>
            <p className="text-sm text-muted-foreground">
              Enter items to match. The order defines correct pairs.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="font-medium text-sm">Left Column</div>
              <div className="font-medium text-sm">Right Column</div>
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
                  placeholder={`Item ${index + 1}`}
                />
                <div className="flex gap-2">
                  <Input
                    value={matchingRight[index] || ''}
                    onChange={(e) => {
                      const newRight = [...matchingRight];
                      newRight[index] = e.target.value;
                      setMatchingRight(newRight);
                    }}
                    placeholder={`Match ${index + 1}`}
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
              Add Pair
            </Button>
          </div>
        );

      case 'fill_blank':
        const blankCount = (fillBlankTemplate.match(/\{\{blank\}\}/g) || []).length;
        return (
          <div className="space-y-4">
            <div>
              <Label>Template</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {"Use {{blank}} to create blanks. Example: The capital of France is {{blank}}."}
              </p>
              <Textarea
                value={fillBlankTemplate}
                onChange={(e) => setFillBlankTemplate(e.target.value)}
                placeholder="Enter text with {{blank}} placeholders..."
                rows={3}
              />
            </div>
            {blankCount > 0 && (
              <div className="space-y-3">
                <Label>Accepted Answers for Each Blank</Label>
                {Array.from({ length: blankCount }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Label className="text-sm">Blank {index + 1}</Label>
                    <Input
                      value={(fillBlankAnswers[`blank_${index}`] || []).join(', ')}
                      onChange={(e) => {
                        setFillBlankAnswers({
                          ...fillBlankAnswers,
                          [`blank_${index}`]: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                        });
                      }}
                      placeholder="Separate multiple answers with commas"
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
            <Label>Answer Options</Label>
            <p className="text-sm text-muted-foreground">
              Check all correct answers
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
                  placeholder={`Option ${index + 1}`}
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
                Add Option
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
        <CardTitle>{initialData ? 'Edit Question' : 'Create Question'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question Type */}
        <div className="space-y-2">
          <Label>Question Type</Label>
          <Select
            value={questionType}
            onValueChange={(value) => setQuestionType(value as QuestionTypeSlug)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col">
                    <span>{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Question Text */}
        <div className="space-y-2">
          <Label>Question</Label>
          <Textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Enter your question..."
            rows={3}
          />
        </div>

        {/* Type-specific fields */}
        {renderTypeSpecificFields()}

        {/* Points */}
        <div className="space-y-2">
          <Label>Points</Label>
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
          <Label>Explanation (Optional)</Label>
          <Textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explain why this answer is correct..."
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={!questionText.trim()}>
            {initialData ? 'Update Question' : 'Add Question'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
