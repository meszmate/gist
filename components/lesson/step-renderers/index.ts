import type { StepType } from "@/lib/types/lesson";
import type { StepRendererProps } from "./types";
import { ExplanationRenderer } from "./explanation-renderer";
import { ConceptRenderer } from "./concept-renderer";
import { MultipleChoiceRenderer } from "./multiple-choice-renderer";
import { TrueFalseRenderer } from "./true-false-renderer";
import { DragSortRenderer } from "./drag-sort-renderer";
import { DragMatchRenderer } from "./drag-match-renderer";
import { DragCategorizeRenderer } from "./drag-categorize-renderer";
import { FillBlanksRenderer } from "./fill-blanks-renderer";
import { TypeAnswerRenderer } from "./type-answer-renderer";
import { SelectManyRenderer } from "./select-many-renderer";
import { RevealRenderer } from "./reveal-renderer";

type RendererComponent = React.ComponentType<StepRendererProps>;

export const STEP_RENDERERS: Record<StepType, RendererComponent> = {
  explanation: ExplanationRenderer,
  concept: ConceptRenderer,
  multiple_choice: MultipleChoiceRenderer,
  true_false: TrueFalseRenderer,
  drag_sort: DragSortRenderer,
  drag_match: DragMatchRenderer,
  drag_categorize: DragCategorizeRenderer,
  fill_blanks: FillBlanksRenderer,
  type_answer: TypeAnswerRenderer,
  select_many: SelectManyRenderer,
  reveal: RevealRenderer,
};

export function getStepRenderer(type: StepType): RendererComponent {
  return STEP_RENDERERS[type] || ExplanationRenderer;
}

export type { StepRendererProps };
