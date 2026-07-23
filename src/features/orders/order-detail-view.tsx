"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Download,
  XCircle,
  Pencil,
  CalendarDays,
  Clock,
  CreditCard,
  AlertTriangle,
  Star,
  Link2,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge, OrderTimeline } from "@/components/orders/order-status";
import { FeedbackModal } from "@/components/orders/feedback-modal";
import { CutoffIndicator } from "@/components/cutoff/cutoff-indicator";
import { useChangeOrder } from "./use-change-order";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
import { orderPayment } from "@/data/orders";
import { program } from "@/data/program";
import { useOrdersStore } from "@/store/use-orders-store";
import { useRatingsStore } from "@/store/use-ratings-store";
import { RateItems } from "@/features/ratings/rate-items";
import { encodeRatingToken } from "@/lib/rating-token";
import { useSessionStore, isSubsidized } from "@/store/use-session-store";
import { confirm } from "@/store/use-confirm-store";
import { toast } from "@/store/use-toast-store";
import { fromISODate, formatDay } from "@/lib/dates";
import { isCutoffPassed } from "@/lib/cutoff";
import { formatCurrency, cn } from "@/lib/utils";
import type { Order, PaymentChoice } from "@/data/types";

const PAYMENT_LABEL: Record<PaymentChoice, string> = {
  covered: "Fully covered by company",
  pay_later: "Invoice to company",
  pay_now: "Paid with Square",
};

/**
 * "Rate your meals", on a delivered order. Collapsed to a prompt until it's
 * opened — the page is here to answer "what did I order and what did it cost",
 * and a star grid unfolded across the top would answer a question nobody asked
 * on the way in.
 *
 * Once every line is rated it stops being a prompt and becomes a record: the
 * card would otherwise sit there inviting an action the store rejects.
 */
