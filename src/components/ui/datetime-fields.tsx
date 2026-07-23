"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { fromISODate, toISODate, sameDay, startOfToday, weekdayOffset, formatDay } from "@/lib/dates";
import { useRovingCalendar } from "@/lib/calendar-keys";

/**
 * Brand-themed date and time fields.
 *
 * These exist for the same reason `ThemeSelect` does: `<input type="date">` and
 * `<input type="time">` open a popup drawn by the *browser*, not the page — an
 * OS calendar and an OS spinner with an OS-blue highlight that no CSS can reach.
 * The only way for them to match the site is to not be native.
 *
 * They keep the shape of the controls they replace — a month grid for the day, a
 * scrolling hour/minute/meridiem picker for the time — so this is the site's
 * paint on the interaction people already know, not a different interaction.
 *
 * Values stay in the native formats (`yyyy-mm-dd` and 24h `HH:MM`), so callers
 * that compare or parse them don't change.
 */

const COLS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** The days of `month`, padded so the 1st lands under its weekday column. */
function monthMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = weekdayOffset(first);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Shared popover plumbing: close on outside click and on Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      // Stop here rather than letting the dialog behind us close too: one Escape
      // should shut the picker and leave the sheet that holds it open.
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    }
    document.addEventListener("mousedown", onDown);
    // On `window`, not `document`. `useDialog` puts its own Escape handler on
    // `document` in the capture phase, and it registers first — the sheet mounts
    // before a picker inside it is opened. Two capture listeners on the same node
    // fire in registration order, so a document-level listener here would run
    // second, after the sheet had already closed itself. Capture reaches `window`
    // before `document`, which is what lets stopPropagation above actually win.
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);
  return ref;
}

const TRIGGER =
  "flex h-11 w-full items-center justify-between gap-1.5 rounded-full border border-control bg-card pl-4 pr-3 text-sm font-semibold text-teal-deep shadow-sm outline-none transition-colors hover:border-primary hover:bg-teal-wash focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30";

// Both pickers below are non-modal popovers anchored to their trigger, and are
// deliberately role-less. They used to claim role="dialog", which tells a screen
// reader to expect a layer that traps focus and seals off the page behind it —
// none of which is true or wanted here. Tab is meant to walk out of a picker and
// on to the next field, and the form behind stays live and scrollable. The
// trigger's aria-expanded is what actually carries the open/closed state, and
// useDismiss above supplies Escape and outside-click.
const POPOVER =
  "absolute left-0 top-full z-50 mt-2 rounded-2xl border border-border bg-card p-3 shadow-raised";

/* ---------------------------------------------------------------------- */
/* Date                                                                     */
/* ---------------------------------------------------------------------- */

