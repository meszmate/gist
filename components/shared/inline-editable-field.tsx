"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

interface InlineEditableFieldProps {
  value: string;
  onSave: (value: string) => void;
  isSaving?: boolean;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function InlineEditableField({
  value,
  onSave,
  isSaving = false,
  multiline = false,
  placeholder,
  className,
  inputClassName,
}: InlineEditableFieldProps) {
  const { t } = useLocale();
  const resolvedPlaceholder = placeholder ?? t("inlineEdit.clickToEdit");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && multiline && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [isEditing, editValue, multiline]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setEditValue(value);
    }
    setIsEditing(false);
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    }
  };

  if (isEditing) {
    if (multiline) {
      return (
        <div className="space-y-2 transition-all duration-200">
          <div className="rounded-lg border bg-background shadow-sm">
            <Textarea
              ref={(el) => {
                (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
              }}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              placeholder={resolvedPlaceholder}
              className={cn(
                "border-0 shadow-none focus-visible:ring-0 resize-none min-h-[80px]",
                inputClassName
              )}
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        placeholder={resolvedPlaceholder}
        className={cn(
          "transition-all duration-200",
          inputClassName
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "group inline-flex items-center gap-2 text-left rounded-md transition-all duration-200 px-2 py-1 -mx-2 -my-1 cursor-pointer",
        "hover:bg-muted/50",
        "border-b border-transparent hover:border-dashed hover:border-muted-foreground/30",
        className
      )}
    >
      <span className={cn(
        "transition-colors",
        value ? "" : "text-muted-foreground italic"
      )}>
        {value || resolvedPlaceholder}
      </span>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}
