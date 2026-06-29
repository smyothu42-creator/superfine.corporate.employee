"use client";

import * as React from "react";
import {
  Salad,
  Check,
  ChevronRight,
  ChevronLeft,
  Lock,
  ClipboardCheck,
  Clock,
  X,
  Search,
  UtensilsCrossed,
  Sprout,
  Carrot,
  Moon,
  WheatOff,
  NutOff,
  MilkOff,
  CalendarDays,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSelect } from "@/components/ui/theme-select";
import { FoodPhoto } from "@/components/menu/food-photo";
import { AddOnModal } from "@/components/menu/add-on-modal";
import {
  getItem,
  cuisines,
  dietaryFilters,
  hasRequiredAddOns,
  hasOptionalAddOns,
} from "@/data/menu";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { formatCurrency, cn } from "@/lib/utils";
import type { MenuItem } from "@/data/types";
import {
  WEEKDAYS,
  mealPool,
  hasAllergen,
  generateWeek,
  weekTotal,
  shortDate,
  type AutoConfig,
  type RotationStrategy,
  type ReminderTiming,
  type SoldOutBehavior,
  type Weekday,
} from "./shared";

const REMINDERS: { id: ReminderTiming; label: string; recommended?: boolean }[] = [
  { id: "1-day", label: "1 day before cutoff", recommended: true },
  { id: "2-hours", label: "2 hours before cutoff" },
  { id: "none", label: "No reminder — just order" },
];

const SOLD_OUT: { id: SoldOutBehavior; label: string }[] = [
  { id: "next-favorite", label: "Pick next favorite in rotation" },
  { id: "skip", label: "Skip the day (don't order)" },
  { id: "notify", label: "Notify me to choose manually" },
];

const STEPS = ["Select Meal", "Schedule", "Confirmation"];

/** Price-cap options — mirrors the Menu page's price filter. */
const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "10", label: "Under $10" },
  { value: "15", label: "Under $15" },
  { value: "20", label: "Under $20" },
];

/** Dietary-filter icons — mirrors the Menu page's filter chips. */
const DIET_ICON: Record<string, LucideIcon> = {
  Vegan: Sprout,
  Vegetarian: Carrot,
  Halal: Moon,
  "Gluten-Free": WheatOff,
  "Nut-Free": NutOff,
  "Dairy-Free": MilkOff,
};

