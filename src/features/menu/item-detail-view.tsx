"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Leaf, Wheat, ShieldCheck, Plus, AlertTriangle, ArrowLeftRight, Check } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { FoodPhoto } from "@/components/menu/food-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { hasRequiredAddOns, hasOptionalAddOns, menuCategory, buildCombos } from "@/data/menu";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { useCartStore, type CartAddOn } from "@/store/use-cart-store";
import { useUiStore } from "@/store/use-ui-store";
import { toast } from "@/store/use-toast-store";
import { confirm } from "@/store/use-confirm-store";
import { nextServiceDays, startOfToday, toISODate, fromISODate, formatDay, WEEKDAY_SHORT } from "@/lib/dates";
import { formatCurrency, cn } from "@/lib/utils";
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
  // Meal options (combos) shown inline on the detail page.
  const combos = React.useMemo(() => buildCombos(item), [item]);
  const [comboId, setComboId] = React.useState<string>(() => combos[0]?.id ?? "");
  const combo = combos.find((c) => c.id === comboId) ?? combos[0];
  const resolved: CartAddOn[] = combo?.selections ?? [];
  const unitPrice = item.price + (combo?.upcharge ?? 0);

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
    cart.add({
      date,
      itemId: item.id,
      name: item.name,
      basePrice: item.price,
      qty: 1,
      addOns: resolved,
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
                  {item.serves ? ` · serves ${item.serves}` : ""}
                </p>
              </div>
              {program.showPrices ? (
                <span className="font-display text-2xl font-semibold nums">{formatCurrency(item.price)}</span>
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

              {customizable && combos.length > 0 ? (
                <>
                  <div className="text-overline">
                    {hasRequiredAddOns(item) ? "Choose an option" : "Options"}
                  </div>
                  <div className="space-y-2">
                    {combos.map((c) => {
                      const checked = c.id === comboId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setComboId(c.id)}
                          className={cn(
                            "flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left text-[13px] transition-colors",
                            checked ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted/50",
                          )}
                        >
                          <span className="flex min-w-0 items-start gap-2.5">
                            <span
                              className={cn(
                                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                                checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                              )}
                            >
                              {checked ? <Check className="size-3.5" /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="font-medium">{c.name}</span>
                              <span className="mt-1 block space-y-0.5">
                                {c.includes.map((inc) => (
                                  <span key={inc.group} className="block text-2xs text-muted-foreground">
                                    <span className="font-semibold text-foreground/70">{inc.group}:</span>{" "}
                                    {inc.item}
                                  </span>
                                ))}
                              </span>
                            </span>
                          </span>
                          {c.upcharge > 0 ? (
                            <span className="shrink-0 font-semibold nums">+{formatCurrency(c.upcharge)}</span>
                          ) : (
                            <span className="shrink-0 text-2xs text-muted-foreground">included</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              <Button block size="lg" disabled={!activeDate} onClick={addToOrder}>
                {editing ? (
                  <>
                    <ArrowLeftRight className="size-4" /> Change to this meal
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> Add to order
                  </>
                )}
                {program.showPrices ? ` · ${formatCurrency(unitPrice)}` : ""}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

