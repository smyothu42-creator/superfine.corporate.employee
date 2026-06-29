"use client";

import * as React from "react";
import { Utensils, Plus, Minus, Leaf, Wheat, ShieldCheck, Sparkles, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import type { MenuItem } from "@/data/types";

/**
 * MenuItemCard — the reusable menu/listing card for the Superfine Kitchen menu.
 *
 * NOTE ON NAMING: the project brief asked for `src/components/restaurant-card.tsx`.
 * This product is an enterprise meal-program admin (not a restaurant directory),
 * so the card represents a *menu item* in the company's curated program. The file
 * path is kept as requested; the exported component name reflects the real domain.
 */

const TAG_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Vegan: Leaf,
  Vegetarian: Leaf,
  "Gluten-Free": Wheat,
  Halal: ShieldCheck,
};

interface MenuItemCardProps {
  item: MenuItem;
  quantity?: number;
  onQuantityChange?: (next: number) => void;
  onAdd?: () => void;
  /** Show an expandable panel with ingredients + nutrition/macros. */
  detailed?: boolean;
  /** Dim the card (e.g. category turned off in the program). */
  disabled?: boolean;
  className?: string;
}

function MenuItemCard({
  item,
  quantity,
  onQuantityChange,
  onAdd,
  detailed = false,
  disabled = false,
  className,
}: MenuItemCardProps) {
  const showStepper = quantity !== undefined && onQuantityChange;
  const [open, setOpen] = React.useState(false);
  const hasDetail = detailed && (item.ingredients || item.nutrition);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-3.5 transition-shadow hover:shadow-card",
        disabled && "opacity-50",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-hero-yellow text-teal-deep">
          <Utensils className="size-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-base font-semibold">{item.name}</span>
            {item.serves ? <Badge tone="yellow">serves {item.serves}</Badge> : null}
            {item.seasonal ? (
              <Badge tone="brand" className="gap-1">
                <Sparkles className="size-3" /> Seasonal
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{item.description}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.tags.map((tag) => {
              const Icon = TAG_ICON[tag];
              return (
                <Badge key={tag} tone="brand" className="gap-1">
                  {Icon ? <Icon className="size-3" /> : null}
                  {tag}
                </Badge>
              );
            })}
            <span className="text-2xs text-muted-foreground">Allergens: {item.allergens}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="font-display text-base font-semibold nums">{formatCurrency(item.price)}</span>
          {showStepper ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Decrease ${item.name}`}
                onClick={() => onQuantityChange!(Math.max(0, (quantity ?? 0) - 1))}
                className="flex size-8 items-center justify-center rounded-full border border-border bg-card hover:bg-muted"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-semibold nums">{quantity}</span>
              <button
                type="button"
                aria-label={`Increase ${item.name}`}
                onClick={() => onQuantityChange!((quantity ?? 0) + 1)}
                className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-teal-deep"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          ) : onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex size-8 items-center justify-center rounded-full bg-coral text-white hover:bg-coral-deep"
              aria-label={`Add ${item.name}`}
            >
              <Plus className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {hasDetail ? (
        <div className="mt-3 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-[0.08em] text-primary"
          >
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            {open ? "Hide details" : "Ingredients & nutrition"}
          </button>
          {open ? (
            <div className="mt-2 space-y-3">
              {item.ingredients ? (
                <div>
                  <div className="text-overline">Ingredients</div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{item.ingredients}</p>
                </div>
              ) : null}
              {item.nutrition ? (
                <div>
                  <div className="text-overline">Nutrition (per serving)</div>
                  <div className="mt-1 grid grid-cols-4 gap-2">
                    <Macro label="Calories" value={`${item.nutrition.calories}`} />
                    <Macro label="Protein" value={`${item.nutrition.protein}g`} />
                    <Macro label="Carbs" value={`${item.nutrition.carbs}g`} />
                    <Macro label="Fat" value={`${item.nutrition.fat}g`} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-2 text-center">
      <div className="font-display text-base font-semibold nums">{value}</div>
      <div className="text-2xs text-muted-foreground">{label}</div>
    </div>
  );
}

export { MenuItemCard };
export default MenuItemCard;