function RateOrderCard({ order }: { order: Order }) {
  // Select the whole list and narrow it here. Filtering *inside* the selector
  // returns a new array on every store read, which zustand compares by identity
  // — it never matches, so the component re-renders forever.
  const all = useRatingsStore((s) => s.ratings);
  const ratings = React.useMemo(
    () => all.filter((r) => r.orderId === order.id),
    [all, order.id],
  );
  const [open, setOpen] = React.useState(false);

  const lines = order.days.flatMap((d) => d.items);
  const rated = new Set(ratings.map((r) => r.lineId));
  const left = lines.filter((l) => !rated.has(l.lineId)).length;

  // Collapses to the record only when it isn't open. Folding the moment the last
  // rating lands would tear the thank-you screen out from under the tap that
  // caused it — the card closes when its Done is pressed, not before.
  if (left === 0 && !open) {
    const avg =
      ratings.reduce((n, r) => n + r.stars, 0) / Math.max(ratings.length, 1);
    return (
      <Card>
        <CardBody className="flex items-center gap-3 py-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-yellow/20 text-teal-deep">
            <Star className="size-4 fill-yellow text-yellow" />
          </span>
          <p className="text-[13px] text-muted-foreground">
            You rated {ratings.length} {ratings.length === 1 ? "meal" : "meals"} from this order
            {ratings.length ? ` · ${Math.round(avg * 10) / 10} average` : ""}.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-yellow/20 text-teal-deep">
            <Star className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">Rate your meals</p>
            <p className="text-2xs text-muted-foreground">
              {open
                ? "Rate one, some or all — anything you skip stays open"
                : `${left} of ${lines.length} not yet rated · rate one, some or all`}
            </p>
          </div>
          {!open ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              Rate items
            </Button>
          ) : null}
        </div>
        {open ? <RateItems order={order} source="account" onDone={() => setOpen(false)} /> : null}

        {/* Stands in for the "how was lunch?" email. The link is the real
            artefact of this feature — it has to be reachable to be testable,
            and in production this row is the mail, not a button. */}
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}/r/${encodeRatingToken(order.id)}`;
            void navigator.clipboard?.writeText(url);
            toast.success("Rating link copied", "The same link we email after delivery.");
          }}
          className="flex items-center gap-1.5 text-2xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Link2 className="size-3.5" /> Copy the rating link
        </button>
      </CardBody>
    </Card>
  );
}

export function OrderDetailView({ order: initialOrder }: { order: Order }) {
  const router = useRouter();
  // Prefer the live store copy so a saved edit re-renders this page; fall back to
  // the server-resolved prop before the store has the id (or on a hard load).
  const order = useOrdersStore((s) => s.orders.find((o) => o.id === initialOrder.id)) ?? initialOrder;
  const active = ["draft", "confirmed"].includes(order.status);
  // Editable only before the change cutoff (checked live against the real clock).
  const editable = active && !order.locked && !isCutoffPassed(order.date, order.type);
  // Individuals pay retail — no subsidy line, and "covered" never applies.
  const corporate = isSubsidized(useSessionStore((s) => s.account));
  // Tax on the employee-paid portion + the true total, in sync with the cart/checkout.
  const pay = orderPayment(order, corporate);
  // Same change-order popup + "Select from full menu" hand-off as the list page.
  const { startChange } = useChangeOrder(order);

  async function cancel() {
    const ok = await confirm({
      title: `Cancel order ${order.id}?`,
      description: `Your meal for ${formatDay(fromISODate(order.date))} will be cancelled. ${program.changeWindow}.`,
      confirmLabel: "Cancel order",
      tone: "danger",
    });
    if (ok) {
      toast.success("Order cancelled", `${order.id} has been cancelled.`);
      router.push("/orders");
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to my orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{order.id}</h2>
          <OrderStatusBadge status={order.status} />
        </div>
        <span className="text-2xs text-muted-foreground">Placed {order.placedAt}</span>
      </div>

      {active ? (
        <Card>
          <CardBody>
            <OrderTimeline status={order.status} source={order.source} />
          </CardBody>
        </Card>
      ) : null}

      {/* Rating lives above the order's own detail on a delivered order: it's the
          one thing left to *do* here, and below three day-cards it would be
          found only by someone already scrolling for it. Delivered only —
          nobody can rate a lunch that hasn't arrived. */}
      {order.status === "delivered" ? <RateOrderCard order={order} /> : null}

      {/* When must this be edited by — or is it locked? One prominent, type-aware banner. */}
      {active ? (
        <CutoffIndicator
          deliveryISO={order.date}
          type={order.type}
          lockedOverride={order.locked}
          context="edit"
          variant="notice"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {order.days.map((d) => (
            <Card key={d.date}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="size-4 text-primary" />
                  {formatDay(fromISODate(d.date))}
                </CardTitle>
                <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <Clock className="size-3.5" /> {d.deliveryWindow}
                </span>
              </CardHeader>
              <CardBody className="space-y-2">
                {d.items.map((it, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 text-[13px]">
                    <div className="flex items-start gap-2.5">
                      {/* Decorative — the name is the text beside it. */}
                      <FoodPhoto
                        src={getItem(it.itemId)?.image}
                        alt=""
                        className="size-10 shrink-0 rounded-full"
                        iconClassName="size-4"
                      />
                      <span>
                        <span className="font-medium">
                          {it.name} ×{it.qty}
                        </span>
                        {it.addOns.length ? (
                          <span className="block text-2xs text-muted-foreground">{it.addOns.join(" · ")}</span>
                        ) : null}
                      </span>
                    </div>
                    {program.showPrices ? (
                      <span className="nums">{formatCurrency(it.price * it.qty)}</span>
                    ) : null}
                  </div>
                ))}
              </CardBody>
            </Card>
          ))}

          {order.status === "delivered" ? <FeedbackCard orderId={order.id} /> : null}
        </div>

        {/* Sidebar: delivery, payment, actions */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex items-start gap-2 text-[13px]">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{order.address}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              <div className="flex items-center gap-2 text-[13px]">
                <CreditCard className="size-4 text-muted-foreground" />
                {/* "Fully covered by company" can't apply to an individual. */}
                {!corporate && order.payment === "covered"
                  ? PAYMENT_LABEL.pay_now
                  : PAYMENT_LABEL[order.payment]}
              </div>
              {program.showPrices ? (
                corporate ? (
                  <div className="space-y-1 pt-1 text-[13px]">
                    <Row label="Meals total" value={formatCurrency(order.subtotal)} />
                    <Row label="Company pays" value={`−${formatCurrency(order.subsidy)}`} tone="success" />
                    <Row label="Tax" value={formatCurrency(pay.tax)} />
                    <div className="flex items-center justify-between border-t border-border pt-1.5 font-semibold">
                      <span>You paid</span>
                      <span className="nums">{formatCurrency(pay.total)}</span>
                    </div>
                  </div>
                ) : (
                  // Individuals: no subsidy, so meals total + tax = what you paid.
                  <div className="space-y-1 pt-1 text-[13px]">
                    <Row label="Meals total" value={formatCurrency(order.subtotal)} />
                    <Row label="Tax" value={formatCurrency(pay.tax)} />
                    <div className="flex items-center justify-between border-t border-border pt-1.5 font-semibold">
                      <span>You paid</span>
                      <span className="nums">{formatCurrency(pay.total)}</span>
                    </div>
                  </div>
                )
              ) : null}
            </CardBody>
          </Card>

          <div className="space-y-2">
            {editable ? (
              <>
                <Button block variant="outline" onClick={startChange}>
                  <Pencil className="size-4" /> Edit order
                </Button>
                <Button block variant="ghost" className="text-danger" onClick={cancel}>
                  <XCircle className="size-4" /> Cancel order
                </Button>
              </>
            ) : null}
            {order.invoiceId ? (
              <Button
                block
                variant="ghost"
                onClick={() => toast.info("Invoice ready", `Downloading ${order.invoiceId}.pdf`)}
              >
                <Download className="size-4" /> Download invoice
              </Button>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}

function FeedbackCard({ orderId }: { orderId: string }) {
  // The logistics door for this order — late, missing, wrong, or a refund to
  // chase. Deliberately not a rating: how the food tasted is the stars on each
  // meal, and mixing the two turns a driver's bad day into a one-star recipe.
  const [open, setOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Problem with your order?</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-[13px] text-muted-foreground">
          Late, missing, wrong item, or a delivery or billing issue with {orderId}? Tell our
          operations team here. To say how the food itself was,{" "}
          <Link
            href={`/rate?order=${orderId}`}
            className="font-semibold text-primary underline underline-offset-2"
          >
            rate the meals
          </Link>{" "}
          instead.
        </p>
        {/* The card's own heading already asks the question, so the button
            answers it rather than repeating it back. */}
        <Button size="sm" onClick={() => setOpen(true)}>
          <AlertTriangle className="size-4" /> Report the problem
        </Button>
      </CardBody>
      {open ? <FeedbackModal orderId={orderId} onClose={() => setOpen(false)} /> : null}
    </Card>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium nums", tone === "success" && "text-success")}>{value}</span>
    </div>
  );
}
