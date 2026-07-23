"use client";

import * as React from "react";
import { addDays, startOfWeek, toISODate, fromISODate } from "./dates";

/**
 * Arrow-key movement for a month grid, shared by every calendar in the app.
 *
 * A month grid used to put all ~35 days in the tab order. Reaching the 28th cost
 * twenty-seven presses, and someone who only wanted to get *past* the calendar to
 * the button underneath paid for the whole month one day at a time. That is
 * operable in the narrow sense and exhausting in every other sense.
 *
 * This is the keyboard behaviour a calendar is expected to have, and the one a
 * screen reader implies when it announces a grid of dates:
 *
 *   ← →        a day either side
 *   ↑ ↓        the same weekday, a week either side
 *   Home/End   the start and end of the current week
 *   PageUp/Dn  the same date a month either side
 *
 * The grid holds a single tab stop (see `roving` below), so Tab arrives at the
 * calendar once and leaves it once.
 *
 * Deliberately NOT `role="grid"`: these calendars render a flat run of cells
 * with no row elements, and a grid role without rows is a worse lie than no role
 * at all. The days stay ordinary buttons — named, pressable, and now navigable.
 */
export function dateForKey(key: string, from: Date): Date | null {
  switch (key) {
    case "ArrowLeft":
      return addDays(from, -1);
    case "ArrowRight":
      return addDays(from, 1);
    case "ArrowUp":
      return addDays(from, -7);
    case "ArrowDown":
      return addDays(from, 7);
    case "Home":
      return startOfWeek(from);
    case "End":
      return addDays(startOfWeek(from), 6);
    case "PageUp":
    case "PageDown": {
      const d = new Date(from);
      const target = from.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + (key === "PageUp" ? -1 : 1));
      // Clamp, so 31 January + a month lands on 28/29 February rather than
      // silently rolling over into March.
      const lastOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(target, lastOfMonth));
      d.setHours(0, 0, 0, 0);
      return d;
    }
    default:
      return null;
  }
}

/**
 * The single tab stop, and the day the arrows move from.
 *
 * `focused` is the day the grid will hand focus to when Tab lands on it — the
 * selected day where there is one, so a keyboard user arrives on their own
 * answer rather than at the top of the month.
 */
export function useRovingCalendar({
  open,
  selectedISO,
  fallbackISO,
  onMonthChange,
}: {
  /** Only steal focus while the calendar is actually showing. */
  open: boolean;
  /** The chosen day, if any. */
  selectedISO?: string;
  /** Where to start when nothing is chosen yet — usually today. */
  fallbackISO: string;
  /** Called when a key press moves out of the month on screen. */
  onMonthChange: (date: Date) => void;
}) {
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [focusedISO, setFocusedISO] = React.useState(selectedISO || fallbackISO);
  // Set only by a key press, so the grid doesn't yank focus on first paint or
  // when the day is chosen with a mouse.
  const pendingFocus = React.useRef(false);
  // The last day we know the grid actually rendered — see the guard below.
  const lastRendered = React.useRef(focusedISO);

  // Follow the selection when it changes from outside (a mouse click, a reset).
  React.useEffect(() => {
    if (!open) return;
    setFocusedISO(selectedISO || fallbackISO);
  }, [open, selectedISO, fallbackISO]);

  // Move real focus after the month has had a chance to re-render, so the
  // target button exists by the time we reach for it.
  React.useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    const target = gridRef.current?.querySelector<HTMLElement>(`[data-day="${focusedISO}"]`);
    if (target) {
      lastRendered.current = focusedISO;
      target.focus();
      return;
    }
    /**
     * The grid refused to render that day, so stand still.
     *
     * It happens where the calendar shows less than it computes: a `min` bound
     * that will not page back past today, or a week view holding seven days out
     * of a month's worth. Left alone, `focusedISO` would point at a button that
     * does not exist — and since the roving tab stop is "the day equal to
     * `focusedISO`", *no* cell would carry `tabIndex={0}` and Tab would skip the
     * whole calendar. Reverting to the last day we know is on screen keeps the
     * grid reachable; focus has not moved, because there was nowhere to move to.
     */
    setFocusedISO(lastRendered.current);
  }, [focusedISO]);

  /**
   * A grid always has exactly one tab stop — belt to the braces above.
   *
   * The revert only covers days lost to a key press. A day can also stop being
   * rendered because something outside changed underneath: the month cursor
   * moved, the selection was reset to a date in another month, the view flipped.
   * Running after every render costs one `querySelector` and means the calendar
   * can never end up unreachable, whatever route it took there.
   */
  React.useEffect(() => {
    const grid = gridRef.current;
    if (!open || !grid) return;
    if (grid.querySelector('[data-day][tabindex="0"]')) return;
    const first = grid.querySelector<HTMLElement>("[data-day]")?.getAttribute("data-day");
    if (first) {
      lastRendered.current = first;
      setFocusedISO(first);
    }
  });

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const from = fromISODate(focusedISO);
    const next = dateForKey(e.key, from);
    if (!next) return;
    e.preventDefault();
    // Stop the sheet or dialog behind from also acting on the same press.
    e.stopPropagation();
    if (next.getMonth() !== from.getMonth() || next.getFullYear() !== from.getFullYear()) {
      onMonthChange(next);
    }
    pendingFocus.current = true;
    setFocusedISO(toISODate(next));
  }

  return {
    gridRef,
    focusedISO,
    onKeyDown,
    /** Spread onto each day button. */
    dayProps: (iso: string) => ({
      "data-day": iso,
      tabIndex: iso === focusedISO ? 0 : -1,
    }),
  };
}
