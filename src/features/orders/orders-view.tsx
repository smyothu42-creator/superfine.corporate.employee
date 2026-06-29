"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarOff,
  Download,
  XCircle,
  Pencil,
  ChevronRight,
  MapPin,
  MessageSquare,
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
import { me } from "@/data/me";
import { SwapSheet } from "@/features/auto-order/swap-sheet";
import { confirm } from "@/store/use-confirm-store";
import { toast } from "@/store/use-toast-store";
import { useOOOStore } from "@/store/use-ooo-store";
import { fromISODate, formatDay } from "@/lib/dates";
import { formatCurrency, cn } from "@/lib/utils";
import type { Order } from "@/data/types";

const upcoming = orders.filter((o) => ["draft", "confirmed", "out_for_delivery"].includes(o.status));
const past = orders.filter((o) => o.status === "delivered");
const cancelled = orders.filter((o) => o.status === "cancelled");

const EMPTY_COPY: Record<string, string> = {
  past: "No past orders yet.",
  cancelled: "No cancelled orders.",
};

export function OrdersView() {
  const [tab, setTab] = React.useState("upcoming");
  const ooo = useOOOStore();
  const list = tab === "upcoming" ? upcoming : tab === "past" ? past : cancelled;

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
  const href = `/orders/${order.id}`;
  const items = order.days.flatMap((d) => d.items);
  const active = ["draft", "confirmed", "out_for_delivery"].includes(order.status);
  const editable = active && !order.locked;
  // Change flow: multi-item orders pick which item first; single-item jumps straight to swap.
  const [picking, setPicking] = React.useState(false);
  const [swapItem, setSwapItem] = React.useState<OrderLineItem | null>(null);
  const changeWeekday = fromISODate(order.date).toLocaleDateString("en-US", { weekday: "long" });
  const changeDateLabel = `${changeWeekday}, ${formatDay(fromISODate(order.date))}`;

  function startChange() {
    if (items.length > 1) setPicking(true);
    else setSwapItem(items[0] ?? null);
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
      className="cursor-pointer transition-transform duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-semibold tracking-tight">{order.id}</span>
            <OrderStatusBadge status={order.status} />
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
              <Pencil className="size-3.5" /> Change
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
        ) : (
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        )}
      </div>

      <CardBody className="space-y-4">
        {active ? (
          <div className="pb-2">
            <OrderTimeline status={order.status} />
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

        {order.invoiceId || order.status === "delivered" ? (
          <div className="flex flex-wrap gap-2">
            {order.invoiceId ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  stop(e);
                  toast.info("Invoice ready", `Downloading ${order.invoiceId}.pdf`);
                }}
              >
                <Download className="size-3.5" /> Invoice
              </Button>
            ) : null}
            {order.status === "delivered" ? (
              <Button asChild size="sm" variant="ghost" onClick={stop}>
                <Link href={href}>
                  <MessageSquare className="size-3.5" /> Leave feedback
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}

        {order.locked && active ? (
          <Notice tone="locked" className="text-xs">
            Past the change window — this order is locked in for delivery.
          </Notice>
        ) : null}
      </CardBody>
    </Card>

    {picking ? (
      <ChangeOrderSheet
        items={items}
        dateLabel={changeDateLabel}
        onClose={() => setPicking(false)}
        onEdit={(it) => {
          setPicking(false);
          setSwapItem(it);
        }}
      />
    ) : null}

    {swapItem ? (
      <SwapSheet
        dateISO={order.date}
        weekday={changeWeekday}
        currentItemId={swapItem.itemId}
        favorites={me.autoOrder.favorites}
        title="Pick the meal you want to change"
        subtitle={`Currently ${swapItem.name} · ${changeDateLabel}`}
        onClose={() => {
          setSwapItem(null);
          if (items.length > 1) setPicking(true);
        }}
        onPick={(itemId) => {
          setSwapItem(null);
          toast.success("Order updated", `Changed to ${getItem(itemId)?.name}.`);
          if (items.length > 1) setPicking(true);
        }}
      />
    ) : null}
    </>
  );
}

type OrderLineItem = Order["days"][number]["items"][number];

/** Step 1 of the multi-item change flow — pick which ordered item to swap. */
function ChangeOrderSheet({
  items,
  dateLabel,
  onEdit,
  onClose,
}: {
  items: OrderLineItem[];
  dateLabel: string;
  onEdit: (item: OrderLineItem) => void;
  onClose: () => void;
}) {
  const [shown, setShown] = React.useState(false);

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
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative flex max-h-[80vh] w-full max-w-[460px] flex-col rounded-t-3xl bg-card shadow-raised transition-all duration-300 sm:rounded-3xl",
          shown ? "translate-y-0 sm:opacity-100" : "translate-y-full sm:translate-y-2 sm:opacity-0",
        )}
      >
        <div className="shrink-0 px-4 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden" />
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight">Change order</h3>
              <p className="text-[13px] text-muted-foreground">Pick an item to swap for {dateLabel}</p>
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
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-6">
          {items.map((it, idx) => (
            <div
              key={`${it.itemId}-${idx}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5"
            >
              <FoodPhoto
                src={getItem(it.itemId)?.image}
                alt={it.name}
                className="size-12 shrink-0 rounded-xl"
                iconClassName="size-4"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {it.name} ×{it.qty}
                </p>
                {it.addOns.length ? (
                  <p className="truncate text-2xs text-muted-foreground">{it.addOns.join(" · ")}</p>
                ) : null}
              </div>
              <Button size="sm" variant="ghost" onClick={() => onEdit(it)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
