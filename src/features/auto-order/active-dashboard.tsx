"use client";

import * as React from "react";
import {
  Check,
  X,
  Lock,
  Clock,
  RefreshCw,
  Settings2,
  Play,
  CalendarPlus,
  ShieldCheck,
  CalendarDays,
  MoreVertical,
} from "lucide-react";
import { addDays, fromISODate, toISODate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Notice } from "@/components/ui/notice";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { confirm } from "@/store/use-confirm-store";
import { toast } from "@/store/use-toast-store";
import { useAutoOrderStore } from "@/store/use-auto-order-store";
import { formatCurrency, cn } from "@/lib/utils";
import { isCutoffPassed } from "@/lib/cutoff";
import { SwapSheet } from "./swap-sheet";
import {
  generateWeek,
  weekTotal,
  weeklyBudget,
  safeFavorites,
  shortDate,
  dayMealIds,
  type AutoConfig,
  type PlanDay,
  type DayStatus,
} from "./shared";

const STATUS_META: Record<DayStatus, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "border-success-border bg-success-bg text-success" },
  review: { label: "Review", cls: "border-warning-border bg-warning-bg text-coral-deep" },
  skipped: { label: "Skipped", cls: "border-danger-border bg-danger-bg text-danger" },
  "sold-out": { label: "Sold out", cls: "border-warning-border bg-warning-bg text-coral-deep" },
  "day-off": { label: "Day off", cls: "border-border bg-muted text-muted-foreground" },
};

