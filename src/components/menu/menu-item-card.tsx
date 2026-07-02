"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Check, Leaf, Wheat, ShieldCheck, SunSnow, Flame, Nut, Milk, Replace } from "lucide-react";
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
  /** Quantity already in the cart for the active day (shown on the add button). */
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
  /** Changing a placed order: the quick-add "+" becomes a change icon. */
  editing?: boolean;
  className?: string;
}

/**
 * The reusable menu card for the employee menu — a DoorDash-style horizontal
 * row: a left text column (name + price, an inline Popular/Seasonal badge, a
 * one-line description, serves, dietary tags, and allergens pinned at the
 * bottom) sits beside a square food photo on the right that carries a floating
 * coral "+" button in its bottom corner. Items with no add-ons add straight to
 * the cart; items with add-ons route through Customize. In `selectable` mode the
 * whole card toggles selection (Auto-Order favorites) and the "+" becomes a
 * check.
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
  editing = false,
  className,
}: MenuItemCardProps) {
  const required = hasRequiredAddOns(item);
  const customizable = required || hasOptionalAddOns(item);
  const cardRef = React.useRef<HTMLDivElement>(null);
  // In "change a placed order" mode the action reads as a swap.
  const ActionIcon = editing ? Replace : Plus;

  const tagsRow = (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs font-medium text-muted-foreground">
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

  // The text content block — name/price header, inline promo badge, description,
  // serves and tags. (Allergens are pinned separately at the column's bottom.)
  const info = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate font-display text-base font-semibold leading-tight">{item.name}</h3>
        {showPrice ? (
          <span className="shrink-0 font-display text-base font-semibold nums">
            {formatCurrency(item.price)}
          </span>
        ) : null}
      </div>
      {item.popular || item.seasonal ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.popular ? (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-coral-deep">
              <Flame className="size-3" /> Popular
            </span>
          ) : null}
          {item.seasonal ? (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-primary">
              <SunSnow className="size-3" /> Seasonal
            </span>
          ) : null}
        </div>
      ) : null}
      <p className="mt-1 line-clamp-1 text-[13px] leading-snug text-muted-foreground">
        {item.description}
      </p>
      {item.serves ? (
        <p className="mt-1.5 text-2xs text-muted-foreground">Serves {item.serves}</p>
      ) : null}
      {tagsRow}
    </>
  );

  const allergens = (
    <p className="mt-auto pt-2 text-2xs text-muted-foreground">Allergens: {item.allergens}</p>
  );

  // Square photo (right column). The "N in cart" pill sits top-left so it never
  // collides with the "+" / select control in the bottom-right corner.
  const photoInner = (
    <>
      <FoodPhoto src={item.image} alt={item.name} className="size-28 rounded-xl" iconClassName="size-8" />
      {inCart > 0 ? (
        <span className="absolute left-1.5 top-1.5 flex min-w-[20px] items-center justify-center rounded-full bg-coral px-1.5 text-2xs font-bold text-white shadow ring-2 ring-card">
          {inCart}
        </span>
      ) : null}
    </>
  );

  // Selector mode — the whole card is a toggle; no links, no action button.
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
          "group flex cursor-pointer gap-4 rounded-2xl border bg-card p-4 text-left shadow-card outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring hover:shadow-raised",
          selected ? "border-primary ring-2 ring-primary" : "border-border",
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          {info}
          {allergens}
        </div>
        <div className="relative size-28 shrink-0 self-center">
          {photoInner}
          <span
            className={cn(
              "absolute bottom-1.5 right-1.5 flex size-8 items-center justify-center rounded-full ring-2 ring-card transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-card text-teal-deep group-hover:bg-teal-wash",
            )}
          >
            {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "group flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-raised",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/menu/${item.id}`} className="block">
          {info}
        </Link>
        {allergens}
      </div>

      <div className="relative size-28 shrink-0 self-center">
        <Link href={`/menu/${item.id}`} className="block">
          {photoInner}
        </Link>

        {/* Floating coral action button in the photo's bottom corner. */}
        {customizable ? (
          <button
            type="button"
            onClick={onCustomize}
            aria-label={editing ? `Change to ${item.name}` : `Choose options for ${item.name}`}
            className="absolute bottom-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-coral text-white shadow-md ring-2 ring-card transition-colors hover:bg-coral-deep active:scale-95"
          >
            <ActionIcon className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              flyCardToCart(cardRef.current);
              onAdd?.();
            }}
            aria-label={editing ? `Change to ${item.name}` : `Add ${item.name}`}
            className="absolute bottom-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-coral text-white shadow-md ring-2 ring-card transition-colors hover:bg-coral-deep active:scale-95"
          >
            <ActionIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
