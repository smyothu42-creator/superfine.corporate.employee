import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { me } from "@/data/me";
import { cn } from "@/lib/utils";
import type { DietaryTag } from "@/data/types";

/**
 * The dietary tags and allergens of a single **option** — the protein, sauce or
 * side a meal is being built from, rather than the meal as a whole.
 *
 * The meal's own line ("Contains: wheat, milk") describes the dish as it ships
 * by default, so it can't answer the question the options actually raise: the
 * plate is gluten-free until you pick the garlic bread, and vegetarian until
 * you pick the chicken. Printing each option's own answer next to it is what
 * lets someone choose without leaving the page.
 *
 * It prints as one quiet caption — "Vegan · Gluten-Free · Contains soy" — and
 * not as a row of badges. Every option carries some of this, so badges would
 * put a chip on every row of the sheet: fifteen pills competing with the
 * fifteen names and prices that are the actual choice. A caption keeps each row
 * two lines tall whatever it holds, which is what makes the list scan.
 *
 * An option carrying an allergen from the signed-in profile is the exception —
 * that half goes to the warning tone, matching the notice the meal header shows
 * for the dish.
 *
 * Renders as inline elements throughout — the individual picker's rows are
 * `<button>`s, which may not contain block content.
 */
export function OptionDietary({
  tags,
  allergens,
  className,
}: {
  tags?: DietaryTag[];
  allergens?: string;
  className?: string;
}) {
  if (!tags?.length && !allergens) return null;

  const flagged = allergens
    ? me.allergens.filter((a) => allergens.toLowerCase().includes(a.toLowerCase()))
    : [];

  return (
    <span className={cn("mt-0.5 block truncate text-2xs text-muted-foreground", className)}>
      {tags?.join(" · ")}
      {tags?.length && allergens ? " · " : null}
      {allergens ? (
        <span className={cn(flagged.length && "font-semibold text-warning")}>
          {flagged.length ? (
            <AlertTriangle className="mr-0.5 inline size-3 -translate-y-px" />
          ) : null}
          Contains {allergens.toLowerCase()}
        </span>
      ) : null}
    </span>
  );
}
