"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectFilterProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  "aria-label"?: string;
  align?: "left" | "right";
  className?: string;
}

/**
 * Compact multiselect filter pill — matches the menu bar's `ThemeSelect`
 * "pill" look (teal-deep label, cream panel, teal-wash highlight), but lets the
 * user tick several options at once. Shows a count badge when any are selected.
 */
export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  align = "right",
  className,
  ...props
}: MultiSelectFilterProps) {
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

  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  }

  const count = selected.length;

  return (
    <div ref={ref} className={cn("relative inline-flex shrink-0", className)}>
      <button
        type="button"
        aria-label={props["aria-label"] ?? label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full pl-3.5 pr-2.5 text-[13px] font-semibold text-teal-deep transition-colors",
          count > 0 ? "bg-teal-wash" : "hover:bg-teal-wash",
        )}
      >
        <span className="truncate">{label}</span>
        {count > 0 ? (
          <span className="flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-[18px] text-primary-foreground nums">
            {count}
          </span>
        ) : null}
        <ChevronDown className={cn("size-4 shrink-0 text-primary transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable
          className={cn(
            "absolute top-full z-50 mt-2 max-h-72 w-56 overflow-auto rounded-2xl border border-border bg-card p-1.5 shadow-raised",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => toggle(opt)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                  active ? "bg-teal-wash font-semibold text-teal-deep" : "font-medium text-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {active ? <Check className="size-3" /> : null}
                </span>
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
          {count > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 flex w-full items-center justify-center rounded-xl border-t border-border px-3 py-2 text-2xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
