"use client";

import * as React from "react";
import { AlarmClock, Clock, Lock } from "lucide-react";
import type { OrderType } from "@/data/types";
import { cutoffInfo, type CutoffInfo, type CutoffTone } from "@/lib/cutoff-messaging";
import { cn } from "@/lib/utils";

/** Client-only mount guard — cutoff copy reads the clock (`demoNow`). */
function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

const TONE_CHIP: Record<CutoffTone, string> = {
  danger: "border-danger-border bg-danger-bg text-danger",
  warning: "border-warning-border bg-warning-bg text-coral-deep",
  locked: "border-border bg-muted text-muted-foreground",
  neutral: "border-border bg-muted/40 text-muted-foreground",
};

const TONE_ICON: Record<CutoffTone, string> = {
  danger: "text-danger",
  warning: "text-coral-deep",
  locked: "text-muted-foreground",
  neutral: "text-primary",
};

function iconFor(info: CutoffInfo) {
  if (info.locked) return Lock;
  if (info.urgent || info.soon) return AlarmClock;
  return Clock;
}

interface CutoffIndicatorProps {
  deliveryISO: string;
  type: OrderType;
  /** Force locked state from a placed order's own flag instead of the clock. */
  lockedOverride?: boolean;
  /** "edit" swaps "order" → "edit" in the copy (for already-placed orders). */
  context?: "order" | "edit";
  /**
   * inline — compact pill (menu helper, cart/order day header).
   * notice — full block: headline + helper (checkout, cart top, order detail).
   */
  variant?: "inline" | "notice";
  /** Show the "Delivering …" one-day framing (so it reads as not same-day). */
  showDelivery?: boolean;
  className?: string;
}

/**
 * The one component every surface uses to show cutoff/lock status. Reads all copy
 * and state from `cutoffInfo`, so wording and urgency colours are identical
 * everywhere. Renders nothing until mounted to avoid SSR clock drift.
 */
export function CutoffIndicator({
  deliveryISO,
  type,
  lockedOverride,
  context = "order",
  variant = "inline",
  showDelivery = false,
  className,
}: CutoffIndicatorProps) {
  const mounted = useMounted();
  if (!mounted) return null;

  const info = cutoffInfo(deliveryISO, type, { lockedOverride, context });
  const Icon = iconFor(info);

  if (variant === "inline") {
    const label = info.locked
      ? info.lockedLabel
      : info.urgent || info.soon
        ? info.urgencyLabel
        : info.headline;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-semibold",
          TONE_CHIP[info.tone],
          className,
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        {label}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3 py-2.5",
        TONE_CHIP[info.tone],
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", TONE_ICON[info.tone])} />
      <div className="min-w-0 text-[13px] leading-snug">
        <div className="font-semibold">{info.headline}</div>
        <p className="mt-0.5">{info.helper}</p>
        {showDelivery && !info.locked ? (
          <p className="mt-1 text-2xs font-medium">
            {info.deliveryLine} · not same-day
          </p>
        ) : null}
      </div>
    </div>
  );
}
