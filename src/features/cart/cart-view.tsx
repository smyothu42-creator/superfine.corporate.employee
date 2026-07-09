"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Plus, Minus, Trash2, CalendarDays, ShoppingBag, ArrowRight, ArrowDown, CalendarPlus, Pencil, Check, UtensilsCrossed, Clock, Lock, AlertTriangle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { FoodPhoto } from "@/components/menu/food-photo";
import { ServingBreakdown } from "@/components/cart/serving-breakdown";
import { getItem } from "@/data/menu";
import type { EditingOrderContext } from "@/store/use-ui-store";
import { useCartStore } from "@/store/use-cart-store";
import { useUiStore } from "@/store/use-ui-store";
import { toast } from "@/store/use-toast-store";
import { program } from "@/data/program";
import { fromISODate, formatDay } from "@/lib/dates";
import { CutoffIndicator } from "@/components/cutoff/cutoff-indicator";
import { cutoffInfo } from "@/lib/cutoff-messaging";
import { subsidyLabel } from "@/lib/subsidy";
import { useSessionStore, isSubsidized } from "@/store/use-session-store";
import type { OrderType } from "@/data/types";
import { formatCurrency, cn } from "@/lib/utils";

function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

/** Full-page cart (the /cart route). */
export function CartView() {
  const mounted = useMounted();
  const cart = useCartStore();
  const plannedDays = useUiStore((s) => s.plannedDays);

  if (!mounted) return <CartSkeleton />;
  // Show the day list once any day is committed — either it already holds a meal
  // or it was picked as part of a multi-day plan (and is still waiting to be filled).
  if (cart.dates().length === 0 && plannedDays.length === 0) return <CartEmptyState />;

  return (
    <div className="space-y-5">
      <CartDayList />
      {/* On large screens the charges summary sticks to the bottom of the
          viewport so Checkout stays reachable while the day list scrolls. */}
      <div className="lg:sticky lg:bottom-4 lg:z-10">
        <CartSummaryCard />
      </div>
    </div>
  );
}

/**
 * Cart body for the slide-in panel: the day list scrolls, while the charges
 * summary is pinned to the bottom (it never scrolls out of view).
 */
export function CartPanelBody() {
  const mounted = useMounted();
  const cart = useCartStore();
  const plannedDays = useUiStore((s) => s.plannedDays);

  if (!mounted) {
    return (
      <div className="p-4">
        <CartSkeleton />
      </div>
    );
  }
  if (cart.dates().length === 0 && plannedDays.length === 0) {
    return (
      <div className="p-4">
        <CartEmptyState />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CartDayList />
      </div>
      <div className="shrink-0 border-t border-border bg-card p-4">
        <CartSummaryCard bare />
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

function CartEmptyState() {
  const subsidized = isSubsidized(useSessionStore((s) => s.account));
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShoppingBag className="size-7" />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Your cart is empty</h2>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
            {subsidized ? (
              <>
                Pick a day and add a meal — {program.company} covers{" "}
                {formatCurrency(program.subsidyPerDay)} each service day.
              </>
            ) : (
              <>Pick a day and add a meal to get started.</>
            )}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/menu">Browse the menu</Link>
        </Button>
      </CardBody>
    </Card>
  );
}

/**
 * Per-item order cutoff — the exact time this line must be ordered/edited by.
 * Order-type aware (individual = 4 PM day before, family = 72 h ahead) and
 * colour-escalates as the cutoff nears, then reads "Ordering closed" once past.
 */
function ItemCutoffLine({ date, type }: { date: string; type: OrderType }) {
  const info = cutoffInfo(date, type);
  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1 text-2xs font-medium",
        info.locked || info.urgent
          ? "text-danger"
          : info.soon
            ? "text-coral-deep"
            : "text-muted-foreground",
      )}
    >
      {info.locked ? <Lock className="size-3 shrink-0" /> : <Clock className="size-3 shrink-0" />}
      {info.locked ? "Ordering closed for this day" : `Order by ${info.cutoffAbsolute}`}
    </p>
  );
}

