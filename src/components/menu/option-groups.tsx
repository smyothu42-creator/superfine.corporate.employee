"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { RadioGroup } from "@/components/ui/radio-group";
import { formatCurrency, cn } from "@/lib/utils";
import { summarizeAddOns, cleanOptionName } from "@/data/menu";
import type { MenuItem, AddOnGroup } from "@/data/types";
import type { CartAddOn } from "@/store/use-cart-store";

/**
 * Individual meals are configured one choice group at a time — Protein, then
 * Sauce, then Side — exactly the way the menu describes them. (The old picker
 * multiplied the groups together and asked the user to choose one of the
 * resulting bundles, which meant a three-group item offered dozens of
 * near-identical rows and no clear sense of what was being chosen.)
 *
 * Every group starts empty. A required group is a question the user has to
 * answer, so we don't answer it for them by pre-selecting the first option —
 * a default protein is a protein nobody chose. An optional group left empty is
 * simply skipped.
 */
export function useItemOptions(item: MenuItem, omitGroup?: (g: AddOnGroup) => boolean) {
  const groups = React.useMemo(
    () => (item.addOns ?? []).filter((g) => !omitGroup?.(g)),
    [item.addOns, omitGroup],
  );

  // groupId → selected optionIds. Single-select groups hold exactly one.
  const [picked, setPicked] = React.useState<Record<string, string[]>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, []])),
  );

  function toggle(group: AddOnGroup, optionId: string) {
    setPicked((prev) => {
      const current = prev[group.id] ?? [];
      if (group.select === "single") return { ...prev, [group.id]: [optionId] };

      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      // At the cap, the newest pick pushes out the oldest rather than silently
      // doing nothing — a disabled checkbox with no explanation reads as a bug.
      const next = group.max && current.length >= group.max ? current.slice(1) : current;
      return { ...prev, [group.id]: [...next, optionId] };
    });
  }

  const selections: CartAddOn[] = groups.flatMap((g) =>
    (picked[g.id] ?? []).flatMap((optionId) => {
      const option = g.options.find((o) => o.id === optionId);
      // Store the cleaned label: the cart and the order lines print these names
      // verbatim, and "Extra brisket (+$4)" beside its own price reads as a typo.
      return option
        ? [{ groupId: g.id, optionId: option.id, name: cleanOptionName(option.name), price: option.price }]
        : [];
    }),
  );

  // Every required group needs at least one answer before the meal can be added.
  const missing = groups.filter((g) => g.required && (picked[g.id] ?? []).length === 0);
  const unitPrice = item.price + selections.reduce((sum, s) => sum + s.price, 0);

  return {
    groups,
    picked,
    toggle,
    selections,
    unitPrice,
    valid: missing.length === 0,
    /** The first unanswered required group, for the Add button's label. */
    missingLabel: missing[0]?.name ?? "",
    /** "Mild · Sumac fries" — the chosen options, minus the "no extra" defaults. */
    summary: summarizeAddOns(selections),
  };
}

export function OptionGroups({
  groups,
  picked,
  onToggle,
  className,
  showPrices = true,
}: {
  groups: AddOnGroup[];
  picked: Record<string, string[]>;
  onToggle: (group: AddOnGroup, optionId: string) => void;
  className?: string;
  /** Hide the per-option price badge — e.g. the nutrition lookup, where price
      is irrelevant. Defaults to showing prices (menu/order surfaces). */
  showPrices?: boolean;
}) {
  if (!groups.length) return null;

  return (
    <div className={cn("space-y-5", className)}>
      {groups.map((group) => {
        const selected = picked[group.id] ?? [];
        const single = group.select === "single";
        // The options were already announced as radios and checkboxes, but the
        // heading that says *what is being chosen* sat outside as loose text.
        // "Protein" was on screen and nowhere in the accessibility tree, so the
        // list read as five unexplained options. Naming the group attaches it.
        const labelId = `optgroup-${group.id}`;
        // Single-select gets the arrow keys its `radio` role promises; a
        // checkbox list correctly stays one Tab stop per box, because each is an
        // independent yes/no rather than one choice among several.
        const List = single ? RadioGroup : "div";
        return (
          <section key={group.id}>
            {/* An unanswered required group is a question still open, not an
                error — the button names it, so the header stays quiet. */}
            <div className="mb-2 flex items-center gap-2">
              <h3 id={labelId} className="font-display text-sm font-semibold tracking-tight">
                {group.name}
              </h3>
              {!group.required ? (
                <span className="text-2xs text-muted-foreground">Optional</span>
              ) : null}
            </div>

            <List
              className="space-y-1.5"
              aria-labelledby={labelId}
              {...(single ? {} : { role: "group" as const })}
            >
              {group.options.map((option) => {
                const checked = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    role={single ? "radio" : "checkbox"}
                    aria-checked={checked}
                    onClick={() => onToggle(group, option.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-[13px] transition-colors",
                      checked ? "border-primary bg-teal-wash" : "border-control bg-card hover:bg-muted/50",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center border",
                          // Radios read as circles, checkboxes as squares — the
                          // shape tells you whether picking this drops the last one.
                          single ? "rounded-full" : "rounded-md",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-control",
                        )}
                      >
                        {checked ? <Check className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0">
                        {/* The price lives in its own badge, so drop the
                            "(+$3)" the option name carries for legacy surfaces. */}
                        <span className="block truncate font-medium">{cleanOptionName(option.name)}</span>
                      </span>
                    </span>
                    {showPrices ? (
                      option.price > 0 ? (
                        <span className="shrink-0 font-semibold nums">+{formatCurrency(option.price)}</span>
                      ) : (
                        <span className="shrink-0 font-semibold nums">$0</span>
                      )
                    ) : null}
                  </button>
                );
              })}
            </List>
          </section>
        );
      })}
    </div>
  );
}