export function ActiveDashboard({
  config,
  setConfig,
  onEditSetup,
}: {
  config: AutoConfig;
  setConfig: (c: AutoConfig) => void;
  onEditSetup: () => void;
}) {
  // Demo: flag the last upcoming scheduled day as sold-out so the edge case shows.
  const soldOutSeed = React.useMemo(() => {
    const upcoming = generateWeek(config).filter((d) => d.status === "review");
    return upcoming.length ? upcoming[upcoming.length - 1].dateISO : undefined;
  }, [config]);

  // Each tab is a week; week 0 is the current (editable) week, 1+ are upcoming.
  const [weeks, setWeeks] = React.useState<Record<number, PlanDay[]>>(() => ({
    0: generateWeek(config, soldOutSeed),
  }));
  const [activeWeek, setActiveWeek] = React.useState(0);
  const [planCount, setPlanCount] = React.useState(4); // this week + 3 upcoming
  const [swapping, setSwapping] = React.useState<PlanDay | null>(null);

  const paused = config.status === "paused";
  const week = weeks[activeWeek] ?? weeks[0];

  const setWeek = React.useCallback(
    (updater: PlanDay[] | ((prev: PlanDay[]) => PlanDay[])) => {
      setWeeks((prev) => {
        const cur = prev[activeWeek] ?? [];
        const next = typeof updater === "function" ? (updater as (p: PlanDay[]) => PlanDay[])(cur) : updater;
        return { ...prev, [activeWeek]: next };
      });
    },
    [activeWeek],
  );

  function selectWeek(offset: number) {
    setWeeks((prev) => (prev[offset] ? prev : { ...prev, [offset]: generateWeek(config, undefined, offset) }));
    setActiveWeek(offset);
  }

  function planMore() {
    const offset = planCount;
    setPlanCount((c) => c + 1);
    selectWeek(offset);
    toast.success("Planning ahead", "We'll keep rotating your favorites each week.");
  }

  function updateDay(dateISO: string, patch: Partial<PlanDay>) {
    setWeek((prev) => prev.map((d) => (d.dateISO === dateISO ? { ...d, ...patch } : d)));
  }

  async function acceptSoldOutSwap(day: PlanDay) {
    const pool = safeFavorites(config.favorites);
    const next = pool.find((id) => id !== day.itemId) ?? pool[0];
    if (!next) return;
    const ok = await confirm({
      title: `Swap ${day.weekday}'s lunch?`,
      description: `We'll replace your sold-out pick with ${getItem(next)?.name}.`,
      confirmLabel: "Confirm swap",
    });
    if (!ok) return;
    updateDay(day.dateISO, {
      itemId: next,
      originalItemId: day.itemId,
      status: "review",
      userModified: true,
      kitchenReview: true,
    });
    toast.success("Swapped in your next favorite", getItem(next)?.name);
  }

  async function toggleAutoOrder(next: boolean) {
    if (next) {
      setConfig({ ...config, status: "active" });
      return;
    }
    const ok = await confirm({
      title: "Turn off Auto-Order?",
      description: "We'll keep your favorites and settings so you can switch it back on anytime.",
      tone: "danger",
      confirmLabel: "Turn off",
    });
    if (ok) setConfig({ ...config, status: "inactive" });
  }

  async function skipDay(day: PlanDay) {
    const ok = await confirm({
      title: `Skip ${day.weekday}?`,
      description: "You won't get lunch that day.",
      tone: "warning",
      confirmLabel: "Yes, skip",
      cancelLabel: "Keep it",
    });
    if (ok) updateDay(day.dateISO, { status: "skipped", itemId: undefined });
  }

  const visibleDays = week;
  const total = weekTotal(week);
  const budget = weeklyBudget(config);
  const soldOutDay = week.find((d) => d.status === "sold-out");
  const suggestedSwap = React.useMemo(() => {
    if (!soldOutDay) return undefined;
    const pool = safeFavorites(config.favorites);
    const id = pool.find((fid) => fid !== soldOutDay.itemId) ?? pool[0];
    return id ? getItem(id) : undefined;
  }, [soldOutDay, config.favorites]);
  const nextReview = week.find((d) => d.status === "review");
  const blockedFavorite = config.favorites.find((id) => !safeFavorites([id]).length);

  // Publish the weekly summary + toggle to the Topbar so the nav header adapts.
  const setAutoOrderHeader = useAutoOrderStore((s) => s.setHeader);
  const toggleRef = React.useRef(toggleAutoOrder);
  toggleRef.current = toggleAutoOrder;
  React.useEffect(() => {
    setAutoOrderHeader({
      total,
      budget,
      remaining: Math.max(0, budget - total),
      paused,
      onToggle: (next) => toggleRef.current(next),
    });
    return () => setAutoOrderHeader(null);
  }, [total, budget, paused, setAutoOrderHeader]);

  const weekTabs = React.useMemo(() => {
    const mon = fromISODate(weeks[0][0].dateISO);
    return Array.from({ length: planCount }, (_, w) => {
      if (w === 0) return { id: "0", label: "This week" };
      const start = addDays(mon, 7 * w);
      const end = addDays(start, 4);
      return { id: String(w), label: `${shortDate(toISODate(start))} – ${shortDate(toISODate(end))}` };
    });
  }, [planCount, weeks]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <CalendarDays className="size-5 text-primary" />
          Week of {shortDate(week[0].dateISO)}–{shortDate(week[week.length - 1].dateISO)}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={planMore}>
            <CalendarPlus className="size-4" /> Plan more weeks
          </Button>
          <Button variant="brand" size="sm" onClick={onEditSetup}>
            <Settings2 className="size-4" /> Edit Auto Ordering
          </Button>
        </div>
      </div>

      {/* Edge-case banners */}
      {blockedFavorite ? (
        <Notice tone="success">
          <ShieldCheck className="inline size-3.5" /> Allergy-safe mode is on —{" "}
          <strong>{getItem(blockedFavorite)?.name}</strong> contains {me.allergens.join(", ")} and is never
          auto-ordered.
        </Notice>
      ) : null}

      {!paused && nextReview ? (
        <div className="flex items-center gap-2 rounded-xl border border-warning-border bg-warning-bg px-3 py-2 text-[13px] font-semibold text-coral-deep">
          <Clock className="size-4 shrink-0" />
          Confirm {nextReview.weekday}&apos;s order before {program.individualSoftCutoff} or it auto-skips.
        </div>
      ) : null}

      {/* Week tabs — switch the orders shown below */}
      <div className="overflow-x-auto pb-1">
        <Tabs
          tabs={weekTabs}
          value={String(activeWeek)}
          onValueChange={(id) => selectWeek(Number(id))}
        />
      </div>

      {/* Day cards — single box, one row per day */}
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        {visibleDays.map((day) => (
          <DayCard
            key={day.dateISO}
            day={day}
            suggestedItem={day.status === "sold-out" ? suggestedSwap : undefined}
            onSwap={() => setSwapping(day)}
            onSkip={() => skipDay(day)}
            onUndoSkip={() => updateDay(day.dateISO, { status: "review" })}
            onAddOrder={() => setSwapping(day)}
            onAcceptSwap={() => acceptSoldOutSwap(day)}
          />
        ))}
      </div>

      {swapping ? (
        <SwapSheet
          dateISO={swapping.dateISO}
          weekday={swapping.weekday}
          currentItemId={swapping.itemId}
          favorites={config.favorites}
          onClose={() => setSwapping(null)}
          onPick={async (itemId) => {
            const ok = await confirm({
              title: `Swap ${swapping.weekday}'s lunch?`,
              description: `Order ${getItem(itemId)?.name} for ${shortDate(swapping.dateISO)}?`,
              confirmLabel: "Confirm swap",
            });
            if (!ok) return;
            updateDay(swapping.dateISO, {
              itemId,
              originalItemId: swapping.itemId ?? swapping.originalItemId,
              status: "review",
              userModified: true,
              kitchenReview: swapping.status === "sold-out",
            });
            setSwapping(null);
            toast.success(`${swapping.weekday} updated`, getItem(itemId)?.name);
          }}
        />
      ) : null}
    </div>
  );
}