export function CartDayList() {
  const cart = useCartStore();
  const plannedDays = useUiStore((s) => s.plannedDays);
  const editingOrder = useUiStore((s) => s.editingOrder);
  // Subscribed, not just read: the cart's own store holds no subsidy state, so
  // these re-render the day totals when the contract is switched, or when a
  // guest verifies into a corporate account.
  const subsidyMode = useUiStore((s) => s.subsidyMode);
  const subsidized = isSubsidized(useSessionStore((s) => s.account));

  // Editing a placed order: show the single meal change (from → to) instead of
  // the normal per-day cart.
  if (editingOrder) return <CartEditingSummary editingOrder={editingOrder} />;

  // A section for every committed day: days that already hold a meal, plus any
  // day picked as part of a multi-day plan that's still empty. Empty days render
  // a prompt so the user knows they can still order for them.
  const dates = Array.from(new Set([...cart.dates(), ...plannedDays])).sort();

  return (
    <>
      <Notice tone="info">
        Review every day below. You can edit or remove anything up to the order cutoff —{" "}
        <strong>payment isn&apos;t taken until 24 hours before delivery.</strong>
      </Notice>

      {dates.map((date) => {
        const items = cart.itemsForDate(date);
        if (items.length === 0) return <EmptyDayCard key={date} date={date} />;
        const dayOwed = cart.dayEmployeePaid(date);
        const daySub = cart.daySubsidy(date);
        return (
          <Card key={date}>
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
                <CalendarDays className="size-4 text-primary" />
                {formatDay(fromISODate(date))}
              </h3>
              {!subsidized ? (
                <Badge tone="neutral">{formatCurrency(dayOwed)}</Badge>
              ) : dayOwed > 0 ? (
                <Badge tone="warning">You pay {formatCurrency(dayOwed)}</Badge>
              ) : (
                <Badge tone="success">Fully covered</Badge>
              )}
            </div>
            <CardBody className="space-y-3">
              {items.map((line) => (
                <div key={line.uid} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{line.name}</span>
                      {line.type === "family_style" ? (
                        <Badge tone="neutral">Family Style · {line.guests} guests</Badge>
                      ) : null}
                    </div>
                    {line.addOns.length ? (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {line.addOns.map((a) => a.name).join(" · ")}
                      </p>
                    ) : null}
                    {line.servings?.length ? <ServingBreakdown servings={line.servings} /> : null}
                    {program.showPrices ? (
                      <p className="mt-0.5 text-2xs text-muted-foreground nums">
                        {line.type === "family_style"
                          ? `${formatCurrency(line.unitPrice)} per package`
                          : `${formatCurrency(line.unitPrice)} each`}
                      </p>
                    ) : null}
                    <ItemCutoffLine date={date} type={line.type} />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {program.showPrices ? (
                      <span className="font-semibold nums">{formatCurrency(line.unitPrice * line.qty)}</span>
                    ) : null}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Decrease ${line.name}`}
                        onClick={() => cart.setQty(line.uid, line.qty - 1)}
                        className="flex size-8 items-center justify-center rounded-full border border-border bg-card hover:bg-muted"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold nums">{line.qty}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${line.name}`}
                        onClick={() => cart.setQty(line.uid, line.qty + 1)}
                        className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-teal-deep"
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${line.name}`}
                        onClick={() => cart.remove(line.uid)}
                        className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-danger hover:bg-danger-bg"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {/* A guest has no company share — a "−$0.00" row would imply one. */}
              {subsidized ? (
                <div className="flex items-center justify-between pt-1 text-[13px] text-muted-foreground">
                  <span>{subsidyLabel(subsidyMode)}</span>
                  <span className="nums text-success">−{formatCurrency(daySub)}</span>
                </div>
              ) : null}
            </CardBody>
          </Card>
        );
      })}
    </>
  );
}

/**
 * A planned day with no meal yet. Shown in the cart for every selected multi-day
 * date so the user can see — and act on — the days still waiting to be filled.
 */
function EmptyDayCard({ date }: { date: string }) {
  const router = useRouter();
  const closeCart = useUiStore((s) => s.closeCart);
  const setActiveOrderDate = useUiStore((s) => s.setActiveOrderDate);
  const requestFocusDay = useUiStore((s) => s.requestFocusDay);

  function orderForDay() {
    setActiveOrderDate(date);
    // Ask the menu to focus this exact day — covers the case where the menu is
    // already mounted (cart opened as a side panel), so navigation alone won't
    // re-run its init effect.
    requestFocusDay(date);
    closeCart();
    router.push("/menu");
  }

  return (
    <Card className="border-dashed">
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-border px-5 py-3.5">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <CalendarDays className="size-4 text-muted-foreground" />
          {formatDay(fromISODate(date))}
        </h3>
        <Badge tone="neutral">No meal yet</Badge>
      </div>
      <CardBody className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UtensilsCrossed className="size-5" />
        </span>
        <p className="max-w-xs text-[13px] text-muted-foreground">
          You haven&apos;t ordered for this day yet. Pick a meal from the menu and it&apos;ll show up here.
        </p>
        <Button variant="ghost" size="sm" onClick={orderForDay}>
          <Plus className="size-4" /> Order for this day
        </Button>
      </CardBody>
    </Card>
  );
}

/** The "from → to" meal change shown in the cart while editing a placed order. */
function CartEditingSummary({ editingOrder }: { editingOrder: EditingOrderContext }) {
  const changed = editingOrder.itemId !== editingOrder.originalItemId;
  const fromItem = getItem(editingOrder.originalItemId);
  const toItem = getItem(editingOrder.itemId);

  return (
    <>
      <Notice tone="info">
        Changing one meal in <strong>{editingOrder.orderId}</strong>. Pick a new meal from the menu, then
        Save.
      </Notice>
      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
            <CalendarDays className="size-4 text-primary" />
            {editingOrder.dateLabel}
          </h3>
          <Badge tone="brand" className="gap-1">
            <Pencil className="size-3" /> Editing order
          </Badge>
        </div>
        <CardBody className="space-y-2.5">
          <CutoffIndicator deliveryISO={editingOrder.date} type="individual" context="edit" variant="inline" />
          <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">From</div>
          <MealTile name={editingOrder.originalItemName} image={fromItem?.image} muted />
          <div className="flex items-center justify-center">
            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ArrowDown className="size-4" />
            </span>
          </div>
          <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">To</div>
          {changed ? (
            <MealTile name={editingOrder.itemName} image={toItem?.image} highlighted />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-[13px] text-muted-foreground">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Plus className="size-5" />
              </span>
              Pick a meal from the menu &rarr;
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function MealTile({
  name,
  image,
  muted,
  highlighted,
}: {
  name: string;
  image?: string;
  muted?: boolean;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3",
        highlighted ? "border-primary bg-teal-wash" : "border-border bg-card",
      )}
    >
      <FoodPhoto src={image} alt={name} className="size-12 shrink-0 rounded-xl" iconClassName="size-4" />
      <p className={cn("min-w-0 flex-1 truncate text-sm font-semibold", muted && "text-muted-foreground line-through")}>
        {name}
      </p>
    </div>
  );
}

/** Charges + actions. `bare` drops the Card chrome (used in the pinned footer). */
function CartSummaryCard({ bare = false }: { bare?: boolean }) {
  const router = useRouter();
  const cart = useCartStore();
  const plannedDays = useUiStore((s) => s.plannedDays);
  const closeCart = useUiStore((s) => s.closeCart);
  const requestRangePicker = useUiStore((s) => s.requestRangePicker);
  const setActiveOrderDate = useUiStore((s) => s.setActiveOrderDate);
  const requestFocusDay = useUiStore((s) => s.requestFocusDay);
  const editingOrder = useUiStore((s) => s.editingOrder);
  const clearEditingOrder = useUiStore((s) => s.clearEditingOrder);
  const subsidyMode = useUiStore((s) => s.subsidyMode);
  const subsidized = isSubsidized(useSessionStore((s) => s.account));
  const subtotal = cart.subtotal();
  const subsidy = cart.totalSubsidy();
  const tax = cart.tax();
  const owed = cart.total();

  // Planned days still missing a meal, ascending — the days the warning is about.
  const emptyDays = plannedDays.filter((d) => cart.itemsForDate(d).length === 0).sort();
  const daysRemaining = emptyDays.length;

  // Missing-meals warning modal: shown when checkout is attempted while one or
  // more planned days have no meal chosen yet.
  const [missingMealsOpen, setMissingMealsOpen] = React.useState(false);

  function handleCheckout() {
    // Multi-day with days still missing meals → warn instead of checking out.
    if (plannedDays.length > 0 && daysRemaining > 0) {
      setMissingMealsOpen(true);
      return;
    }
    closeCart();
    router.push("/checkout");
  }

  // Primary CTA on the warning: jump to the menu on the first empty day so the
  // user can pick a meal for it right away.
  function handleSelectMeals() {
    setMissingMealsOpen(false);
    const first = emptyDays[0];
    if (first) {
      setActiveOrderDate(first);
      requestFocusDay(first);
    }
    closeCart();
    router.push("/menu");
  }

  // Secondary CTA: check out despite the empty days (they won't get meals then).
  function handleProceedAnyway() {
    setMissingMealsOpen(false);
    closeCart();
    router.push("/checkout");
  }

  function handleAddAnotherDay() {
    closeCart();
    requestRangePicker();
    router.push("/menu");
  }

  // Editing a placed order: "Save" applies the change and leaves editing mode.
  function handleSave() {
    const label = editingOrder?.dateLabel ?? "";
    if (editingOrder) cart.clearDay(editingOrder.date);
    clearEditingOrder();
    closeCart();
    toast.success("Order updated", `Your ${label} order has been updated.`);
    router.push("/orders");
  }

  const body = (
    <div className="space-y-3">
      {plannedDays.length > 0 ? (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl border px-3 py-2 text-[13px] font-semibold",
            daysRemaining > 0
              ? "border-warning-border bg-warning-bg text-coral-deep"
              : "border-success-border bg-success-bg text-success",
          )}
        >
          <span>
            {plannedDays.length - daysRemaining}/{plannedDays.length} days ordered
          </span>
          <span>
            {daysRemaining > 0
              ? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining`
              : "All days done"}
          </span>
        </div>
      ) : null}
      {program.showPrices ? (
        <>
          <Row label="Meals total" value={formatCurrency(subtotal)} />
          {subsidized ? (
            <Row label={subsidyLabel(subsidyMode)} value={`−${formatCurrency(subsidy)}`} tone="success" />
          ) : null}
          <Row label="Tax" value={formatCurrency(tax)} />
          <div className="flex items-center justify-between border-t-2 border-foreground pt-3 text-base font-bold">
            <span>You pay</span>
            <span className="nums">{formatCurrency(owed)}</span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between text-base font-bold">
          <span>Your meals are fully covered</span>
          <span className="nums text-success">{formatCurrency(0)}</span>
        </div>
      )}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-between">
        {editingOrder ? (
          // Editing a placed order: save the change; no "add another day".
          <Button size="lg" block onClick={handleSave}>
            <Check className="size-4" /> Save
          </Button>
        ) : (
          <>
            <Button variant="outline" size="lg" onClick={handleAddAnotherDay}>
              <CalendarPlus className="size-4" /> Add another day
            </Button>
            <Button size="lg" onClick={handleCheckout}>
              Checkout <ArrowRight className="size-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const modal = missingMealsOpen ? (
    <MissingMealsModal
      emptyCount={daysRemaining}
      plannedCount={plannedDays.length}
      onSelectMeals={handleSelectMeals}
      onProceedAnyway={handleProceedAnyway}
      onClose={() => setMissingMealsOpen(false)}
    />
  ) : null;

  if (bare)
    return (
      <>
        {body}
        {modal}
      </>
    );
  return (
    <>
      <Card>
        <CardBody>{body}</CardBody>
      </Card>
      {modal}
    </>
  );
}

/**
 * Warning shown when the user tries to check out while one or more planned days
 * still have no meal. Deliberately spells out both choices so the outcome is
 * never ambiguous: fill the empty days, or skip them (and get no meal for them).
 *
 * Mirrors the shared ConfirmDialog chrome, and portals to <body> so it centers
 * on the viewport rather than being trapped inside the transformed cart panel.
 */
function MissingMealsModal({
  emptyCount,
  plannedCount,
  onSelectMeals,
  onProceedAnyway,
  onClose,
}: {
  emptyCount: number;
  plannedCount: number;
  onSelectMeals: () => void;
  onProceedAnyway: () => void;
  onClose: () => void;
}) {
  const dayWord = emptyCount === 1 ? "day" : "days";

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-teal-deep/50 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="missing-meals-title"
        aria-describedby="missing-meals-desc"
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-raised animate-fade-in"
      >
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning-bg text-warning">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="missing-meals-title" className="font-display text-lg font-semibold tracking-tight">
              {emptyCount} selected {dayWord} {emptyCount === 1 ? "has" : "have"} no meal yet
            </h2>
            <p id="missing-meals-desc" className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              You planned {plannedCount} {plannedCount === 1 ? "day" : "days"}, but {emptyCount} of them{" "}
              {emptyCount === 1 ? "doesn't" : "don't"} have a meal chosen yet. If you check out without
              picking meals, you <strong className="text-foreground">won&apos;t receive any meal</strong> for{" "}
              {emptyCount === 1 ? "that day" : `those ${emptyCount} days`}.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onProceedAnyway}>
            Proceed to checkout anyway
          </Button>
          <Button variant="warning" onClick={onSelectMeals}>
            <UtensilsCrossed className="size-4" /> Select meals
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium nums", tone === "success" && "text-success")}>{value}</span>
    </div>
  );
}
