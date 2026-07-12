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
              "whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
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
