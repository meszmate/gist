import { View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./pdf-styles";
import type { PdfTranslations } from "./quiz-pdf-document";
import type {
  QuestionConfig,
  CorrectAnswerData,
  MultipleChoiceConfig,
  MultipleChoiceAnswer,
  TrueFalseConfig,
  TrueFalseAnswer,
  TextInputAnswer,
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

export interface PdfQuestionRendererProps {
  config: QuestionConfig;
  correctAnswerData: CorrectAnswerData | null;
  showAnswerKey?: boolean;
  translations: PdfTranslations;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? key));
}

// Multiple Choice
function MultipleChoicePdfRenderer({
  config,
  correctAnswerData,
  showAnswerKey,
}: PdfQuestionRendererProps) {
  const mcConfig = config as MultipleChoiceConfig;
  const options = mcConfig.options || [];
  const correctIndex = showAnswerKey
    ? (correctAnswerData as MultipleChoiceAnswer)?.correctIndex
    : undefined;

  return (
    <View>
      {options.map((option, index) => (
        <View key={index} style={pdfStyles.optionRow}>
          <View style={pdfStyles.optionCircle} />
          <Text style={pdfStyles.optionLetter}>
            {String.fromCharCode(65 + index)}.
          </Text>
          <Text style={pdfStyles.optionText}>
            {option}
            {showAnswerKey && correctIndex === index && " ✓"}
          </Text>
        </View>
      ))}
    </View>
  );
}

// True/False
function TrueFalsePdfRenderer({
  config,
  correctAnswerData,
  showAnswerKey,
  translations,
}: PdfQuestionRendererProps) {
  const tfConfig = config as TrueFalseConfig;
  const trueLabel = tfConfig.trueLabel || translations.trueLabel;
  const falseLabel = tfConfig.falseLabel || translations.falseLabel;
  const correctValue = showAnswerKey
    ? (correctAnswerData as TrueFalseAnswer)?.correctValue
    : undefined;

  return (
    <View style={pdfStyles.trueFalseRow}>
      <View style={pdfStyles.trueFalseOption}>
        <View style={pdfStyles.checkbox} />
        <Text style={pdfStyles.optionText}>
          {trueLabel}
          {showAnswerKey && correctValue === true && " ✓"}
        </Text>
      </View>
      <View style={pdfStyles.trueFalseOption}>
        <View style={pdfStyles.checkbox} />
        <Text style={pdfStyles.optionText}>
          {falseLabel}
          {showAnswerKey && correctValue === false && " ✓"}
        </Text>
      </View>
    </View>
  );
}

// Text Input
function TextInputPdfRenderer({
  correctAnswerData,
  showAnswerKey,
  translations,
}: PdfQuestionRendererProps) {
  const answer = showAnswerKey
    ? (correctAnswerData as TextInputAnswer)?.acceptedAnswers?.[0]
    : undefined;

  return (
    <View style={pdfStyles.answerLines}>
      {showAnswerKey && answer ? (
        <Text style={{ fontSize: 10, color: "#333" }}>{translations.answer} {answer}</Text>
      ) : (
        <>
          <View style={pdfStyles.answerLine} />
          <View style={pdfStyles.answerLine} />
          <View style={pdfStyles.answerLine} />
        </>
      )}
    </View>
  );
}

// Year Range
function YearRangePdfRenderer({
  correctAnswerData,
  showAnswerKey,
  translations,
}: PdfQuestionRendererProps) {
  const answer = showAnswerKey
    ? (correctAnswerData as YearRangeAnswer)?.correctYear
    : undefined;

  return (
    <View style={pdfStyles.shortAnswerRow}>
      <Text style={pdfStyles.infoLabel}>{translations.year} </Text>
      {showAnswerKey && answer ? (
        <Text style={{ fontSize: 11 }}>{answer}</Text>
      ) : (
        <View style={pdfStyles.shortAnswerLine} />
      )}
    </View>
  );
}

