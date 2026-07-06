"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addDays, fromISODate, toISODate, sameDay, startOfToday, isServiceDay, formatDay } from "@/lib/dates";

const COLS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Hover bubble explaining why a day is closed. Lives on the (enabled) cell
 *  wrapper so it reveals on group-hover even over a disabled day button. */
function DayTooltip({ reason }: { reason: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden w-40 -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-center text-2xs font-medium leading-snug text-background shadow-raised group-hover:block"
    >
      {reason}
      <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground" />
    </span>
  );
}

interface DateRangeModalProps {
  initialStart?: string;
  initialEnd?: string;
  /** Weekday numbers (1=Mon) that can be ordered. Default: Mon–Fri. */
  serviceDayNums?: number[];
  /** Earliest selectable delivery date (ISO). Days before it are disabled —
   *  drives the per-meal-style lead window (individual +1 day, family +3 days). */
  minISO?: string;
  /** Per-day classification: closed days grey out, past-cutoff days show red
   *  with a reason (weekends/holidays/past stay grey). */
  dayInfo?: (iso: string) => { selectable: boolean; cutoff: boolean; reason: string };
  onClose: () => void;
  onApply: (startISO: string, endISO: string) => void;
}

function monthMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // 0 = Monday
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * shadcn-style range calendar. First tap sets the start; hovering previews the
 * range; the next tap (on/after start) sets the end. Endpoints are filled
 * circles with a continuous accent band between them. Weekends are disabled —
 * any weekday (Mon–Fri) can be ordered.
 */
export function DateRangeModal({
  initialStart,
  initialEnd,
  serviceDayNums = [1, 2, 3, 4, 5],
  minISO,
  dayInfo,
  onClose,
  onApply,
}: DateRangeModalProps) {
  const today = startOfToday();
  const todayISO = toISODate(today);
  // Earliest orderable day — anything before this is closed (lead window).
  const minOrderISO = minISO ?? todayISO;
  const [start, setStart] = React.useState<string>(initialStart ?? "");
  const [end, setEnd] = React.useState<string>(initialEnd ?? "");
  const [hovered, setHovered] = React.useState<string>("");
  const anchor = fromISODate(initialStart || todayISO);
  const [cursor, setCursor] = React.useState(() => ({ y: anchor.getFullYear(), m: anchor.getMonth() }));

  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  function pick(iso: string) {
    if (!start || (start && end)) {
      setStart(iso);
      setEnd("");
    } else if (iso < start) {
      setStart(iso);
    } else {
      setEnd(iso);
    }
  }

  // The high end used for highlighting: committed end, else hover preview.
  const lo = start;
  const hi = end || (start && hovered && hovered > start ? hovered : start);
  const hasRange = !!lo && !!hi && hi !== lo;
  const resolvedEnd = end || start;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative w-full max-w-sm rounded-3xl bg-card p-5 shadow-raised transition-all duration-200",
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">Select dates</h3>
            <p className="text-[13px] text-muted-foreground">
              {start
                ? `${formatDay(fromISODate(start))} → ${formatDay(fromISODate(resolvedEnd))}`
                : "Tap a start and end day"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="rounded-full border border-border bg-card p-1.5 hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-semibold">{monthLabel}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="rounded-full border border-border bg-card p-1.5 hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 text-center text-2xs font-semibold uppercase text-muted-foreground">
          {COLS.map((d, i) => (
            <div key={d} className={cn("pb-1.5", i >= 5 && "text-muted-foreground/40")}>
              {d}
            </div>
          ))}
        </div>
        <div
          className="grid grid-cols-7"
          onMouseLeave={() => setHovered("")}
        >
          {cells.map((date, i) => {
            if (!date) return <div key={`x${i}`} />;
            const iso = toISODate(date);
            const past = iso < minOrderISO;
            const service = isServiceDay(date, serviceDayNums);
            // dayInfo (when provided) is the source of truth for closure + red
            // cutoff styling; fall back to the structural past/weekend checks.
            const info = dayInfo?.(iso);
            const disabled = info ? !info.selectable : past || !service;
            const cutoffClosed = info?.cutoff ?? false;

            const isStart = !!lo && iso === lo;
            const isEnd = hasRange && iso === hi;
            const inMiddle = hasRange && iso > lo && iso < hi;
            const isEndpoint = isStart || isEnd;
            const isToday = sameDay(date, today);

            return (
              <div
                key={iso}
                className={cn(
                  "relative flex items-center justify-center py-0.5",
                  disabled && info?.reason && "group",
                )}
              >
                {disabled && info?.reason ? <DayTooltip reason={info.reason} /> : null}
                {/* Continuous range band — never drawn on weekends, so a range
                    that spans Sat/Sun visibly skips them. */}
                {inMiddle && !disabled ? <span className="absolute inset-y-0.5 inset-x-0 bg-teal-wash" /> : null}
                {isStart && hasRange ? (
                  <span className="absolute inset-y-0.5 left-1/2 right-0 bg-teal-wash" />
                ) : null}
                {isEnd ? <span className="absolute inset-y-0.5 left-0 right-1/2 bg-teal-wash" /> : null}

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(iso)}
                  onMouseEnter={() => !disabled && start && !end && setHovered(iso)}
                  aria-label={
                    disabled && info?.reason ? `${date.toDateString()}, ${info.reason}` : date.toDateString()
                  }
                  className={cn(
                    "relative z-10 flex size-9 items-center justify-center rounded-full text-sm transition-colors",
                    isEndpoint
                      ? "bg-primary font-semibold text-primary-foreground"
                      : cutoffClosed
                        ? "cursor-not-allowed bg-danger/10 font-semibold text-danger group-hover:bg-danger/20"
                        : disabled
                          ? "cursor-not-allowed text-muted-foreground/40"
                          : inMiddle
                            ? "text-teal-deep"
                            : "text-foreground hover:bg-muted",
                    isToday && !isEndpoint && !inMiddle && !disabled && "ring-1 ring-inset ring-primary/60",
                  )}
                >
                  {date.getDate()}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-2xs text-muted-foreground">
          Weekends (Sat &amp; Sun) are off — pick any weekday, Mon through Fri.
        </p>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" block onClick={onClose}>
            Cancel
          </Button>
          <Button variant="teal" block disabled={!start} onClick={() => onApply(start, resolvedEnd)}>
            Apply dates
          </Button>
        </div>
      </div>
    </div>
  );
}
