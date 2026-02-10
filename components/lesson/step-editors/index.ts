import type { StepType } from "@/lib/types/lesson";
import type { StepEditorProps } from "./types";
import { ExplanationEditor } from "./explanation-editor";
import { ConceptEditor } from "./concept-editor";
import { MultipleChoiceEditor } from "./multiple-choice-editor";
import { TrueFalseEditor } from "./true-false-editor";
import { DragSortEditor } from "./drag-sort-editor";
import { DragMatchEditor } from "./drag-match-editor";
import { DragCategorizeEditor } from "./drag-categorize-editor";
import { FillBlanksEditor } from "./fill-blanks-editor";
import { TypeAnswerEditor } from "./type-answer-editor";
import { SelectManyEditor } from "./select-many-editor";
import { RevealEditor } from "./reveal-editor";

type EditorComponent = React.ComponentType<StepEditorProps>;

export const STEP_EDITORS: Record<StepType, EditorComponent> = {
  explanation: ExplanationEditor,
  concept: ConceptEditor,
  multiple_choice: MultipleChoiceEditor,
  true_false: TrueFalseEditor,
  drag_sort: DragSortEditor,
  drag_match: DragMatchEditor,
  drag_categorize: DragCategorizeEditor,
  fill_blanks: FillBlanksEditor,
  type_answer: TypeAnswerEditor,
  select_many: SelectManyEditor,
  reveal: RevealEditor,
};

export function getStepEditor(type: StepType): EditorComponent {
  return STEP_EDITORS[type] || ExplanationEditor;
}

export type { StepEditorProps };
