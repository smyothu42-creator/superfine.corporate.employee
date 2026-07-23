"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  // Namespaces the listbox and its options so two comboboxes on one page can
  // never point `aria-controls`/`aria-activedescendant` at each other's list.
  const listId = React.useId();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // The open list is portalled to <body> and positioned `fixed`, not rendered
  // `absolute` inside this component. An absolute list is clipped by any
  // ancestor that hides overflow — and the account settings shell does exactly
  // that (`lg:overflow-hidden` to keep its rail's rounded corners), which sheared
  // this dropdown off at the card edge. Same fix, and same reasoning, as
  // ThemeSelect: escape the clipping ancestor rather than fight it with z-index.
  const [placement, setPlacement] = React.useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const GAP = 8;
  const EDGE = 8;
  const MIN_H = 140;
  const MAX_H = 288;

  const measure = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    // Drop down by default; flip up only when below is genuinely too cramped and
    // above has more room, so it doesn't jump sides on small scrolls.
    const up = below < MIN_H && above > below;
    setPlacement({
      top: up ? undefined : r.bottom + GAP,
      bottom: up ? window.innerHeight - r.top + GAP : undefined,
      left: r.left,
      width: r.width,
      maxHeight: Math.max(MIN_H, Math.min(MAX_H, up ? above : below)),
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onReflow = () => measure();
    // Capture phase: the trigger may live inside a scrolling panel whose scroll
    // doesn't bubble to window.
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, measure]);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      // The list is portalled outside this component's tree, so testing only the
      // wrapper would close it on mousedown and swallow the option click.
      if (ref.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
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
        ref={triggerRef}
        className={cn(
          "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-sm transition-colors",
          open ? "border-primary ring-2 ring-ring/30" : "border-input hover:border-primary",
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
          /* `aria-expanded` on a plain text field is invalid — the attribute is
             only allowed on things that can expand, and without `role="combobox"`
             assistive tech discards it, so the list's open/closed state was never
             announced at all. Declaring the role makes the whole set legal, and
             `aria-activedescendant` lets the arrow keys move a highlight the
             screen reader can actually follow while focus stays in the field. */
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          // The list is only in the page while it is open.
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          /* Gated on `rows`, not `filtered`: when the query matches nothing but a
             custom value can still be added, that "Add …" row is the only row
             there is — highlighting it while claiming no active descendant left
             the move visible but unannounced. */
          aria-activedescendant={open && rows.length ? `${listId}-opt-${activeIndex}` : undefined}
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
          // Plain `outline-none` loses on specificity to the global
          // `input:focus-visible` rule, so this borderless field drew a sharp
          // rectangle inside the wrapper's rounded ring — and `onFocus` opens
          // the list, so both fired on the same press. The wrapper is the field.
          className="h-7 min-w-[100px] flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
        />
        {/* A real button. This was a click handler on a bare chevron graphic —
            mouse-only, unreachable by keyboard, and 16px against a 24px minimum
            target. */}
        <button
          type="button"
          aria-label={open ? "Hide allergen suggestions" : "Show allergen suggestions"}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-primary hover:bg-muted"
        >
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && placement
        ? createPortal(
        <div
          ref={listRef}
          // See `use-dialog.ts`: an enclosing dialog leaves Escape alone while
          // this list is up, so the press shuts the list, not the dialog.
          data-escape-layer
          style={{
            position: "fixed",
            top: placement.top,
            bottom: placement.bottom,
            left: placement.left,
            width: placement.width,
            maxHeight: placement.maxHeight,
          }}
          className="z-50 overflow-auto rounded-2xl border border-border bg-card p-1.5 shadow-raised"
        >
          {/* Only `option` children belong in a listbox — the "no matches" note
              below is not one of them, so it sits outside. */}
          <div id={listId} role="listbox" aria-label="Allergen suggestions" aria-multiselectable>
          {filtered.map((o, i) => {
            const active = value.some((v) => v.toLowerCase() === o.toLowerCase());
            const highlighted = i === activeIndex;
            return (
              <button
                key={o}
                type="button"
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={active}
                /* Kept out of the tab order. The list is portalled to the end of
                   the document, so tabbing off the field used to jump the user
                   to the bottom of the page and back. Arrow keys drive it via
                   `aria-activedescendant`; `onMouseDown` prevents the click from
                   stealing focus out of the field mid-selection. */
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
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

          {/* The "create" row is a real choice in the list, so it carries option
              semantics and an id like any other — without them the highlight
              landed on it silently and `aria-activedescendant` named nothing. */}
          {canAddCustom ? (
            <button
              type="button"
              id={`${listId}-opt-${filtered.length}`}
              role="option"
              aria-selected={false}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={addCustom}
              onMouseMove={() => setActiveIndex(filtered.length)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-teal-deep transition-colors",
                activeIndex === filtered.length && "bg-teal-wash",
              )}
            >
              <Plus aria-hidden className="size-4 shrink-0 text-primary" />
              Add &ldquo;{query.trim()}&rdquo;
            </button>
          ) : null}
          </div>

          {filtered.length === 0 && !canAddCustom ? (
            <p className="px-3 py-2 text-[13px] text-muted-foreground">No allergens found.</p>
          ) : null}
        </div>,
            document.body,
          )
        : null}

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
