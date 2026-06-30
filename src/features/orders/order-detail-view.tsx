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
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { OrderStatusBadge, OrderTimeline } from "@/components/orders/order-status";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
import { program } from "@/data/program";
import { confirm } from "@/store/use-confirm-store";
import { toast } from "@/store/use-toast-store";
import { fromISODate, formatDay } from "@/lib/dates";
import { formatCurrency, cn } from "@/lib/utils";
import type { Order, PaymentChoice } from "@/data/types";

const PAYMENT_LABEL: Record<PaymentChoice, string> = {
  covered: "Fully covered by company",
  pay_later: "Invoice to company",
  pay_now: "Card on file",
};

export function OrderDetailView({ order }: { order: Order }) {
  const router = useRouter();
  const active = ["draft", "confirmed", "out_for_delivery"].includes(order.status);
  const editable = active && !order.locked;

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
            <OrderTimeline status={order.status} />
          </CardBody>
        </Card>
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
                {PAYMENT_LABEL[order.payment]}
              </div>
              {program.showPrices ? (
                <div className="space-y-1 pt-1 text-[13px]">
                  <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
                  <Row label="Company subsidy" value={`−${formatCurrency(order.subsidy)}`} tone="success" />
                  <div className="flex items-center justify-between border-t border-border pt-1.5 font-semibold">
                    <span>You paid</span>
                    <span className="nums">{formatCurrency(order.employeePaid)}</span>
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <div className="space-y-2">
            {editable ? (
              <>
                <Button asChild block variant="outline">
                  <Link href="/menu">
                    <Pencil className="size-4" /> Change order
                  </Link>
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

          {order.locked && active ? (
            <Notice tone="locked" className="text-xs">
              Past the change window — this order is locked in for delivery.
            </Notice>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FeedbackCard({ orderId }: { orderId: string }) {
  const [sent, setSent] = React.useState(false);
  const faces = [
    { v: "bad", emoji: "😕", label: "Not great" },
    { v: "ok", emoji: "😐", label: "It was okay" },
    { v: "good", emoji: "🙂", label: "Good" },
    { v: "great", emoji: "😍", label: "Loved it" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How was it?</CardTitle>
      </CardHeader>
      <CardBody>
        {sent ? (
          <p className="text-[13px] text-success">Thanks! Your feedback helps the kitchen.</p>
        ) : (
          <>
            <p className="mb-3 text-[13px] text-muted-foreground">
              One tap — no survey. Tied to {orderId}.
            </p>
            <div className="flex gap-2">
              {faces.map((f) => (
                <button
                  key={f.v}
                  type="button"
                  aria-label={f.label}
                  onClick={() => {
                    setSent(true);
                    toast.success("Thanks for the feedback!");
                  }}
                  className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-border bg-card py-3 transition-colors hover:border-primary hover:bg-teal-wash"
                >
                  <span className="text-2xl">{f.emoji}</span>
                  <span className="text-2xs text-muted-foreground">{f.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </CardBody>
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
