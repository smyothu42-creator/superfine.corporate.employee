"use client";

import * as React from "react";
import { X, Check, ArrowRight } from "lucide-react";
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
  /**
   * When provided, the in-popup "Full menu" tab is replaced by a "Select from
   * full menu" action that closes the popup and hands off to the main menu page
   * (with the edited day + cart context preserved by the caller).
   */
  onFullMenu?: () => void;
}

/** Swap a day's meal — bottom sheet on mobile, centered modal on desktop. Favorites first, then the full menu. */
export function SwapSheet({ dateISO, weekday, currentItemId, favorites, title, subtitle, onClose, onPick, onFullMenu }: SwapSheetProps) {
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
  // When the full menu is handed off to the main page, the in-popup browse tab
  // is gone, so this sheet only ever lists the quick picks (favorites).
  const activeTab = onFullMenu ? "favorites" : tab;
  // Items with the employee's saved allergens are never shown (not greyed).
  const list = (activeTab === "favorites" ? favItems : mealPool).filter((item) => item && !hasAllergen(item));

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
          "relative flex max-h-[80dvh] w-full max-w-[460px] flex-col rounded-t-3xl bg-card shadow-raised transition-all duration-300 sm:rounded-3xl",
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
              className="rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          {onFullMenu ? (
            <div className="mt-3 space-y-3">
              <button
                type="button"
                onClick={onFullMenu}
                className="flex w-full items-center justify-between gap-2 rounded-2xl bg-primary px-4 py-3 text-left text-primary-foreground transition-colors hover:bg-teal-deep"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Select from full menu</span>
                  <span className="block text-2xs text-primary-foreground/80">
                    Browse everything for {shortDate(dateISO)}
                  </span>
                </span>
                <ArrowRight className="size-5 shrink-0" />
              </button>
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Or pick a favorite
              </p>
            </div>
          ) : (
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
          )}
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
