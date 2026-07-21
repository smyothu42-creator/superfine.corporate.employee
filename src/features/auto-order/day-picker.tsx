"use client";

import { cn } from "@/lib/utils";
import { selectableAutoDays, weekdayLabel } from "./shared";

/**
 * Which weekdays Auto-Order runs on.
 *
 * Shared by the setup modal and the dashboard so the two can't drift into
 * disagreeing about what a selected day looks like — this is the one control in
 * the feature that a person edits twice (once at setup, again when their week
 * changes), and it should be the same control both times.
 *
 * Rendered as a toggle row rather than checkboxes: a week is a shape people
 * read at a glance, and the gaps in it are the information.
 */
export function AutoDayPicker({
  days,
  onChange,
  /** Compact sizing for the dashboard card, where it sits under a heading. */
  size = "lg",
  /**
   * Show the week as a static summary rather than a set of toggles. The
   * dashboard parks the picker here until the person taps Edit, so a stray tap
   * can't quietly reschedule their week — the same control, minus the fill,
   * the border weight and the tap target that say "editable".
   */
  readOnly = false,
}: {
  days: number[];
  onChange?: (days: number[]) => void;
  size?: "sm" | "lg";
  readOnly?: boolean;
}) {
  function toggle(day: number) {
    onChange?.(
      days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day].sort((a, b) => a - b),
    );
  }

  const sizing =
    size === "lg" ? "min-w-16 px-3 py-2.5 text-sm" : "min-w-14 px-2.5 py-2 text-[13px]";

  return (
    <div role="group" aria-label="Days to auto-order" className="flex flex-wrap gap-2">
      {selectableAutoDays.map((day) => {
        const active = days.includes(day);

        // Read-only: flat chips, no border, off-days ghosted. Deliberately calm
        // so the editable state's fill + heavy border reads as a mode change.
        if (readOnly) {
          return (
            <span
              key={day}
              aria-label={`${weekdayLabel(day)}: ${active ? "ordering on" : "off"}`}
              className={cn(
                "flex-1 rounded-2xl text-center font-semibold",
                sizing,
                active
                  ? "bg-teal-wash text-teal-deep"
                  : "text-muted-foreground/50",
              )}
            >
              {weekdayLabel(day)}
            </span>
          );
        }

        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            // Pressed rather than a checkbox role: these read as toggles, and
            // aria-pressed is what announces the on/off state that the fill is
            // carrying visually.
            aria-pressed={active}
            className={cn(
              "flex-1 rounded-2xl border-2 font-semibold transition-colors",
              sizing,
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {weekdayLabel(day)}
          </button>
        );
      })}
    </div>
  );
}
