"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarRange, Rows3, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { addDays, fromISODate, toISODate, sameDay, weekdayOffset, startOfWeek } from "@/lib/dates";
import { program } from "@/data/program";
import { useSessionStore, isSubsidized } from "@/store/use-session-store";
import {
  HOLIDAYS,
  isHoliday,
  isServiceDay,
  isOrderable,
  isCutoffPassed,
} from "@/lib/cutoff";

const WEEKDAY_COLS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarStepProps {
  todayISO: string;
  selected: string[];
  onToggle: (iso: string) => void;
  onSelectWeek: (weekDates: string[]) => void;
  onClearAll: () => void;
  onContinue: () => void;
}

/** Sunday-first matrix of the given month, padded with nulls to full weeks. */
function monthMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = weekdayOffset(first);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** The Sun–Sat dates of the week containing `date`. */
function weekOf(date: Date): Date[] {
  const sunday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

export function CalendarStep({
  todayISO,
  selected,
  onToggle,
  onSelectWeek,
  onClearAll,
  onContinue,
}: CalendarStepProps) {
  const today = fromISODate(todayISO);
  const [view, setView] = React.useState<"month" | "week">("month");
  const [cursor, setCursor] = React.useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));

  const monthCells = monthMatrix(cursor.y, cursor.m);
  const weekCells = weekOf(today);
  const cells = view === "month" ? monthCells : weekCells;

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

  const corporate = isSubsidized(useSessionStore((s) => s.account));

  function handleSelectWeek() {
    const dates = weekOf(today)
      .map(toISODate)
      .filter((iso) => isOrderable(iso) && iso >= todayISO);
    onSelectWeek(dates);
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-display text-xl font-semibold tracking-tight">Plan your week</h2>
        <p className="text-[13px] text-muted-foreground">
          Tap the days you want meals.{" "}
          {corporate
            ? `${program.company} covers ${formatCurrency(program.subsidyPerDay)} each weekday.`
            : "Pick as many weekdays as you like."}
        </p>
      </header>

      {/* Month nav + view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={view === "week"}
            aria-label="Previous month"
            className="rounded-full border border-border bg-card touch-target p-1.5 text-foreground hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[120px] text-center text-sm font-semibold">{monthLabel}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={view === "week"}
            aria-label="Next month"
            className="rounded-full border border-border bg-card touch-target p-1.5 text-foreground hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setView((v) => (v === "month" ? "week" : "month"))}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-2xs font-semibold text-foreground hover:bg-muted"
        >
          {view === "month" ? <Rows3 className="size-3.5" /> : <CalendarDays className="size-3.5" />}
          {view === "month" ? "Week view" : "Month view"}
        </button>
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-2xs font-semibold text-muted-foreground">
          {WEEKDAY_COLS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`x${i}`} />;
            const iso = toISODate(date);
            const isToday = sameDay(date, today);
            const isPast = iso < todayISO;
            const weekend = !isServiceDay(iso);
            const holiday = isHoliday(iso);
            const orderable = isOrderable(iso);
            const cutoff = orderable && isCutoffPassed(iso);
            const isSel = selected.includes(iso);
            // Past / weekend / holiday are disabled. Cutoff-passed days stay
            // tappable so the warning surfaces later in the flow.
            const disabled = isPast || weekend || holiday || !orderable;

            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(iso)}
                aria-pressed={isSel}
                aria-label={date.toDateString()}
                className={cn(
                  "relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl border text-sm transition-colors",
                  isSel
                    ? "border-primary bg-primary font-bold text-primary-foreground"
                    : disabled
                      ? "border-transparent bg-transparent text-muted-foreground/40"
                      : "border-border bg-card text-foreground hover:bg-muted",
                  isToday && !isSel && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                )}
              >
                <span className={cn(cutoff && !isSel && "text-danger", isPast && "line-through")}>
                  {date.getDate()}
                </span>
                {holiday ? (
                  <span className="absolute bottom-1 text-[7px] font-semibold leading-none text-muted-foreground/70">
                    Holiday
                  </span>
                ) : cutoff ? (
                  <span
                    className={cn(
                      "absolute bottom-1.5 size-1.5 rounded-full",
                      isSel ? "bg-white" : "bg-danger",
                    )}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-2xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-md bg-primary" /> Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-md ring-2 ring-primary" /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-danger" /> Cutoff passed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-md bg-muted" /> Weekend / holiday
        </span>
      </div>

      {/* Shortcuts */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleSelectWeek}>
          <CalendarRange className="size-4" /> Select this week
        </Button>
        {selected.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            Clear all
          </Button>
        ) : null}
      </div>

      {Object.keys(HOLIDAYS).length ? (
        <p className="text-2xs text-muted-foreground">
          Note: {Object.values(HOLIDAYS)[0]} is a company holiday. No service that day.
        </p>
      ) : null}

      {/* Sticky footer — held off the home indicator on a phone, which would
          otherwise draw straight through the count and the button. */}
      <div className="sticky bottom-[env(safe-area-inset-bottom,0px)] -mx-1 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-1 py-3 backdrop-blur lg:bottom-0">
        <span className="text-sm font-semibold">
          {selected.length} {selected.length === 1 ? "day" : "days"} selected
        </span>
        <Button variant="teal" disabled={selected.length === 0} onClick={onContinue}>
          Browse menus <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
