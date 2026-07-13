"use client";

import * as React from "react";
import { Phone, ArrowUpRight } from "lucide-react";
import { support } from "@/data/program";
import { cn } from "@/lib/utils";

/**
 * The bubble that explains why a calendar day is closed — and, when the day is
 * closed only because its *order cutoff* has passed (the red days, most notably
 * family-style with its 72-hour lead), offers a way to still arrange it: a
 * tap-to-call button and a link out to the kitchen's contact page.
 *
 * Shared by every date picker (the menu's unified picker and the range modal) so
 * the wording and the contact affordance stay identical everywhere.
 *
 * Two things make it clickable rather than a passive hover label:
 *  - It is `pointer-events-auto`, and the outer wrapper uses bottom *padding*
 *    (not a margin) as a hover bridge down to the day cell — so the pointer can
 *    cross into the bubble to hit a link without the group-hover dropping in a
 *    dead gap.
 *  - `open` pins it for touch: a finger has no hover and a disabled day fires no
 *    click, so the cell wrapper takes the tap and pins the bubble, which is the
 *    only way the contact links are reachable on a phone.
 */
export function CutoffDayTooltip({
  reason,
  cutoff,
  open,
}: {
  reason: string;
  /** True only for order-cutoff closures (red) — those get the contact links. */
  cutoff: boolean;
  /** Tap-pinned open (touch). Hover still reveals it via `group-hover`. */
  open: boolean;
}) {
  return (
    <span
      role="tooltip"
      className={cn(
        // `pb-1.5` is a transparent, hoverable bridge to the cell below — using a
        // margin here would leave a dead gap that drops the hover before the
        // pointer reaches the bubble.
        "pointer-events-auto absolute bottom-full left-1/2 z-30 w-44 -translate-x-1/2 pb-1.5 group-hover:block",
        open ? "block" : "hidden",
      )}
    >
      <span className="relative block rounded-lg bg-foreground px-2.5 py-2 text-center text-2xs font-medium leading-snug text-background shadow-raised">
        {reason}

        {cutoff ? (
          <span className="mt-2 flex flex-col gap-1 border-t border-background/20 pt-2">
            <span className="text-background/70">Need it sooner? Arrange it with the kitchen.</span>
            <a
              href={support.phoneHref}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-background/15 px-2 py-1 font-semibold text-background transition-colors hover:bg-background/25"
            >
              <Phone className="size-3 shrink-0" /> Call {support.phone}
            </a>
            <a
              href={support.contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 font-semibold text-background underline-offset-2 hover:underline"
            >
              Contact page <ArrowUpRight className="size-3 shrink-0" />
            </a>
          </span>
        ) : null}

        {/* Caret — sits at the bubble's bottom edge, pointing at the day cell. */}
        <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground" />
      </span>
    </span>
  );
}
