import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `text-base` on phones is not a type choice — it's 16px, and iOS Safari zooms
 * the whole page in when you focus a field smaller than that. It never zooms
 * back out. From `sm` up we're on a pointer device and 14px reads better.
 */
const MOBILE_SAFE_TEXT = "text-base sm:text-sm";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-foreground placeholder:text-muted-foreground/70 transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 read-only:bg-muted",
          MOBILE_SAFE_TEXT,
          className,
        )}
        {...props}
      />
    );
  },
);

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[90px] w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/70 transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
          MOBILE_SAFE_TEXT,
          className,
        )}
        {...props}
      />
    );
  },
);

function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-overline", className)} {...props} />;
}

function Field({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-0", className)} {...props} />;
}

export { Input, Textarea, Label, Field };
