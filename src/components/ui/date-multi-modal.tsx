"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fromISODate, toISODate, sameDay, startOfToday, isServiceDay, formatDay, weekdayOffset } from "@/lib/dates";

const COLS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DateMultiModalProps {
  initialDates?: string[];
  /** Weekday numbers (1=Mon) that can be picked. Default: Mon–Fri. */
  serviceDayNums?: number[];
  title?: string;
  subtitle?: string;
  /** Allow applying an empty selection (e.g. to clear an existing set of dates). */
  allowClear?: boolean;
  /** Apply-button label when nothing is selected (only reachable with allowClear). */
  emptyApplyLabel?: string;
  onClose: () => void;
  onApply: (datesISO: string[]) => void;
}

function monthMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = weekdayOffset(first);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Multi-select calendar — tap individual days to toggle them on/off (no
 * start/end range). Weekends are disabled; past days are disabled.
 */
export function DateMultiModal({
  initialDates = [],
  serviceDayNums = [1, 2, 3, 4, 5],
  title = "Select dates",
  subtitle = "Tap the days you'll be away.",
  allowClear = false,
  emptyApplyLabel = "Select days",
  onClose,
  onApply,
}: DateMultiModalProps) {
  const today = startOfToday();
  const todayISO = toISODate(today);
  const [selected, setSelected] = React.useState<string[]>(initialDates);
  const anchor = fromISODate(initialDates[0] || todayISO);
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

  function toggle(iso: string) {
    setSelected((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()));
  }

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
            <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
            <p className="text-[13px] text-muted-foreground">
              {selected.length ? `${selected.length} day${selected.length > 1 ? "s" : ""} selected` : subtitle}
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
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={`x${i}`} />;
            const iso = toISODate(date);
            const past = iso < todayISO;
            const service = isServiceDay(date, serviceDayNums);
            const disabled = past || !service;
            const isSelected = selected.includes(iso);
            const isToday = sameDay(date, today);

            return (
              <div key={iso} className="relative flex items-center justify-center py-0.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(iso)}
                  aria-pressed={isSelected}
                  aria-label={date.toDateString()}
                  className={cn(
                    "relative z-10 flex size-9 items-center justify-center rounded-full text-sm transition-colors",
                    isSelected
                      ? "bg-primary font-semibold text-primary-foreground"
                      : disabled
                        ? "cursor-not-allowed text-muted-foreground/40 line-through"
                        : "text-foreground hover:bg-muted",
                    isToday && !isSelected && !disabled && "ring-1 ring-inset ring-primary/60",
                  )}
                >
                  {date.getDate()}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-2xs text-muted-foreground">
          Tap any weekday (Mon–Fri) to add or remove it. Weekends are off.
        </p>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" block onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="teal"
            block
            disabled={!selected.length && !allowClear}
            onClick={() => onApply([...selected].sort())}
          >
            {selected.length ? `Set ${selected.length} day${selected.length > 1 ? "s" : ""}` : emptyApplyLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
