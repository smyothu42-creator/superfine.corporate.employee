"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Leaf, Wheat, ShieldCheck, AlertTriangle, Check } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { FoodPhoto } from "@/components/menu/food-photo";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import {
  menuCategory,
  isFamilyStyle,
  minGuestsFor,
  pricePerGuestFor,
} from "@/data/menu";
import { FamilyStyleModal } from "@/components/menu/family-style-modal";
import { AddOnModal } from "@/components/menu/add-on-modal";
import { type BuiltCombo } from "@/components/menu/combo-builder";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { useCartStore, type CartServing } from "@/store/use-cart-store";
import { toast } from "@/store/use-toast-store";
import { nextServiceDays, startOfToday, toISODate, fromISODate, formatDay, WEEKDAY_SHORT } from "@/lib/dates";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@/data/types";

const TAG_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Vegan: Leaf,
  Vegetarian: Leaf,
  "Gluten-Free": Wheat,
  Halal: ShieldCheck,
};

export function ItemDetailView({ item }: { item: MenuItem }) {
  const router = useRouter();
  const cart = useCartStore();
  const [mounted, setMounted] = React.useState(false);
  const [date, setDate] = React.useState("");
  // Family packages are portioned by headcount, so they can never be added
  // straight from the page — the configurator has to answer for them first.
  const family = isFamilyStyle(item);

  const activeDate = date;

  React.useEffect(() => {
    const upcoming = nextServiceDays(startOfToday(), program.serviceDayNums, 8).map(toISODate);
    setDate(upcoming[0] ?? "");
    setMounted(true);
  }, []);

  const allergenHit =
    me.allergens.length > 0 &&
    me.allergens.some((a) =>
      `${item.allergens} ${item.ingredients ?? ""}`.toLowerCase().includes(a.toLowerCase()),
    );

  /** Add the built customizations (each its own packed meal) — the embedded
   *  individual configurator's confirm, mirroring the menu's popup. */
  function confirmIndividual(combos: BuiltCombo[]) {
    for (const combo of combos) {
      cart.add({
        date: activeDate,
        itemId: item.id,
        name: item.name,
        basePrice: item.price,
        qty: combo.qty,
        addOns: combo.addOns,
        unitPrice: combo.unitPrice,
        type: item.type,
      });
    }
    toast.success(`${item.name} added`, `For ${formatDay(fromISODate(activeDate))}`);
    router.push("/menu");
  }

  /** The embedded family configurator's confirm — one package line carrying its
   *  headcount + serving split. */
  function confirmFamily(guests: number, servings: CartServing[], totalPrice: number) {
    cart.add({
      date: activeDate,
      itemId: item.id,
      name: item.name,
      basePrice: totalPrice,
      qty: 1,
      addOns: [],
      unitPrice: totalPrice,
      type: item.type,
      guests,
      servings,
    });
    toast.success(`${item.name} added`, `For ${guests} guests on ${formatDay(fromISODate(activeDate))}.`);
    router.push("/menu");
  }

  return (
    <div className="space-y-5">
      <Link href="/menu" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to menu
      </Link>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          {/* Decorative: the <h2> directly below is the meal's name. Naming the
              photo as well makes a screen reader say it twice in a row. */}
          <FoodPhoto src={item.image} alt="" className="h-56" iconClassName="size-16" />
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">{item.name}</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {item.cuisine} · {menuCategory(item)}
                  {family ? ` · ${minGuestsFor(item)} guest minimum` : ""}
                </p>
              </div>
              {program.showPrices ? (
                <span className="shrink-0 text-right">
                  <span className="block font-display text-2xl font-semibold nums">
                    {formatCurrency(family ? pricePerGuestFor(item) : item.price)}
                  </span>
                  {family ? (
                    <span className="block text-2xs text-muted-foreground">per guest</span>
                  ) : null}
                </span>
              ) : null}
            </div>
            {/* Prominent description — larger, black — with what's included right
                beneath it, so the sides are visible before any scrolling. */}
            <p className="text-lg font-medium leading-relaxed text-foreground">{item.description}</p>

            {family && item.includedItems?.length ? (
              <div className="rounded-2xl border border-border bg-muted/40 p-3.5">
                <div className="text-overline">Included with every package</div>
                <ul className="mt-2 space-y-1.5">
                  {item.includedItems.map((inc) => (
                    <li key={inc.name} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <Check className="size-4 shrink-0 translate-y-0.5 text-primary" />
                        <span className="font-medium text-foreground">{inc.name}</span>
                      </span>
                      {inc.note ? (
                        <span className="shrink-0 text-2xs text-muted-foreground">{inc.note}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Dietary restrictions and allergens, merged into one section. */}
            <div>
              <div className="text-overline">Dietary &amp; allergens</div>
              {item.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => {
                    const Icon = TAG_ICON[tag];
                    return (
                      <Badge key={tag} tone="brand" className="gap-1">
                        {Icon ? <Icon className="size-3" /> : null}
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              ) : null}
              {item.allergens ? (
                <p className="mt-2 text-[13px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Contains:</span> {item.allergens}
                </p>
              ) : null}
            </div>

            {allergenHit ? (
              <Notice tone="warning">
                <AlertTriangle className="inline size-3.5" /> Heads up: this item lists an allergen on your
                profile (<strong>{me.allergens.join(", ")}</strong>). See the allergens above.
              </Notice>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-5">
          {/* Options + add — the full configurator inline (same as the popup). */}
          <Card>
            <CardBody className="space-y-3">
              {family ? (
                <FamilyStyleModal
                  embedded
                  item={item}
                  dateLabel={activeDate ? formatDay(fromISODate(activeDate)) : ""}
                  onClose={() => {}}
                  onConfirm={confirmFamily}
                />
              ) : (
                <AddOnModal
                  embedded
                  item={item}
                  dateLabel={activeDate ? formatDay(fromISODate(activeDate)) : ""}
                  onClose={() => {}}
                  onConfirm={confirmIndividual}
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Both embedded configurators dock their commit bar to the foot of the
          viewport, so the foot of the page is under it. The spacer is the page's
          job, not theirs: they render inside the card above, where reserving the
          room would just open a hole in the card instead of below it. Sized for
          the taller of the two bars — family style carries a total and a
          balancing line over its button. */}
      <div className="h-32" aria-hidden />
    </div>
  );
}

