"use client";

import * as React from "react";
import { X, Check } from "lucide-react";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
import { program } from "@/data/program";
import { formatCurrency, cn } from "@/lib/utils";
import { mealPool, hasAllergen, shortDate } from "./shared";

interface SwapSheetProps {
  dateISO: string;
  weekday: string;
  currentItemId?: string;
  favorites: string[];
  /** Override the header title (defaults to "Swap {weekday}"). */
  title?: string;
  /** Override the header subtitle (defaults to "Pick a meal for {date}"). */
  subtitle?: string;
  onClose: () => void;
  onPick: (itemId: string) => void;
}

/** Swap a day's meal — bottom sheet on mobile, centered modal on desktop. Favorites first, then the full menu. */
export function SwapSheet({ dateISO, weekday, currentItemId, favorites, title, subtitle, onClose, onPick }: SwapSheetProps) {
  const [shown, setShown] = React.useState(false);
  const [tab, setTab] = React.useState<"favorites" | "menu">("favorites");

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

  const favItems = favorites.map((id) => getItem(id)).filter(Boolean);
  // Items with the employee's saved allergens are never shown (not greyed).
  const list = (tab === "favorites" ? favItems : mealPool).filter((item) => item && !hasAllergen(item));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative flex max-h-[80vh] w-full max-w-[460px] flex-col rounded-t-3xl bg-card shadow-raised transition-all duration-300 sm:rounded-3xl",
          shown ? "translate-y-0 sm:opacity-100" : "translate-y-full sm:translate-y-2 sm:opacity-0",
        )}
      >
        <div className="shrink-0 px-4 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden" />
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight">{title ?? `Swap ${weekday}`}</h3>
              <p className="text-[13px] text-muted-foreground">
                {subtitle ?? `Pick a meal for ${shortDate(dateISO)}`}
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
          <div className="mt-3 inline-flex gap-1 rounded-full border border-border bg-card p-1">
            {(["favorites", "menu"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[13px] font-semibold capitalize transition-colors",
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "menu" ? "Full menu" : "Favorites"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-6">
          {list.map((item) => {
            if (!item) return null;
            const current = item.id === currentItemId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors",
                  current ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted",
                )}
              >
                <FoodPhoto src={item.image} alt={item.name} className="size-14 rounded-xl" iconClassName="size-5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{item.name}</span>
                    {current ? <Check className="size-4 shrink-0 text-primary" /> : null}
                  </div>
                  <p className="line-clamp-1 text-2xs text-muted-foreground">{item.description}</p>
                </div>
                {program.showPrices ? (
                  <span className="shrink-0 text-sm font-semibold nums">{formatCurrency(item.price)}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
