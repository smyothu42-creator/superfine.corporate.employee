import * as React from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/data/types";

const META: Record<OrderStatus, { label: string; tone: React.ComponentProps<typeof Badge>["tone"] }> = {
  draft: { label: "Draft", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

/**
 * Terminal-status badge shown beside the order number. Active orders
 * (Draft / Placed / Confirmed) are intentionally NOT badged here — their state
 * lives in the progress bar — and a locked order surfaces via a disabled edit
 * control, not a tag. So this only renders for the two states with no timeline:
 * Delivered and Cancelled.
 */
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  if (status !== "delivered" && status !== "cancelled") return null;
  const m = META[status];
  return <Badge tone={m.tone} className={className}>{m.label}</Badge>;
}

// Every order runs the same customer-facing track: Draft → Placed → Confirmed.
// "Delivered" / "Out for delivery" are deliberately omitted — once delivered the
// timeline is hidden entirely.
const TIMELINE: { label: string }[] = [
  { label: "Draft" },
  { label: "Placed" },
  { label: "Confirmed" },
];

const STATUS_INDEX: Record<OrderStatus, number> = {
  draft: 0,
  confirmed: 2,
  delivered: 2,
  cancelled: -1,
};

/**
 * The customer-facing status track. All orders run Draft → Placed → Confirmed;
 * "Delivered" / "Out for delivery" are deliberately omitted from the timeline.
 */
export function OrderTimeline({
  status,
}: {
  status: OrderStatus;
  source?: "manual" | "auto";
}) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-[13px] font-medium text-danger">
        This order was cancelled.
      </div>
    );
  }
  const current = STATUS_INDEX[status];
  return (
    // Extra bottom room on phones for the labels, which stack *under* each circle
    // (absolute, so they don't shift the row); no extra room needed at sm+, where
    // the label sits beside the circle.
    <div className="flex items-center gap-3 pb-6 sm:pb-0">
      {TIMELINE.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const isFirst = i === 0;
        const isLast = i === TIMELINE.length - 1;
        return (
          <React.Fragment key={step.label}>
            <div className="relative flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-bold transition-colors",
                  done && "bg-success text-white",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "border border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  "font-semibold transition-colors",
                  active ? "text-teal-deep" : done ? "text-foreground" : "text-muted-foreground",
                  // Phones: centred under the circle (edge steps align to their
                  // circle's edge so nothing clips). sm+: inline beside the circle.
                  "absolute top-full mt-1 whitespace-nowrap text-2xs",
                  isFirst ? "left-0" : isLast ? "right-0" : "left-1/2 -translate-x-1/2",
                  "sm:static sm:left-auto sm:right-auto sm:top-auto sm:mt-0 sm:translate-x-0 sm:text-[13px]",
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
