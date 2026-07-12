"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, Minus, Check, Wallet, Leaf, Wheat, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FoodPhoto } from "@/components/menu/food-photo";
import { menuFor, hasRequiredAddOns, hasOptionalAddOns } from "@/data/menu";
import { program } from "@/data/program";
import { cn, formatCurrency } from "@/lib/utils";
import { fromISODate, isoWeekday, formatDayLong, WEEKDAY_SHORT } from "@/lib/dates";
import { isCutoffPassed } from "@/lib/cutoff";
import type { MenuItem, DietaryTag } from "@/data/types";
import type { DaySelections, PlanLine } from "./types";
import { AddOnSheet } from "./addon-sheet";

const TAG_ICON: Partial<Record<DietaryTag, React.ComponentType<{ className?: string }>>> = {
  Vegan: Leaf,
  Vegetarian: Leaf,
  "Gluten-Free": Wheat,
  Halal: ShieldCheck,
};

interface MenuStepProps {
  dates: string[];
  activeDate: string;
  setActiveDate: (iso: string) => void;
  selections: DaySelections;
  onAdd: (date: string, line: PlanLine) => void;
  onRemoveLast: (date: string, itemId: string) => void;
  onBack: () => void;
  onReview: () => void;
}

export function MenuStep({
  dates,
  activeDate,
  setActiveDate,
  selections,
  onAdd,
  onRemoveLast,
  onBack,
  onReview,
}: MenuStepProps) {
  const [loading, setLoading] = React.useState(true);
  const [sheetItem, setSheetItem] = React.useState<MenuItem | null>(null);

  // Skeleton on first load + whenever the active day changes (feels like fetch).
  React.useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [activeDate]);

  const dayDate = fromISODate(activeDate);
  const dayItems = menuFor("individual", isoWeekday(dayDate));
  const lines = selections[activeDate] ?? [];
  const daySpent = lines.reduce((s, l) => s + l.price, 0);
  const remaining = Math.max(0, program.subsidyPerDay - daySpent);
  const overage = Math.max(0, daySpent - program.subsidyPerDay);
  const cutoff = isCutoffPassed(activeDate);

  const totalLines = Object.values(selections).reduce((s, ls) => s + ls.length, 0);
  const daysWithItems = dates.filter((d) => (selections[d]?.length ?? 0) > 0).length;

  const activeIdx = dates.indexOf(activeDate);
  function step(delta: number) {
    const next = dates[activeIdx + delta];
    if (next) setActiveDate(next);
  }

  function countFor(itemId: string) {
    return lines.filter((l) => l.itemId === itemId).length;
  }

  function handlePlus(item: MenuItem) {
    if (hasRequiredAddOns(item) || hasOptionalAddOns(item)) {
      setSheetItem(item);
    } else {
      onAdd(activeDate, {
        uid: `${item.id}__${Date.now()}`,
        itemId: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
      });
    }
  }

  // Swipe between days.
  const touch = React.useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touch.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
    touch.current = null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to calendar"
          className="rounded-full border border-border bg-card touch-target p-1.5 text-foreground hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="font-display text-lg font-semibold tracking-tight">Build your meals</h2>
      </div>

      {/* Day scroller */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dates.map((iso) => {
          const d = fromISODate(iso);
          const active = iso === activeDate;
          const has = (selections[iso]?.length ?? 0) > 0;
          const dayCut = isCutoffPassed(iso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setActiveDate(iso)}
              className={cn(
                "relative flex min-w-[60px] flex-col items-center rounded-2xl border px-3 py-2 transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              <span className="text-2xs font-semibold uppercase">{WEEKDAY_SHORT[d.getDay()]}</span>
              <span className="font-display text-lg font-semibold leading-none">{d.getDate()}</span>
              {has ? (
                <Check className={cn("mt-1 size-3", active ? "text-primary-foreground" : "text-success")} />
              ) : (
                <span className={cn("mt-1 size-3", active ? "" : "")} />
              )}
              {dayCut ? (
                <span
                  className={cn(
                    "absolute right-1.5 top-1.5 size-1.5 rounded-full",
                    active ? "bg-white" : "bg-danger",
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Budget badge + cutoff warning */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold">{formatDayLong(dayDate)}</h3>
        {overage > 0 ? (
          <span className="flex items-center gap-1.5 rounded-full border border-warning-border bg-warning-bg px-3 py-1 text-[13px] font-semibold text-coral-deep">
            <Wallet className="size-3.5" />
            You pay {formatCurrency(overage)} for {WEEKDAY_SHORT[dayDate.getDay()]}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-info-border bg-info-bg px-3 py-1 text-[13px] font-semibold text-info">
            <Wallet className="size-3.5" />
            {formatCurrency(remaining)} left for {WEEKDAY_SHORT[dayDate.getDay()]}
          </span>
        )}
      </div>
      {cutoff ? (
        <div className="rounded-xl border border-danger-border bg-danger-bg px-3 py-2 text-2xs font-semibold text-danger">
          Cutoff passed. This day won&apos;t be ordered. You can still plan it, or deselect it in review.
        </div>
      ) : null}

      {/* Items */}
      <div className="space-y-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : dayItems.map((item, i) => {
              const count = countFor(item.id);
              const soldOut = i === 2; // deterministic demo sold-out
              // Hard block: a single item that can't fit a full day's subsidy.
              // Normal items may stack past the subsidy into "you pay".
              const overBudget = item.price > program.subsidyPerDay + 0.001;
              const disabled = soldOut || overBudget;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex gap-3 rounded-2xl border bg-card p-2.5 shadow-card transition-colors",
                    count > 0 ? "border-primary" : "border-border",
                    disabled && "opacity-60",
                  )}
                >
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                    <FoodPhoto src={item.image} alt={item.name} className="size-20" iconClassName="size-6" />
                    {soldOut ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xs font-bold uppercase text-white">
                        Sold out
                      </span>
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="truncate font-display text-sm font-semibold leading-tight">{item.name}</h4>
                      <span className="shrink-0 text-sm font-semibold nums">
                        {item.price === 0 ? "Free" : formatCurrency(item.price)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-2xs text-muted-foreground">{item.description}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {item.tags.slice(0, 2).map((tag) => {
                        const Icon = TAG_ICON[tag];
                        return (
                          <Badge key={tag} tone="brand" className="gap-1">
                            {Icon ? <Icon className="size-3" /> : null}
                            {tag}
                          </Badge>
                        );
                      })}
                      {hasRequiredAddOns(item) ? <Badge tone="yellow">Choose a side</Badge> : null}
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      {overBudget ? (
                        <span className="text-2xs font-semibold text-danger">
                          Out of budget · +{formatCurrency(item.price - program.subsidyPerDay)} over
                        </span>
                      ) : soldOut ? (
                        <span className="text-2xs font-semibold text-muted-foreground">Unavailable today</span>
                      ) : (
                        <span className="text-2xs text-muted-foreground">
                          {count > 0 ? `${count} added` : "Tap + to add"}
                        </span>
                      )}

                      {count > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => onRemoveLast(activeDate, item.id)}
                            className="flex size-11 items-center justify-center rounded-full sm:size-8 border-2 border-primary text-primary hover:bg-teal-wash"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="w-4 text-center text-sm font-bold nums">{count}</span>
                          <button
                            type="button"
                            aria-label={`Add one ${item.name}`}
                            onClick={() => handlePlus(item)}
                            className="flex size-11 items-center justify-center rounded-full sm:size-8 bg-coral text-white hover:bg-coral-deep disabled:opacity-40"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Add ${item.name}`}
                          disabled={disabled}
                          onClick={() => handlePlus(item)}
                          className="flex size-11 items-center justify-center rounded-full sm:size-9 bg-coral text-white shadow-sm transition-colors hover:bg-coral-deep disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                        >
                          <Plus className="size-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Day pager */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={activeIdx <= 0} onClick={() => step(-1)}>
          <ChevronLeft className="size-4" /> Prev day
        </Button>
        <span className="text-2xs text-muted-foreground">
          Day {activeIdx + 1} of {dates.length}
        </span>
        <Button variant="ghost" size="sm" disabled={activeIdx >= dates.length - 1} onClick={() => step(1)}>
          Next day <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Sticky review bar */}
      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-1 py-3 backdrop-blur">
        <span className="text-sm font-semibold">
          {totalLines} {totalLines === 1 ? "meal" : "meals"} · {daysWithItems}/{dates.length} days
        </span>
        <Button variant="teal" disabled={totalLines === 0} onClick={onReview}>
          Review week <ChevronRight className="size-4" />
        </Button>
      </div>

      {sheetItem ? (
        <AddOnSheet
          item={sheetItem}
          remaining={remaining}
          onClose={() => setSheetItem(null)}
          onAdd={(line) => {
            onAdd(activeDate, line);
            setSheetItem(null);
          }}
        />
      ) : null}
    </div>
  );
}
