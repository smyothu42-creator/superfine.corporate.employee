"use client";

import * as React from "react";
import {
  Check,
  X,
  ChevronRight,
  Pencil,
  Trash2,
  CreditCard,
  Mail,
  Repeat,
  CalendarPlus,
  AlertTriangle,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { companyCovers, employeeCovers } from "@/lib/subsidy";
import { useUiStore } from "@/store/use-ui-store";
import { useSessionStore, isSubsidized } from "@/store/use-session-store";
import { cn, formatCurrency } from "@/lib/utils";
import { startOfToday, toISODate, fromISODate, formatDay, formatDayLong } from "@/lib/dates";
import { isCutoffPassed, nextOpenDays } from "@/lib/cutoff";
import type { DaySelections, PlanLine, PlanStep } from "./types";
import { CalendarStep } from "./calendar-step";
import { MenuStep } from "./menu-step";

const STEPS: { id: PlanStep; label: string }[] = [
  { id: "calendar", label: "Dates" },
  { id: "menu", label: "Meals" },
  { id: "review", label: "Review" },
  { id: "checkout", label: "Checkout" },
  { id: "done", label: "Done" },
];

export function PlanWeekFlow() {
  const [mounted, setMounted] = React.useState(false);
  const [todayISO, setTodayISO] = React.useState("");

  const [step, setStep] = React.useState<PlanStep>("calendar");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [selections, setSelections] = React.useState<DaySelections>({});
  const [activeDate, setActiveDate] = React.useState("");
  const [placing, setPlacing] = React.useState(false);
  const [recurring, setRecurring] = React.useState(false);

  // Subscribed, not read via getState: companyCovers() consults the session
  // itself, so without this the totals would keep quoting the old entitlement
  // after a guest verifies into a corporate account.
  const subsidyMode = useUiStore((s) => s.subsidyMode);
  const corporate = isSubsidized(useSessionStore((s) => s.account));

  React.useEffect(() => {
    setTodayISO(toISODate(startOfToday()));
    setMounted(true);
  }, []);

  const dates = React.useMemo(() => [...selected].sort(), [selected]);

  // ---- selection helpers ----
  function toggleDate(iso: string) {
    setSelected((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]));
  }
  function selectWeek(weekDates: string[]) {
    setSelected((prev) => Array.from(new Set([...prev, ...weekDates])));
  }
  function clearAll() {
    setSelected([]);
    setSelections({});
  }
  function addLine(date: string, line: PlanLine) {
    setSelections((prev) => ({ ...prev, [date]: [...(prev[date] ?? []), line] }));
  }
  function removeLast(date: string, itemId: string) {
    setSelections((prev) => {
      const ls = prev[date] ?? [];
      const idx = [...ls].reverse().findIndex((l) => l.itemId === itemId);
      if (idx === -1) return prev;
      const realIdx = ls.length - 1 - idx;
      return { ...prev, [date]: ls.filter((_, i) => i !== realIdx) };
    });
  }
  function clearDay(date: string) {
    setSelections((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
    setSelected((prev) => prev.filter((d) => d !== date));
  }

  function goMenu() {
    const first = dates.find((d) => (selections[d]?.length ?? 0) >= 0) ?? dates[0];
    setActiveDate(first ?? "");
    setStep("menu");
  }

  // ---- derived order math ----
  const orderedDays = dates.filter((d) => (selections[d]?.length ?? 0) > 0);
  const cutoffDays = orderedDays.filter((d) => isCutoffPassed(d));
  const payableDays = orderedDays.filter((d) => !isCutoffPassed(d));

  function dayTotal(d: string) {
    return (selections[d] ?? []).reduce((s, l) => s + l.price, 0);
  }
  const subtotal = payableDays.reduce((s, d) => s + dayTotal(d), 0);
  // Routed through lib/subsidy rather than reading program.subsidyPerDay directly:
  // that's the only path that checks whether *this viewer* is entitled to a
  // subsidy at all. Doing the min()/max() inline here quoted every guest and
  // individual a corporate price.
  const subsidy = payableDays.reduce((s, d) => s + companyCovers(dayTotal(d), subsidyMode), 0);
  const youPay = payableDays.reduce((s, d) => s + employeeCovers(dayTotal(d), subsidyMode), 0);
  const allPastCutoff = orderedDays.length > 0 && payableDays.length === 0;

  async function placeOrder() {
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 900));
    setPlacing(false);
    setStep("done");
  }

  if (!mounted) {
    return (
      <PhoneFrame stepIndex={0}>
        <div className="space-y-3">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-10 rounded-full" />
        </div>
      </PhoneFrame>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <PhoneFrame stepIndex={stepIndex}>
      {step === "calendar" ? (
        <CalendarStep
          todayISO={todayISO}
          selected={selected}
          onToggle={toggleDate}
          onSelectWeek={selectWeek}
          onClearAll={clearAll}
          onContinue={goMenu}
        />
      ) : null}

      {step === "menu" ? (
        <MenuStep
          dates={dates}
          activeDate={activeDate || dates[0]}
          setActiveDate={setActiveDate}
          selections={selections}
          onAdd={addLine}
          onRemoveLast={removeLast}
          onBack={() => setStep("calendar")}
          onReview={() => setStep("review")}
        />
      ) : null}

      {step === "review" ? (
        <ReviewStep
          dates={orderedDays}
          selections={selections}
          cutoffDays={cutoffDays}
          allPastCutoff={allPastCutoff}
          todayISO={todayISO}
          subtotal={subtotal}
          subsidy={subsidy}
          youPay={youPay}
          corporate={corporate}
          dayTotal={dayTotal}
          onEditDay={(d) => {
            setActiveDate(d);
            setStep("menu");
          }}
          onRemoveDay={clearDay}
          onBack={() => setStep("menu")}
          onContinue={() => setStep("checkout")}
          onPickNewDates={() => setStep("calendar")}
        />
      ) : null}

      {step === "checkout" ? (
        <CheckoutStep
          payableDays={payableDays}
          cutoffDays={cutoffDays}
          youPay={youPay}
          subsidy={subsidy}
          corporate={corporate}
          placing={placing}
          onBack={() => setStep("review")}
          onConfirm={placeOrder}
        />
      ) : null}

      {step === "done" ? (
        <ConfirmationStep
          orderedDays={orderedDays}
          payableDays={payableDays}
          cutoffDays={cutoffDays}
          recurring={recurring}
          setRecurring={setRecurring}
          onRestart={() => {
            clearAll();
            setRecurring(false);
            setStep("calendar");
          }}
        />
      ) : null}
    </PhoneFrame>
  );
}

/* ----------------------------------------------------------------------- */
/* Mobile phone frame + step progress                                       */
/* ----------------------------------------------------------------------- */

function PhoneFrame({ children, stepIndex }: { children: React.ReactNode; stepIndex: number }) {
  // The allowance pill is a statement about an entitlement. Shown to someone who
  // has none, it's just a false promise, so the strip carries only the platform.
  const corporate = isSubsidized(useSessionStore((s) => s.account));

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <div className="overflow-hidden rounded-[28px] border border-border bg-background shadow-raised">
        {/* status strip */}
        <div className="flex items-center justify-between bg-sidebar px-5 py-2.5 text-2xs font-semibold text-sidebar-foreground">
          <span>{program.platform}</span>
          {corporate ? (
            <span>{program.company} · {formatCurrency(program.subsidyPerDay)}/day</span>
          ) : null}
        </div>
        {/* progress */}
        <div className="flex gap-1.5 px-4 pt-3">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= stepIndex ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        <div className="max-h-[78dvh] overflow-y-auto px-4 pb-4 pt-3">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Review                                                                   */
/* ----------------------------------------------------------------------- */

function ReviewStep({
  dates,
  selections,
  cutoffDays,
  allPastCutoff,
  todayISO,
  subtotal,
  subsidy,
  youPay,
  corporate,
  dayTotal,
  onEditDay,
  onRemoveDay,
  onBack,
  onContinue,
  onPickNewDates,
}: {
  dates: string[];
  selections: DaySelections;
  cutoffDays: string[];
  allPastCutoff: boolean;
  todayISO: string;
  subtotal: number;
  subsidy: number;
  youPay: number;
  corporate: boolean;
  dayTotal: (d: string) => number;
  onEditDay: (d: string) => void;
  onRemoveDay: (d: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onPickNewDates: () => void;
}) {
  const suggestions = nextOpenDays(todayISO, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="rounded-full border border-control bg-card touch-target p-1.5 text-foreground hover:bg-muted"
        >
          <ChevronRight className="size-4 rotate-180" />
        </button>
        <h2 className="font-display text-lg font-semibold tracking-tight">Your week</h2>
      </div>

      {allPastCutoff ? (
        <Notice tone="warning">
          <strong>Cannot place this order.</strong> The cutoff (4:00 PM the day before) has passed for every
          day you picked. Try one of the next open days below.
        </Notice>
      ) : cutoffDays.length ? (
        <Notice tone="warning">
          <strong>
            {cutoffDays.map((d) => formatDay(fromISODate(d))).join(", ")} cutoff{" "}
            {cutoffDays.length === 1 ? "has" : "have"} passed.
          </strong>{" "}
          {cutoffDays.length === 1 ? "It" : "They"} will <strong>NOT</strong> be ordered. You can still
          continue with the remaining {dates.length - cutoffDays.length} day
          {dates.length - cutoffDays.length === 1 ? "" : "s"}.
        </Notice>
      ) : null}

      {/* Day-by-day */}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {dates.map((d) => {
          const lines = selections[d] ?? [];
          const cut = cutoffDays.includes(d);
          return (
            <div key={d} className={cn("p-3", cut && "bg-danger-bg/40")}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {formatDay(fromISODate(d))}
                  {cut ? (
                    <span className="rounded-full bg-danger-bg px-2 py-0.5 text-2xs font-semibold text-danger">
                      Cutoff passed
                    </span>
                  ) : null}
                </span>
                {/* Edit and Remove sit side by side, so they grow for real
                    rather than wearing invisible 44px boxes that would overlap
                    — a tap meant for Edit must never delete the day. */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEditDay(d)}
                    aria-label={`Edit ${d}`}
                    className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground sm:size-8"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveDay(d)}
                    aria-label={`Remove ${d}`}
                    className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-danger sm:size-8"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <ul className="mt-1.5 space-y-1">
                {lines.map((l) => (
                  <li key={l.uid} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className={cn("min-w-0 truncate", cut && "text-muted-foreground line-through")}>
                      {l.name}
                      {l.addOnLabel ? <span className="text-muted-foreground"> · {l.addOnLabel}</span> : null}
                    </span>
                    <span className={cn("shrink-0 nums", cut ? "text-muted-foreground line-through" : "")}>
                      {formatCurrency(l.price)}
                    </span>
                  </li>
                ))}
              </ul>
              {!cut ? (
                <div className="mt-1.5 flex justify-between border-t border-dashed border-border pt-1.5 text-2xs text-muted-foreground">
                  <span>Day total</span>
                  <span className="nums">{formatCurrency(dayTotal(d))}</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {allPastCutoff ? (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-[13px] font-semibold">Next open days</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((d) => (
              <span
                key={d}
                className="rounded-full border border-border bg-muted px-3 py-1 text-2xs font-semibold"
              >
                {formatDay(fromISODate(d))}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <Row label="Subtotal" value={formatCurrency(subtotal)} />
          {corporate ? (
            <Row label={`${program.company} covers`} value={`-${formatCurrency(subsidy)}`} tone="success" />
          ) : null}
          <div className="my-2 border-t border-border" />
          <Row label="You pay" value={formatCurrency(youPay)} bold />
        </div>
      )}

      {allPastCutoff ? (
        <Button variant="teal" block size="lg" onClick={onPickNewDates}>
          <CalendarPlus className="size-4" /> Pick new dates
        </Button>
      ) : (
        <Button variant="teal" block size="lg" onClick={onContinue}>
          {youPay > 0 ? `Checkout · ${formatCurrency(youPay)}` : "Checkout"}
          <ChevronRight className="size-4" />
        </Button>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: string;
  tone?: "success";
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className={cn(bold ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span
        className={cn(
          "nums",
          bold && "text-base font-bold",
          tone === "success" && "font-semibold text-success",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Checkout                                                                  */
/* ----------------------------------------------------------------------- */

function CheckoutStep({
  payableDays,
  cutoffDays,
  youPay,
  subsidy,
  corporate,
  placing,
  onBack,
  onConfirm,
}: {
  payableDays: string[];
  cutoffDays: string[];
  youPay: number;
  subsidy: number;
  corporate: boolean;
  placing: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  // Only read for the individual branch — a corporate order goes to the
  // contract's site regardless of anything this user has typed.
  const delivery = useSessionStore((s) => s.delivery);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="rounded-full border border-control bg-card touch-target p-1.5 text-foreground hover:bg-muted"
        >
          <ChevronRight className="size-4 rotate-180" />
        </button>
        <h2 className="font-display text-lg font-semibold tracking-tight">Checkout</h2>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[13px] text-muted-foreground">Delivering to</p>
        {corporate ? (
          <>
            <p className="text-sm font-semibold">HQ · Floor 3 Kitchen</p>
            <p className="text-2xs text-muted-foreground">500 Market St, Floor 3, San Francisco</p>
          </>
        ) : delivery.street ? (
          <>
            <p className="text-sm font-semibold">
              {delivery.street}
              {delivery.apt ? `, ${delivery.apt}` : ""}
            </p>
            <p className="text-2xs text-muted-foreground">
              {[delivery.city, delivery.zip].filter(Boolean).join(" ")}
            </p>
          </>
        ) : (
          <p className="text-sm font-semibold text-muted-foreground">
            Add an address at checkout
          </p>
        )}
        <div className="my-3 border-t border-border" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Confirmed days</span>
          <span className="font-semibold">{payableDays.length}</span>
        </div>
        {cutoffDays.length ? (
          <div className="mt-1 flex items-center justify-between text-2xs text-danger">
            <span>Skipped (cutoff passed)</span>
            <span className="font-semibold">{cutoffDays.length}</span>
          </div>
        ) : null}
        {corporate ? (
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Company pays</span>
            <span className="font-semibold text-success">-{formatCurrency(subsidy)}</span>
          </div>
        ) : null}
      </div>

      {youPay > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
            <CreditCard className="size-5 text-foreground" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Visa ···· 4242</p>
            <p className="text-2xs text-muted-foreground">Default payment method · charged via Square</p>
          </div>
          <span className="text-sm font-bold nums">{formatCurrency(youPay)}</span>
        </div>
      ) : corporate ? (
        <Notice tone="success">
          Fully covered by {program.company}. No payment needed. Just confirm.
        </Notice>
      ) : (
        <Notice tone="info">Nothing to pay yet. Add meals to a day to continue.</Notice>
      )}

      <Button variant="teal" block size="lg" disabled={placing} onClick={onConfirm}>
        {placing
          ? "Placing order…"
          : youPay > 0
            ? `Confirm & pay ${formatCurrency(youPay)}`
            : "Confirm order"}
        {!placing ? <Check className="size-4" /> : null}
      </Button>
      <p className="text-center text-2xs text-muted-foreground">
        One tap to confirm · cancel or change up to {program.changeWindow.toLowerCase()}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Confirmation                                                              */
/* ----------------------------------------------------------------------- */

function ConfirmationStep({
  orderedDays,
  payableDays,
  cutoffDays,
  recurring,
  setRecurring,
  onRestart,
}: {
  orderedDays: string[];
  payableDays: string[];
  cutoffDays: string[];
  recurring: boolean;
  setRecurring: (v: boolean) => void;
  onRestart: () => void;
}) {
  const confirmedCount = payableDays.length;
  const subject = `${confirmedCount} of ${orderedDays.length} Days Confirmed`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center pt-2 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-bg text-success">
          <PartyPopper className="size-7" />
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">
          {confirmedCount === orderedDays.length ? "All days confirmed!" : "Order placed"}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          We emailed {me.email} with the exact days below.
        </p>
      </div>

      {/* Day-by-day status */}
      <div className="space-y-2">
        {orderedDays.map((d) => {
          const cut = cutoffDays.includes(d);
          return (
            <div
              key={d}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3",
                cut ? "border-danger-border bg-danger-bg/50" : "border-success-border bg-success-bg/50",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-white",
                  cut ? "bg-danger" : "bg-success",
                )}
              >
                {cut ? <X className="size-4" /> : <Check className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{formatDayLong(fromISODate(d))}</p>
                <p className={cn("text-2xs font-semibold", cut ? "text-danger" : "text-success")}>
                  {cut ? "Cutoff passed · not ordered" : "Confirmed"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {cutoffDays.length ? (
        <Notice tone="warning">
          <AlertTriangle className="inline size-3.5" /> We did <strong>not</strong> charge or order the
          skipped day{cutoffDays.length === 1 ? "" : "s"}. No silent confirmations here.
        </Notice>
      ) : null}

      {/* Email preview */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-2xs font-semibold text-muted-foreground">
          <Mail className="size-3.5" /> Email preview
        </div>
        <p className="mt-1.5 text-sm font-semibold">{subject}</p>
        <p className="text-2xs text-muted-foreground">
          To: {me.email} · from {program.platform}
        </p>
      </div>

      {/* Recurring */}
      <button
        type="button"
        onClick={() => setRecurring(!recurring)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-3 text-left transition-colors",
          recurring ? "border-primary bg-teal-wash" : "border-control bg-card hover:bg-muted",
        )}
      >
        <span className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
            <Repeat className="size-4 text-primary" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Set as recurring</span>
            <span className="block text-2xs text-muted-foreground">Auto-order the same meals next week</span>
          </span>
        </span>
        <span
          className={cn(
            "flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
            recurring ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "size-5 rounded-full bg-white shadow transition-transform",
              recurring ? "translate-x-5" : "translate-x-0",
            )}
          />
        </span>
      </button>

      <Button variant="ghost" block size="lg" onClick={onRestart}>
        Start another order
      </Button>
    </div>
  );
}
