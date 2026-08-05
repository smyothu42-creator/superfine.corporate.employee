"use client";

import * as React from "react";
import { RadioGroup } from "@/components/ui/radio-group";
import { formatCurrency, cn } from "@/lib/utils";
import type { PortionOption } from "@/data/types";

/**
 * The portion question, asked once for a whole choice group.
 *
 * The alternative — a "regular" and an "extra" twin of every protein — doubles
 * the list, and the two halves of each pair then have to be read against each
 * other to work out that the gap is the same $4 every time. Hoisting it to the
 * group says that once: pick the portion, then pick the protein, and the
 * upgrade costs the same whichever protein that turns out to be.
 *
 * The options below it therefore carry only their names and their own prices —
 * see {@link PortionedPrice}, which spells the two halves out on every row so
 * the arithmetic is never something the user has to trust.
 */
export function PortionPicker({
  groupName,
  portions,
  value,
  onChange,
  className,
}: {
  /** The group this portion governs, e.g. "Protein" — named in the caption. */
  groupName: string;
  portions: PortionOption[];
  /** Chosen portion id. Falls back to the first (included) portion. */
  value: string | undefined;
  onChange: (portionId: string) => void;
  className?: string;
}) {
  // Scoped to this instance: the combo builder can put the same group on screen
  // more than once, and two elements sharing an id make `aria-labelledby` point
  // at whichever one the browser saw first.
  const captionId = React.useId();
  if (!portions.length) return null;
  const selected = portions.find((p) => p.id === value) ?? portions[0];

  return (
    // The rule matters more than it looks: the portion cards are the same size
    // and shape as the option rows under them, so without a break the pair reads
    // as two more proteins — a list of six, two of which behave strangely. The
    // line says the control above governs the list below.
    <div className={cn("mb-3 border-b border-border pb-3", className)}>
      {/* Says what the control governs *before* it's used, because its effect is
          on rows further down the sheet — a radio pair labelled only "Portion"
          reads as a property of the group heading it sits under. */}
      <p id={captionId} className="mb-1.5 text-2xs text-muted-foreground">
        Portion — applies to every {groupName.toLowerCase()} below
      </p>

      {/* Side by side when the pair fits, stacked when it doesn't — and that's
          a question about the *container*, not the viewport. Both sheets this
          renders in are ~400px columns at every screen size, so a `sm:` grid
          went two-up on a desktop that had no more room to give and clipped
          "Standard portion" to "Standard porti…". A flex basis wide enough for
          the longest label lets the row make that call for itself. */}
      <RadioGroup aria-labelledby={captionId} className="flex flex-wrap gap-2">
        {portions.map((portion) => {
          const checked = portion.id === selected.id;
          return (
            <button
              key={portion.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(portion.id)}
              className={cn(
                "flex min-w-[15rem] flex-1 items-center justify-between gap-3 rounded-xl border p-3 text-left text-[13px] transition-colors",
                checked
                  ? "border-primary bg-teal-wash"
                  : "border-control bg-card hover:bg-muted/50",
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {/* A dot rather than the tick the option rows use: this is a
                    setting the list below inherits, not one of the things being
                    chosen, and the different mark keeps the two readable as
                    different kinds of answer. */}
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    checked ? "border-primary" : "border-control",
                  )}
                >
                  {checked ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                </span>
                <span className="truncate font-medium">{portion.name}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-2xs font-semibold nums",
                  portion.price > 0 ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {portion.price > 0 ? `+${formatCurrency(portion.price)}` : "included"}
              </span>
            </button>
          );
        })}
      </RadioGroup>
    </div>
  );
}

/**
 * One option's price under a group-level portion: what it comes to, and the two
 * numbers it came from.
 *
 * The breakdown line is the point. Once the portion is priced on the group, a
 * bare "+$6 each" against the salmon and "+$8 each" against the steak invites
 * the reading that the upgrade itself costs more on the steak. Printing
 * "option $2 + portion $4" and "option $4 + portion $4" shows it doesn't.
 */
export function PortionedPrice({
  optionPrice,
  portionPrice,
  /** Suffix the total, e.g. "each" for a per-serving family-style row. */
  each = false,
  align = "left",
  primaryClassName = "text-2xs font-semibold text-foreground",
  className,
}: {
  optionPrice: number;
  portionPrice: number;
  each?: boolean;
  align?: "left" | "right";
  primaryClassName?: string;
  className?: string;
}) {
  const total = optionPrice + portionPrice;

  return (
    <div className={cn("mt-0.5 min-w-0", align === "right" && "text-right", className)}>
      {total > 0 ? (
        <>
          <p className={cn("nums", primaryClassName)}>
            +{formatCurrency(total)}
            {each ? " each" : ""}
          </p>
          <p className="mt-0.5 text-2xs text-muted-foreground nums">
            option {formatCurrency(optionPrice)} + portion {formatCurrency(portionPrice)}
          </p>
        </>
      ) : (
        // Nothing to break down: both halves are zero, and "option $0 + portion
        // $0" is a sum nobody needs to check.
        <p className="text-2xs text-muted-foreground">Included</p>
      )}
    </div>
  );
}
