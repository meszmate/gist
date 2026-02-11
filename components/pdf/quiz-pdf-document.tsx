import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles, paperSizes, type PaperSize } from "./pdf-styles";
import {
  getPdfQuestionRenderer,
  getAnswerText,
} from "./pdf-question-renderers";
import type {
  QuestionConfig,
  CorrectAnswerData,
  QuestionTypeSlug,
} from "@/lib/types/quiz";

export interface QuizQuestion {
  id: string;
  question: string;
  questionType: QuestionTypeSlug;
  questionConfig: QuestionConfig;
  correctAnswerData: CorrectAnswerData | null;
  points: string;
  order: number | null;
  explanation: string | null;
}

export interface PdfExportOptions {
  includeAnswerKey: boolean;
  showPointValues: boolean;
  answerKeyOnSeparatePage: boolean;
  paperSize: PaperSize;
}

export interface PdfTranslations {
  name: string;
  date: string;
  instructions: string;
  instructionsText: string;
  pointsSuffix: string;
  pt: string;
  pts: string;
  page: string;
  answerKey: string;
  selectAllApply: string;
  noAnswerProvided: string;
  answer: string;
  year: string;
  trueLabel: string;
  falseLabel: string;
  blankAnswer: string;
}

interface QuizPdfDocumentProps {
  title: string;
  description?: string;
  questions: QuizQuestion[];
  options: PdfExportOptions;
  translations: PdfTranslations;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? key));
}

export function QuizPdfDocument({
  title,
  description,
  questions,
  options,
  translations,
}: QuizPdfDocumentProps) {
  const { includeAnswerKey, showPointValues, answerKeyOnSeparatePage, paperSize } =
    options;

  const pageSize = paperSizes[paperSize];

  return (
    <Document>
      {/* Quiz Pages */}
      <Page size={[pageSize.width, pageSize.height]} style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>{title}</Text>
          {description && (
            <Text style={pdfStyles.description}>{description}</Text>
          )}

          {/* Name and Date */}
          <View style={pdfStyles.infoRow}>
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              <Text style={pdfStyles.infoLabel}>{translations.name}</Text>
              <View style={pdfStyles.infoLine} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              <Text style={pdfStyles.infoLabel}>{translations.date}</Text>
              <View style={[pdfStyles.infoLine, { width: 120 }]} />
            </View>
          </View>

          {/* Instructions */}
          <View style={pdfStyles.instructions}>
            <Text style={pdfStyles.instructionsTitle}>{translations.instructions}</Text>
            <Text style={pdfStyles.instructionsText}>
              {translations.instructionsText}
              {showPointValues && ` ${translations.pointsSuffix}`}
            </Text>
          </View>
        </View>

        {/* Questions */}
        {questions.map((question, index) => {
          const PdfRenderer = getPdfQuestionRenderer(question.questionType);

          return (
            <View
              key={question.id}
              style={pdfStyles.questionContainer}
              wrap={false}
            >
              <View style={pdfStyles.questionHeader}>
                <View style={{ flexDirection: "row", flex: 1 }}>
                  <Text style={pdfStyles.questionNumber}>{index + 1}.</Text>
                  <Text style={pdfStyles.questionText}>{question.question}</Text>
                </View>
                {showPointValues && (
                  <Text style={pdfStyles.pointsBadge}>
                    {parseFloat(question.points || "1")} {parseFloat(question.points || "1") !== 1 ? translations.pts : translations.pt}
                  </Text>
                )}
              </View>

              {PdfRenderer && (
                <PdfRenderer
                  config={question.questionConfig}
                  correctAnswerData={question.correctAnswerData}
                  showAnswerKey={includeAnswerKey && !answerKeyOnSeparatePage}
                  translations={translations}
                />
              )}
            </View>
          );
        })}

        {/* Page number */}
        <Text
          style={pdfStyles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            interpolate(translations.page, { current: pageNumber, total: totalPages })
          }
          fixed
        />
      </Page>

      {/* Answer Key Page (if enabled and on separate page) */}
      {includeAnswerKey && answerKeyOnSeparatePage && (
        <Page
          size={[pageSize.width, pageSize.height]}
          style={pdfStyles.answerKeyPage}
        >
          <Text style={pdfStyles.answerKeyTitle}>{translations.answerKey} - {title}</Text>

          {questions.map((question, index) => (
            <View key={question.id} style={pdfStyles.answerKeyItem} wrap={false}>
              <Text style={pdfStyles.answerKeyNumber}>{index + 1}.</Text>
              <View style={pdfStyles.answerKeyContent}>
                <Text style={pdfStyles.answerKeyAnswer}>
                  {getAnswerText(
                    question.questionType,
                    question.questionConfig,
                    question.correctAnswerData,
                    translations
                  )}
                </Text>
                {question.explanation && (
                  <Text style={pdfStyles.answerKeyExplanation}>
                    {question.explanation}
                  </Text>
                )}
              </View>
            </View>
          ))}

          {/* Page number */}
          <Text
            style={pdfStyles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              interpolate(translations.page, { current: pageNumber, total: totalPages })
            }
            fixed
          />
        </Page>
      )}
    </Document>
  );
}
