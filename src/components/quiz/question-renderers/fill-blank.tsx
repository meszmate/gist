"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import type { QuestionRendererProps, ResultRendererProps } from "./types";
import type { FillBlankConfig, FillBlankAnswer, FillBlankUserAnswer } from "@/lib/types/quiz";

interface ParsedTemplate {
  type: 'text' | 'blank';
  content: string;
  blankId?: string;
}

function parseTemplate(template: string, blanks: FillBlankConfig['blanks']): ParsedTemplate[] {
  const parts: ParsedTemplate[] = [];
  let currentIndex = 0;
  let blankIndex = 0;

  const regex = /\{\{blank\}\}/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    // Add text before the blank
    if (match.index > currentIndex) {
      parts.push({
        type: 'text',
        content: template.slice(currentIndex, match.index),
      });
    }

    // Add the blank
    const blankDef = blanks[blankIndex];
    parts.push({
      type: 'blank',
      content: '',
      blankId: blankDef?.id || `blank_${blankIndex}`,
    });

    currentIndex = match.index + match[0].length;
    blankIndex++;
  }

  // Add remaining text
  if (currentIndex < template.length) {
    parts.push({
      type: 'text',
      content: template.slice(currentIndex),
    });
  }

  return parts;
}

export function FillBlankRenderer({
  config,
  userAnswer,
  onAnswer,
  disabled,
  showResult,
  correctAnswerData,
}: QuestionRendererProps) {
  const fillConfig = config as FillBlankConfig;
  const template = fillConfig.template || '';
  const blanks = fillConfig.blanks || [];
  const correctBlanks = (correctAnswerData as FillBlankAnswer)?.blanks || {};

  const parsedTemplate = useMemo(
    () => parseTemplate(template, blanks),
    [template, blanks]
  );

  const currentValues = (userAnswer as FillBlankUserAnswer)?.blanks || {};
  const [values, setValues] = useState<Record<string, string>>(currentValues);

  useEffect(() => {
    setValues(currentValues);
  }, [JSON.stringify(currentValues)]);

  const handleChange = (blankId: string, value: string) => {
    if (disabled) return;

    const newValues = { ...values, [blankId]: value };
    setValues(newValues);
    onAnswer({ blanks: newValues });
  };

  const checkBlankCorrect = (blankId: string): boolean | null => {
    if (!showResult) return null;

    const userValue = values[blankId]?.trim() || '';
    const acceptedAnswers = correctBlanks[blankId] || [];

    const normalize = (str: string) => {
      let result = str.trim();
      if (!fillConfig.caseSensitive) {
        result = result.toLowerCase();
      }
      return result;
    };

    return acceptedAnswers.some(answer => normalize(answer) === normalize(userValue));
  };

  return (
    <div className="space-y-4">
      <div className="text-lg leading-relaxed flex flex-wrap items-center gap-1">
        {parsedTemplate.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index}>{part.content}</span>;
          }

          const blankId = part.blankId!;
          const isCorrect = checkBlankCorrect(blankId);

          return (
            <span key={index} className="inline-flex items-center gap-1">
              <Input
                type="text"
                value={values[blankId] || ''}
                onChange={(e) => handleChange(blankId, e.target.value)}
                disabled={disabled}
                placeholder="..."
                className={cn(
                  "w-32 inline-flex h-8 text-center",
                  showResult && isCorrect === true && "border-green-500 bg-green-500/10",
                  showResult && isCorrect === false && "border-red-500 bg-red-500/10"
                )}
              />
              {showResult && isCorrect === true && (
                <Check className="h-4 w-4 text-green-500" />
              )}
              {showResult && isCorrect === false && (
                <X className="h-4 w-4 text-red-500" />
              )}
            </span>
          );
        })}
      </div>

      {showResult && (
        <div className="text-sm text-muted-foreground">
          {Object.entries(values).filter(([id]) => checkBlankCorrect(id)).length} of {blanks.length} blanks correct
        </div>
      )}
    </div>
  );
}

export function FillBlankResultRenderer({
  config,
  correctAnswerData,
  userAnswer,
  creditPercent,
  explanation,
}: ResultRendererProps) {
  const fillConfig = config as FillBlankConfig;
  const template = fillConfig.template || '';
  const blanks = fillConfig.blanks || [];
  const correctBlanks = (correctAnswerData as FillBlankAnswer)?.blanks || {};
  const userBlanks = (userAnswer as FillBlankUserAnswer)?.blanks || {};

  const parsedTemplate = useMemo(
    () => parseTemplate(template, blanks),
    [template, blanks]
  );

  const normalize = (str: string) => {
    let result = str.trim();
    if (!fillConfig.caseSensitive) {
      result = result.toLowerCase();
    }
    return result;
  };

  const checkBlankCorrect = (blankId: string): boolean => {
    const userValue = userBlanks[blankId]?.trim() || '';
    const acceptedAnswers = correctBlanks[blankId] || [];
    return acceptedAnswers.some(answer => normalize(answer) === normalize(userValue));
  };

  return (
    <div className="space-y-4">
      <div className="text-lg leading-relaxed">
        {parsedTemplate.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index}>{part.content}</span>;
          }

          const blankId = part.blankId!;
          const userValue = userBlanks[blankId] || '';
          const isCorrect = checkBlankCorrect(blankId);
          const acceptedAnswers = correctBlanks[blankId] || [];

          return (
            <span
              key={index}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded mx-1",
                isCorrect ? "bg-green-500/20" : "bg-red-500/20"
              )}
            >
              <span className={cn(
                "font-medium",
                isCorrect ? "text-green-700" : "text-red-700 line-through"
              )}>
                {userValue || <em className="text-muted-foreground">blank</em>}
              </span>
              {!isCorrect && (
                <span className="text-green-700 font-medium">
                  ({acceptedAnswers[0]})
                </span>
              )}
              {isCorrect ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
            </span>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Accepted answers for each blank:</div>
        <div className="grid gap-2">
          {blanks.map((blank, index) => (
            <div key={blank.id} className="flex items-center gap-2 text-sm">
              <Badge variant="outline">Blank {index + 1}</Badge>
              <div className="flex flex-wrap gap-1">
                {correctBlanks[blank.id]?.map((answer, i) => (
                  <Badge key={i} variant="secondary" className="bg-green-500/20">
                    {answer}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Score:</span>
        <Badge variant={creditPercent === 100 ? "default" : "secondary"}>
          {creditPercent.toFixed(0)}%
        </Badge>
      </div>

      {explanation && (
        <p className="text-sm text-muted-foreground pt-3 border-t">
          <strong>Explanation:</strong> {explanation}
        </p>
      )}
    </div>
  );
}
