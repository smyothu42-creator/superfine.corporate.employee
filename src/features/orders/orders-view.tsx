"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarOff,
  CalendarRange,
  ArrowDownUp,
  XCircle,
  Pencil,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Repeat,
  Lock,
  Star,
  X,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ThemeSelect } from "@/components/ui/theme-select";
import { DateRangeModal } from "@/features/menu/date-range-modal";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { OrderTimeline } from "@/components/orders/order-status";
import { FeedbackModal } from "@/components/orders/feedback-modal";
import { RateItemModal } from "@/features/ratings/rate-item-modal";
import { useRatingsStore } from "@/store/use-ratings-store";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
import { orderPayment } from "@/data/orders";
import { program } from "@/data/program";
import { useChangeOrder } from "./use-change-order";
import { useOrdersStore } from "@/store/use-orders-store";
import { useCartStore } from "@/store/use-cart-store";
import { useSessionStore, isSubsidized } from "@/store/use-session-store";
import { confirm } from "@/store/use-confirm-store";
import { toast } from "@/store/use-toast-store";
import { useOOOStore } from "@/store/use-ooo-store";
import { fromISODate, formatDay, toISODate, startOfToday } from "@/lib/dates";
import { nextOpenDays, earliestDeliveryDate, isCutoffPassed } from "@/lib/cutoff";
import { useDialog } from "@/lib/use-dialog";
import { formatCurrency, cn } from "@/lib/utils";
import type { Order } from "@/data/types";

const EMPTY_COPY: Record<string, string> = {
  past: "No past orders yet.",
  cancelled: "No cancelled orders.",
};

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Amount: high to low" },
  { value: "amount-asc", label: "Amount: low to high" },
];

function sortOrders(list: Order[], sort: SortKey): Order[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return a.date.localeCompare(b.date);
      case "amount-desc":
        return b.employeePaid - a.employeePaid;
      case "amount-asc":
        return a.employeePaid - b.employeePaid;
      case "date-desc":
      default:
        return b.date.localeCompare(a.date);
    }
  });
}

