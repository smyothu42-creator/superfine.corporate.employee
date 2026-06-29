import * as React from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/data/types";

const META: Record<OrderStatus, { label: string; tone: React.ComponentProps<typeof Badge>["tone"] }> = {
  draft: { label: "Draft", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "info" },
  out_for_delivery: { label: "Out for delivery", tone: "warning" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

const TIMELINE: { key: OrderStatus; label: string }[] = [
  { key: "draft", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

const ORDER_INDEX: Record<OrderStatus, number> = {
  draft: 0,
  confirmed: 1,
  out_for_delivery: 2,
  delivered: 3,
  cancelled: -1,
};

/**
 * The simple, customer-facing status track the interviews asked for —
 * Draft → Confirmed → Out for Delivery → Delivered — so employees always know
 * whether their food is actually coming.
 */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-[13px] font-medium text-danger">
        This order was cancelled.
      </div>
    );
  }
  const current = ORDER_INDEX[status];
  return (
    <div className="flex items-center gap-3">
      {TIMELINE.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.key}>
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
                {step.label}
              </span>
            </div>
            {i < TIMELINE.length - 1 ? (
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
