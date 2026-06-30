"use client";

import * as React from "react";
import Link from "next/link";
import {
  Repeat,
  ShieldCheck,
  BellRing,
  Mail,
  CheckCircle2,
  CalendarClock,
  ChevronRight,
  Lock,
  X,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
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
  // Cutoff is 4PM the day before delivery; the draft is created 24h earlier —
  // i.e. two days before delivery at 4PM (Mon delivery → Sat 4PM draft).
  const nextDelivery = React.useMemo(
    () => nextServiceDays(new Date(), program.serviceDayNums, 1)[0],
    [],
  );
  const draftDay = nextDelivery ? addDays(nextDelivery, -2) : undefined;

  const [howItWorksOpen, setHowItWorksOpen] = React.useState(false);

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
      onHowItWorks: () => setHowItWorksOpen(true),
      onStop: paused ? undefined : stopOrdering,
    });
    return () => setAutoOrderHeader(null);
  }, [pool.length, onEditSetup, setAutoOrderHeader, paused, stopOrdering]);

  return (
    <div className="w-full space-y-4">
      {blockedFavorite ? (
        <Notice tone="success">
          <ShieldCheck className="inline size-3.5" /> Allergy-safe mode is on —{" "}
          <strong>{getItem(blockedFavorite)?.name}</strong> contains {me.allergens.join(", ")} and is never
          auto-ordered.
        </Notice>
      ) : null}

      {/* Status hero — "Auto-Order is on" + Stop ordering, with Next up (and the
          Review-drafts link) tucked inside the box. */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <div
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
                : "Nothing to do right now — we'll build each day's order and email you to review it before the cutoff."}
            </p>
          </div>
        </div>

        {/* Next up — the upcoming draft, with a compact Review action. */}
        {!paused && nextDelivery && draftDay ? (
          <div className="flex items-center gap-3 border-t border-border px-6 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-wash text-primary">
              <CalendarClock className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
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
      <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-overline">Your meal pool</p>
            <span className="text-2xs font-semibold text-muted-foreground nums">
              {pool.length} {pool.length === 1 ? "meal" : "meals"}
            </span>
          </div>
          <Button variant="brand" size="sm" onClick={onEditSetup}>
            <Settings2 className="size-4" /> Edit Auto Order
          </Button>
        </div>
        {pool.length ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pool.map((id) => {
              const item = getItem(id);
              if (!item) return null;
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5"
                >
                  <FoodPhoto src={item.image} alt={item.name} className="size-11 rounded-xl" iconClassName="size-4" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{item.name}</p>
                    <p className="truncate text-2xs text-muted-foreground">{item.cuisine}</p>
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

      {howItWorksOpen ? <HowItWorksModal onClose={() => setHowItWorksOpen(false)} /> : null}
    </div>
  );
}

/** "How auto-order works" — opened from the topbar's How it works button. */
function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const [shown, setShown] = React.useState(false);

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

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="How auto-order works">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative w-full max-w-md rounded-t-3xl bg-card shadow-raised transition-all duration-300 sm:rounded-3xl",
          shown ? "translate-y-0 sm:opacity-100" : "translate-y-full sm:translate-y-2 sm:opacity-0",
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Repeat className="size-5 text-primary" /> How auto-order works
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <ol className="space-y-3 p-5">
          <Step
            n={1}
            icon={Repeat}
            title="Auto-Order stays active in the background"
            desc="No per-day schedule to manage. We pick from your meal pool automatically."
          />
          <Step
            n={2}
            icon={BellRing}
            title="24 hours before each cutoff, a draft is created"
            desc="You get an email: “Your order is ready. Tap to review or change.”"
          />
          <Step
            n={3}
            icon={Mail}
            title="Review it in My Orders"
            desc="Keep it, swap the meal, add sides or beverages, or cancel — your call."
          />
          <Step
            n={4}
            icon={CheckCircle2}
            title="At the cutoff, the draft confirms itself"
            desc="Do nothing and it's locked in. Already ordered yourself? We skip it — no duplicate."
            last
          />
        </ol>
      </div>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  desc,
  last,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-wash text-primary">
          <Icon className="size-4" />
        </span>
        {!last ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
      </div>
      <div className="min-w-0 pb-1">
        <p className="text-[13px] font-semibold">
          <span className="mr-1.5 text-muted-foreground nums">{n}.</span>
          {title}
        </p>
        <p className="mt-0.5 text-2xs text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}
