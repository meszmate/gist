"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCEPTED_EXTENSIONS } from "@/lib/file-parser";
import { useLocale } from "@/hooks/use-locale";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(",");

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

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return t("upload.fileSizeExceeds");
    }
    const ext = file.name.lastIndexOf(".") !== -1
      ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      : "";
    if (!ACCEPTED_EXTENSIONS.includes(ext as typeof ACCEPTED_EXTENSIONS[number])) {
      return t("upload.unsupportedType", { types: ACCEPTED_EXTENSIONS.join(", ") });
    }
    return null;
  }, [t]);

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
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload/parse", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to parse file");
        }

        setState("success");
        onTextExtracted(data.text, data.fileName);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse file";
        setState("error");
        setErrorMessage(message);
        onError(message);
      }
    },
    [onTextExtracted, onError, validateFile]
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