function DayCard({
  day,
  suggestedItem,
  onSwap,
  onSkip,
  onUndoSkip,
  onAddOrder,
  onAcceptSwap,
}: {
  day: PlanDay;
  suggestedItem?: ReturnType<typeof getItem>;
  onSwap: () => void;
  onSkip: () => void;
  onUndoSkip: () => void;
  onAddOrder: () => void;
  onAcceptSwap: () => void;
}) {
  const item = day.itemId ? getItem(day.itemId) : undefined;
  const meta = STATUS_META[day.status];
  const soldOut = day.status === "sold-out";
  const mealIds = dayMealIds(day);
  const multi = mealIds.length > 1;
  const mealTotal = mealIds.reduce((s, id) => s + (getItem(id)?.price ?? 0), 0);
  const reviewing = day.kitchenReview === true;
  const badge = reviewing
    ? { label: "Reviewing", cls: "border-warning-border bg-warning-bg text-coral-deep" }
    : meta;
  const cutoffLabel = isCutoffPassed(day.dateISO) ? "Cutoff passed" : `Review by cutoff`;

  return (
    <div
      className={cn(
        "px-3 py-4 transition-colors",
        day.status === "skipped" && "opacity-70",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 shrink-0 text-center">
          <p className="text-2xs font-semibold uppercase text-muted-foreground">{day.weekday}</p>
          <p className="font-display text-lg font-semibold leading-none">{shortDate(day.dateISO).split(" ")[1]}</p>
        </div>

        {day.status === "day-off" ? (
          <div className="flex flex-1 items-center justify-between">
            <span className="text-[13px] text-muted-foreground">No order (day off)</span>
            <Button variant="ghost" size="sm" onClick={onAddOrder}>
              <CalendarPlus className="size-4" /> Add order
            </Button>
          </div>
        ) : (
          <>
            {multi ? (
              <div className="flex shrink-0 -space-x-3">
                {mealIds.slice(0, 3).map((id, idx) => (
                  <FoodPhoto
                    key={idx}
                    src={getItem(id)?.image}
                    alt={getItem(id)?.name ?? ""}
                    className={cn(
                      "size-12 rounded-full ring-2 ring-card",
                      day.status === "skipped" && "opacity-70 grayscale",
                    )}
                    iconClassName="size-4"
                  />
                ))}
              </div>
            ) : (
              <FoodPhoto
                src={item?.image}
                alt={item?.name ?? ""}
                className={cn("size-12 rounded-full", soldOut && "opacity-50 grayscale")}
                iconClassName="size-4"
              />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm font-semibold",
                  (day.status === "skipped" || soldOut) && "text-muted-foreground line-through",
                )}
              >
                {multi ? `${mealIds.length} meal orders` : item?.name ?? "—"}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", badge.cls)}>
                  {badge.label}
                </span>
                {day.status === "review" ? (
                  <span className="text-2xs text-muted-foreground">{cutoffLabel}</span>
                ) : null}
                {day.originalItemId ? (
                  <span className="text-2xs text-muted-foreground">· swapped</span>
                ) : null}
              </div>
            </div>
            {mealIds.length > 0 && program.showPrices ? (
              <span className="shrink-0 text-sm font-semibold nums">{formatCurrency(mealTotal)}</span>
            ) : null}
            {day.status === "review" ? <DayActionsMenu onSwap={onSwap} onSkip={onSkip} /> : null}
          </>
        )}
      </div>

      {/* Per-status actions */}
      {soldOut ? (
        suggestedItem ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-muted/60 px-2.5 py-2">
            <RefreshCw className="size-3.5 shrink-0 text-primary" />
            <FoodPhoto
              src={suggestedItem.image}
              alt={suggestedItem.name}
              className="size-9 rounded-lg"
              iconClassName="size-3.5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-medium text-muted-foreground">We&apos;ll swap in</p>
              <p className="truncate text-[13px] font-semibold leading-tight">{suggestedItem.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <MiniBtn onClick={onAcceptSwap} icon={Check} label="Accept" primary />
              <MiniBtn onClick={onSwap} icon={RefreshCw} label="Pick other" />
            </div>
            {program.showPrices ? (
              <span className="shrink-0 text-[13px] font-semibold nums">{formatCurrency(suggestedItem.price)}</span>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-end gap-1.5">
            <MiniBtn onClick={onAcceptSwap} icon={Check} label="Accept" primary />
            <MiniBtn onClick={onSwap} icon={RefreshCw} label="Pick other" />
          </div>
        )
      ) : null}
      {day.status === "skipped" ? (
        <div className="mt-3">
          <ActionBtn onClick={onUndoSkip} icon={Play} label="Undo skip — order again" full />
        </div>
      ) : null}
      {day.status === "confirmed" ? (
        <p className="mt-2 flex items-center gap-1 text-2xs text-muted-foreground">
          <Lock className="size-3" /> Locked in — cutoff passed
        </p>
      ) : null}
    </div>
  );
}

function ActionBtn({
  onClick,
  icon: Icon,
  label,
  primary,
  full,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1 rounded-full border px-2.5 py-2.5 text-2xs font-semibold transition-colors",
        full && "w-full",
        primary
          ? "border-primary bg-primary text-primary-foreground hover:bg-teal-deep"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-3" /> {label}
    </button>
  );
}

/** Compact pill button — used inline in the sold-out swap row. */
function MiniBtn({
  onClick,
  icon: Icon,
  label,
  primary,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-2xs font-semibold transition-colors",
        primary
          ? "border-primary bg-primary text-primary-foreground hover:bg-teal-deep"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-3" /> {label}
    </button>
  );
}

/** Kebab menu for a review day — Swap / Skip in a dropdown instead of inline buttons. */
function DayActionsMenu({ onSwap, onSkip }: { onSwap: () => void; onSkip: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Day options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex size-8 items-center justify-center rounded-full border transition-colors",
          open
            ? "border-primary bg-teal-wash text-teal-deep"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <MoreVertical className="size-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <DayMenuItem
            icon={RefreshCw}
            label="Swap"
            onClick={() => {
              setOpen(false);
              onSwap();
            }}
          />
          <DayMenuItem
            icon={X}
            label="Skip"
            onClick={() => {
              setOpen(false);
              onSkip();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function DayMenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-semibold text-foreground hover:bg-muted"
    >
      <Icon className="size-3.5 text-muted-foreground" /> {label}
    </button>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold">{label}</span>
          <span className="block truncate text-2xs text-muted-foreground">{value}</span>
        </span>
      </span>
      <button type="button" onClick={onAction} className="shrink-0 text-[13px] font-semibold text-primary hover:underline">
        {actionLabel}
      </button>
    </div>
  );
}
