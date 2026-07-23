"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { id: string; label: string }[];
  value: string;
  onValueChange: (id: string) => void;
  className?: string;
}

/** Pill tab bar (employee detail). */
function Tabs({ tabs, value, onValueChange, className }: TabsProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  /**
   * Left/Right (and Home/End) move between tabs; Tab moves past the whole strip.
   *
   * This is not a nicety — a tab strip is one control, not one control per tab.
   * Announcing "tab, 1 of 3" and then not answering the arrow keys leaves a
   * screen-reader user pressing the keys the announcement just promised and
   * getting nothing. It also meant the three Orders filters cost three Tab
   * presses to walk past on the way to the list they filter.
   */
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const jump = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (!delta && jump === null) return;
    e.preventDefault();
    const from = tabs.findIndex((t) => t.id === value);
    const next = jump ?? (from + delta + tabs.length) % tabs.length;
    const target = tabs[next];
    if (!target) return;
    onValueChange(target.id);
    // Follow the selection with focus, so the next arrow press continues from
    // where the user actually is.
    ref.current?.querySelector<HTMLElement>(`[data-tab-id="${target.id}"]`)?.focus();
  }

  return (
    <div
      ref={ref}
      onKeyDown={onKeyDown}
      className={cn("inline-flex gap-1 rounded-full border border-border bg-card p-1", className)}
      role="tablist"
    >
      {tabs.map((tab, i) => {
        const active = tab.id === value;
        // The roving stop has to land *somewhere*. If `value` ever fails to
        // match a tab — a stale filter, a route that renamed one — every tab
        // would be `tabIndex={-1}` and the strip would drop out of the tab order
        // altogether, which is a worse failure than showing the wrong tab as
        // current. The first tab holds the stop in that case.
        const stop = active || (i === 0 && !tabs.some((t) => t.id === value));
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab-id={tab.id}
            aria-selected={active}
            // Roving tab stop: the strip takes one Tab press, and it lands on
            // the tab that is currently showing.
            tabIndex={stop ? 0 : -1}
            onClick={() => onValueChange(tab.id)}
            className={cn(
              // Taller on phones than the label strictly needs: with the
              // wrapper's `p-1` and border this brings the whole control to
              // ~46px, the touch-target floor it previously sat 12px under.
              // Height only — the horizontal padding and type size stay put,
              // because on the menu this sits beside the date pill and any
              // extra width drops that pill onto a second line. From `sm` up a
              // mouse is doing the aiming, so the tighter proportions return.
              "whitespace-nowrap rounded-full px-2 py-2.5 text-xs font-semibold transition-colors sm:px-4 sm:py-1.5 sm:text-[13px]",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs };
