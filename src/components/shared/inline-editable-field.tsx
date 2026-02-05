"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  placeholder = "Click to edit...",
  className,
  inputClassName,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setEditValue(value);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    }
  };

  if (isEditing) {
    const sharedProps = {
      value: editValue,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => setEditValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      disabled: isSaving,
      placeholder,
      className: inputClassName,
    };

    if (multiline) {
      return (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          {...sharedProps}
        />
      );
    }

    return (
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        {...sharedProps}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "group inline-flex items-center gap-2 text-left rounded-md transition-colors hover:bg-muted/50 px-2 py-1 -mx-2 -my-1 cursor-pointer",
        className
      )}
    >
      <span className={value ? "" : "text-muted-foreground"}>
        {value || placeholder}
      </span>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}
