"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThemeSelectOption {
  value: string;
  label: string;
}

interface ThemeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ThemeSelectOption[];
  "aria-label": string;
  /** "box" = full bordered pill (Favourites); "pill" = inline borderless (Menu). */
  variant?: "box" | "pill";
  /** Trigger height for the "box" variant. "sm" matches a small button. */
  size?: "sm" | "md";
  /** Which edge the open list aligns to. */
  align?: "left" | "right";
  className?: string;
}

/**
 * Brand-themed dropdown. Unlike a native <select>, the open option list is fully
 * styled (cream/white surface, teal selected highlight) so it matches the site
 * theme instead of the browser's default dark popup with an OS-blue highlight.
 */
export function ThemeSelect({
  value,
  onValueChange,
  options,
  variant = "box",
  size = "md",
  align = "left",
  className,
  ...props
}: ThemeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div
      ref={ref}
      className={cn("relative", variant === "box" ? "inline-flex w-full" : "inline-flex shrink-0", className)}
    >
      <button
        type="button"
        aria-label={props["aria-label"]}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center justify-between gap-1.5 font-semibold text-teal-deep outline-none transition-colors",
          variant === "box"
            ? cn(
                "w-full rounded-full border border-border bg-card shadow-sm hover:border-primary/40 hover:bg-teal-wash focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
                size === "sm" ? "h-8 pl-3.5 pr-2.5 text-[13px]" : "h-11 pl-4 pr-3 text-sm",
              )
            : "h-9 max-w-[9rem] rounded-full bg-transparent pl-3 pr-2 text-[13px] hover:bg-teal-wash focus-visible:bg-teal-wash",
        )}
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-primary transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className={cn(
            "absolute top-full z-50 mt-2 max-h-72 min-w-full overflow-auto rounded-2xl border border-border bg-card p-1.5 shadow-raised",
            align === "right" ? "right-0" : "left-0",
            variant === "pill" && "w-44",
          )}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onValueChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                  active
                    ? "bg-teal-wash font-semibold text-teal-deep"
                    : "font-medium text-foreground hover:bg-muted",
                )}
              >
                <span className="truncate">{o.label}</span>
                {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
