"use client";

import * as React from "react";
import { ChevronDown, Check, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AllergenComboboxProps {
  /** Currently selected allergens. */
  value: string[];
  onValueChange: (value: string[]) => void;
  /** Suggestion list shown in the dropdown. */
  options: string[];
  placeholder?: string;
  /** Allow adding a typed allergen that isn't in the suggestion list. */
  allowCustom?: boolean;
  "aria-label"?: string;
  className?: string;
}

/**
 * Searchable multi-select for allergens. Type to filter the suggestion list,
 * click to toggle. Styled to match the brand dropdown in `theme-select.tsx`
 * (cream/white surface, teal selected highlight) instead of a native control.
 */
export function AllergenCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Search allergens…",
  allowCustom = true,
  className,
  ...props
}: AllergenComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

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

  const q = query.trim().toLowerCase();
  const filtered = options.filter((o) => o.toLowerCase().includes(q));
  const hasExactMatch = options.some((o) => o.toLowerCase() === q);
  const canAddCustom = allowCustom && q.length > 0 && !hasExactMatch;

  function toggle(allergen: string) {
    const exists = value.some((v) => v.toLowerCase() === allergen.toLowerCase());
    onValueChange(
      exists
        ? value.filter((v) => v.toLowerCase() !== allergen.toLowerCase())
        : [...value, allergen],
    );
  }

  function addCustom() {
    const v = query.trim();
    if (!v) return;
    if (!value.some((x) => x.toLowerCase() === v.toLowerCase())) {
      onValueChange([...value, v]);
    }
    setQuery("");
  }

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      {/* Trigger / search input — selected allergens sit inside as chips. */}
      <div
        className={cn(
          "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-sm transition-colors",
          open ? "border-primary ring-2 ring-ring/30" : "border-input hover:border-primary/40",
        )}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        {value.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-full border border-danger-border bg-danger-bg px-2 py-0.5 text-2xs font-semibold text-danger"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={(e) => {
                e.stopPropagation();
                toggle(v);
              }}
              className="rounded-full text-danger/70 hover:text-danger"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          aria-label={props["aria-label"] ?? "Search allergens"}
          aria-haspopup="listbox"
          aria-expanded={open}
          placeholder={value.length ? "Add more…" : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length === 1) toggle(filtered[0]);
              else if (canAddCustom) addCustom();
            } else if (e.key === "Backspace" && !query && value.length) {
              // Backspace on an empty field removes the last chip.
              toggle(value[value.length - 1]);
            }
          }}
          className="h-7 min-w-[100px] flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/70 outline-none"
        />
        <ChevronDown
          className={cn(
            "size-4 shrink-0 cursor-pointer text-primary transition-transform",
            open && "rotate-180",
          )}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        />
      </div>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute top-full z-50 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-border bg-card p-1.5 shadow-raised"
        >
          {filtered.map((o) => {
            const active = value.some((v) => v.toLowerCase() === o.toLowerCase());
            return (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => toggle(o)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                  active
                    ? "bg-teal-wash font-semibold text-teal-deep"
                    : "font-medium text-foreground hover:bg-muted",
                )}
              >
                <span className="truncate">{o}</span>
                {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
              </button>
            );
          })}

          {canAddCustom ? (
            <button
              type="button"
              onClick={addCustom}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-teal-deep transition-colors hover:bg-teal-wash"
            >
              <Plus className="size-4 shrink-0 text-primary" />
              Add &ldquo;{query.trim()}&rdquo;
            </button>
          ) : null}

          {filtered.length === 0 && !canAddCustom ? (
            <p className="px-3 py-2 text-[13px] text-muted-foreground">No allergens found.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