export function SetupWizard({
  onActivate,
  onCancel,
}: {
  onActivate: (config: AutoConfig) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = React.useState(0);
  // Rotation strategy is fixed — we always rotate through the chosen favorites.
  const strategy: RotationStrategy = "round-robin";
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [schedule, setSchedule] = React.useState<Weekday[]>([...WEEKDAYS]);
  const [reminder, setReminder] = React.useState<ReminderTiming>("1-day");
  const [soldOut, setSoldOut] = React.useState<SoldOutBehavior>("next-favorite");
  // Favorites filters — mirror the Menu page (search + cuisine + dietary tags).
  const [query, setQuery] = React.useState("");
  const [cuisine, setCuisine] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [diet, setDiet] = React.useState<string | null>(null);
  // Item being customized before it joins the favorites (reuses the Menu modal).
  const [customizing, setCustomizing] = React.useState<MenuItem | null>(null);

  const config: AutoConfig = { status: "active", strategy, favorites, schedule, reminder, soldOut };

  function addFav(id: string) {
    setFavorites((prev) => (prev.includes(id) || prev.length >= 10 ? prev : [...prev, id]));
  }

  /**
   * Picking a meal: deselect if already chosen; otherwise open the customize
   * modal (same as the Menu) when it has add-ons, or add it straight away.
   */
  function pickFav(item: MenuItem) {
    if (favorites.includes(item.id)) {
      setFavorites((prev) => prev.filter((x) => x !== item.id));
      return;
    }
    if (favorites.length >= 10) return;
    if (hasRequiredAddOns(item) || hasOptionalAddOns(item)) {
      setCustomizing(item);
      return;
    }
    addFav(item.id);
  }
  function toggleDay(d: Weekday) {
    setSchedule((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  // Selected favorites float to the top of the grid.
  const sortedPool = React.useMemo(() => {
    return [...mealPool].sort((a, b) => {
      const av = favorites.includes(a.id) ? 0 : 1;
      const bv = favorites.includes(b.id) ? 0 : 1;
      return av - bv;
    });
  }, [favorites]);

  // Apply search + cuisine + dietary filters — selected items stay visible.
  const filteredPool = sortedPool.filter((item) => {
    if (favorites.includes(item.id)) return true;
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
    if (diet && !(item.tags as string[]).includes(diet)) return false;
    return true;
  });

  const canContinue = step === 0 ? favorites.length >= 3 : step === 1 ? schedule.length >= 1 : true;

  return (
    <div className="w-full">
      {/* progress — sticky connected stepper */}
      <div className="sticky top-16 z-20 -mx-4 bg-background px-4 pb-4 pt-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-bold transition-colors",
                    done && "bg-success text-white",
                    active && "bg-primary text-primary-foreground",
                    !done && !active && "border border-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-[13px] font-semibold transition-colors",
                    active ? "text-teal-deep" : done ? "text-foreground" : "text-muted-foreground",
                    active ? "inline" : "hidden sm:inline",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    done ? "bg-success" : "bg-border",
                  )}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
        {/* STEP 0 — favorites */}
        {step === 0 ? (
          <div className="space-y-4">
            <Header
              icon={Salad}
              title="Build your meal rotation"
              subtitle="Choose 3–10 meals. We'll rotate through them so you never get bored."
              aside={
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-2xs font-semibold text-foreground nums">
                  Order Items {favorites.length}/10
                </span>
              }
            />

            {/* Unified search bar — search, cuisine and price in one pill (same as the Menu page) */}
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-sm">
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

            {/* Dietary tags — same chips as the Menu page */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterPill icon={UtensilsCrossed} active={!diet} onClick={() => setDiet(null)}>
                All
              </FilterPill>
              {dietaryFilters.map((d) => (
                <FilterPill
                  key={d}
                  icon={DIET_ICON[d]}
                  active={diet === d}
                  onClick={() => setDiet(diet === d ? null : d)}
                >
                  {d}
                </FilterPill>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredPool.map((item) => {
                const on = favorites.includes(item.id);
                const blocked = hasAllergen(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={blocked}
                    onClick={() => pickFav(item)}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all",
                      on
                        ? "border-2 border-primary shadow-raised ring-2 ring-primary/30"
                        : "border-border hover:-translate-y-0.5 hover:shadow-card",
                      blocked && "opacity-60",
                    )}
                  >
                    <FoodPhoto src={item.image} alt={item.name} className="h-24" iconClassName="size-6" />
                    {on ? (
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-primary/35" aria-hidden />
                    ) : null}
                    {on ? (
                      <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-card">
                        <Check className="size-3.5" />
                      </span>
                    ) : null}
                    {blocked ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 px-1 text-center text-[10px] font-bold text-white">
                        <Lock className="mr-1 size-3" /> Allergen
                      </span>
                    ) : null}
                    <div className={cn("p-2", on && "bg-teal-wash")}>
                      <p
                        className={cn(
                          "truncate text-2xs font-semibold leading-tight",
                          on && "text-teal-deep",
                        )}
                      >
                        {item.name}
                      </p>
                      <p className="text-2xs text-muted-foreground nums">{formatCurrency(item.price)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* STEP 1 — schedule & rules */}
        {step === 1 ? (
          <div className="space-y-5">
            <Header icon={CalendarDays} title="When should we order?" subtitle="Tap the weekdays to order for. Grey = off." />
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const on = schedule.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(d)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all",
                      on
                        ? "border-primary bg-teal-wash text-teal-deep shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {on ? <Check className="size-3.5 text-primary" /> : null} {d}
                  </button>
                );
              })}
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
                <BellRing className="size-4 text-primary" /> Remind me to review
              </p>
              <div className="space-y-2">
                {REMINDERS.map((r) => (
                  <RadioCard
                    key={r.id}
                    active={reminder === r.id}
                    onClick={() => setReminder(r.id)}
                    title={r.label}
                    badge={r.recommended ? "Recommended" : undefined}
                    compact
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold">If my favorite is sold out</p>
              <div className="space-y-2">
                {SOLD_OUT.map((s) => (
                  <RadioCard
                    key={s.id}
                    active={soldOut === s.id}
                    onClick={() => setSoldOut(s.id)}
                    title={s.label}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* STEP 2 — confirmation */}
        {step === 2 ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-teal-wash text-primary">
                <ClipboardCheck className="size-7" />
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">Review &amp; confirm</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Tap any meal to see its details, then confirm to activate.
              </p>
            </div>
            <PreviewWeek config={config} />
            <div className="space-y-2 text-2xs text-muted-foreground">
              <p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
                <Clock className="size-3.5 shrink-0 text-primary" /> Change any day before the{" "}
                {program.individualSoftCutoff} cutoff.
              </p>
              <p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
                <BellRing className="size-3.5 shrink-0 text-primary" /> We&apos;ll email you a review reminder
                1 day before each cutoff.
              </p>
            </div>
          </div>
        ) : null}

        {/* Sticky footer — pins to the bottom while the step content scrolls */}
        <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 rounded-b-3xl border-t border-border bg-card px-5 py-4">
          {step === 0 ? (
            <div className="mb-3">
              <p className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                <Lock className="size-3.5" /> Allergy-safe mode is on — items with{" "}
                {me.allergens.join(", ") || "your allergens"} are blocked.
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            {step === 0 ? (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="size-4" /> Back
              </Button>
            )}

            {step < 1 ? (
              <Button variant="teal" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
                Continue <ChevronRight className="size-4" />
              </Button>
            ) : step === 1 ? (
              <Button variant="teal" disabled={!canContinue} onClick={() => setStep(2)}>
                Review <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button variant="teal" onClick={() => onActivate(config)}>
                <Check className="size-4" /> Confirm
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Customize modal — same bottom sheet as the Menu. Confirming adds the
          meal to the favorites rotation. */}
      {customizing ? (
        <AddOnModal
          item={customizing}
          dateLabel="your Auto-Order rotation"
          onClose={() => setCustomizing(null)}
          onConfirm={() => {
            addFav(customizing.id);
            setCustomizing(null);
          }}
        />
      ) : null}
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

function Header({
  icon: Icon,
  title,
  subtitle,
  aside,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  aside?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Icon className="size-5 text-primary" /> {title}
        </h3>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function RadioCard({
  active,
  onClick,
  title,
  desc,
  badge,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  badge?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border-2 text-left transition-colors",
        compact ? "px-3 py-2.5" : "px-4 py-3",
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

function PreviewWeek({ config }: { config: AutoConfig }) {
  const days = generateWeek(config).filter((d) => d.status !== "day-off");
  const total = weekTotal(days);
  const [details, setDetails] = React.useState<
    { item: MenuItem; weekday: string; dateISO: string } | null
  >(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {days.map((d) => {
        const item = d.itemId ? getItem(d.itemId) : undefined;
        const meta = (
          <>
            <FoodPhoto src={item?.image} alt={item?.name ?? ""} className="size-11 rounded-lg" iconClassName="size-4" />
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-semibold uppercase text-muted-foreground">
                {d.weekday} · {shortDate(d.dateISO)}
              </p>
              <p className="truncate text-sm font-semibold">{item?.name ?? "—"}</p>
            </div>
            <span className="text-sm font-semibold nums">{item ? formatCurrency(item.price) : ""}</span>
          </>
        );
        return item ? (
          <button
            key={d.dateISO}
            type="button"
            onClick={() => setDetails({ item, weekday: d.weekday, dateISO: d.dateISO })}
            className="flex w-full items-center gap-3 border-b border-border p-2.5 text-left transition-colors last:border-0 hover:bg-muted"
          >
            {meta}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ) : (
          <div key={d.dateISO} className="flex items-center gap-3 border-b border-border p-2.5 last:border-0">
            {meta}
          </div>
        );
      })}
      <div className="flex items-center justify-between bg-muted px-3 py-2.5 text-sm">
        <span className="font-semibold">Total · company covers</span>
        <span className="font-bold text-success nums">{formatCurrency(total)}</span>
      </div>

      {details ? (
        <MealDetailsModal
          item={details.item}
          weekday={details.weekday}
          dateISO={details.dateISO}
          onClose={() => setDetails(null)}
        />
      ) : null}
    </div>
  );
}

/** Read-only meal details — opened from a confirmation-week row. */
function MealDetailsModal({
  item,
  weekday,
  dateISO,
  onClose,
}: {
  item: MenuItem;
  weekday: string;
  dateISO: string;
  onClose: () => void;
}) {
  const nutrition = item.nutrition
    ? [
        { label: "Cal", value: `${item.nutrition.calories}` },
        { label: "Protein", value: `${item.nutrition.protein}g` },
        { label: "Carbs", value: `${item.nutrition.carbs}g` },
        { label: "Fat", value: `${item.nutrition.fat}g` },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl">
        <div className="relative">
          <FoodPhoto src={item.image} alt={item.name} className="h-40" iconClassName="size-8" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full bg-card/90 p-1.5 text-foreground shadow-card hover:bg-card"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              {weekday} · {shortDate(dateISO)} · {item.cuisine}
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">{item.name}</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">{item.description}</p>
          </div>

          {item.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span key={t} className="rounded-full bg-teal-wash px-2 py-0.5 text-2xs font-semibold text-teal-deep">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {nutrition.length ? (
            <div className="grid grid-cols-4 gap-2">
              {nutrition.map((n) => (
                <div key={n.label} className="rounded-xl bg-muted px-2 py-2 text-center">
                  <p className="text-sm font-bold nums">{n.value}</p>
                  <p className="text-2xs text-muted-foreground">{n.label}</p>
                </div>
              ))}
            </div>
          ) : null}

          {item.ingredients ? (
            <div>
              <p className="text-overline">Ingredients</p>
              <p className="mt-1 text-2xs text-muted-foreground">{item.ingredients}</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-border p-4">
          <span className="text-[13px] text-muted-foreground">Company covers</span>
          <span className="text-base font-bold text-success nums">{formatCurrency(item.price)}</span>
        </div>
      </div>
    </div>
  );
}
