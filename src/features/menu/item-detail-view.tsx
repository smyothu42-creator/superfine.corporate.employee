"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Leaf } from "lucide-react";
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

  /** Does the configurator have a question to put on the page? */
  const asksSomething = family || (item.addOns?.length ?? 0) > 0;

  const configurator = family ? (
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
  );

  return (
    <div className="space-y-5">
      <Link href="/menu" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to menu
      </Link>

      {/* Two columns: the meal on the left as a stack of cards — who it is and
          what it means for you, then what it asks — and the preview card on the
          right holding the photo, the price and the ingredients. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        {/* Left — the name and every section that asks or tells something.
            Ordered second on a phone so the photo still introduces the meal. */}
        <div className="order-2 min-w-0 space-y-5 lg:order-1">
          {/* Who the meal is, and whether you can eat it. One card, because the
              second half only makes sense as a fact about the first: a rule
              between them, not a gap. */}
          <Card>
            <CardBody>
              <h1 className="font-display text-3xl font-semibold tracking-tight">{item.name}</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {item.cuisine} · {menuCategory(item)}
                {family ? ` · ${minGuestsFor(item)} guest minimum` : ""}
              </p>
              <p className="mt-3 text-lg font-medium leading-relaxed text-foreground">
                {item.description}
              </p>
              {allergenHit ? (
                <Notice tone="warning" className="mt-4">
                  <AlertTriangle className="inline size-3.5" /> Heads up: this item lists an allergen on
                  your profile (<strong>{me.allergens.join(", ")}</strong>). See the allergens below.
                </Notice>
              ) : null}

              <div className="mt-5 border-t border-border pt-5">
                <h2 className="font-display text-base font-semibold tracking-tight">
                  Dietary &amp; allergens
                </h2>
                {/* Tags and allergens on one wrapping row, centred on a shared
                    line rather than stacked as a row of pills over a sentence
                    that started somewhere else. They answer the same question —
                    what is in this for me — so they read as one line of facts,
                    and the tag pills give the row its height. */}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {/* One leaf on every chip. Per-tag glyphs (wheat for
                      gluten-free, a shield for halal) made three pills that
                      differ in shape as well as word, and the eye reads the row
                      as three kinds of thing rather than one list of tags. */}
                  {item.tags.map((tag) => (
                    <Badge key={tag} tone="brand" className="h-6 gap-1 px-2.5">
                      <Leaf className="size-3" />
                      {tag}
                    </Badge>
                  ))}
                  <span className="text-[13px] leading-none text-muted-foreground">
                    <span className="font-semibold text-foreground">Contains:</span>{" "}
                    {item.allergens || "no listed allergens"}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* The questions, in their own card. A meal with nothing to choose
              gets no card at all: its Add button is docked to the viewport, not
              to this column, so the card would be an empty pill under the one
              above. Family packages always ask for a headcount, so they always
              get one. */}
          {asksSomething ? (
            <Card>
              <CardBody>
                <h2 className="font-display text-base font-semibold tracking-tight">
                  {family ? "Guests & servings" : "Choose your options"}
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {family
                    ? "Tell us the headcount and how the dishes should split."
                    : "Every choice is packed into its own box."}
                </p>
                <div className="mt-4">{configurator}</div>
              </CardBody>
            </Card>
          ) : (
            /* Nothing to choose. The slot still gets a card, because an empty
               column under the meal reads as a page that failed to load its
               options — and because the Add button is docked to the foot of the
               viewport, far from anything explaining why it is the only control
               on the page. Saying so plainly is shorter than making someone
               scroll to find out. The configurator still renders alongside: it
               is what puts that docked bar on the page. */
            <>
              <Card>
                <CardBody>
                  <h2 className="font-display text-base font-semibold tracking-tight">
                    Nothing to choose
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    This meal comes as it is. Just add it to your order below.
                  </p>
                </CardBody>
              </Card>
              {configurator}
            </>
          )}
        </div>

        {/* Right — the preview card: the photo and the plain facts about the
            package, held still while the left column is answered. */}
        <Card
          /* Sticky, but never taller than the room it has: a family package's
             card (photo, price, ingredients, allergens, the included list) runs
             past the fold, and a sticky box taller than the viewport pins its
             top and puts its last lines somewhere the page can never scroll to.
             Capping it and letting the card scroll inside keeps every line
             reachable. The subtracted height is the top offset plus the docked
             commit bar at the foot of the screen. */
          className="order-1 overflow-hidden lg:order-2 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto"
        >
          <CardBody className="space-y-4">
            {/* Decorative: the <h1> in the left column is the meal's name, so
                naming the photo as well says it twice in a row. */}
            <FoodPhoto
              src={item.image}
              alt=""
              /* Square, as on the menu cards, and the full width of the card —
                 the card is what was narrowed to bring the photo down, so the
                 two shrink together and the photo never floats in a box wider
                 than itself. */
              className="aspect-square rounded-xl"
              iconClassName="size-10"
            />
            {program.showPrices ? (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {family ? "Per guest" : "Price"}
                </span>
                <span className="font-display text-2xl font-semibold nums">
                  {formatCurrency(family ? pricePerGuestFor(item) : item.price)}
                </span>
              </div>
            ) : null}

            {/* What the dish is made of, in the card with the photo of it — the
                one line that only describes the food. Dietary and allergens are
                a different question (can *I* eat this?), and they stay on the
                left with the choices they bear on. */}
            {item.ingredients ? (
              <p className="border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">What&rsquo;s in it:</span>{" "}
                {item.ingredients}
              </p>
            ) : null}

            {/* What comes with the package, as one wrapping sentence rather than
                a ticked list. The list gave five sides five rows and a column of
                right-aligned notes, which read as five decisions to make — they
                are not decisions at all, they simply arrive. As prose it takes
                three lines and matches the allergen line directly above it, so
                the whole card is one voice describing the meal. Each side keeps
                its note in parentheses; that is where "1 per guest" and "shared
                trays" live now. */}
            {family && item.includedItems?.length ? (
              <p className="border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Included with every package:</span>{" "}
                {item.includedItems
                  .map((inc) => (inc.note ? `${inc.name} (${inc.note.toLowerCase()})` : inc.name))
                  .join(", ")}
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* Both embedded configurators dock their commit bar to the foot of the
          viewport, so the foot of the page is under it. The spacer is the page's
          job, not theirs: they render inside the column above, where reserving
          the room would open a hole mid-page instead of below it. Sized for the
          taller of the two bars — family style carries a total and a balancing
          line over its button. */}
      <div className="h-32" aria-hidden />
    </div>
  );
}
