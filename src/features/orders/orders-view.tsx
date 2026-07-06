"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarOff,
  XCircle,
  Pencil,
  ChevronRight,
  MapPin,
  MessageSquare,
  Repeat,
  Lock,
  X,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { OrderStatusBadge, OrderTimeline } from "@/components/orders/order-status";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
import { orders } from "@/data/orders";
import { program } from "@/data/program";
import { useChangeOrder } from "./use-change-order";
import { useUiStore } from "@/store/use-ui-store";
import { useCartStore } from "@/store/use-cart-store";
import { confirm } from "@/store/use-confirm-store";
import { toast } from "@/store/use-toast-store";
import { useOOOStore } from "@/store/use-ooo-store";
import { fromISODate, formatDay, toISODate, startOfToday } from "@/lib/dates";
import { nextOpenDays, earliestDeliveryDate } from "@/lib/cutoff";
import { formatCurrency, cn } from "@/lib/utils";
import type { Order } from "@/data/types";

const upcoming = orders.filter((o) => ["draft", "confirmed"].includes(o.status));
const past = orders.filter((o) => o.status === "delivered");
const cancelled = orders.filter((o) => o.status === "cancelled");

const EMPTY_COPY: Record<string, string> = {
  past: "No past orders yet.",
  cancelled: "No cancelled orders.",
};

export function OrdersView() {
  const [tab, setTab] = React.useState("upcoming");
  const ooo = useOOOStore();
  const clearEditingOrder = useUiStore((s) => s.clearEditingOrder);
  const list = tab === "upcoming" ? upcoming : tab === "past" ? past : cancelled;

  // Landing on My Orders always exits any in-progress "change a meal" flow.
  React.useEffect(() => clearEditingOrder(), [clearEditingOrder]);

  return (
    <div className="space-y-5">
      {ooo.active && ooo.dates.length ? (
        <Notice tone="warning">
          <CalendarOff className="inline size-3.5" /> <strong>You&apos;re out of office</strong> on{" "}
          {ooo.dates.map((d) => formatDay(fromISODate(d))).join(", ")}. Auto-orders are paused on{" "}
          {ooo.dates.length === 1 ? "this day" : "these days"} —{" "}
          <button type="button" onClick={ooo.clear} className="font-semibold underline">
            turn off
          </button>
          .
        </Notice>
      ) : null}

      <div className="sticky top-16 z-20 -mx-4 overflow-x-auto bg-background px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
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

      {list.length === 0 ? (
        <Card>
          <CardBody className="py-14 text-center text-[13px] text-muted-foreground">
            {tab === "upcoming" ? (
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
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const cart = useCartStore();
  const href = `/orders/${order.id}`;
  const items = order.days.flatMap((d) => d.items);
  const active = ["draft", "confirmed"].includes(order.status);
  const editable = active && !order.locked;
  // Re-order confirmation modal (past orders).
  const [reorderOpen, setReorderOpen] = React.useState(false);
  // Shared change/swap flow (opens the change-order popup, hands off to the menu).
  const { startChange, sheets } = useChangeOrder(order);

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
      <div className="flex items-center justify-between gap-3 border-b border-teal-soft bg-teal-wash px-5 py-3.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-semibold tracking-tight text-teal-deep">{order.id}</span>
            <OrderStatusBadge status={order.status} />
            {order.source === "auto" ? (
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
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                stop(e);
                startChange();
              }}
            >
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={(e) => {
                stop(e);
                cancel();
              }}
            >
              <XCircle className="size-3.5" /> Cancel
            </Button>
          </div>
        ) : active && order.locked ? (
          <span
            aria-label="Editing closed — this order can no longer be changed"
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

        {items.length > 1 ? (
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 -space-x-3">
              {items.slice(0, 3).map((it, i) => (
                <FoodPhoto
                  key={i}
                  src={getItem(it.itemId)?.image}
                  alt={it.name}
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
                    <FoodPhoto
                      src={getItem(it.itemId)?.image}
                      alt={it.name}
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
            {order.employeePaid > 0 ? (
              <>You paid {formatCurrency(order.employeePaid)}</>
            ) : (
              <span className="text-success">Fully covered</span>
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
            <Button asChild size="sm" variant="ghost" onClick={stop}>
              <Link href={href}>
                <MessageSquare className="size-3.5" /> Leave feedback
              </Link>
            </Button>
          </div>
        ) : null}

        {order.locked && active ? (
          <Notice tone="locked" className="text-xs">
            Past the change window — this order is locked in for delivery.
          </Notice>
        ) : null}
      </CardBody>
    </Card>

    {sheets}
    {reorderOpen ? (
      <ReOrderModal order={order} onClose={() => setReorderOpen(false)} onConfirm={reorder} />
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
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Re-order ${order.id}`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-raised transition-all duration-200 sm:rounded-3xl",
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
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <ul className="space-y-3">
            {items.map((it, idx) => (
              <li key={`${it.itemId}-${idx}`} className="flex items-start gap-3">
                <FoodPhoto
                  src={getItem(it.itemId)?.image}
                  alt={it.name}
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
