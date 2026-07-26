"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CutoffDayTooltip } from "@/components/cutoff/cutoff-day-tooltip";
import { cn } from "@/lib/utils";
import { fromISODate, toISODate, sameDay, startOfToday, weekdayOffset } from "@/lib/dates";
import { useRovingCalendar } from "@/lib/calendar-keys";
import type { DayAvailability } from "@/lib/cutoff-messaging";

const COLS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DateSingleCalendarProps {
  /** The chosen day (ISO `yyyy-mm-dd`). Always exactly one. */
  value: string;
  onChange: (iso: string) => void;
  /**
   * Per-day availability — pass `dayAvailability(iso, type)` so this calendar
   * agrees with the menu's, down to the wording of each closure.
   */
  dayInfo: (iso: string) => DayAvailability;
  className?: string;
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
 * One-day calendar, rendered in place rather than in a layer of its own.
 *
 * The other calendars in the app are each a modal or a popover; this one is the
 * grid alone, so it can sit inside a sheet that is already up (the re-order
 * confirmation) without stacking a dialog on a dialog or fighting it for Escape.
 * Picking a day is the whole interaction — there is no Apply, the caller's own
 * confirm button is the commit.
 *
 * Everything else matches the menu's single-day tab, because it is the same
 * question asked somewhere else: grey for a structural closure (weekend,
 * holiday, a day gone by), red for a day whose order cutoff has passed, and a
 * {@link CutoffDayTooltip} on every closed day carrying the reason — plus the
 * kitchen's number on the red ones, which is the only door left for someone who
 * needs that day.
 */
export function DateSingleCalendar({ value, onChange, dayInfo, className }: DateSingleCalendarProps) {
  const today = startOfToday();
  const todayISO = toISODate(today);
  const anchor = fromISODate(value || todayISO);
  const [cursor, setCursor] = React.useState(() => ({ y: anchor.getFullYear(), m: anchor.getMonth() }));
  /** ISO of the closed day whose reason bubble is pinned open by a tap — touch
   *  has no hover, so the contact links would otherwise be unreachable. */
  const [revealed, setRevealed] = React.useState("");

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

  // Arrow keys across the month; the whole grid is one tab stop. Focus starts on
  // the day already chosen, so a keyboard user arrives on their own answer.
  const roving = useRovingCalendar({
    open: true,
    selectedISO: value || undefined,
    fallbackISO: todayISO,
    onMonthChange: (d) => setCursor({ y: d.getFullYear(), m: d.getMonth() }),
  });

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="rounded-full border border-control bg-card touch-target p-1.5 hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="rounded-full border border-control bg-card touch-target p-1.5 hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekends are de-emphasised by weight, not by fading the ink — these
          labels are the only thing naming the columns. */}
      <div className="mt-3 grid grid-cols-7 text-center text-2xs font-semibold text-muted-foreground">
        {COLS.map((d, i) => (
          <div key={d} className={cn("pb-1.5", i >= 5 && "font-normal")}>
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
          const info = dayInfo(iso);
          const disabled = !info.selectable;
          const isSelected = iso === value;
          const isToday = sameDay(date, today);

          return (
            <div
              key={iso}
              // A closed day's button refuses its own press, so the tap that pins
              // the reason bubble open is taken here on the wrapper.
              onClick={() => disabled && info.reason && setRevealed((r) => (r === iso ? "" : iso))}
              className={cn(
                "relative flex items-center justify-center py-0.5",
                // Disabled buttons don't fire hover, so the bubble hangs off the
                // (enabled) wrapper and reveals on group-hover.
                disabled && info.reason && "group",
              )}
            >
              {disabled && info.reason ? (
                <CutoffDayTooltip
                  id={`why-reorder-${iso}`}
                  reason={info.reason}
                  cutoff={info.cutoff}
                  open={revealed === iso}
                />
              ) : null}
              <button
                type="button"
                /* `aria-disabled`, not `disabled` — the same choice every other
                   calendar here makes. A truly disabled button cannot be focused,
                   so the arrow keys would stop dead on a weekend, and the reason
                   attached to a closed day (with the kitchen's number inside it)
                   would be unreachable by keyboard. The press is refused below. */
                aria-disabled={disabled || undefined}
                aria-pressed={disabled ? undefined : isSelected}
                aria-describedby={disabled && info.reason ? `why-reorder-${iso}` : undefined}
                aria-label={disabled ? `${date.toDateString()}, ${info.reason}` : date.toDateString()}
                {...roving.dayProps(iso)}
                onFocus={() => {
                  if (disabled && info.reason) setRevealed(iso);
                }}
                onBlur={() => setRevealed((r) => (r === iso ? "" : r))}
                onClick={() => {
                  if (disabled) {
                    // Closed: the press says why rather than doing nothing at all.
                    if (info.reason) setRevealed((r) => (r === iso ? "" : iso));
                    return;
                  }
                  onChange(iso);
                }}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full text-sm transition-colors sm:size-9",
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground"
                    : !disabled
                      ? "text-foreground hover:bg-teal-wash"
                      : info.cutoff
                        ? "cursor-not-allowed bg-danger/10 font-semibold text-danger group-hover:bg-danger/20"
                        : "cursor-not-allowed text-muted-foreground/40",
                  isToday && !isSelected && !disabled && "ring-1 ring-inset ring-primary/60",
                )}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-2xs text-muted-foreground">
        Grey = closed. <span className="rounded bg-danger/10 px-1 font-semibold text-danger">Red</span>{" "}
        = cutoff passed (hover or tap for contact options).
      </p>
    </div>
  );
}