// Numeric Range
function NumericRangePdfRenderer({
  config,
  correctAnswerData,
  showAnswerKey,
}: PdfQuestionRendererProps) {
  const nrConfig = config as NumericRangeConfig;
  const answer = showAnswerKey
    ? (correctAnswerData as NumericRangeAnswer)?.correctValue
    : undefined;

  return (
    <View style={pdfStyles.shortAnswerRow}>
      {showAnswerKey && answer !== undefined ? (
        <Text style={{ fontSize: 11 }}>
          {answer}
          {nrConfig.unit && ` ${nrConfig.unit}`}
        </Text>
      ) : (
        <>
          <View style={pdfStyles.shortAnswerLine} />
          {nrConfig.unit && (
            <Text style={pdfStyles.unitLabel}>{nrConfig.unit}</Text>
          )}
        </>
      )}
    </View>
  );
}

// Matching
function MatchingPdfRenderer({
  config,
  correctAnswerData,
  showAnswerKey,
}: PdfQuestionRendererProps) {
  const matchConfig = config as MatchingConfig;
  const leftColumn = matchConfig.leftColumn || [];
  const rightColumn = matchConfig.rightColumn || [];
  const correctPairs = showAnswerKey
    ? (correctAnswerData as MatchingAnswer)?.correctPairs || {}
    : {};

  // Create letter labels for right column
  const rightLabels = rightColumn.map((_, i) => String.fromCharCode(65 + i));

  return (
    <View style={pdfStyles.matchingContainer}>
      <View style={pdfStyles.matchingHeaders}>
        <Text style={pdfStyles.matchingHeader}>
          {matchConfig.leftColumnLabel || "Item"}
        </Text>
        <Text style={[pdfStyles.matchingHeader, { width: 40 }]}>Match</Text>
        <Text style={pdfStyles.matchingHeader}>
          {matchConfig.rightColumnLabel || "Options"}
        </Text>
      </View>

      {leftColumn.map((leftItem, index) => {
        const correctMatch = correctPairs[leftItem];
        const correctIndex = rightColumn.indexOf(correctMatch);
        const correctLetter =
          correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : "";

        return (
          <View key={index} style={pdfStyles.matchingRow}>
            <Text style={pdfStyles.matchingLeft}>
              {index + 1}. {leftItem}
            </Text>
            {showAnswerKey ? (
              <Text style={[pdfStyles.matchingBlank, { fontSize: 10 }]}>
                {correctLetter}
              </Text>
            ) : (
              <View style={pdfStyles.matchingBlank} />
            )}
            <Text style={pdfStyles.matchingRight}>
              {rightLabels[index]}. {rightColumn[index]}
            </Text>
          </View>
        );
      })}

      {!showAnswerKey && rightColumn.length > leftColumn.length && (
        <View style={{ marginTop: 4 }}>
          {rightColumn.slice(leftColumn.length).map((item, i) => (
            <Text key={i} style={pdfStyles.matchingRight}>
              {rightLabels[leftColumn.length + i]}. {item}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// Fill in the Blank
function FillBlankPdfRenderer({
  config,
  correctAnswerData,
  showAnswerKey,
}: PdfQuestionRendererProps) {
  const fbConfig = config as FillBlankConfig;
  const template = fbConfig.template || "";
  const blanks = fbConfig.blanks || [];
  const correctBlanks = showAnswerKey
    ? (correctAnswerData as FillBlankAnswer)?.blanks || {}
    : {};

  // Parse template and replace blanks
  const parts: { type: "text" | "blank"; content: string; blankId?: string }[] =
    [];
  let currentIndex = 0;
  let blankIndex = 0;
  const regex = /\{\{blank\}\}/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (match.index > currentIndex) {
      parts.push({
        type: "text",
        content: template.slice(currentIndex, match.index),
      });
    }

    const blankDef = blanks[blankIndex];
    parts.push({
      type: "blank",
      content: "",
      blankId: blankDef?.id || `blank_${blankIndex}`,
    });

    currentIndex = match.index + match[0].length;
    blankIndex++;
  }

  if (currentIndex < template.length) {
    parts.push({
      type: "text",
      content: template.slice(currentIndex),
    });
  }

  return (
    <View style={pdfStyles.fillBlankText}>
      <Text>
        {parts.map((part) => {
          if (part.type === "text") {
            return part.content;
          }

          const blankId = part.blankId!;
          const answer = correctBlanks[blankId]?.[0];

          if (showAnswerKey && answer) {
            return `[${answer}]`;
          }

          return "____________";
        })}
      </Text>
    </View>
  );
}

// Multi-Select
function MultiSelectPdfRenderer({
  config,
  correctAnswerData,
  showAnswerKey,
  translations,
}: PdfQuestionRendererProps) {
  const msConfig = config as MultiSelectConfig;
  const options = msConfig.options || [];
  const correctIndices = showAnswerKey
    ? (correctAnswerData as MultiSelectAnswer)?.correctIndices || []
    : [];

  return (
    <View>
      <Text
        style={{
          fontSize: 9,
          color: "#666",
          marginLeft: 16,
          marginBottom: 6,
          fontStyle: "italic",
        }}
      >
        {translations.selectAllApply}
      </Text>
      {options.map((option, index) => (
        <View key={index} style={pdfStyles.optionRow}>
          <View style={pdfStyles.checkbox} />
          <Text style={pdfStyles.optionLetter}>
            {String.fromCharCode(65 + index)}.
          </Text>
          <Text style={pdfStyles.optionText}>
            {option}
            {showAnswerKey && correctIndices.includes(index) && " ✓"}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Registry of PDF renderers
export const pdfQuestionRenderers: Record<
  string,
  React.FC<PdfQuestionRendererProps>
> = {
  multiple_choice: MultipleChoicePdfRenderer,
  true_false: TrueFalsePdfRenderer,
  text_input: TextInputPdfRenderer,
  year_range: YearRangePdfRenderer,
  numeric_range: NumericRangePdfRenderer,
  matching: MatchingPdfRenderer,
  fill_blank: FillBlankPdfRenderer,
  multi_select: MultiSelectPdfRenderer,
};

// Get PDF renderer for a question type
export function getPdfQuestionRenderer(
  questionType: string
): React.FC<PdfQuestionRendererProps> | null {
  return pdfQuestionRenderers[questionType] || null;
}

// Get answer text for answer key
export function getAnswerText(
  questionType: string,
  config: QuestionConfig,
  correctAnswerData: CorrectAnswerData | null,
  translations: PdfTranslations
): string {
  if (!correctAnswerData) return translations.noAnswerProvided;

  switch (questionType) {
    case "multiple_choice": {
      const mcConfig = config as MultipleChoiceConfig;
      const mcAnswer = correctAnswerData as MultipleChoiceAnswer;
      const option = mcConfig.options?.[mcAnswer.correctIndex];
      return option
        ? `${String.fromCharCode(65 + mcAnswer.correctIndex)}. ${option}`
        : "N/A";
    }
    case "true_false": {
      const tfConfig = config as TrueFalseConfig;
      const tfAnswer = correctAnswerData as TrueFalseAnswer;
      return tfAnswer.correctValue
        ? tfConfig.trueLabel || translations.trueLabel
        : tfConfig.falseLabel || translations.falseLabel;
    }
    case "text_input": {
      const tiAnswer = correctAnswerData as TextInputAnswer;
      return tiAnswer.acceptedAnswers?.join(", ") || "N/A";
    }
    case "year_range": {
      const yrAnswer = correctAnswerData as YearRangeAnswer;
      return String(yrAnswer.correctYear);
    }
    case "numeric_range": {
      const nrConfig = config as NumericRangeConfig;
      const nrAnswer = correctAnswerData as NumericRangeAnswer;
      return `${nrAnswer.correctValue}${nrConfig.unit ? ` ${nrConfig.unit}` : ""}`;
    }
    case "matching": {
      const mAnswer = correctAnswerData as MatchingAnswer;
      const pairs = mAnswer.correctPairs || {};
      return Object.entries(pairs)
        .map(([left, right]) => `${left} → ${right}`)
        .join("; ");
    }
    case "fill_blank": {
      const fbAnswer = correctAnswerData as FillBlankAnswer;
      const blanks = fbAnswer.blanks || {};
      return Object.entries(blanks)
        .map(([, answers], i) => interpolate(translations.blankAnswer, { index: i + 1, answer: answers[0] }))
        .join("; ");
    }
    case "multi_select": {
      const msConfig = config as MultiSelectConfig;
      const msAnswer = correctAnswerData as MultiSelectAnswer;
      return (
        msAnswer.correctIndices
          ?.map(
            (i) =>
              `${String.fromCharCode(65 + i)}. ${msConfig.options?.[i] || ""}`
          )
          .join(", ") || "N/A"
      );
    }
    default:
      return "N/A";
  }
}
