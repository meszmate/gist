"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Download, Loader2, FileText, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/hooks/use-locale";
import {
  QuizPdfDocument,
  type QuizQuestion,
  type PdfExportOptions,
  type PdfTranslations,
} from "./quiz-pdf-document";
import type { PaperSize } from "./pdf-styles";

// Dynamically import PDFDownloadLink and PDFViewer to avoid SSR issues
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

interface QuizPdfPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  quizId: string;
}

export function QuizPdfPreview({
  open,
  onOpenChange,
  title,
  description,
  questions,
  quizId,
}: QuizPdfPreviewProps) {
  const { t } = useLocale();
  const [options, setOptions] = useState<PdfExportOptions>({
    includeAnswerKey: false,
    showPointValues: true,
    answerKeyOnSeparatePage: true,
    paperSize: "letter",
  });

  // Ensure we're on client side before rendering PDF components
  const emptySubscribe = useCallback(() => () => {}, []);
  const getClientSnapshot = useCallback(() => true, []);
  const getServerSnapshot = useCallback(() => false, []);
  const isClient = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  const updateOption = useCallback(
    <K extends keyof PdfExportOptions>(key: K, value: PdfExportOptions[K]) => {
      setOptions((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const sanitizedTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 50);
  const fileName = `${sanitizedTitle || "quiz"}-${quizId.slice(0, 8)}.pdf`;

  // Build translations object for PDF components (which can't access React context)
  const pdfTranslations: PdfTranslations = {
    name: t("pdfExport.name"),
    date: t("pdfExport.date"),
    instructions: t("pdfExport.instructions"),
    instructionsText: t("pdfExport.instructionsText"),
    pointsSuffix: t("pdfExport.pointsSuffix"),
    pt: t("pdfExport.pt"),
    pts: t("pdfExport.pts"),
    page: t("pdfExport.page", { current: "{current}", total: "{total}" }),
    answerKey: t("pdfExport.answerKey"),
    selectAllApply: t("pdfExport.selectAllApply"),
    noAnswerProvided: t("pdfExport.noAnswerProvided"),
    answer: t("pdfExport.answer"),
    year: t("pdfExport.year"),
    trueLabel: t("quizRenderer.true"),
    falseLabel: t("quizRenderer.false"),
    blankAnswer: t("pdfExport.blankAnswer", { index: "{index}", answer: "{answer}" }),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("pdfExport.preview")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Options Sidebar */}
          <div className="w-64 shrink-0 space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4" />
              {t("pdfExport.exportOptions")}
            </div>

            <Separator />

            {/* Paper Size */}
            <div className="space-y-2">
              <Label className="text-sm">{t("pdfExport.paperSize")}</Label>
              <Select
                value={options.paperSize}
                onValueChange={(value: PaperSize) =>
                  updateOption("paperSize", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">{t("pdfExport.usLetter")}</SelectItem>
                  <SelectItem value="a4">{t("pdfExport.a4")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Show Point Values */}
            <div className="flex items-center justify-between">
              <Label htmlFor="showPoints" className="text-sm cursor-pointer">
                {t("pdfExport.showPoints")}
              </Label>
              <Switch
                id="showPoints"
                checked={options.showPointValues}
                onCheckedChange={(checked) =>
                  updateOption("showPointValues", checked)
                }
              />
            </div>

            {/* Include Answer Key */}
            <div className="flex items-center justify-between">
              <Label htmlFor="answerKey" className="text-sm cursor-pointer">
                {t("pdfExport.includeAnswerKey")}
              </Label>
              <Switch
                id="answerKey"
                checked={options.includeAnswerKey}
                onCheckedChange={(checked) =>
                  updateOption("includeAnswerKey", checked)
                }
              />
            </div>

            {/* Answer Key on Separate Page */}
            {options.includeAnswerKey && (
              <div className="flex items-center justify-between pl-4">
                <Label htmlFor="separatePage" className="text-sm cursor-pointer">
                  {t("pdfExport.separatePage")}
                </Label>
                <Switch
                  id="separatePage"
                  checked={options.answerKeyOnSeparatePage}
                  onCheckedChange={(checked) =>
                    updateOption("answerKeyOnSeparatePage", checked)
                  }
                />
              </div>
            )}

            <Separator />

            {/* Download Button */}
            <div className="pt-2">
              {isClient && (
                <PDFDownloadLink
                  document={
                    <QuizPdfDocument
                      title={title}
                      description={description}
                      questions={questions}
                      options={options}
                      translations={pdfTranslations}
                    />
                  }
                  fileName={fileName}
                >
                  {({ loading }) => (
                    <Button className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("pdfExport.generating")}
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          {t("pdfExport.downloadPdf")}
                        </>
                      )}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {t("pdfExport.questionCount", { count: questions.length })} •{" "}
              {t("pdfExport.format", { size: options.paperSize === "letter" ? t("pdfExport.usLetter") : t("pdfExport.a4") })}
            </p>
          </div>

          {/* PDF Preview */}
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-gray-100">
            {isClient ? (
              <PDFViewer
                width="100%"
                height="100%"
                showToolbar={false}
                style={{ border: "none" }}
              >
                <QuizPdfDocument
                  title={title}
                  description={description}
                  questions={questions}
                  options={options}
                  translations={pdfTranslations}
                />
              </PDFViewer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
