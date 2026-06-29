"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Leaf, Wheat, ShieldCheck, SunSnow, Flame, Nut, Milk } from "lucide-react";
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
  /** Highlight an allergen the employee has flagged. */
  allergenWarning?: boolean;
  className?: string;
}

/**
 * The reusable menu card for the employee menu. Per the User Flow, each card
 * shows a photo, tags, a short description and allergen info — "no need to open
 * the item to decide." Items with no add-ons add straight to the cart; items
 * with add-ons route through Customize.
 */
export function MenuItemCard({
  item,
  inCart = 0,
  onAdd,
  onCustomize,
  showPrice = true,
  allergenWarning = false,
  className,
}: MenuItemCardProps) {
  const required = hasRequiredAddOns(item);
  const customizable = required || hasOptionalAddOns(item);
  const cardRef = React.useRef<HTMLDivElement>(null);

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
          {showPrice ? (
            <span className="shrink-0 font-display text-base font-semibold nums">
              {formatCurrency(item.price)}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{item.description}</p>

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
        <p
          className={cn(
            "mt-2.5 text-2xs",
            allergenWarning ? "font-semibold text-danger" : "text-muted-foreground",
          )}
        >
          {allergenWarning ? "⚠ Contains an allergen you flagged · " : "Allergens: "}
          {item.allergens}
        </p>

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
