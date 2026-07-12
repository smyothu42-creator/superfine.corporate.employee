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
  /** Render selected chips in a separate row below the search box (like the
   *  Dietary tags) instead of inside the input. */
  separateChips?: boolean;
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
  separateChips = false,
  className,
  ...props
}: AllergenComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
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

  // Flat list of keyboard-navigable rows (suggestions + the optional "Add …" row)
  // so ArrowUp/Down highlight and Enter commits whatever is highlighted.
  const rows: Array<{ kind: "option"; value: string } | { kind: "custom" }> = [
    ...filtered.map((o) => ({ kind: "option" as const, value: o })),
    ...(canAddCustom ? [{ kind: "custom" as const }] : []),
  ];

  // Keep the highlight in range as the query filters the list down.
  React.useEffect(() => {
    setActiveIndex((i) => (rows.length === 0 ? 0 : Math.min(i, rows.length - 1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, value.length]);

  function toggle(allergen: string) {
    const exists = value.some((v) => v.toLowerCase() === allergen.toLowerCase());
    onValueChange(
      exists
        ? value.filter((v) => v.toLowerCase() !== allergen.toLowerCase())
        : [...value, allergen],
    );
    // Clear the search so the next allergen can be typed straight away, and keep
    // focus in the field for rapid multi-add.
    setQuery("");
    inputRef.current?.focus();
  }

  function addCustom() {
    const v = query.trim();
    if (!v) return;
    if (!value.some((x) => x.toLowerCase() === v.toLowerCase())) {
      onValueChange([...value, v]);
    }
    setQuery("");
    inputRef.current?.focus();
  }

  function commitRow(i: number) {
    const row = rows[i];
    if (!row) return;
    if (row.kind === "custom") addCustom();
    else toggle(row.value);
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
        {/* Inline chips, unless the caller wants them in a separate row below. */}
        {!separateChips &&
          value.map((v) => (
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
          placeholder={value.length && !separateChips ? "Add more…" : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActiveIndex((i) => (rows.length ? (i + 1) % rows.length : 0));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActiveIndex((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              commitRow(activeIndex);
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
          {filtered.map((o, i) => {
            const active = value.some((v) => v.toLowerCase() === o.toLowerCase());
            const highlighted = i === activeIndex;
            return (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => toggle(o)}
                onMouseMove={() => setActiveIndex(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                  active
                    ? "bg-teal-wash font-semibold text-teal-deep"
                    : highlighted
                      ? "bg-muted font-medium text-foreground"
                      : "font-medium text-foreground",
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
              onMouseMove={() => setActiveIndex(filtered.length)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-teal-deep transition-colors",
                activeIndex === filtered.length && "bg-teal-wash",
              )}
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

      {/* Selected chips in their own row below the search box — same pill shape
          as the Dietary tags, kept in the danger tone to read as "avoid". */}
      {separateChips && value.length ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full border border-danger-border bg-danger-bg px-3 py-1.5 text-[13px] font-semibold text-danger"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => toggle(v)}
                className="rounded-full text-danger/70 hover:text-danger"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
