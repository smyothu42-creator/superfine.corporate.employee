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
  Pencil,
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
import { safeFavorites, formatAutoDays, type AutoConfig } from "./shared";
import { AutoDayPicker } from "./day-picker";

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
  // Narrowed to the days actually selected, not every day the company serves —
  // naming a day the employee just switched off would read as us ignoring it.
  const nextDelivery = React.useMemo(
    () => nextServiceDays(new Date(), config.days, 1)[0],
    [config.days],
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

      {/* Ordering days + meal pool share one card — the two settings a person
          tweaks after setup, kept together so the dashboard reads as one
          "what's on rotation" panel rather than a stack of boxes.
          Ordering days edits in place (behind Edit) rather than routing through
          the full setup wizard, since it's the setting that shifts week to week
          (a day off, a client lunch). */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <OrderingDaysCard config={config} setConfig={setConfig} />

        {/* Meal pool */}
        <div data-tour="dash-pool" className="border-t border-border p-5">
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

    </div>
  );
}

function sameDays(a: number[], b: number[]) {
  return a.length === b.length && a.every((d) => b.includes(d));
}

/**
 * Ordering days, guarded behind an explicit Edit. The schedule is the one thing
 * on this page a person tweaks casually and would hate to change by accident, so
 * the chips sit read-only until Edit is tapped; edits land on a draft and only
 * take effect on Save, with Cancel to back out. Same AutoDayPicker the setup
 * modal uses, so the editable chips look identical to where they first picked
 * them.
 */
function OrderingDaysCard({
  config,
  setConfig,
}: {
  config: AutoConfig;
  setConfig: (c: AutoConfig) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<number[]>(config.days);

  const dirty = !sameDays(draft, config.days);

  function startEdit() {
    setDraft(config.days);
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
  }
  function save() {
    setConfig({ ...config, days: draft });
    setEditing(false);
  }

  return (
    <div className="p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] font-semibold tracking-tight">Ordering days</p>
          <p className="mt-0.5 text-[13px] font-semibold text-teal-deep">
            {formatAutoDays(editing ? draft : config.days)}
          </p>
        </div>
        {editing ? null : (
          <Button
            variant="link"
            size="sm"
            onClick={startEdit}
            className="h-auto shrink-0 px-0"
          >
            <Pencil className="size-3.5" /> Edit
          </Button>
        )}
      </div>

      {editing ? (
        <>
          <p className="mb-3 text-2xs text-muted-foreground">
            Tap a day to turn ordering on or off. Changes apply to drafts that haven&apos;t been
            built yet.
          </p>
          <AutoDayPicker size="sm" days={draft} onChange={setDraft} />
          {!draft.length ? (
            <p className="mt-2 text-2xs font-semibold text-warning">
              No days selected — nothing will be ordered until you pick one.
            </p>
          ) : null}
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={cancel}>
              Cancel
            </Button>
            <Button variant="brand" size="sm" onClick={save} disabled={!dirty || !draft.length}>
              Save days
            </Button>
          </div>
        </>
      ) : (
        <AutoDayPicker size="sm" days={config.days} readOnly />
      )}
    </div>
  );
}

