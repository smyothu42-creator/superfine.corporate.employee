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
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  /**
   * Which option the keyboard is on.
   *
   * These pills were usable before — the options sit right after the pill in the
   * page, so Tab reached them — but they answered none of the keys every other
   * dropdown in the app now answers. Down-arrow did not open them, the arrows
   * did nothing once open, and ticking four allergens cost four Tab presses
   * through the list and back. Same behaviour as the rest, so the keyboard works
   * the same way everywhere.
   */
  const [activeIndex, setActiveIndex] = React.useState(0);
  // On phones the panel is `fixed` and clamped to the viewport — anchored
  // `absolute` panels overhang the screen edge when the pill sits near it.
  const [mobilePos, setMobilePos] = React.useState<{ top: number; left: number } | null>(null);

  function toggleOpen() {
    if (!open && btnRef.current && window.matchMedia("(max-width: 639px)").matches) {
      const r = btnRef.current.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const w = 224; // panel width (w-56)
      const anchored = align === "right" ? r.right - w : r.left;
      setMobilePos({ top: r.bottom + 8, left: Math.min(Math.max(8, anchored), vw - w - 8) });
    } else {
      setMobilePos(null);
    }
    setOpen((o) => !o);
  }

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Focus the panel as it opens, so the arrow keys have something answering them.
  React.useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Never point the highlight past the end of the list. The rows are the options
  // plus a "Clear all" that only exists while something is selected, so the last
  // index moves under the user — cleared from elsewhere, or a shorter set of
  // options arriving — and a dangling `aria-activedescendant` reads as nothing.
  const lastIndex = options.length - 1 + (selected.length > 0 ? 1 : 0);
  React.useEffect(() => {
    if (activeIndex > lastIndex) setActiveIndex(Math.max(0, lastIndex));
  }, [activeIndex, lastIndex]);

  /**
   * The id of the row the keyboard is on. "Clear all" is a command, not a choice,
   * so it is not an `option` and does not sit inside the listbox — it gets its own
   * id and the highlight moves onto it by name rather than by index.
   */
  const activeId =
    activeIndex >= options.length ? `${listId}-clear` : `${listId}-opt-${activeIndex}`;

  // Keep the highlighted row in view — the panel scrolls past ten or so options.
  // Looked up by id rather than by child index: the options and the "Clear all"
  // row are no longer siblings, so a positional lookup would scroll the wrong one.
  React.useEffect(() => {
    if (!open) return;
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  /** Shut the panel and put focus back on the pill that opened it. */
  function close() {
    setOpen(false);
    btnRef.current?.focus();
  }

  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  }

  function onListKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // "Clear all" is the row after the options when it is showing, so the arrows
    // reach it too — it would otherwise be visible but unreachable by keyboard.
    const last = lastIndex;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i >= last ? 0 : i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? last : i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(last);
        break;
      case "Enter":
      case " ": {
        e.preventDefault();
        // Ticking does NOT close the panel — this is a multi-select, and the
        // whole point is choosing several without reopening it each time.
        if (activeIndex >= options.length) {
          onChange([]);
          setActiveIndex(0);
          break;
        }
        const opt = options[activeIndex];
        if (opt) toggle(opt);
        break;
      }
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
      case "Tab":
        // Leaving means done; shut the panel so focus continues down the page.
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const count = selected.length;

  return (
    <div ref={ref} className={cn("relative inline-flex shrink-0", className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label={props["aria-label"] ?? label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          // Down-arrow opens a shut pill, the way every other dropdown here does.
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setActiveIndex(0);
            toggleOpen();
          }
        }}
        className={cn(
          "flex h-8 items-center gap-1 rounded-full pl-2.5 pr-2 text-xs font-semibold text-teal-deep transition-colors sm:h-9 sm:gap-1.5 sm:pl-3.5 sm:pr-2.5 sm:text-[13px]",
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
          ref={panelRef}
          // See `use-dialog.ts`: an enclosing dialog stands down on Escape while
          // this list is open, so the press shuts the list, not the whole modal.
          data-escape-layer
          /**
           * The panel — not the listbox — is what holds focus and the highlight.
           *
           * A `listbox` may only contain `option` (or `group`) children, so the
           * "Clear all" command cannot live inside one; putting it there made the
           * whole list an invalid structure (WCAG 1.3.1) and pointed
           * `aria-activedescendant` at a row with no option semantics, so the
           * screen reader had nothing to announce when the highlight landed on it.
           * `group` is the role that legally carries `aria-activedescendant` over
           * a mixed set of rows, and every key binding below is unchanged.
           */
          role="group"
          aria-label={props["aria-label"] ?? label}
          tabIndex={-1}
          aria-activedescendant={activeId}
          onKeyDown={onListKeyDown}
          style={mobilePos ?? undefined}
          className={cn(
            "z-50 max-h-72 w-56 overflow-auto rounded-2xl border border-border bg-card p-1.5 shadow-raised",
            mobilePos
              ? "fixed"
              : cn("absolute top-full mt-2", align === "right" ? "right-0" : "left-0"),
          )}
        >
          <div id={listId} role="listbox" aria-label={props["aria-label"] ?? label} aria-multiselectable>
          {options.map((opt, i) => {
            const active = selected.includes(opt);
            const highlighted = i === activeIndex;
            return (
              <button
                key={opt}
                type="button"
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={active}
                // Driven by the arrow keys from the list itself, so the options
                // are not separate tab stops.
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle(opt)}
                onMouseMove={() => setActiveIndex(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                  active
                    ? "bg-teal-wash font-semibold text-teal-deep"
                    : highlighted
                      ? "bg-muted font-medium text-foreground"
                      : "font-medium text-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-control",
                  )}
                >
                  {active ? <Check className="size-3" /> : null}
                </span>
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
          </div>
          {count > 0 ? (
            <button
              type="button"
              id={`${listId}-clear`}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setActiveIndex(options.length)}
              // Clearing removes this very row, so the highlight has to move off
              // it in the same breath — otherwise `aria-activedescendant` names
              // an element that has just left the page.
              onClick={() => {
                setActiveIndex(0);
                onChange([]);
              }}
              className={cn(
                "mt-1 flex w-full items-center justify-center rounded-xl border-t border-control px-3 py-2 text-2xs font-semibold text-muted-foreground transition-colors hover:bg-muted",
                activeIndex === options.length && "bg-muted text-foreground",
              )}
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
