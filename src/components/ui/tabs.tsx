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
  return (
    <div className={cn("inline-flex gap-1 rounded-full border border-border bg-card p-1", className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
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
