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
  MessageSquare,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge, OrderTimeline } from "@/components/orders/order-status";
import { FeedbackModal } from "@/components/orders/feedback-modal";
import { CutoffIndicator } from "@/components/cutoff/cutoff-indicator";
import { useChangeOrder } from "./use-change-order";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
import { program } from "@/data/program";
import { useSessionStore, isSubsidized } from "@/store/use-session-store";
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
  const active = ["draft", "confirmed"].includes(order.status);
  const editable = active && !order.locked;
  // Individuals pay retail — no subsidy line, and "covered" never applies.
  const corporate = isSubsidized(useSessionStore((s) => s.account));
  // Same change-order popup + "Select from full menu" hand-off as the list page.
  const { startChange, sheets } = useChangeOrder(order);

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
                    <div className="flex items-center justify-between border-t border-border pt-1.5 font-semibold">
                      <span>You paid</span>
                      <span className="nums">{formatCurrency(order.employeePaid)}</span>
                    </div>
                  </div>
                ) : (
                  // Individuals: no subsidy, so a single "You paid" line at the
                  // full meals total.
                  <div className="pt-1 text-[13px]">
                    <div className="flex items-center justify-between font-semibold">
                      <span>You paid</span>
                      <span className="nums">{formatCurrency(order.subtotal)}</span>
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
                  <Pencil className="size-4" /> Change order
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
      {sheets}
    </div>
  );
}

function FeedbackCard({ orderId }: { orderId: string }) {
  // In-platform feedback form — opens a lightweight rating/comment sheet tagged
  // to this order so the kitchen knows which meal it's about.
  const [open, setOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How was it?</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-[13px] text-muted-foreground">
          Tell us how {orderId} was: the meal, portion, freshness or delivery. The kitchen reads
          every note.
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <MessageSquare className="size-4" /> Share your feedback
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
