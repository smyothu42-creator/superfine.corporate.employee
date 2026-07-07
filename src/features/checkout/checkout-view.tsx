"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Check,
  MapPin,
  Clock,
  CreditCard,
  CalendarDays,
  Lock,
  Mail,
  ShoppingBag,
  X,
  Pencil,
  XCircle,
  AlertTriangle,
  Tag,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { ThemeSelect } from "@/components/ui/theme-select";
import { Skeleton } from "@/components/ui/skeleton";
import { CartDayList } from "@/features/cart/cart-view";
import { useCartStore } from "@/store/use-cart-store";
import { toast } from "@/store/use-toast-store";
import { program, addresses, getAddress } from "@/data/program";
import { me } from "@/data/me";
import { fromISODate, formatDay } from "@/lib/dates";
import { CutoffIndicator } from "@/components/cutoff/cutoff-indicator";
import { formatCurrency, cn } from "@/lib/utils";
import type { PaymentChoice } from "@/data/types";

/** Demo promo codes — flat dollars off or a percentage of the employee balance. */
const PROMO_CODES: Record<string, { kind: "flat" | "percent"; value: number; label: string }> = {
  LUNCH5: { kind: "flat", value: 5, label: "$5 off" },
  SAVE10: { kind: "percent", value: 10, label: "10% off your share" },
  WELCOME: { kind: "flat", value: 3, label: "$3 off" },
};

type AppliedPromo = { code: string; kind: "flat" | "percent"; value: number; label: string };

/** Discount a promo yields against the current balance owed (clamped, 2dp). */
function promoDiscount(promo: AppliedPromo, owed: number) {
  const raw = promo.kind === "flat" ? promo.value : (owed * promo.value) / 100;
  return Math.min(owed, Math.round(raw * 100) / 100);
}

