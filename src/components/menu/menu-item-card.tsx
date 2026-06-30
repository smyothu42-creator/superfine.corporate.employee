"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Check, Leaf, Wheat, ShieldCheck, SunSnow, Flame, Nut, Milk } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FoodPhoto } from "@/components/menu/food-photo";
import { flyCardToCart } from "@/lib/fly-to-cart";
import { formatCurrency, cn } from "@/lib/utils";
import { hasRequiredAddOns, hasOptionalAddOns } from "@/data/menu";
import type { MenuItem } from "@/data/types";

const TAG_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Vegan: Leaf,
  Vegetarian: Leaf,
  "Gluten-Free": Wheat,
  Halal: ShieldCheck,
  "Nut-Free": Nut,
  "Dairy-Free": Milk,
};

interface MenuItemCardProps {
  item: MenuItem;
  /** Quantity already in the cart for the active day (badge). */
  inCart?: number;
  /** Quick-add (no add-ons) — adds straight to the cart. */
  onAdd?: () => void;
  /** Open the add-on sheet (required or optional add-ons). */
  onCustomize?: () => void;
  /** Hide prices entirely (some companies pay 100% and hide cost). */
  showPrice?: boolean;
  /**
   * Selector mode (e.g. Auto-Order favorites): the whole card toggles selection,
   * there are no add buttons and no navigation links, and the selected state is
   * shown with a ring + check.
   */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

/**
 * The reusable menu card for the employee menu. Per the User Flow, each card
 * shows a photo, tags, a short description and allergen info — "no need to open
 * the item to decide." Items with no add-ons add straight to the cart; items
 * with add-ons route through Customize. In `selectable` mode the card becomes a
 * selection toggle (used by the Auto-Order favorites picker).
 */
export function MenuItemCard({
  item,
  inCart = 0,
  onAdd,
  onCustomize,
  showPrice = true,
  selectable = false,
  selected = false,
  onSelect,
  className,
}: MenuItemCardProps) {
  const required = hasRequiredAddOns(item);
  const customizable = required || hasOptionalAddOns(item);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const badges = (
    <div className="absolute left-2 top-2 flex flex-wrap gap-1">
      {item.popular ? (
        <Badge tone="yellow" className="gap-1">
          <Flame className="size-3" /> Popular
        </Badge>
      ) : null}
      {item.seasonal ? (
        <Badge tone="brand" className="gap-1">
          <SunSnow className="size-3" /> Seasonal
        </Badge>
      ) : null}
      {item.serves ? <Badge tone="neutral">serves {item.serves}</Badge> : null}
    </div>
  );

  const tagsRow = (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs font-medium text-muted-foreground">
      {item.tags.map((tag) => {
        const Icon = TAG_ICON[tag] ?? Leaf;
        return (
          <span key={tag} className="inline-flex items-center gap-1">
            <Icon className="size-3 text-primary" />
            {tag}
          </span>
        );
      })}
    </div>
  );

  const priceEl = showPrice ? (
    <span className="shrink-0 font-display text-base font-semibold nums">{formatCurrency(item.price)}</span>
  ) : null;

  // Selector mode — the whole card is a toggle; no links, no add buttons.
  if (selectable) {
    return (
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.();
          }
        }}
        className={cn(
          "flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-card text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "border-2 border-primary shadow-raised ring-2 ring-primary/30"
            : "border border-border shadow-card hover:-translate-y-0.5 hover:shadow-raised",
          className,
        )}
      >
        <div className="relative block">
          <FoodPhoto src={item.image} alt={item.name} className="h-28" iconClassName="size-9" />
          {badges}
          {selected ? (
            <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-card">
              <Check className="size-4" />
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold leading-tight">{item.name}</h3>
            {priceEl}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{item.description}</p>
          {tagsRow}
          <p className="mt-2.5 text-2xs text-muted-foreground">Allergens: {item.allergens}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-raised",
        className,
      )}
    >
      <Link href={`/menu/${item.id}`} className="group relative block">
        <FoodPhoto src={item.image} alt={item.name} className="h-28" iconClassName="size-9" />
        {badges}
        {inCart > 0 ? (
          <span className="absolute right-2 top-2 flex min-w-[22px] items-center justify-center rounded-full bg-coral px-1.5 text-2xs font-bold text-white">
            {inCart} in cart
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/menu/${item.id}`} className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold leading-tight hover:underline">
              {item.name}
            </h3>
          </Link>
          {priceEl}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{item.description}</p>

        {tagsRow}
        <p className="mt-2.5 text-2xs text-muted-foreground">Allergens: {item.allergens}</p>

        <div className="mt-auto flex items-center gap-2 pt-3">
          {customizable ? (
            <button
              type="button"
              onClick={onCustomize}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-coral px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-coral-deep"
            >
              <Plus className="size-4" />
              Choose options
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                flyCardToCart(cardRef.current);
                onAdd?.();
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-coral px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-coral-deep"
            >
              <Plus className="size-4" /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
