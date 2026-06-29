"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  CalendarRange,
  UtensilsCrossed,
  Sprout,
  Carrot,
  Moon,
  WheatOff,
  NutOff,
  MilkOff,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ThemeSelect } from "@/components/ui/theme-select";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { AddOnModal } from "@/components/menu/add-on-modal";
import { DateRangeModal } from "@/features/menu/date-range-modal";
import {
  menuForWeekday,
  cuisines,
  dietaryFilters,
  hasRequiredAddOns,
  hasOptionalAddOns,
} from "@/data/menu";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { useCartStore } from "@/store/use-cart-store";
import { useUiStore } from "@/store/use-ui-store";
import {
  nextServiceDays,
  serviceDaysInRange,
  startOfToday,
  fromISODate,
  toISODate,
  isoWeekday,
  formatDay,
  formatShort,
  WEEKDAY_SHORT,
} from "@/lib/dates";
import { formatCurrency, cn } from "@/lib/utils";
import { bumpCart } from "@/lib/fly-to-cart";
import type { MenuItem } from "@/data/types";

type Mode = "single" | "multi";

/** Multi-day ordering runs Mon–Fri — only weekends are off. */
const MULTI_DAY_NUMS = [1, 2, 3, 4, 5];

/** Price-cap options for the menu/favorites filter. */
const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "10", label: "Under $10" },
  { value: "15", label: "Under $15" },
  { value: "20", label: "Under $20" },
];