export function DateField({
  value,
  onChange,
  min,
  placeholder = "Choose a day",
  "aria-label": ariaLabel,
}: {
  /** `yyyy-mm-dd`, or "" for unset. */
  value: string;
  onChange: (iso: string) => void;
  /** Earliest selectable day, `yyyy-mm-dd`. Earlier days render disabled. */
  min?: string;
  placeholder?: string;
  "aria-label": string;
}) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  const today = startOfToday();
  // Open on the selected month, or on today's when nothing is picked yet.
  const [cursor, setCursor] = React.useState(() => {
    const d = value ? fromISODate(value) : today;
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const cells = monthMatrix(cursor.y, cursor.m);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  // Arrow keys across the month; one tab stop for the whole grid.
  const roving = useRovingCalendar({
    open,
    selectedISO: value || undefined,
    fallbackISO: min && toISODate(today) < min ? min : toISODate(today),
    onMonthChange: (d) => setCursor({ y: d.getFullYear(), m: d.getMonth() }),
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={TRIGGER}
      >
        <span className={cn("truncate", !value && "font-medium text-muted-foreground")}>
          {value ? formatDay(fromISODate(value)) : placeholder}
        </span>
        <Calendar className="size-4 shrink-0 text-primary" />
      </button>

      {open ? (
        <div className={cn(POPOVER, "w-[19rem]")}>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="touch-target rounded-full border border-control bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold">{monthLabel}</span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="touch-target rounded-full border border-control bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center text-2xs font-semibold text-muted-foreground">
            {COLS.map((d) => (
              <div key={d} className="pb-1.5">
                {d}
              </div>
            ))}
          </div>
          <div
            ref={roving.gridRef}
            onKeyDown={roving.onKeyDown}
            role="group"
            aria-label={`${monthLabel} — use the arrow keys to choose a day`}
            className="grid grid-cols-7"
          >
            {cells.map((date, i) => {
              if (!date) return <div key={`x${i}`} />;
              const iso = toISODate(date);
              const disabled = min ? iso < min : false;
              const selected = iso === value;
              const isToday = sameDay(date, today);
              return (
                <div key={iso} className="flex items-center justify-center py-0.5">
                  <button
                    type="button"
                    /* `aria-disabled`, not `disabled` — the same choice the
                       other calendars in the app already make. A truly disabled
                       button cannot be focused, so the arrow keys would stop
                       dead on a day that is merely too early rather than
                       stepping over it, and a screen-reader user would never be
                       told the day was there at all. The press is refused
                       below instead. */
                    aria-disabled={disabled || undefined}
                    aria-pressed={selected}
                    aria-label={
                      disabled ? `${date.toDateString()}, not available` : date.toDateString()
                    }
                    {...roving.dayProps(iso)}
                    onClick={() => {
                      if (disabled) return;
                      onChange(iso);
                      close();
                    }}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full text-sm transition-colors",
                      selected
                        ? "bg-primary font-semibold text-primary-foreground"
                        : disabled
                          ? "cursor-not-allowed text-muted-foreground/40"
                          : "text-foreground hover:bg-muted",
                      isToday && !selected && !disabled && "ring-1 ring-inset ring-primary/60",
                    )}
                  >
                    {date.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Time                                                                     */
/* ---------------------------------------------------------------------- */

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const MERIDIEM = ["AM", "PM"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** 24h `HH:MM` → the three things the columns actually show. */
function parse(value: string) {
  if (!value) return null;
  const h = Number(value.slice(0, 2));
  const m = Number(value.slice(3, 5));
  return { h12: h % 12 === 0 ? 12 : h % 12, m, pm: h >= 12 };
}

export function TimeField({
  value,
  onChange,
  placeholder = "Choose a time",
  "aria-label": ariaLabel,
}: {
  /** 24h `HH:MM`, or "" for unset. */
  value: string;
  onChange: (hhmm: string) => void;
  placeholder?: string;
  "aria-label": string;
}) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  const parsed = parse(value);
  // The columns always have something to act on, so the first tap on any of them
  // produces a whole time rather than a half-set one.
  const cur = parsed ?? { h12: 12, m: 0, pm: true };

  function emit(next: { h12: number; m: number; pm: boolean }) {
    const h24 = next.pm ? (next.h12 === 12 ? 12 : next.h12 + 12) : next.h12 === 12 ? 0 : next.h12;
    onChange(`${pad(h24)}:${pad(next.m)}`);
  }

  const col = "min-w-0 flex-1 max-h-48 overflow-y-auto px-1 [scrollbar-width:thin]";
  const cell = (active: boolean) =>
    cn(
      "w-full rounded-lg py-1.5 text-center text-[13px] transition-colors",
      active
        ? "bg-primary font-semibold text-primary-foreground"
        : "font-medium text-foreground hover:bg-muted",
    );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={TRIGGER}
      >
        <span className={cn("truncate", !value && "font-medium text-muted-foreground")}>
          {parsed ? `${parsed.h12}:${pad(parsed.m)} ${parsed.pm ? "PM" : "AM"}` : placeholder}
        </span>
        <Clock className="size-4 shrink-0 text-primary" />
      </button>

      {open ? (
        <div className={cn(POPOVER, "w-[13rem]")}>
          {/* Hour · minute · AM/PM, the same three columns the native picker
              shows — the interaction people already know, in the site's paint. */}
          <div className="flex gap-1">
            <div className={col} role="listbox" aria-label="Hour">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  role="option"
                  aria-selected={Boolean(parsed) && cur.h12 === h}
                  onClick={() => emit({ ...cur, h12: h })}
                  className={cell(Boolean(parsed) && cur.h12 === h)}
                >
                  {pad(h)}
                </button>
              ))}
            </div>
            <div className={col} role="listbox" aria-label="Minute">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={Boolean(parsed) && cur.m === m}
                  onClick={() => emit({ ...cur, m })}
                  className={cell(Boolean(parsed) && cur.m === m)}
                >
                  {pad(m)}
                </button>
              ))}
            </div>
            <div className="min-w-0 flex-1 px-1" role="listbox" aria-label="AM or PM">
              {MERIDIEM.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="option"
                  aria-selected={Boolean(parsed) && cur.pm === (p === "PM")}
                  onClick={() => emit({ ...cur, pm: p === "PM" })}
                  className={cell(Boolean(parsed) && cur.pm === (p === "PM"))}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
