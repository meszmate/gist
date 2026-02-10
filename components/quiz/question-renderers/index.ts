export * from './types';
export * from './multiple-choice';
export * from './true-false';
export * from './text-input';
export * from './year-range';
export * from './numeric-range';
export * from './matching';
export * from './fill-blank';
export * from './multi-select';

import type { QuestionTypeSlug } from '@/lib/types/quiz';
import type { QuestionRendererProps, ResultRendererProps } from './types';

import { MultipleChoiceRenderer, MultipleChoiceResultRenderer } from './multiple-choice';
import { TrueFalseRenderer, TrueFalseResultRenderer } from './true-false';
import { TextInputRenderer, TextInputResultRenderer } from './text-input';
import { YearRangeRenderer, YearRangeResultRenderer } from './year-range';
import { NumericRangeRenderer, NumericRangeResultRenderer } from './numeric-range';
import { MatchingRenderer, MatchingResultRenderer } from './matching';
import { FillBlankRenderer, FillBlankResultRenderer } from './fill-blank';
import { MultiSelectRenderer, MultiSelectResultRenderer } from './multi-select';

type RendererComponent = React.FC<QuestionRendererProps>;
type ResultRendererComponent = React.FC<ResultRendererProps>;

// Registry of question renderers
export const questionRenderers: Record<string, RendererComponent> = {
  multiple_choice: MultipleChoiceRenderer,
  true_false: TrueFalseRenderer,
  text_input: TextInputRenderer,
  year_range: YearRangeRenderer,
  numeric_range: NumericRangeRenderer,
  matching: MatchingRenderer,
  fill_blank: FillBlankRenderer,
  multi_select: MultiSelectRenderer,
};

// Registry of result renderers
export const resultRenderers: Record<string, ResultRendererComponent> = {
  multiple_choice: MultipleChoiceResultRenderer,
  true_false: TrueFalseResultRenderer,
  text_input: TextInputResultRenderer,
  year_range: YearRangeResultRenderer,
  numeric_range: NumericRangeResultRenderer,
  matching: MatchingResultRenderer,
  fill_blank: FillBlankResultRenderer,
  multi_select: MultiSelectResultRenderer,
};

// Get renderer for a question type
export function getQuestionRenderer(questionType: QuestionTypeSlug): RendererComponent | null {
  return questionRenderers[questionType] || null;
}

// Get result renderer for a question type
export function getResultRenderer(questionType: QuestionTypeSlug): ResultRendererComponent | null {
  return resultRenderers[questionType] || null;
}
