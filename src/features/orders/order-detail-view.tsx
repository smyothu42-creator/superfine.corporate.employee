"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  XCircle,
  Pencil,
  ChevronDown,
  Clock,
  CreditCard,
  Star,
  Lock,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge, OrderTimeline } from "@/components/orders/order-status";
import { FeedbackModal } from "@/components/orders/feedback-modal";
import { useChangeOrder } from "./use-change-order";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
import { orderPayment, orderTaxLines, canChangeOrder } from "@/data/orders";
import { program } from "@/data/program";
import { useOrdersStore } from "@/store/use-orders-store";
import { useRatingsStore } from "@/store/use-ratings-store";
import { RateItemModal } from "@/features/ratings/rate-item-modal";
import { useSessionStore, isSubsidized } from "@/store/use-session-store";
import { confirm } from "@/store/use-confirm-store";
import { toast } from "@/store/use-toast-store";
import { fromISODate, formatDay } from "@/lib/dates";
import { formatCurrency, cn } from "@/lib/utils";
import type { Order, OrderType, PaymentChoice } from "@/data/types";

const PAYMENT_LABEL: Record<PaymentChoice, string> = {
  covered: "Fully covered by company",
  pay_later: "Invoice to company",
  pay_now: "Paid with Square",
};

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  individual: "Individual",
  family_style: "Family style",
};

