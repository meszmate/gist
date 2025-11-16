import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, minRows = 3, maxRows, value, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const mirrorRef = React.useRef<HTMLSpanElement>(null);

    React.useImperativeHandle(ref, () => textareaRef.current!);

    React.useEffect(() => {
      const textarea = textareaRef.current;
      const mirror = mirrorRef.current;
      if (!textarea || !mirror) return;

      const updateHeight = () => {
        const style = window.getComputedStyle(textarea);
        mirror.style.font = style.font;
        mirror.style.padding = style.padding;
        mirror.style.borderWidth = style.borderWidth;
        mirror.style.width = style.width;
        mirror.style.letterSpacing = style.letterSpacing;
        mirror.style.wordSpacing = style.wordSpacing;
        mirror.style.whiteSpace = style.whiteSpace;

        const text = (textarea.value || props.placeholder || ' ');
        mirror.textContent = text + '\n';

        const lineHeight = parseFloat(style.lineHeight) || 24;
        const minH = minRows * lineHeight;
        const maxH = maxRows !== undefined ? maxRows * lineHeight : Infinity;

        let height = mirror.offsetHeight;
        height = Math.max(minH, Math.min(height, maxH));

        textarea.style.height = `${height}px`;
      };

      updateHeight();

      const ro = new ResizeObserver(updateHeight);
      ro.observe(textarea);
      return () => ro.disconnect();
    }, [value, props.placeholder, minRows, maxRows]);

    return (
      <>
        <span
          ref={mirrorRef}
          className="invisible absolute whitespace-pre-wrap break-words pointer-events-none"
          aria-hidden
        />

        <textarea
          ref={textareaRef}
          data-slot="textarea"
          className={cn(
            "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            "resize-none overflow-hidden",
            className
          )}
          rows={minRows}
          value={value}
          onChange={onChange}
          {...props}
        />
      </>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
