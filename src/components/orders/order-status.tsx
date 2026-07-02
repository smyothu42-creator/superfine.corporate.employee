import * as React from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/data/types";

const META: Record<OrderStatus, { label: string; tone: React.ComponentProps<typeof Badge>["tone"] }> = {
  draft: { label: "Placed", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

/**
 * Terminal-status badge shown beside the order number. Active orders
 * (Placed / Confirmed) are intentionally NOT badged here — their state lives in
 * the progress bar — and a locked order surfaces via a disabled edit control,
 * not a tag. So this only renders for the two states with no timeline:
 * Delivered and Cancelled.
 */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  if (status !== "delivered" && status !== "cancelled") return null;
  const m = META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

const MANUAL_TIMELINE: { label: string }[] = [
  { label: "Placed" },
  { label: "Confirmed" },
  { label: "Delivered" },
];

const MANUAL_INDEX: Record<OrderStatus, number> = {
  draft: 0,
  confirmed: 1,
  delivered: 2,
  cancelled: -1,
};

// Auto-Orders start life as an editable Draft (created ~24h before cutoff),
// then move through Placed → Confirmed. No "Delivered" step: once delivered the
// timeline is hidden entirely.
const AUTO_TIMELINE: { label: string }[] = [
  { label: "Draft" },
  { label: "Placed" },
  { label: "Confirmed" },
];

const AUTO_INDEX: Record<OrderStatus, number> = {
  draft: 0,
  confirmed: 2,
  delivered: 2,
  cancelled: -1,
};

/**
 * The customer-facing status track. Manual orders run Placed → Confirmed →
 * Delivered; Auto-Orders run Draft → Placed → Confirmed. "Out for delivery" is
 * deliberately omitted from the customer view.
 */
export function OrderTimeline({
  status,
  source,
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
  const auto = source === "auto";
  const TIMELINE = auto ? AUTO_TIMELINE : MANUAL_TIMELINE;
  const current = auto ? AUTO_INDEX[status] : MANUAL_INDEX[status];
  return (
    <div className="flex items-center gap-3">
      {TIMELINE.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.label}>
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
