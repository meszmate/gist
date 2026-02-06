"use client";

import { useState, useCallback, useEffect } from "react";
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
import {
  QuizPdfDocument,
  type QuizQuestion,
  type PdfExportOptions,
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
  const [options, setOptions] = useState<PdfExportOptions>({
    includeAnswerKey: false,
    showPointValues: true,
    answerKeyOnSeparatePage: true,
    paperSize: "letter",
  });

  const [isClient, setIsClient] = useState(false);

  // Ensure we're on client side before rendering PDF components
  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateOption = useCallback(
    <K extends keyof PdfExportOptions>(key: K, value: PdfExportOptions[K]) => {
      setOptions((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const sanitizedTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 50);
  const fileName = `${sanitizedTitle || "quiz"}-${quizId.slice(0, 8)}.pdf`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Options Sidebar */}
          <div className="w-64 shrink-0 space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4" />
              Export Options
            </div>

            <Separator />

            {/* Paper Size */}
            <div className="space-y-2">
              <Label className="text-sm">Paper Size</Label>
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
                  <SelectItem value="letter">US Letter</SelectItem>
                  <SelectItem value="a4">A4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Show Point Values */}
            <div className="flex items-center justify-between">
              <Label htmlFor="showPoints" className="text-sm cursor-pointer">
                Show Point Values
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
                Include Answer Key
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
                  Separate Page
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
                    />
                  }
                  fileName={fileName}
                >
                  {({ loading }) => (
                    <Button className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {questions.length} question{questions.length !== 1 && "s"} •{" "}
              {options.paperSize === "letter" ? "Letter" : "A4"} format
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