export function MenuView() {
  const [mounted, setMounted] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("single");

  // Date state (populated after mount to avoid SSR/CSR date mismatch).
  // One-day mode orders for the next service day (no picker); multi-day mode
  // picks a date range and orders day-by-day.
  const [selectedDate, setSelectedDate] = React.useState<string>("");
  const [rangeStart, setRangeStart] = React.useState<string>("");
  const [rangeEnd, setRangeEnd] = React.useState<string>("");
  const [activeDate, setActiveDate] = React.useState<string>("");
  // Multi-day: whether a range has been chosen, and the range-picker modal.
  const [rangeChosen, setRangeChosen] = React.useState(false);
  const [rangePickerOpen, setRangePickerOpen] = React.useState(false);

  // Filters
  const [query, setQuery] = React.useState("");
  const [cuisine, setCuisine] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [diet, setDiet] = React.useState<string | null>(null);

  // Add-on sheet
  const [customizing, setCustomizing] = React.useState<MenuItem | null>(null);

  const cart = useCartStore();
  const setActiveOrderDate = useUiStore((s) => s.setActiveOrderDate);
  const setPlannedDays = useUiStore((s) => s.setPlannedDays);
  const openCart = useUiStore((s) => s.openCart);
  const rangePickerRequested = useUiStore((s) => s.rangePickerRequested);
  const clearRangePicker = useUiStore((s) => s.clearRangePicker);
  // When the desktop cart panel pushes the content narrower, drop a column at
  // each breakpoint (4→3, 3→2) so cards keep their size instead of shrinking.
  const cartOpen = useUiStore((s) => s.cartOpen);
  const gridCols = cn(
    "grid grid-cols-1 gap-4 sm:grid-cols-2",
    cartOpen ? "lg:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4",
  );

  React.useEffect(() => {
    const today = startOfToday();
    const upcoming = nextServiceDays(today, MULTI_DAY_NUMS, 8).map(toISODate);
    setSelectedDate(upcoming[0] ?? "");
    setActiveDate(upcoming[0] ?? "");
    const week = nextServiceDays(today, MULTI_DAY_NUMS, 3).map(toISODate);
    setRangeStart(week[0] ?? "");
    setRangeEnd(week[week.length - 1] ?? "");
    setMounted(true);
  }, []);

  // Resolve the multi-day range into service days (weekends auto-skipped).
  const rangeDays = React.useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const start = fromISODate(rangeStart);
    const end = fromISODate(rangeEnd);
    if (end < start) return [];
    return serviceDaysInRange(start, end, MULTI_DAY_NUMS).map(toISODate);
  }, [rangeStart, rangeEnd]);

  // Keep the active multi-day tab valid.
  React.useEffect(() => {
    if (mode === "multi" && rangeDays.length && !rangeDays.includes(activeDate)) {
      setActiveDate(rangeDays[0]);
    }
  }, [mode, rangeDays, activeDate]);

  const day = mode === "single" ? selectedDate : activeDate;

  // Publish the active order day so the topbar can show that day's budget.
  React.useEffect(() => {
    if (day) setActiveOrderDate(day);
  }, [day, setActiveOrderDate]);

  // Publish the planned multi-day range so the cart can show days remaining.
  React.useEffect(() => {
    setPlannedDays(mode === "multi" && rangeChosen ? rangeDays : []);
  }, [mode, rangeChosen, rangeDays, setPlannedDays]);

  // "Add another day" (from the cart) asks us to reopen the date-range picker.
  React.useEffect(() => {
    if (rangePickerRequested) {
      setMode("multi");
      setRangePickerOpen(true);
      clearRangePicker();
    }
  }, [rangePickerRequested, clearRangePicker]);

  // Multi-day progress.
  const daysBoxOpen = mode === "multi" && rangeChosen && rangeDays.length > 0;
  const daysAdded = rangeDays.filter((d) => cart.itemsForDate(d).length > 0).length;
  const daysRemaining = rangeDays.length - daysAdded;

  const dayMenu = React.useMemo(() => {
    if (!day) return [];
    const weekday = isoWeekday(fromISODate(day));
    let items = menuForWeekday(weekday);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.cuisine.toLowerCase().includes(q),
      );
    }
    if (cuisine) items = items.filter((i) => i.cuisine === cuisine);
    if (priceMax) items = items.filter((i) => i.price <= Number(priceMax));
    if (diet) items = items.filter((i) => i.tags.includes(diet as MenuItem["tags"][number]));
    return items;
  }, [day, query, cuisine, priceMax, diet]);

  function inCartFor(itemId: string) {
    return cart
      .itemsForDate(day)
      .filter((l) => l.itemId === itemId)
      .reduce((s, l) => s + l.qty, 0);
  }

  function quickAdd(item: MenuItem) {
    cart.add({
      date: day,
      itemId: item.id,
      name: item.name,
      basePrice: item.price,
      qty: 1,
      addOns: [],
      type: item.type,
    });
  }

  function handleAdd(item: MenuItem) {
    if (hasRequiredAddOns(item) || hasOptionalAddOns(item)) {
      setCustomizing(item);
    } else {
      quickAdd(item);
    }
  }

  function allergenWarning(item: MenuItem) {
    if (!me.allergens.length) return false;
    const text = `${item.allergens} ${item.ingredients ?? ""}`.toLowerCase();
    return me.allergens.some((a) => text.includes(a.toLowerCase()));
  }

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-full" />
        <Skeleton className="h-16 rounded-2xl" />
        <div className={gridCols}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const cartCount = cart.count();
  const cartTotal = cart.subtotal();
  const cartOwed = cart.totalEmployeePaid();

  return (
    <div className="space-y-5 pb-4">
      {/* Start an order — date selection. The sticky wrapper pins flush to the
          topbar with a solid background so nothing shows through the float gap,
          while the inner card sits below it with a shadow (floating look). */}
      <div className="sticky top-16 z-20 bg-background pb-1 pt-4">
      <section
        className={cn(
          "relative z-10 rounded-2xl border border-border bg-card p-4 shadow-raised sm:p-5",
          daysBoxOpen && "rounded-b-none",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Hi {me.firstName}, what would you like to eat?
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {mode === "single"
                ? "Add meals for your next service day."
                : "Pick a date range and add meals day by day."}{" "}
              {program.company} covers {formatCurrency(program.subsidyPerDay)} each service day.
            </p>
          </div>
          <Tabs
            tabs={[
              { id: "single", label: "One day" },
              { id: "multi", label: "Multiple days" },
            ]}
            value={mode}
            onValueChange={(v) => {
              const m = v as Mode;
              setMode(m);
              // Switching to multi-day opens the date picker straight away.
              if (m === "multi" && !rangeChosen) setRangePickerOpen(true);
            }}
          />
        </div>

        {/* Unified search bar — search, cuisine and price in one pill */}
        <div className="mt-4 flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-sm">
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu…"
              aria-label="Search the menu"
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
      </section>

      {/* Multi-day "days" box — attached to the bottom of the Hi Maya box and
          slides out from under it. Lives in the same sticky wrapper so it sticks
          together with the box above. */}
      {daysBoxOpen ? (
        <div className="overflow-hidden">
          <div className="animate-reveal-down rounded-b-2xl border border-t-0 border-border bg-card p-4 shadow-raised sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <CalendarRange className="size-4 text-primary" />
                {formatDay(fromISODate(rangeStart))} – {formatDay(fromISODate(rangeEnd))}
              </span>
              <button
                type="button"
                onClick={() => setRangePickerOpen(true)}
                className="text-[13px] font-semibold text-primary hover:underline"
              >
                Change
              </button>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-end">
                <span className="text-2xs font-semibold text-muted-foreground">
                  {daysAdded}/{rangeDays.length} done
                </span>
              </div>
              <DayStrip
                cells={rangeDays.map((iso) => {
                  const d = fromISODate(iso);
                  const items = cart.itemsForDate(iso);
                  const owed = cart.dayEmployeePaid(iso);
                  const has = items.length > 0;
                  return {
                    iso,
                    weekday: WEEKDAY_SHORT[d.getDay()],
                    dayNum: d.getDate(),
                    fullLabel: formatDay(d),
                    has,
                    owed,
                    total: cart.dayTotal(iso),
                    itemCount: items.reduce((s, l) => s + l.qty, 0),
                    subLabel: has ? (owed > 0 ? formatCurrency(owed) : "added") : formatShort(d).split(" ")[0],
                  };
                })}
                activeDate={activeDate}
                onSelect={setActiveDate}
              />
            </div>

            {daysRemaining === 0 ? (
              <div className="mt-3">
                <Button variant="teal" block size="lg" onClick={openCart}>
                  <Check className="size-4" /> All {rangeDays.length} days added · Review cart
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Dietary filters — a little spacing below the box above */}
      <div className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      </div>

      {/* Menu grid */}
      {dayMenu.length ? (
        <div className={gridCols}>
          {dayMenu.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              inCart={inCartFor(item.id)}
              showPrice={program.showPrices}
              allergenWarning={allergenWarning(item)}
              onAdd={() => quickAdd(item)}
              onCustomize={() => handleAdd(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">
          No items match your filters for this day. Try clearing filters or pick another day.
        </div>
      )}

      {/* Sticky review-cart bar — mobile only (desktop uses the topbar cart) */}
      {cartCount > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[68px] z-30 px-4 lg:hidden">
          <div className="pointer-events-auto mx-auto flex max-w-[1100px] items-center justify-between gap-3 rounded-full border border-teal-deep bg-sidebar px-4 py-2.5 text-sidebar-foreground shadow-raised">
            <span className="flex items-center gap-2 text-[13px] font-semibold">
              <ShoppingBag className="size-4" />
              {cartCount} {cartCount === 1 ? "item" : "items"} ·{" "}
              {cart.dates().length} {cart.dates().length === 1 ? "day" : "days"}
              <span className="hidden text-sidebar-muted sm:inline">
                {cartOwed > 0 ? `· you pay ${formatCurrency(cartOwed)}` : "· fully covered"}
              </span>
            </span>
            <Link
              href="/cart"
              className="flex items-center gap-1 rounded-full bg-yellow px-4 py-1.5 text-[13px] font-bold text-teal-deep transition-colors hover:bg-yellow-deep"
            >
              Review cart <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      ) : null}

      {customizing ? (
        <AddOnModal
          item={customizing}
          dateLabel={formatDay(fromISODate(day))}
          onClose={() => setCustomizing(null)}
          onConfirm={(addOns, qty, unitPrice) => {
            cart.add({
              date: day,
              itemId: customizing.id,
              name: customizing.name,
              basePrice: customizing.price,
              qty,
              addOns,
              unitPrice,
              type: customizing.type,
            });
            setCustomizing(null);
            bumpCart();
          }}
        />
      ) : null}

      {rangePickerOpen ? (
        <DateRangeModal
          initialStart={rangeStart}
          initialEnd={rangeEnd}
          serviceDayNums={MULTI_DAY_NUMS}
          onClose={() => {
            setRangePickerOpen(false);
            // Cancelled before ever choosing a range → fall back to one-day mode.
            if (!rangeChosen) setMode("single");
          }}
          onApply={(start, end) => {
            setRangeStart(start);
            setRangeEnd(end);
            setRangeChosen(true);
            setRangePickerOpen(false);
            const days = serviceDaysInRange(
              fromISODate(start),
              fromISODate(end),
              MULTI_DAY_NUMS,
            ).map(toISODate);
            if (days[0]) setActiveDate(days[0]);
          }}
        />
      ) : null}
    </div>
  );
}

/** Dietary-filter icons — small "illustration" per chip, DoorDash/Airbnb style. */
const DIET_ICON: Record<string, LucideIcon> = {
  Vegan: Sprout,
  Vegetarian: Carrot,
  Halal: Moon,
  "Gluten-Free": WheatOff,
  "Nut-Free": NutOff,
  "Dairy-Free": MilkOff,
};

/** One day in the multi-day strip, with its order summary for the hover card. */
interface DayCell {
  iso: string;
  weekday: string;
  dayNum: number;
  fullLabel: string;
  has: boolean;
  owed: number;
  total: number;
  itemCount: number;
  subLabel: string;
}

/**
 * Horizontal day strip with click-and-drag scrolling, edge arrow buttons, and
 * an on-hover summary card under any ordered day (item count + price). A drag
 * past a small threshold suppresses the trailing click so dragging the strip
 * never accidentally selects a day.
 *
 * The hover card is rendered `fixed` (positioned from the pill's screen rect)
 * because the strip lives inside an `overflow-x-auto` scroller nested in an
 * `overflow-hidden` reveal wrapper — an absolutely-positioned card would be
 * clipped on both axes.
 */
function DayStrip({
  cells,
  activeDate,
  onSelect,
}: {
  cells: DayCell[];
  activeDate: string;
  onSelect: (iso: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(false);
  const [hover, setHover] = React.useState<{ cell: DayCell; x: number; y: number } | null>(null);

  const updateArrows = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows]);

  function onPointerDown(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    setHover(null);
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(dx) > 4) {
      drag.current.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    if (drag.current.moved) el.scrollLeft = drag.current.startScroll - dx;
  }
  function endDrag(e: React.PointerEvent) {
    const el = ref.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    drag.current.active = false;
  }
  function onClickCapture(e: React.MouseEvent) {
    // Swallow the click that ends a drag so a day isn't toggled on release.
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  }
  function scrollByStep(dir: 1 | -1) {
    setHover(null);
    ref.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  }

  const scrollable = canLeft || canRight;

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={() => {
          updateArrows();
          setHover(null);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className={cn(
          "flex select-none gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          scrollable ? "cursor-grab px-2 active:cursor-grabbing" : "cursor-default",
        )}
      >
        {cells.map((cell) => {
          const active = cell.iso === activeDate;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelect(cell.iso)}
              onMouseEnter={(e) => {
                if (!cell.has) return;
                const r = e.currentTarget.getBoundingClientRect();
                setHover({ cell, x: r.left + r.width / 2, y: r.bottom + 8 });
              }}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "relative flex min-w-[64px] flex-col items-center rounded-2xl border px-3 py-2 transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : cell.has
                    ? "border-success-border bg-success-bg text-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              <span className="text-2xs font-semibold uppercase">{cell.weekday}</span>
              <span className="font-display text-lg font-semibold leading-none">{cell.dayNum}</span>
              <span
                className={cn(
                  "mt-1 text-[10px]",
                  cell.has && "font-bold",
                  active ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {cell.subLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Edge fades hint there's more to scroll. */}
      {canLeft ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 rounded-l-2xl bg-gradient-to-r from-card to-transparent" />
      ) : null}
      {canRight ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 rounded-r-2xl bg-gradient-to-l from-card to-transparent" />
      ) : null}

      {/* Always show the arrows while the strip is scrollable; disable at the ends. */}
      {scrollable ? (
        <>
          <button
            type="button"
            aria-label="Scroll days left"
            disabled={!canLeft}
            onClick={() => scrollByStep(-1)}
            className="absolute left-0 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-raised transition hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Scroll days right"
            disabled={!canRight}
            onClick={() => scrollByStep(1)}
            className="absolute right-0 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-raised transition hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      ) : null}

      {/* Hover summary card — opens under an ordered day. */}
      {hover ? (
        <div
          role="tooltip"
          style={{ left: hover.x, top: hover.y }}
          className="pointer-events-none fixed z-50 w-44 -translate-x-1/2 rounded-2xl border border-border bg-card p-3 text-foreground shadow-lg"
        >
          <div
            className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-l border-t border-border bg-card"
            aria-hidden
          />
          <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            {hover.cell.fullLabel}
          </div>
          <div className="mt-2 space-y-1 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {hover.cell.itemCount} {hover.cell.itemCount === 1 ? "item" : "items"}
              </span>
              <span className="font-semibold nums">{formatCurrency(hover.cell.total)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{hover.cell.owed > 0 ? "You pay" : "Covered"}</span>
              <span
                className={cn(
                  "font-semibold nums",
                  hover.cell.owed > 0 ? "text-danger" : "text-success",
                )}
              >
                {hover.cell.owed > 0 ? formatCurrency(hover.cell.owed) : formatCurrency(0)}
              </span>
            </div>
          </div>
        </div>
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