export function CheckoutView() {
  const [mounted, setMounted] = React.useState(false);
  const [placed, setPlaced] = React.useState(false);
  const cart = useCartStore();

  React.useEffect(() => setMounted(true), []);

  const owed = mounted ? cart.totalEmployeePaid() : 0;
  const [payment, setPayment] = React.useState<PaymentChoice>(
    me.permissions.payLater ? "pay_later" : "pay_now",
  );
  const [commonWindow, setCommonWindow] = React.useState(program.deliveryWindows[1]);
  // Email-only order updates — address where confirmation/updates are sent.
  const [editOpen, setEditOpen] = React.useState(false);
  const [timeModalOpen, setTimeModalOpen] = React.useState(false);
  const [addressOpen, setAddressOpen] = React.useState(false);

  // Promo code (applied against the employee-paid balance).
  const [promoInput, setPromoInput] = React.useState("");
  const [promo, setPromo] = React.useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = React.useState("");

  const discount = promo ? promoDiscount(promo, owed) : 0;
  // Tax applies to the employee-paid portion after any promo (0 when covered).
  const taxable = Math.max(0, owed - discount);
  const tax = Math.round(taxable * program.taxRate * 100) / 100;
  const finalOwed = taxable + tax;

  if (!mounted) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  const dates = cart.dates();

  if (placed) {
    return <Confirmation owed={finalOwed} payment={finalOwed === 0 ? "covered" : payment} />;
  }

  if (dates.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingBag className="size-7" />
          </span>
          <h2 className="font-display text-xl font-semibold tracking-tight">Nothing to check out</h2>
          <Button asChild>
            <Link href="/menu">Browse the menu</Link>
          </Button>
        </CardBody>
      </Card>
    );
  }

  const address = getAddress(cart.addressId);
  const subtotal = cart.subtotal();
  const subsidy = cart.totalSubsidy();

  // Per-day cutoff status — order type drives which rule applies (individual =
  // 4 PM day before, family = 72 h ahead), resolved inside CutoffIndicator.
  const cutoffs = dates.map((date) => {
    const dayItems = cart.itemsForDate(date);
    const type = dayItems.some((i) => i.type === "family_style") ? "family_style" : "individual";
    return { date, type } as const;
  });

  function applyCommonWindow(w: string) {
    setCommonWindow(w);
    dates.forEach((d) => cart.setWindow(d, w));
  }

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const def = PROMO_CODES[code];
    if (!def) {
      setPromo(null);
      setPromoError("That code isn't valid or has expired.");
      return;
    }
    setPromo({ code, ...def });
    setPromoError("");
    setPromoInput("");
    toast.success("Promo applied", `${code} — ${def.label}`);
  }

  function removePromo() {
    setPromo(null);
    setPromoError("");
  }

  function placeOrder() {
    const resolvedPayment: PaymentChoice = finalOwed === 0 ? "covered" : payment;
    cart.setPayment(resolvedPayment);
    toast.success(
      "Order placed",
      finalOwed === 0 ? "Fully covered — confirmation on its way." : "Confirmation on its way.",
    );
    setPlaced(true);
    cart.clear();
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-16 z-20 -mx-4 bg-background px-4 py-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Steps current={1} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Cutoff check */}
          <Card>
            <CardHeader className="flex-wrap">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <CardTitle>Cutoff check</CardTitle>
                <span className="inline-flex items-center gap-1 text-2xs font-medium leading-snug text-warning">
                  <AlertTriangle className="size-3 shrink-0 -translate-y-px" />
                  Order by each day&apos;s cutoff — individual meals 4 PM the day before, family style 72 h ahead — or that day is cancelled automatically.
                </span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-2">
                  {cutoffs.map((c) => (
                    <div key={c.date} className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-2xs font-semibold text-muted-foreground">
                        <CalendarDays className="size-3.5 text-primary" />
                        {formatDay(fromISODate(c.date))}
                      </span>
                      <CutoffIndicator deliveryISO={c.date} type={c.type} variant="inline" />
                    </div>
                  ))}
              </div>
            </CardBody>
          </Card>

          {/* Delivery address */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery address</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 text-[13px]">
                  <div className="font-semibold">{address.name}</div>
                  <div className="text-muted-foreground">{address.address}</div>
                  {address.instructions ? (
                    <div className="mt-1 text-2xs text-muted-foreground">{address.instructions}</div>
                  ) : null}
                </div>
                {addresses.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setAddressOpen(true)}
                    aria-label="Change delivery address"
                    className="shrink-0 rounded-full border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                ) : null}
              </div>
            </CardBody>
          </Card>

          {/* Delivery time — one common time for all days, editable per day in a modal */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 whitespace-nowrap font-display text-base font-semibold tracking-tight">
                  <CalendarDays className="size-4 text-primary" /> Delivery windows
                </span>
                {me.permissions.flexibleDelivery ? (
                  <div className="w-44 shrink-0 sm:w-56">
                    <ThemeSelect
                      value={commonWindow}
                      onValueChange={applyCommonWindow}
                      options={program.deliveryWindows.map((w) => ({ value: w, label: w }))}
                      aria-label="Delivery window for all days"
                      size="sm"
                      align="right"
                    />
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted-foreground">
                    <Clock className="size-3.5" /> {program.deliveryWindows[1]}
                  </span>
                )}
              </div>
              {me.permissions.flexibleDelivery && dates.length > 1 ? (
                <Button size="sm" variant="ghost" onClick={() => setTimeModalOpen(true)}>
                  <CalendarDays className="size-3.5" /> Set delivery window per day
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-2xs text-muted-foreground">
              <Mail className="size-3.5 shrink-0 text-primary" />
              You&apos;ll receive an email when your order is confirmed.
            </div>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {owed === 0 ? (
                <Notice tone="success">
                  <CheckCircle2 className="inline size-3.5" /> Your order is fully covered by{" "}
                  {program.company}. <strong>No payment needed.</strong>
                </Notice>
              ) : (
                <>
                  <p className="text-[13px] text-muted-foreground">
                    {program.company} pays {formatCurrency(subsidy)}. You pay{" "}
                    <strong className="text-foreground">{formatCurrency(finalOwed)}</strong> for the
                    extras, tax included.
                  </p>
                  <div className="space-y-2">
                    {me.permissions.payLater ? (
                      <PayOption
                        active={payment === "pay_later"}
                        onClick={() => setPayment("pay_later")}
                        title="Add to my company invoice"
                        subtitle="Added to your company's monthly invoice — nothing to pay now"
                      />
                    ) : null}
                    <PayOption
                      active={payment === "pay_now"}
                      onClick={() => setPayment("pay_now")}
                      title="Pay with card on file"
                      subtitle="•••• 4242 · charged 24h before delivery"
                    />
                  </div>
                </>
              )}
              <Notice tone="info" className="text-xs">
                <Lock className="inline size-3.5" /> Your order locks in and{" "}
                <strong>payment is taken 24 hours before delivery</strong> — never before. You can edit
                until then.
              </Notice>
            </CardBody>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="lg:sticky lg:top-32">
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5" /> Edit order
              </Button>
            </CardHeader>
            <CardBody className="space-y-3">
              {dates.map((date) => (
                <div key={date} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="text-overline">{formatDay(fromISODate(date))}</div>
                  <ul className="mt-1 space-y-1">
                    {cart.itemsForDate(date).map((line) => (
                      <li key={line.uid} className="flex justify-between gap-2 text-[13px]">
                        <span className="text-muted-foreground">
                          {line.name} ×{line.qty}
                        </span>
                        {program.showPrices ? (
                          <span className="nums">{formatCurrency(line.unitPrice * line.qty)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {program.showPrices ? (
                <div className="space-y-1.5 pt-1">
                  <SummaryRow label="Meals total" value={formatCurrency(subtotal)} />
                  <SummaryRow label="Company pays" value={`−${formatCurrency(subsidy)}`} tone="success" />
                  {discount > 0 && promo ? (
                    <SummaryRow
                      label={`Promo · ${promo.code}`}
                      value={`−${formatCurrency(discount)}`}
                      tone="success"
                    />
                  ) : null}
                  <SummaryRow label="Tax" value={formatCurrency(tax)} />
                  <div className="flex items-center justify-between border-t-2 border-foreground pt-2 text-base font-bold">
                    <span>You pay</span>
                    <span className="nums">{formatCurrency(finalOwed)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between border-t-2 border-foreground pt-2 text-base font-bold">
                  <span>You pay</span>
                  <span className="nums text-success">{formatCurrency(0)}</span>
                </div>
              )}

              {program.showPrices && owed > 0 ? (
                <PromoField
                  promo={promo}
                  value={promoInput}
                  error={promoError}
                  onChange={(v) => {
                    setPromoInput(v);
                    if (promoError) setPromoError("");
                  }}
                  onApply={applyPromo}
                  onRemove={removePromo}
                />
              ) : null}

              <Button block size="lg" onClick={placeOrder}>
                Place order
              </Button>
              <Button asChild variant="ghost" block>
                <Link href="/cart">Back to cart</Link>
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {addressOpen ? <AddressModal onClose={() => setAddressOpen(false)} /> : null}
      {editOpen ? <EditOrderModal onClose={() => setEditOpen(false)} /> : null}
      {timeModalOpen ? (
        <PerDayTimeModal
          dates={dates}
          commonWindow={commonWindow}
          onClose={() => setTimeModalOpen(false)}
        />
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Delivery address picker — modal with radio options                       */
/* ---------------------------------------------------------------------- */

function AddressModal({ onClose }: { onClose: () => void }) {
  const [shown, setShown] = React.useState(false);
  const cart = useCartStore();
  const [selected, setSelected] = React.useState(cart.addressId);

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative w-full max-w-md rounded-3xl bg-card p-5 shadow-raised transition-all duration-200",
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <MapPin className="size-4 text-primary" /> Delivery address
            </h3>
            <p className="text-[13px] text-muted-foreground">Pick where your meals are delivered.</p>
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

        <div className="mt-4 space-y-2" role="radiogroup" aria-label="Delivery address">
          {addresses.map((a) => {
            const active = a.id === selected;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(a.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  active ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                    active ? "border-primary" : "border-border",
                  )}
                >
                  {active ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                </span>
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="block font-semibold">{a.name}</span>
                  <span className="block text-muted-foreground">{a.address}</span>
                </span>
              </button>
            );
          })}
        </div>

        <Button
          block
          className="mt-4"
          onClick={() => {
            cart.setAddress(selected);
            toast.success("Delivery address updated");
            onClose();
          }}
        >
          Save address
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Edit order — the cart, shown as a modal with a pinned bottom summary     */
/* ---------------------------------------------------------------------- */

function EditOrderModal({ onClose }: { onClose: () => void }) {
  const [shown, setShown] = React.useState(false);
  const cart = useCartStore();
  const subtotal = cart.subtotal();
  const subsidy = cart.totalSubsidy();
  const tax = cart.tax();
  const owed = cart.total();

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-card shadow-raised transition-all duration-200",
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-semibold tracking-tight">Edit order</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CartDayList />
        </div>

        <div className="shrink-0 space-y-3 border-t border-border bg-card p-5">
          {program.showPrices ? (
            <>
              <SummaryRow label="Meals total" value={formatCurrency(subtotal)} />
              <SummaryRow label="Company pays" value={`−${formatCurrency(subsidy)}`} tone="success" />
              <SummaryRow label="Tax" value={formatCurrency(tax)} />
              <div className="flex items-center justify-between border-t-2 border-foreground pt-2 text-base font-bold">
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
          <Button
            block
            size="lg"
            onClick={() => {
              toast.success("Order updated");
              onClose();
            }}
          >
            Save order
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Per-day delivery time — modal                                           */
/* ---------------------------------------------------------------------- */

function PerDayTimeModal({
  dates,
  commonWindow,
  onClose,
}: {
  dates: string[];
  commonWindow: string;
  onClose: () => void;
}) {
  const [shown, setShown] = React.useState(false);
  const cart = useCartStore();

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative flex w-full max-w-md flex-col rounded-3xl bg-card shadow-raised transition-all duration-200",
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">Delivery time per day</h3>
            <p className="text-[13px] text-muted-foreground">Pick a window for each delivery day.</p>
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

        <div className="space-y-3 p-5">
          {dates.map((date) => {
            const win = cart.windows[date] ?? commonWindow;
            return (
              <div key={date} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="flex items-center gap-2 whitespace-nowrap text-base font-semibold">
                  <CalendarDays className="size-4 text-primary" />
                  {formatDay(fromISODate(date))}
                </span>
                <div className="w-44 shrink-0 sm:w-56">
                  <ThemeSelect
                    value={win}
                    onValueChange={(v) => cart.setWindow(date, v)}
                    options={program.deliveryWindows.map((w) => ({ value: w, label: w }))}
                    aria-label={`Delivery window for ${formatDay(fromISODate(date))}`}
                    align="right"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-b-3xl border-t border-border bg-card p-5">
          <Button block size="lg" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function Confirmation({ owed, payment }: { owed: number; payment: PaymentChoice }) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-14 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success-bg text-success">
          <CheckCircle2 className="size-9" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Order confirmed 🎉</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
            Order <strong>#ORD-2892</strong> is in. We&apos;ve emailed your confirmation to{" "}
            <strong>{me.email}</strong>.{" "}
            {owed === 0 ? (
              <>This order is fully covered by {me.company} — nothing to pay.</>
            ) : payment === "pay_later" ? (
              <>The {formatCurrency(owed)} balance will appear on your company invoice.</>
            ) : (
              <>Your card on file will be charged {formatCurrency(owed)} 24 hours before delivery.</>
            )}
          </p>
        </div>
        <Notice tone="info" className="max-w-md text-left text-xs">
          <Mail className="inline size-3.5" /> You&apos;ll get one email now, and a heads-up the day before
          delivery — no surprise &quot;payment taken&quot; emails.
        </Notice>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/orders">Track my orders</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/menu">Order more</Link>
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function Steps({ current }: { current: number }) {
  const labels = ["Cart", "Checkout", "Confirmed"];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-bold transition-colors",
                  done && "bg-success text-white",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "border border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[13px] font-semibold transition-colors",
                  active ? "text-teal-deep" : done ? "text-foreground" : "text-muted-foreground",
                  active ? "inline" : "hidden sm:inline",
                )}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 ? (
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors",
                  done ? "bg-success" : "bg-border",
                )}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PayOption({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-[13px] transition-colors",
        active ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          active ? "border-primary" : "border-border",
        )}
      >
        {active ? <span className="size-2.5 rounded-full bg-primary" /> : null}
      </span>
      <CreditCard className="size-4 text-muted-foreground" />
      <span>
        <strong>{title}</strong>
        <span className="block text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium nums", tone === "success" && "text-success")}>{value}</span>
    </div>
  );
}

/**
 * Promo-code entry above "Place order". Shows an input + Apply button while no
 * code is active; once applied it collapses into a removable success chip.
 */
function PromoField({
  promo,
  value,
  error,
  onChange,
  onApply,
  onRemove,
}: {
  promo: AppliedPromo | null;
  value: string;
  error: string;
  onChange: (v: string) => void;
  onApply: () => void;
  onRemove: () => void;
}) {
  if (promo) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-success-border bg-success-bg px-3 py-2.5 text-[13px]">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="truncate">
            {promo.code} applied · {promo.label}
          </span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove promo code ${promo.code}`}
          className="shrink-0 rounded-full p-1 text-success/80 transition-colors hover:bg-success/10 hover:text-success"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-xl border bg-card p-1.5 transition-colors focus-within:border-primary",
          error ? "border-danger-border" : "border-border",
        )}
      >
        <Tag className="ml-1.5 size-4 shrink-0 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onApply();
            }
          }}
          placeholder="Promo code"
          aria-label="Promo code"
          autoCapitalize="characters"
          spellCheck={false}
          className="h-8 min-w-0 flex-1 bg-transparent text-[13px] uppercase tracking-wide text-foreground outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/70"
        />
        <Button size="sm" variant="teal" onClick={onApply} disabled={!value.trim()}>
          Apply
        </Button>
      </div>
      {error ? (
        <p className="flex items-center gap-1 px-1 text-2xs font-medium text-danger">
          <XCircle className="size-3 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
