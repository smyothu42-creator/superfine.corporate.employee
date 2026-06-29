"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Leaf, Wheat, ShieldCheck, Plus, AlertTriangle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { FoodPhoto } from "@/components/menu/food-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { AddOnModal } from "@/components/menu/add-on-modal";
import { hasRequiredAddOns, hasOptionalAddOns } from "@/data/menu";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { useCartStore } from "@/store/use-cart-store";
import { toast } from "@/store/use-toast-store";
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
  const [mounted, setMounted] = React.useState(false);
  const [days, setDays] = React.useState<string[]>([]);
  const [date, setDate] = React.useState("");
  const [customizing, setCustomizing] = React.useState(false);

  React.useEffect(() => {
    const upcoming = nextServiceDays(startOfToday(), program.serviceDayNums, 8).map(toISODate);
    setDays(upcoming);
    setDate(upcoming[0] ?? "");
    setMounted(true);
  }, []);

  const customizable = hasRequiredAddOns(item) || hasOptionalAddOns(item);
  const allergenHit =
    me.allergens.length > 0 &&
    me.allergens.some((a) =>
      `${item.allergens} ${item.ingredients ?? ""}`.toLowerCase().includes(a.toLowerCase()),
    );

  function quickAdd() {
    cart.add({
      date,
      itemId: item.id,
      name: item.name,
      basePrice: item.price,
      qty: 1,
      addOns: [],
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <FoodPhoto src={item.image} alt={item.name} className="h-56" iconClassName="size-16" />
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">{item.name}</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {item.cuisine} · {item.category}
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

          {item.nutrition ? (
            <Card>
              <CardBody>
                <div className="text-overline">Nutrition (per serving)</div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <Macro label="Calories" value={`${item.nutrition.calories}`} />
                  <Macro label="Protein" value={`${item.nutrition.protein}g`} />
                  <Macro label="Carbs" value={`${item.nutrition.carbs}g`} />
                  <Macro label="Fat" value={`${item.nutrition.fat}g`} />
                </div>
              </CardBody>
            </Card>
          ) : null}

          {/* Choose a day + add */}
          <Card>
            <CardBody className="space-y-3">
              <div className="text-overline">Add to which day?</div>
              {!mounted ? (
                <Skeleton className="h-16 rounded-xl" />
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {days.map((iso) => {
                    const d = fromISODate(iso);
                    const active = iso === date;
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setDate(iso)}
                        className={cn(
                          "flex min-w-[60px] flex-col items-center rounded-xl border px-3 py-2 transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:bg-muted",
                        )}
                      >
                        <span className="text-2xs font-semibold uppercase">{WEEKDAY_SHORT[d.getDay()]}</span>
                        <span className="font-display text-lg font-semibold leading-none">{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {customizable ? (
                <Button block size="lg" disabled={!date} onClick={() => setCustomizing(true)}>
                  {hasRequiredAddOns(item) ? "Choose options" : "Customize & add"}
                </Button>
              ) : (
                <Button block size="lg" disabled={!date} onClick={quickAdd}>
                  <Plus className="size-4" /> Add to order
                </Button>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {customizing && date ? (
        <AddOnModal
          item={item}
          dateLabel={formatDay(fromISODate(date))}
          onClose={() => setCustomizing(false)}
          onConfirm={(addOns, qty, unitPrice) => {
            cart.add({
              date,
              itemId: item.id,
              name: item.name,
              basePrice: item.price,
              qty,
              addOns,
              unitPrice,
              type: item.type,
            });
            toast.success(`${item.name} added`, `For ${formatDay(fromISODate(date))}`);
            setCustomizing(false);
            router.push("/menu");
          }}
        />
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