export function OrdersView() {
  const [tab, setTab] = React.useState("upcoming");
  const [sort, setSort] = React.useState<SortKey>("date-desc");
  // Inclusive delivery-date range filter (Ant Design RangePicker style): pick a
  // start and end day; orders whose primary date falls inside are kept.
  const [range, setRange] = React.useState<{ start: string; end: string } | null>(null);
  const [rangeOpen, setRangeOpen] = React.useState(false);
  const ooo = useOOOStore();
  // Read from the reactive store so a saved edit re-renders the list.
  const orders = useOrdersStore((s) => s.orders);
  const upcoming = orders.filter((o) => ["draft", "confirmed"].includes(o.status));
  const past = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const baseList = tab === "upcoming" ? upcoming : tab === "past" ? past : cancelled;

  // Reset the date range when switching tabs (each tab spans its own dates).
  React.useEffect(() => setRange(null), [tab]);

  const list = React.useMemo(() => {
    const filtered = range
      ? baseList.filter((o) => o.date >= range.start && o.date <= range.end)
      : baseList;
    return sortOrders(filtered, sort);
  }, [baseList, range, sort]);

  const rangeFmt = (iso: string) =>
    fromISODate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const rangeLabel = range ? `${rangeFmt(range.start)} – ${rangeFmt(range.end)}` : "All dates";

  return (
    <div className="space-y-5">
      {ooo.active && ooo.dates.length ? (
        <Notice tone="warning">
          <CalendarOff className="inline size-3.5" /> <strong>You&apos;re out of office</strong> on{" "}
          {ooo.dates.map((d) => formatDay(fromISODate(d))).join(", ")}. Auto-orders are paused on{" "}
          {ooo.dates.length === 1 ? "this day" : "these days"}.{" "}
          <button type="button" onClick={ooo.clear} className="font-semibold underline">
            Turn off
          </button>
          .
        </Notice>
      ) : null}

      {/* One row at every width. The tab strip is the flexible part (shrinks and
          scrolls), while the date/sort controls stay put — and collapse to
          icon-only on phones so all three fit 390px instead of wrapping to a
          second row. The date label reappears once a range is set, since then
          it carries information the icon can't. */}
      <div className="sticky top-16 z-20 -mx-4 flex items-center justify-between gap-2 bg-background px-4 py-2 sm:-mx-6 sm:gap-3 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <Tabs
            tabs={[
              { id: "upcoming", label: `Upcoming (${upcoming.length})` },
              { id: "past", label: `Past (${past.length})` },
              { id: "cancelled", label: `Cancelled (${cancelled.length})` },
            ]}
            value={tab}
            onValueChange={setTab}
          />
        </div>
        {baseList.length > 0 ? (
          <div className="flex shrink-0 items-center gap-2">
            {/* Date-range filter — opens a start/end calendar picker. Styled to
                match the sort ThemeSelect's box trigger so the two are the same
                height and weight. */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setRangeOpen(true)}
                aria-label={range ? `Date range: ${rangeLabel}` : "Filter by date"}
                className={cn(
                  "flex h-10 items-center gap-1.5 rounded-full border bg-card px-3 text-[13px] font-semibold text-teal-deep shadow-sm outline-none transition-colors hover:bg-teal-wash focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 sm:px-3.5",
                  range ? "border-primary" : "border-control hover:border-primary",
                )}
              >
                <CalendarRange className="size-4 shrink-0 text-primary" />
                <span className={cn("truncate", !range && "hidden sm:inline")}>{rangeLabel}</span>
              </button>
              {range ? (
                <button
                  type="button"
                  onClick={() => setRange(null)}
                  aria-label="Clear date range"
                  className="touch-target ml-1 rounded-full border border-control bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
            <ThemeSelect
              value={sort}
              onValueChange={(v) => setSort(v as SortKey)}
              options={SORT_OPTIONS}
              size="sm"
              align="right"
              aria-label="Sort orders"
              icon={ArrowDownUp}
              labelClassName="hidden sm:inline"
              className="w-auto"
              triggerClassName="h-10"
            />
          </div>
        ) : null}
      </div>

      {list.length === 0 ? (
        <Card>
          <CardBody className="py-14 text-center text-[13px] text-muted-foreground">
            {baseList.length > 0 ? (
              <>
                No orders in this date range.{" "}
                <button
                  type="button"
                  onClick={() => setRange(null)}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Show all dates
                </button>
              </>
            ) : tab === "upcoming" ? (
              <>
                No upcoming orders.{" "}
                <Link href="/menu" className="font-semibold text-primary underline underline-offset-2">
                  Browse the menu
                </Link>{" "}
                to get lunch sorted.
              </>
            ) : (
              EMPTY_COPY[tab]
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Date-range picker. Every day is selectable here (this filters past and
          upcoming orders alike), so override the ordering calendar's default
          past/weekend disabling via dayInfo. */}
      {rangeOpen ? (
        <DateRangeModal
          initialStart={range?.start}
          initialEnd={range?.end}
          dayInfo={() => ({ selectable: true, cutoff: false, reason: "" })}
          onClose={() => setRangeOpen(false)}
          onApply={(start, end) => {
            setRange({ start, end });
            setRangeOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const cart = useCartStore();
  // Individuals pay retail — no subsidy, no auto-order.
  const corporate = isSubsidized(useSessionStore((s) => s.account));
  const href = `/orders/${order.id}`;
  const items = order.days.flatMap((d) => d.items);
  const active = ["draft", "confirmed"].includes(order.status);
  // Editable only before the change cutoff — checked against the real clock, so
  // an order still open at page load locks the moment its cutoff passes.
  const editable = active && !order.locked && !isCutoffPassed(order.date, order.type);
  // Re-order confirmation modal (past orders).
  const [reorderOpen, setReorderOpen] = React.useState(false);
  // In-platform feedback form (delivered orders).
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  // Shared change/swap flow (opens the change-order popup, hands off to the menu).
  const { startChange } = useChangeOrder(order);

  // Re-order: drop this order's meals into the cart on the next open delivery
  // day(s), then send the user to the cart to pick a day and check out.
  function reorder() {
    const days = nextOpenDays(toISODate(startOfToday()), order.days.length, order.type);
    const fallback = toISODate(earliestDeliveryDate(order.type));
    order.days.forEach((d, i) => {
      const date = days[i] ?? days[days.length - 1] ?? fallback;
      d.items.forEach((it) => {
        cart.add({
          date,
          itemId: it.itemId,
          name: it.name,
          basePrice: getItem(it.itemId)?.price ?? it.price,
          qty: it.qty,
          addOns: [],
          type: order.type,
        });
      });
    });
    setReorderOpen(false);
    toast.success(
      "Added to your cart",
      `${items.length} meal${items.length === 1 ? "" : "s"} from ${order.id} ready to reorder.`,
    );
    router.push("/cart");
  }

  async function cancel() {
    const ok = await confirm({
      title: `Cancel order ${order.id}?`,
      description: `Your meal for ${formatDay(fromISODate(order.date))} will be cancelled. ${program.changeWindow}.`,
      confirmLabel: "Cancel order",
      tone: "danger",
    });
    if (ok) toast.success("Order cancelled", `${order.id} has been cancelled.`);
  }

  // Stops a button/link inside the card from also triggering the card navigation.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Order ${order.id} details`}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      className="cursor-pointer overflow-hidden transition-transform duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b px-5 py-3.5",
          order.status === "cancelled"
            ? "border-danger-border bg-danger-bg"
            : "border-teal-soft bg-teal-wash",
        )}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-display text-base font-semibold tracking-tight",
                order.status === "cancelled" ? "text-danger" : "text-teal-deep",
              )}
            >
              {order.id}
            </span>
            {corporate && order.source === "auto" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-card px-2.5 py-1 text-xs font-semibold text-teal-deep shadow-sm">
                <Repeat className="size-3.5" /> Auto-order
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {order.days.length > 1
              ? `${order.days.length} days from ${formatDay(fromISODate(order.date))}`
              : formatDay(fromISODate(order.date))}
          </p>
        </div>
        {editable ? (
          <div className="flex shrink-0 items-center gap-2">
            {/* Icon-only on phones, where the header band is tight and spelled-out
                labels crowd the order id + date; the label returns from `sm` up.
                aria-label + title keep the meaning while the text is hidden. */}
            <Button
              size="sm"
              variant="outline"
              className="w-8 px-0 sm:w-auto sm:px-4"
              aria-label="Edit order"
              title="Edit order"
              onClick={(e) => {
                stop(e);
                startChange();
              }}
            >
              <Pencil className="size-3.5" /> <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-8 border-danger px-0 text-danger hover:bg-danger/10 sm:w-auto sm:px-4"
              aria-label="Cancel order"
              title="Cancel order"
              onClick={(e) => {
                stop(e);
                cancel();
              }}
            >
              <XCircle className="size-3.5" /> <span className="hidden sm:inline">Cancel</span>
            </Button>
          </div>
        ) : active && order.locked ? (
          <span
            aria-label="Editing closed. This order can no longer be changed"
            className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-2xs font-semibold text-muted-foreground opacity-60"
          >
            <Lock className="size-3.5" /> Editing closed
          </span>
        ) : (
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        )}
      </div>

      <CardBody className="space-y-4">
        {active ? (
          <div className="pb-2">
            <OrderTimeline status={order.status} source={order.source} />
          </div>
        ) : null}

        {/* A delivered order is the one place every meal needs its own control,
            so it gets a row per item instead of the stacked-avatar summary. */}
        {order.status === "delivered" ? (
          <RateableItemList order={order} />
        ) : items.length > 1 ? (
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 -space-x-3">
              {items.slice(0, 3).map((it, i) => (
                // Decorative — the summary line under the stack lists every
                // meal by name, so naming each thumbnail says it all twice.
                <FoodPhoto
                  key={i}
                  src={getItem(it.itemId)?.image}
                  alt=""
                  className="size-10 rounded-full ring-2 ring-card"
                  iconClassName="size-4"
                />
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{items.length} meal orders</p>
              <p className="truncate text-2xs text-muted-foreground">
                {items.map((it) => it.name).join(" · ")}
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {order.days.map((d) =>
              d.items.map((it, idx) => (
                <li key={`${d.date}-${idx}`} className="flex items-start justify-between gap-3 text-[13px]">
                  <span className="flex items-start gap-2.5">
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
                  </span>
                  <span className="text-2xs text-muted-foreground">{d.deliveryWindow}</span>
                </li>
              )),
            )}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
            <MapPin className="size-3.5" /> {order.address}
          </span>
          <span className="text-[13px] font-semibold nums">
            {corporate && order.employeePaid === 0 ? (
              <span className="text-success">Fully covered</span>
            ) : (
              // Tax-inclusive total, matching the order-detail payment breakdown.
              <>You paid {formatCurrency(orderPayment(order, corporate).total)}</>
            )}
          </span>
        </div>

        {order.status === "delivered" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                stop(e);
                setReorderOpen(true);
              }}
            >
              <Repeat className="size-3.5" /> Re-Order
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                stop(e);
                setFeedbackOpen(true);
              }}
            >
              {/* Not "Leave feedback": that label collected delivery
                  complaints as one-star meals. This button is the logistics
                  door; the stars on each meal above are the food door. */}
              <AlertTriangle className="size-3.5" /> Problem with your order?
            </Button>
          </div>
        ) : null}

        {order.locked && active ? (
          <Notice tone="locked" className="text-xs">
            Past the change window. This order is locked in for delivery.
          </Notice>
        ) : null}
      </CardBody>
    </Card>

    {reorderOpen ? (
      <ReOrderModal order={order} onClose={() => setReorderOpen(false)} onConfirm={reorder} />
    ) : null}
    {feedbackOpen ? (
      <FeedbackModal orderId={order.id} onClose={() => setFeedbackOpen(false)} />
    ) : null}
    </>
  );
}

/**
 * The meals in a delivered order, each with its own rating control.
 *
 * Per item rather than per order because that is the grain of the opinion: the
 * Bibimbap was excellent and the salad arrived warm, and one number across both
 * says neither. A rated line shows its score back instead of the button — the
 * row is the record as well as the entry point.
 */
function RateableItemList({ order }: { order: Order }) {
  const ratings = useRatingsStore((s) => s.ratings);
  const [rating, setRating] = React.useState<{ lineId: string; name: string } | null>(null);

  const byLine = React.useMemo(() => new Map(ratings.map((r) => [r.lineId, r])), [ratings]);

  return (
    <>
      <ul className="space-y-1.5">
        {order.days.map((d) =>
          d.items.map((it) => {
            const rated = byLine.get(it.lineId);
            return (
              <li key={it.lineId} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex min-w-0 items-center gap-2.5">
                  <FoodPhoto
                    src={getItem(it.itemId)?.image}
                    alt=""
                    className="size-10 shrink-0 rounded-full"
                    iconClassName="size-4"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {it.name} ×{it.qty}
                    </span>
                    {it.addOns.length ? (
                      <span className="block truncate text-2xs text-muted-foreground">
                        {it.addOns.join(" · ")}
                      </span>
                    ) : null}
                  </span>
                </span>

                {rated ? (
                  <span className="flex shrink-0 items-center">
                    <span aria-hidden className="flex items-center">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            "size-3",
                            n <= rated.stars
                              // The empty stars are what say "out of five" to
                              // anyone reading this by eye — the sr-only
                              // sentence below covers everyone else. Faded to
                              // 40% they were all but invisible, leaving a
                              // three-star rating looking like the whole scale.
                              ? "fill-yellow text-yellow"
                              : "fill-transparent text-muted-foreground",
                          )}
                        />
                      ))}
                    </span>
                    <span className="sr-only">
                      You rated {it.name} {rated.stars} out of 5 stars
                    </span>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Rate ${it.name}`}
                    onClick={(e) => {
                      // The card itself navigates; this must not follow it.
                      // (Called inline rather than via OrderCard's `stop`, which
                      // is scoped to that component — the bare name resolves to
                      // `window.stop` out here, which silently does nothing.)
                      e.stopPropagation();
                      setRating({ lineId: it.lineId, name: it.name });
                    }}
                  >
                    <Star className="size-3.5" aria-hidden /> Rate
                  </Button>
                )}
              </li>
            );
          }),
        )}
      </ul>

      {rating ? (
        <RateItemModal
          order={order}
          lineId={rating.lineId}
          itemName={rating.name}
          onClose={() => setRating(null)}
        />
      ) : null}
    </>
  );
}

/**
 * Re-order confirmation — shows the past order's meals in a modal and, on
 * confirm, drops them into the cart for the next open delivery day.
 */
function ReOrderModal({
  order,
  onClose,
  onConfirm,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [shown, setShown] = React.useState(false);
  const items = order.days.flatMap((d) => d.items);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Mounted only while it's up, so it's open for its whole life.
  const dialog = useDialog({ open: true, onClose });

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      {/* The dialog is the sheet, not the box that also holds the scrim, so the
          trap ends where the panel does. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Re-order ${order.id}`}
        {...dialog.props}
        className={cn(
          "relative flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-raised transition-all duration-200 sm:rounded-3xl",
          shown ? "translate-y-0 sm:scale-100 sm:opacity-100" : "translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">Re-order these meals?</h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              From {order.id} · {formatDay(fromISODate(order.date))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-control bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <ul className="space-y-3">
            {items.map((it, idx) => (
              <li key={`${it.itemId}-${idx}`} className="flex items-start gap-3">
                {/* Decorative — the name is the text beside it. */}
                <FoodPhoto
                  src={getItem(it.itemId)?.image}
                  alt=""
                  className="size-11 shrink-0 rounded-full"
                  iconClassName="size-4"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">
                    {it.name} ×{it.qty}
                  </p>
                  {it.addOns.length ? (
                    <p className="mt-0.5 text-2xs text-muted-foreground">{it.addOns.join(" · ")}</p>
                  ) : null}
                </div>
                {program.showPrices ? (
                  <span className="text-[13px] nums">{formatCurrency(it.price * it.qty)}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-muted px-3 py-2.5 text-2xs text-muted-foreground">
            We&apos;ll add these meals to your cart for the next available delivery day. You can change the
            day, add sides or drinks, and check out from your cart.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="teal" onClick={onConfirm}>
            <Repeat className="size-4" /> Re-order
          </Button>
        </div>
      </div>
    </div>
  );
}