/**
 * "Rate your meals", on a delivered order. A prompt that opens the same
 * {@link RateItemModal} the order card on My Orders opens — one rating surface
 * for the whole app, so the star control, the tags, the 24-hour lock and the
 * submit path can't drift between the two places you can reach them from.
 *
 * The card stays a prompt rather than unfolding a star grid in place: this page
 * is here to answer "what did I order and what did it cost", and rating is an
 * errand you arrive at, not one the page should open with.
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

  // Collapses to the record only when the sheet isn't up. Folding the moment the
  // last rating lands would swap the card out from under an open modal, so the
  // page changes shape behind the thing the person is still looking at.
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
      <CardBody>
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-yellow/20 text-teal-deep">
            <Star className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">Rate your meals</p>
            <p className="text-2xs text-muted-foreground">
              {left} of {lines.length} not yet rated · rate one, some or all
            </p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            Rate items
          </Button>
        </div>
        {open ? <RateItemModal order={order} onClose={() => setOpen(false)} /> : null}
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
  // Drafts before their cutoff only — a placed order is the kitchen's now.
  const editable = canChangeOrder(order);
  // Individuals pay retail — no subsidy line, and "covered" never applies.
  const corporate = isSubsidized(useSessionStore((s) => s.account));
  // Tax on the employee-paid portion + the true total, in sync with the cart/checkout.
  const pay = orderPayment(order, corporate);
  // The same tax figure, split into food/beverage for the Payment card's disclosure.
  const taxLines = React.useMemo(() => orderTaxLines(order, corporate), [order, corporate]);
  const itemCount = order.days.reduce(
    (n, d) => n + d.items.reduce((m, it) => m + it.qty, 0),
    0,
  );
  const multiDay = order.days.length > 1;
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

      {active ? (
        <Card>
          <CardBody>
            <OrderTimeline status={order.status} source={order.source} />
          </CardBody>
        </Card>
      ) : null}

      {/* The summary card. Everything a person opens this page holding a question
          about — which day, what time, where, what it cost me, can I still change
          it — plus the two controls that answer "can I still change it" by
          existing or not. The old page spread this across a page header, a
          cutoff banner, a Delivery card and a button stack in the rail. */}
      <Card>
        <CardHeader className="flex-wrap">
          <div className="flex items-center gap-2">
            <CardTitle>Order #{order.id}</CardTitle>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editable ? (
              <>
                {/* Both labels are the card's — one word each, with the order
                    they act on carried by aria-label/title rather than repeated
                    beside a heading that already names it. */}
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Edit order"
                  title="Edit order"
                  onClick={startChange}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-danger text-danger hover:bg-danger/10"
                  aria-label="Cancel order"
                  title="Cancel order"
                  onClick={cancel}
                >
                  <XCircle className="size-3.5" /> Cancel
                </Button>
              </>
            ) : active ? (
              <EditingClosed />
            ) : null}
          </div>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Order type" value={ORDER_TYPE_LABEL[order.type]} />
            {/* A multi-day order gets its span here and its per-day windows in
                the items list — repeating "Mon, Aug 10" for an order that also
                runs on Tuesday is how a delivery gets missed. */}
            <Field
              label={multiDay ? "Delivery dates" : "Delivery date"}
              value={
                multiDay
                  ? `${formatDay(fromISODate(order.days[0].date))} – ${formatDay(
                      fromISODate(order.days[order.days.length - 1].date),
                    )}`
                  : formatDay(fromISODate(order.date))
              }
            />
            <Field
              label="Delivery time"
              value={
                multiDay
                  ? `${order.days.length} days · times below`
                  : order.days[0]?.deliveryWindow ?? "—"
              }
            />
            <Field label="Location" value={order.address} />
            <Field
              label="Payment"
              value={
                // "Fully covered by company" can't apply to an individual.
                !corporate && order.payment === "covered"
                  ? PAYMENT_LABEL.pay_now
                  : PAYMENT_LABEL[order.payment]
              }
            />
            <Field label="Placed" value={order.placedAt} />
          </dl>
        </CardBody>
      </Card>

      {/* Rating lives above the order's own detail on a delivered order: it's the
          one thing left to *do* here, and below the items it would be found only
          by someone already scrolling for it. Delivered only — nobody can rate a
          lunch that hasn't arrived. */}
      {order.status === "delivered" ? <RateOrderCard order={order} /> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* One card for the whole order rather than one per day. A day is a
              band inside the list, and on a single-day order not even that —
              the date is already in the summary card above. */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
              <span className="text-2xs text-muted-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"}
                {multiDay ? ` · ${order.days.length} days` : ""}
              </span>
            </CardHeader>
            {order.days.map((d, di) => (
              <div key={d.date}>
                {multiDay ? (
                  <div
                    className={cn(
                      "flex items-center justify-between gap-3 bg-muted px-5 py-2",
                      di > 0 && "border-t border-border",
                    )}
                  >
                    <span className="text-2xs font-semibold">{formatDay(fromISODate(d.date))}</span>
                    <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                      <Clock className="size-3" /> {d.deliveryWindow}
                    </span>
                  </div>
                ) : null}
                <div className="divide-y divide-border">
                  {d.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                      {/* Decorative — the name is the text beside it. */}
                      <FoodPhoto
                        src={getItem(it.itemId)?.image}
                        alt=""
                        className="size-10 shrink-0 rounded-full"
                        iconClassName="size-4"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{it.name}</p>
                        {it.addOns.length ? (
                          <p className="text-2xs text-muted-foreground">{it.addOns.join(" · ")}</p>
                        ) : null}
                      </div>
                      {program.showPrices ? (
                        <span className="nums shrink-0 font-medium">
                          {formatCurrency(it.price * it.qty)}
                        </span>
                      ) : null}
                      <span className="nums w-8 shrink-0 text-right text-muted-foreground">
                        ×{it.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>

          {/* The door out, under the items on every order the customer can't
              fix themselves. An editable order doesn't get one: its answer to
              "something's wrong" is the Edit button, not our inbox. */}
          {!editable ? <FeedbackLine orderId={order.id} /> : null}
        </div>

        {/* The money rail — the only thing left on this side, so it can follow
            the items list down instead of stranding a half-empty column. */}
        <div className="lg:sticky lg:top-[calc(4rem_+_1.5rem)] lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
              {/* In the header beside the title, the same place the summary
                  card puts Edit and Cancel — an action belongs to the box whose
                  contents it acts on, not to the page floating under it. */}
              {order.invoiceId ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast.info("Invoice ready", `Downloading ${order.invoiceId}.pdf`)}
                >
                  <Download className="size-4" /> Download invoice
                </Button>
              ) : null}
            </CardHeader>
            <CardBody className="space-y-2.5">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <CreditCard className="size-4" />
                {!corporate && order.payment === "covered"
                  ? PAYMENT_LABEL.pay_now
                  : PAYMENT_LABEL[order.payment]}
              </div>
              {program.showPrices ? (
                <div className="space-y-2 text-[13px]">
                  <Row label="Meals total" value={formatCurrency(order.subtotal)} />
                  {corporate ? (
                    <Row
                      label="Company covers"
                      value={`−${formatCurrency(order.subsidy)}`}
                      tone="success"
                    />
                  ) : null}
                  <Row label="Delivery" value="Included" />
                  <TaxRows total={pay.tax} lines={taxLines} />
                  <div className="flex items-center justify-between border-t border-border pt-2.5 text-base font-semibold">
                    <span>{order.status === "delivered" ? "You paid" : "You pay"}</span>
                    <span className="nums">{formatCurrency(pay.total)}</span>
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** A label/value pair in the summary card's metadata grid. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-overline uppercase tracking-[0.04em]">{label}</dt>
      <dd className="mt-1 text-[13px] font-medium">{value}</dd>
    </div>
  );
}

/**
 * What stands where Edit stood once the order is the kitchen's. A chip, not a
 * disabled button: a disabled control invites the aim and then refuses it, and
 * `border-border` rather than `border-control` because this isn't something you
 * operate — the two-tier border rule is the tell.
 *
 * The way out of a closed door is the {@link FeedbackLine} under the items — one
 * place for that door on every order, rather than one wording up here and a
 * different one down there depending on the status.
 */
function EditingClosed() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-[13px] font-semibold text-muted-foreground">
      <Lock className="size-3.5" aria-hidden /> Editing closed
    </span>
  );
}

/**
 * The tax row, and behind a disclosure the same figure split by tax category.
 * Collapsed by default — the total is what almost everyone came for, and an
 * always-open breakdown is what makes this card out-run the items beside it.
 *
 * A single-category order still opens: the panel carries the rate and the
 * taxable base, which the summary row doesn't. With no tax at all there is
 * nothing behind the door, so it stays a plain row.
 */
function TaxRows({ total, lines }: { total: number; lines: ReturnType<typeof orderTaxLines> }) {
  const [open, setOpen] = React.useState(false);
  if (!lines.length) return <Row label="Tax" value={formatCurrency(total)} />;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          Tax
          <ChevronDown
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </span>
        <span className="nums font-medium">{formatCurrency(total)}</span>
      </button>
      {open ? (
        <div className="space-y-2 rounded-xl bg-muted p-3">
          {lines.map((l) => (
            <div key={l.category}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{l.category} tax</span>
                <span className="nums font-medium">{formatCurrency(l.amount)}</span>
              </div>
              <p className="text-2xs text-muted-foreground">
                {(l.rate * 100).toFixed(2)}% on {formatCurrency(l.taxable)} taxable
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FeedbackLine({ orderId }: { orderId: string }) {
  // The logistics door for this order — late, missing, wrong, or a refund to
  // chase. Deliberately not a rating: how the food tasted is the stars on each
  // meal, and mixing the two turns a driver's bad day into a one-star recipe.
  //
  // Most orders are fine, so this sits under the meals as one quiet line rather
  // than a card: the door named, nothing explained until it's asked for. The
  // modal carries the detail. No "rate the meals" steer either — on a delivered
  // order the ratings card sits above, so the only thing left to say here is
  // the one thing it doesn't cover.
  //
  // Every non-editable order shows it, in this one spot: a placed order's "you
  // can't change this here" and a delivered order's "it arrived cold" are the
  // same conversation with the same team.
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-wrap items-center gap-x-2 px-1 text-[13px] text-muted-foreground">
      <span>Something wrong with this order?</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[28px] items-center font-semibold text-primary underline underline-offset-2"
      >
        Report a problem
      </button>
      {open ? <FeedbackModal orderId={orderId} onClose={() => setOpen(false)} /> : null}
    </div>
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
