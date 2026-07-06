"use client";

import * as React from "react";
import {
  Salad,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSelect } from "@/components/ui/theme-select";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import {
  cuisines,
  menuCategory,
  categoriesForType,
  allergenOptions,
  dietaryPreferences,
  itemHasAnyAllergen,
} from "@/data/menu";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/data/types";
import type { CartAddOn } from "@/store/use-cart-store";
import { setupMealPool, type AutoConfig, type SoldOutBehavior } from "./shared";
import { TOUR_PICK_EVENT } from "./walkthrough";

const SOLD_OUT: { id: SoldOutBehavior; label: string; desc: string; recommended?: boolean }[] = [
  {
    id: "notify",
    label: "Notify me to choose",
    desc: "We'll email you so you can pick a replacement before the cutoff.",
    recommended: true,
  },
  {
    id: "skip",
    label: "Skip the day",
    desc: "No order is created. You just won't get lunch that day.",
  },
];

/**
 * Upper bound only — there is no minimum. Pick one meal or many; if you want
 * pad thai every day, that's a pool of one. The cap is just a sanity limit.
 */
const MAX_FAVORITES = 50;

/** Price-cap options — mirrors the Menu page's price filter. */
const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "10", label: "Under $10" },
  { value: "15", label: "Under $15" },
  { value: "20", label: "Under $20" },
];

