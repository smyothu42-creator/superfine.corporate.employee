"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Minus, Trash2, CalendarDays, ShoppingBag, ArrowRight, CalendarPlus } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/store/use-cart-store";
import { useUiStore } from "@/store/use-ui-store";
import { confirm } from "@/store/use-confirm-store";
import { program } from "@/data/program";
import { fromISODate, formatDay } from "@/lib/dates";
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

  if (!mounted) return <CartSkeleton />;
  if (cart.dates().length === 0) return <CartEmptyState />;

  return (
    <div className="space-y-5">
      <CartDayList />
      <CartSummaryCard />
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

  if (!mounted) {
    return (
      <div className="p-4">
        <CartSkeleton />
      </div>
    );
  }
  if (cart.dates().length === 0) {
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
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShoppingBag className="size-7" />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Your cart is empty</h2>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
            Pick a day and add a meal — {program.company} covers{" "}
            {formatCurrency(program.subsidyPerDay)} each service day.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/menu">Browse the menu</Link>
        </Button>
      </CardBody>
    </Card>
  );
}

export function CartDayList() {
  const cart = useCartStore();
  const dates = cart.dates();

  return (
    <>
      <Notice tone="info">
        Review every day below. You can edit or remove anything up to the order cutoff —{" "}
        <strong>payment isn&apos;t taken until 24 hours before delivery.</strong>
      </Notice>

      {dates.map((date) => {
        const items = cart.itemsForDate(date);
        const dayOwed = cart.dayEmployeePaid(date);
        const daySub = cart.daySubsidy(date);
        return (
          <Card key={date}>
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
                <CalendarDays className="size-4 text-primary" />
                {formatDay(fromISODate(date))}
              </h3>
              {dayOwed > 0 ? (
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
                      {line.type === "family_style" ? <Badge tone="neutral">Family</Badge> : null}
                    </div>
                    {line.addOns.length ? (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {line.addOns.map((a) => a.name).join(" · ")}
                      </p>
                    ) : null}
                    {program.showPrices ? (
                      <p className="mt-0.5 text-2xs text-muted-foreground nums">
                        {formatCurrency(line.unitPrice)} each
                      </p>
                    ) : null}
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
              <div className="flex items-center justify-between pt-1 text-[13px] text-muted-foreground">
                <span>Subsidy applied</span>
                <span className="nums text-success">−{formatCurrency(daySub)}</span>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </>
  );
}

/** Charges + actions. `bare` drops the Card chrome (used in the pinned footer). */
function CartSummaryCard({ bare = false }: { bare?: boolean }) {
  const router = useRouter();
  const cart = useCartStore();
  const plannedDays = useUiStore((s) => s.plannedDays);
  const closeCart = useUiStore((s) => s.closeCart);
  const requestRangePicker = useUiStore((s) => s.requestRangePicker);
  const subtotal = cart.subtotal();
  const subsidy = cart.totalSubsidy();
  const owed = cart.totalEmployeePaid();

  const daysRemaining = plannedDays.filter((d) => cart.itemsForDate(d).length === 0).length;

  async function handleCheckout() {
    // Multi-day with days still missing meals → warn instead of checking out.
    if (plannedDays.length > 0 && daysRemaining > 0) {
      const ok = await confirm({
        title: `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} still need meals`,
        description: `You planned ${plannedDays.length} days but haven't ordered for ${daysRemaining} of them. Add a meal to every selected day before checking out.`,
        tone: "warning",
        confirmLabel: "Keep ordering",
        cancelLabel: "Cancel",
      });
      if (ok) closeCart();
      return;
    }
    closeCart();
    router.push("/checkout");
  }

  function handleAddAnotherDay() {
    closeCart();
    requestRangePicker();
    router.push("/menu");
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
          <Row label="Subtotal" value={formatCurrency(subtotal)} />
          <Row label="Company subsidy" value={`−${formatCurrency(subsidy)}`} tone="success" />
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
        <Button variant="ghost" onClick={handleAddAnotherDay}>
          <CalendarPlus className="size-4" /> Add another day
        </Button>
        <Button size="lg" onClick={handleCheckout}>
          Checkout <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );

  if (bare) return body;
  return (
    <Card>
      <CardBody>{body}</CardBody>
    </Card>
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
