"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Leaf, Wheat, ShieldCheck, Plus, AlertTriangle, ArrowLeftRight, Check, ExternalLink, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { FoodPhoto } from "@/components/menu/food-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import {
  hasRequiredAddOns,
  hasOptionalAddOns,
  menuCategory,
  isFamilyStyle,
  minGuestsFor,
  pricePerGuestFor,
} from "@/data/menu";
import { OptionGroups, useItemOptions } from "@/components/menu/option-groups";
import { FamilyStyleModal } from "@/components/menu/family-style-modal";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { useCartStore } from "@/store/use-cart-store";
import { useUiStore } from "@/store/use-ui-store";
import { toast } from "@/store/use-toast-store";
import { confirm } from "@/store/use-confirm-store";
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
  const editingOrder = useUiStore((s) => s.editingOrder);
  const clearEditingOrder = useUiStore((s) => s.clearEditingOrder);
  const editing = Boolean(editingOrder);
  const [mounted, setMounted] = React.useState(false);
  const [date, setDate] = React.useState("");
  // Family packages are portioned by headcount, so they can never be added
  // straight from the page — the configurator has to answer for them first.
  const family = isFamilyStyle(item);
  const [configuring, setConfiguring] = React.useState(false);
  // The meal's choice groups (protein, sauce, dressing…), shown inline.
  const { groups, picked, toggle, selections, unitPrice, valid, missingLabel } = useItemOptions(item);

  // While changing a placed order, the day is fixed to the order's day.
  const activeDate = editingOrder ? editingOrder.date : date;

  // Changing a placed order: confirm the swap, then return to My Orders.
  async function requestChange() {
    if (!editingOrder) return;
    const ok = await confirm({
      title: "Change your meal?",
      description: `Change from ${editingOrder.originalItemName} to ${item.name} for ${editingOrder.dateLabel}?`,
      confirmLabel: "Confirm change",
    });
    if (!ok) return;
    clearEditingOrder();
    toast.success(
      "Order updated",
      `${editingOrder.originalItemName} → ${item.name} for ${editingOrder.dateLabel}.`,
    );
    router.push("/orders");
  }

  React.useEffect(() => {
    const upcoming = nextServiceDays(startOfToday(), program.serviceDayNums, 8).map(toISODate);
    setDate(upcoming[0] ?? "");
    setMounted(true);
  }, []);

  const customizable = hasRequiredAddOns(item) || hasOptionalAddOns(item);
  const allergenHit =
    me.allergens.length > 0 &&
    me.allergens.some((a) =>
      `${item.allergens} ${item.ingredients ?? ""}`.toLowerCase().includes(a.toLowerCase()),
    );

  function addToOrder() {
    if (editingOrder) {
      requestChange();
      return;
    }
    if (family) {
      setConfiguring(true);
      return;
    }
    cart.add({
      date,
      itemId: item.id,
      name: item.name,
      basePrice: item.price,
      qty: 1,
      addOns: selections,
      unitPrice,
      type: item.type,
    });
    toast.success(`${item.name} added`, `For ${formatDay(fromISODate(date))}`);
    router.push("/menu");
  }

  return (
    <div className="space-y-5">
      <Link href="/menu" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to menu
      </Link>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <FoodPhoto src={item.image} alt={item.name} className="h-56" iconClassName="size-16" />
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
            <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            <div className="flex flex-wrap gap-1.5">
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
            {allergenHit ? (
              <Notice tone="warning">
                <AlertTriangle className="inline size-3.5" /> Heads up — this item lists an allergen on your
                profile (<strong>{me.allergens.join(", ")}</strong>). Check the ingredients below.
              </Notice>
            ) : null}
            {/* Full macros live on Superfine Kitchen's nutrition page rather than
                inline — a small link keeps the card focused on the meal itself. */}
            <a
              href={`https://superfinekitchen.com/nutrition/${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
            >
              Nutritional info
              <ExternalLink className="size-3.5" />
            </a>
          </CardBody>
        </Card>

        <div className="space-y-5">
          {item.ingredients ? (
            <Card>
              <CardBody>
                <div className="text-overline">Ingredients</div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{item.ingredients}</p>
                <div className="text-overline mt-3">Allergens</div>
                <p className="mt-1 text-[13px] text-muted-foreground">{item.allergens}</p>
              </CardBody>
            </Card>
          ) : null}

          {/* Options + add */}
          <Card>
            <CardBody className="space-y-3">
              {editing ? (
                <p className="text-[13px] text-muted-foreground">
                  Changing your meal for{" "}
                  <strong className="text-foreground">{editingOrder!.dateLabel}</strong>.
                </p>
              ) : null}

              {family ? (
                <FamilyStylePreview item={item} />
              ) : customizable && groups.length > 0 ? (
                <OptionGroups groups={groups} picked={picked} onToggle={toggle} className="pb-1" />
              ) : null}

              <Button block size="lg" disabled={!activeDate || (!family && !valid)} onClick={addToOrder}>
                {!family && !valid ? (
                  `Choose ${missingLabel}`
                ) : editing ? (
                  <>
                    <ArrowLeftRight className="size-4" /> Change to this meal
                  </>
                ) : family ? (
                  <>
                    <Users className="size-4" /> Set guests &amp; quantities
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> Add to order
                    {program.showPrices ? ` · ${formatCurrency(unitPrice)}` : ""}
                  </>
                )}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {configuring ? (
        <FamilyStyleModal
          item={item}
          dateLabel={activeDate ? formatDay(fromISODate(activeDate)) : ""}
          onClose={() => setConfiguring(false)}
          onConfirm={(guests, servings, totalPrice) => {
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
            setConfiguring(false);
            toast.success(`${item.name} added`, `For ${guests} guests on ${formatDay(fromISODate(activeDate))}.`);
            router.push("/menu");
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * What a family package looks like before you open the configurator: what
 * always comes with it, and which groups you'll be asked to split. The actual
 * quantities are set in the modal, where the headcount is known.
 */
function FamilyStylePreview({ item }: { item: MenuItem }) {
  const groups = item.servingGroups ?? [];
  return (
    <div className="space-y-3">
      {item.includedItems?.length ? (
        <div>
          <div className="text-overline">Included with every package</div>
          <ul className="mt-1.5 space-y-1">
            {item.includedItems.map((inc) => (
              <li key={inc.name} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="flex min-w-0 items-baseline gap-2">
                  <Check className="size-3.5 shrink-0 translate-y-0.5 text-primary" />
                  <span className="truncate">{inc.name}</span>
                </span>
                {inc.note ? (
                  <span className="shrink-0 text-2xs text-muted-foreground">{inc.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {groups.length ? (
        <div>
          <div className="text-overline">You&apos;ll choose quantities for</div>
          <ul className="mt-1.5 space-y-1.5">
            {groups.map((g) => (
              <li key={g.id} className="rounded-xl border border-border p-2.5 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{g.name}</span>
                  <span className="shrink-0 text-2xs text-muted-foreground">
                    {g.perGuest > 0
                      ? `${g.perGuest} per guest`
                      : "Optional extra"}
                  </span>
                </div>
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  {g.options.map((o) => o.name).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