export function SetupWizard({
  editing = false,
  initialFavorites = [],
  initialCustomizations = {},
  initialSoldOut = "notify",
  onActivate,
  onCancel,
}: {
  /** True when editing an existing auto-order (pre-selects the current pool). */
  editing?: boolean;
  /** Meal ids already in the rotation, pre-selected on open. */
  initialFavorites?: string[];
  /** Add-ons already saved per favorite, pre-selected on open. */
  initialCustomizations?: Record<string, CartAddOn[]>;
  /** The current unavailable-day rule, pre-selected on open. */
  initialSoldOut?: SoldOutBehavior;
  onActivate: (config: AutoConfig) => void;
  onCancel: () => void;
}) {
  // The rule step ("One quick rule") is now a modal opened from Continue.
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [favorites, setFavorites] = React.useState<string[]>(initialFavorites);
  // Add-ons chosen per favorite during setup — persisted so future drafts keep
  // them. Sides/beverages are excluded from the picker, so they never land here.
  const [customizations, setCustomizations] =
    React.useState<Record<string, CartAddOn[]>>(initialCustomizations);
  const [soldOut, setSoldOut] = React.useState<SoldOutBehavior>(initialSoldOut);
  // Favorites filters — mirror the Menu page (search + allergens + dietary +
  // cuisine + price + category tags).
  const [query, setQuery] = React.useState("");
  const [cuisine, setCuisine] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [allergens, setAllergens] = React.useState<string[]>([]);
  const [diets, setDiets] = React.useState<string[]>([]);
  const [category, setCategory] = React.useState("");

  const config: AutoConfig = { status: "active", favorites, customizations, soldOut };

  function addFav(id: string, addOns: CartAddOn[] = []) {
    setFavorites((prev) =>
      prev.includes(id) || prev.length >= MAX_FAVORITES ? prev : [...prev, id],
    );
    if (addOns.length) setCustomizations((prev) => ({ ...prev, [id]: addOns }));
  }

  /**
   * Picking a meal is a straight toggle — no add-on step. Add-ons (sides,
   * drinks, options) are chosen later when you review each day's draft, so
   * tapping a card just adds or removes the meal from the rotation.
   */
  function pickFav(item: MenuItem) {
    if (favorites.includes(item.id)) {
      setFavorites((prev) => prev.filter((x) => x !== item.id));
      return;
    }
    if (favorites.length >= MAX_FAVORITES) return;
    addFav(item.id);
  }

  // Branded category tags available for the individual menu (auto-order is
  // single-serving only), same set as the Menu page.
  const availableCategories = React.useMemo<string[]>(() => categoriesForType("individual"), []);

  // Same filtering as the Menu page; saved allergens are always hidden. Selected
  // favorites stay visible so a filter change never hides what you've picked.
  const filteredPool = setupMealPool.filter((item) => {
    if (favorites.includes(item.id)) return true;
    // Saved allergens always hidden, plus any extra chosen in the filter.
    const avoid = [...me.allergens, ...allergens];
    if (avoid.length && itemHasAnyAllergen(item, avoid)) return false;
    if (category && availableCategories.includes(category) && menuCategory(item) !== category) {
      return false;
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.cuisine.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (cuisine && item.cuisine !== cuisine) return false;
    if (priceMax && item.price > Number(priceMax)) return false;
    if (diets.length && !diets.every((d) => (item.tags as string[]).includes(d))) return false;
    return true;
  });

  // No minimum count — but you need at least one meal to rotate through.
  const canContinue = favorites.length >= 1;

  // Guided walkthrough: "Pick one for me" — adds the first visible meal. No-op
  // once anything is selected. Re-subscribed every render so closures stay fresh.
  React.useEffect(() => {
    function onTourPick() {
      if (favorites.length) return;
      const pick = filteredPool[0];
      if (pick) addFav(pick.id);
    }
    window.addEventListener(TOUR_PICK_EVENT, onTourPick);
    return () => window.removeEventListener(TOUR_PICK_EVENT, onTourPick);
  });

  return (
    <div className="w-full space-y-4 pb-2">
      {/* Back to the Auto-Order intro — top-left of the page, same as Order Details. */}
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      {/* Sticky header — the picker box + category tags stay fixed while the
          grid scrolls underneath (same as the Menu page). */}
      <div className="sticky top-16 z-20 -mx-4 bg-background px-4 pb-1 pt-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
              <Salad className="size-5 text-primary" />{" "}
              {editing ? "Edit the meals you auto-order" : "Pick the meals to auto-order"}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Pick one meal to repeat every day, or several to rotate through.{" "}
              <span data-tour="wizard-count" className="font-semibold text-foreground nums">
                {favorites.length} selected
              </span>
              .
            </p>
          </div>

          {/* Filter bar — search + Allergens / Dietary / Cuisine / Price, same as the Menu. */}
          <div data-tour="wizard-filters" className="mt-4 flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-sm">
            <div className="relative flex min-w-0 flex-1 items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search meals…"
                aria-label="Search meals"
                className="h-9 w-full rounded-full bg-transparent pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            <div className="h-6 w-px shrink-0 bg-border" />
            <MultiSelectFilter
              label="Allergens"
              aria-label="Filter out allergens to avoid"
              options={allergenOptions}
              selected={allergens}
              onChange={setAllergens}
            />
            <div className="h-6 w-px shrink-0 bg-border" />
            <MultiSelectFilter
              label="Dietary"
              aria-label="Filter by dietary preference"
              options={dietaryPreferences}
              selected={diets}
              onChange={setDiets}
            />
            <div className="h-6 w-px shrink-0 bg-border" />
            <ThemeSelect
              value={cuisine}
              onValueChange={setCuisine}
              aria-label="Filter by cuisine"
              variant="pill"
              align="right"
              options={[
                { value: "", label: "All cuisines" },
                ...cuisines.map((c) => ({ value: c, label: c })),
              ]}
            />
            <div className="h-6 w-px shrink-0 bg-border" />
            <ThemeSelect
              value={priceMax}
              onValueChange={setPriceMax}
              aria-label="Filter by price"
              variant="pill"
              align="right"
              options={PRICE_OPTIONS}
            />
          </div>
        </div>

        {/* Category tags — outside the box, same as the Menu page. */}
        {availableCategories.length ? (
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterPill active={!category} onClick={() => setCategory("")}>
              All
            </FilterPill>
            {availableCategories.map((c) => (
              <FilterPill
                key={c}
                active={category === c}
                onClick={() => setCategory(category === c ? "" : c)}
              >
                {c}
              </FilterPill>
            ))}
          </div>
        ) : null}
      </div>

      {/* Meal grid — same cards as the Menu, in selector mode (no add button). */}
      {filteredPool.length ? (
        <div data-tour="wizard-grid" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredPool.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              showPrice={program.showPrices}
              selectable
              selected={favorites.includes(item.id)}
              onSelect={() => pickFav(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">
          No meals match your filters. Try clearing them.
        </div>
      )}

      {/* Footer — Cancel + Continue. Sticky on desktop; on mobile it sits at the
          end so it never overlaps the bottom tab bar. */}
      <div className="z-20 -mx-4 mt-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:sticky lg:bottom-0 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="teal" data-tour="wizard-confirm" disabled={!canContinue} onClick={() => setRulesOpen(true)}>
            Confirm <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* One quick rule — opened from Continue. */}
      {rulesOpen ? (
        <RulesModal
          editing={editing}
          soldOut={soldOut}
          onSelect={setSoldOut}
          onClose={() => setRulesOpen(false)}
          onActivate={() => onActivate(config)}
        />
      ) : null}
    </div>
  );
}

/** "One quick rule" step, shown as a modal after the meals are picked. */
function RulesModal({
  editing,
  soldOut,
  onSelect,
  onClose,
  onActivate,
}: {
  editing?: boolean;
  soldOut: SoldOutBehavior;
  onSelect: (v: SoldOutBehavior) => void;
  onClose: () => void;
  onActivate: () => void;
}) {
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Auto-order rule">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-card shadow-raised transition-all duration-300 sm:rounded-3xl",
          shown ? "translate-y-0 sm:opacity-100" : "translate-y-full sm:translate-y-2 sm:opacity-0",
        )}
      >
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <SlidersHorizontal className="size-5 text-primary" /> One quick rule
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            If a pick isn&apos;t available on a service day, what should we do?
          </p>
        </div>

        <div data-tour="rule-options" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {SOLD_OUT.map((s) => (
            <RadioCard
              key={s.id}
              active={soldOut === s.id}
              onClick={() => onSelect(s.id)}
              title={s.label}
              desc={s.desc}
              badge={s.recommended ? "Recommended" : undefined}
            />
          ))}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={onClose}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <Button variant="teal" data-tour="rule-activate" onClick={onActivate}>
            <Check className="size-4" /> {editing ? "Save changes" : "Turn on Auto-Order"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  icon: Icon,
  active,
  onClick,
  children,
}: {
  icon?: LucideIcon;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-card"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted",
      )}
    >
      {Icon ? (
        <Icon className={cn("size-4 shrink-0", active ? "text-primary-foreground" : "text-primary")} />
      ) : null}
      {children}
    </button>
  );
}

function RadioCard({
  active,
  onClick,
  title,
  desc,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors",
        active ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
          active ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {active ? <Check className="size-3" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge ? (
            <span className="rounded-full bg-teal-wash px-1.5 text-2xs font-semibold text-teal">{badge}</span>
          ) : null}
        </span>
        {desc ? <span className="block text-2xs text-muted-foreground">{desc}</span> : null}
      </span>
    </button>
  );
}
