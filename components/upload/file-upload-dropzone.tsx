"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCEPTED_EXTENSIONS } from "@/lib/file-parser";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage, localizeErrorMessage } from "@/lib/i18n/error-localizer";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ACCEPT_STRING = [
  ...ACCEPTED_EXTENSIONS,
  "text/*",
].join(",");

function sanitizeUploadFileName(fileName: string): string {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const lastDot = normalized.lastIndexOf(".");
  const ext = lastDot > 0 ? normalized.slice(lastDot).toLowerCase() : "";
  const base = lastDot > 0 ? normalized.slice(0, lastDot) : normalized;

  const sanitizedBase = base
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const safeBase = sanitizedBase || "upload";
  const maxBaseLength = Math.max(1, 120 - ext.length);
  return `${safeBase.slice(0, maxBaseLength)}${ext}`;
}

function isExpectedPatternError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /string (does not|did not) match the expected pattern/i.test(error.message)
  );
}

interface FileUploadDropzoneProps {
  onTextExtracted: (text: string, fileName: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export function FileUploadDropzone({
  onTextExtracted,
  onError,
  disabled,
}: FileUploadDropzoneProps) {
  const { t } = useLocale();
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setState("idle");
    setFileName(null);
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return t("upload.fileSizeExceeds");
    }
    return null;
  };

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setState("error");
        setErrorMessage(validationError);
        onError(validationError);
        return;
      }

      setState("uploading");
      setFileName(file.name);

      try {
        const uploadWithName = async (name: string) => {
          const formData = new FormData();
          formData.append("file", file, name);

          return fetch("/api/upload/parse", {
            method: "POST",
            body: formData,
          });
        };

        const fallbackName = sanitizeUploadFileName(file.name);
        let res: Response;

        try {
          res = await uploadWithName(file.name);
        } catch (error) {
          if (!isExpectedPatternError(error) || fallbackName === file.name) {
            throw error;
          }
          res = await uploadWithName(fallbackName);
        }

        if (!res.ok) {
          const rawError = await getApiErrorMessage(res, "Failed to parse file");
          throw new Error(localizeErrorMessage(rawError, t, "upload.failedToParse"));
        }

        const data = await res.json();

        setState("success");
        onTextExtracted(data.text, data.fileName);
      } catch (err) {
        const message = localizeErrorMessage(err, t, "upload.failedToParse");
        setState("error");
        setErrorMessage(message);
        onError(message);
      }
    },
    [onTextExtracted, onError, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [disabled, uploadFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setState("dragging");
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState("idle");
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => {
        if (!disabled && state !== "uploading") {
          resetState();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "relative rounded-lg border-2 border-dashed p-6 text-center transition-all cursor-pointer",
        state === "dragging" && "border-primary bg-primary/5",
        state === "uploading" && "border-muted cursor-wait",
        state === "success" && "border-green-500/50 bg-green-500/5",
        state === "error" && "border-destructive/50 bg-destructive/5",
        state === "idle" && "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {state === "uploading" && (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">{t("upload.extractingText", { fileName: fileName ?? "" })}</p>
        </div>
      )}

      {state === "success" && (
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <p className="text-sm font-medium text-green-600">
            {t("upload.textExtracted", { fileName: fileName ?? "" })}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetState();
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {t("upload.uploadAnother")}
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetState();
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {(state === "idle" || state === "dragging") && (
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-muted p-3">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {state === "dragging" ? t("upload.dropFileHere") : t("upload.dropOrBrowse")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("upload.acceptedFormats")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
