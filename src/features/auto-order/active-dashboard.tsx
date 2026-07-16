"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  CalendarClock,
  ChevronRight,
  Lock,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem, summarizeAddOns } from "@/data/menu";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { confirm } from "@/store/use-confirm-store";
import { useAutoOrderStore } from "@/store/use-auto-order-store";
import { formatCurrency, cn } from "@/lib/utils";
import { nextServiceDays, addDays, formatDay, formatDayLong } from "@/lib/dates";
import { safeFavorites, type AutoConfig } from "./shared";

export function ActiveDashboard({
  config,
  setConfig,
  onEditSetup,
}: {
  config: AutoConfig;
  setConfig: (c: AutoConfig) => void;
  onEditSetup: () => void;
}) {
  const paused = config.status === "paused";
  const pool = safeFavorites(config.favorites);
  const blockedFavorite = config.favorites.find((id) => !safeFavorites([id]).length);

  // The next service day we'll build a draft for, and when that draft lands.
  // Cutoff is 4PM the day before delivery; the draft is created 48h before that
  // cutoff — i.e. three days before delivery at 4PM (Mon delivery → Fri 4PM draft).
  const nextDelivery = React.useMemo(
    () => nextServiceDays(new Date(), program.serviceDayNums, 1)[0],
    [],
  );
  const draftDay = nextDelivery ? addDays(nextDelivery, -3) : undefined;

  const stopOrdering = React.useCallback(async () => {
    const ok = await confirm({
      title: "Turn off auto-order?",
      description: "We'll keep your meals and settings so you can turn it back on anytime.",
      tone: "danger",
      confirmLabel: "Turn off auto order",
    });
    if (ok) setConfig({ ...config, status: "inactive" });
  }, [config, setConfig]);

  // Publish pool size + Edit / How-it-works / Turn-off actions to the Topbar nav.
  const setAutoOrderHeader = useAutoOrderStore((s) => s.setHeader);
  React.useEffect(() => {
    setAutoOrderHeader({
      poolCount: pool.length,
      onEdit: onEditSetup,
      onStop: paused ? undefined : stopOrdering,
    });
    return () => setAutoOrderHeader(null);
  }, [pool.length, onEditSetup, setAutoOrderHeader, paused, stopOrdering]);

  return (
    <div className="w-full space-y-4">
      {blockedFavorite ? (
        <Notice tone="success">
          <ShieldCheck className="inline size-3.5" /> Allergy-safe mode is on.{" "}
          <strong>{getItem(blockedFavorite)?.name}</strong> contains {me.allergens.join(", ")} and is never
          auto-ordered.
        </Notice>
      ) : null}

      {/* Status hero — "Auto-Order is on" + Stop ordering, with Next up (and the
          Review-drafts link) tucked inside the box. */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <div
          data-tour="dash-hero"
          className={cn(
            "flex items-start gap-3 px-6 py-5",
            paused ? "bg-muted text-foreground" : "bg-hero-yellow text-teal-deep",
          )}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/40">
            {paused ? <Lock className="size-5" /> : <CheckCircle2 className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold tracking-tight">
              {paused ? "Auto-Order is paused" : "Auto-Order is on"}
            </h3>
            <p className="mt-0.5 text-[13px]">
              {paused
                ? "No drafts will be created until you switch it back on."
                : "Nothing to do right now. We'll build each day's order and email you to review it before the cutoff."}
            </p>
          </div>
        </div>

        {/* Next up — the upcoming draft, with a compact Review action. */}
        {!paused && nextDelivery && draftDay ? (
          <div data-tour="dash-next-up" className="flex items-center gap-3 border-t border-border px-6 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-wash text-primary">
              <CalendarClock className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-semibold text-muted-foreground">
                Next up
              </p>
              <p className="text-[13px] font-semibold">Lunch for {formatDayLong(nextDelivery)}</p>
              <p className="mt-0.5 text-2xs text-muted-foreground">
                Draft lands {formatDay(draftDay)} · 4:00 PM
              </p>
            </div>
            <Link
              href="/orders"
              className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-teal-deep transition-colors hover:bg-muted"
            >
              Review <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </div>
        ) : null}
      </div>

      {/* Meal pool */}
      <div data-tour="dash-pool" className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-overline">Your meal pool</p>
            <span className="text-2xs font-semibold text-muted-foreground nums">
              {pool.length} {pool.length === 1 ? "meal" : "meals"}
            </span>
          </div>
          <Button variant="brand" size="sm" data-tour="dash-edit" onClick={onEditSetup}>
            <Settings2 className="size-4" /> Edit Auto Order
          </Button>
        </div>
        {pool.length ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pool.map((id) => {
              const item = getItem(id);
              if (!item) return null;
              const addOns = config.customizations?.[id];
              const addOnSummary = addOns ? summarizeAddOns(addOns) : "";
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5"
                >
                  <FoodPhoto src={item.image} alt={item.name} className="size-11 rounded-xl" iconClassName="size-4" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{item.name}</p>
                    <p className="truncate text-2xs text-muted-foreground">
                      {addOnSummary || item.cuisine}
                    </p>
                  </div>
                  {program.showPrices ? (
                    <span className="shrink-0 text-[13px] font-semibold nums">{formatCurrency(item.price)}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            No meals in your rotation yet.{" "}
            <button type="button" onClick={onEditSetup} className="font-semibold text-primary hover:underline">
              Add some
            </button>
            .
          </p>
        )}
      </div>

    </div>
  );
}

