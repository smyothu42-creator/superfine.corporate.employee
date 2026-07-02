"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ShoppingBag,
  CalendarRange,
  CalendarDays,
  AlarmClock,
  Replace,
  X,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ThemeSelect } from "@/components/ui/theme-select";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { FoodPhoto } from "@/components/menu/food-photo";
import { AddOnModal } from "@/components/menu/add-on-modal";
import { DateRangeModal } from "@/features/menu/date-range-modal";
import {
  menuFor,
  cuisines,
  categoriesForType,
  menuCategory,
  allergenOptions,
  dietaryPreferences,
  itemHasAnyAllergen,
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
  addDays,
  fromISODate,
  toISODate,
  isoWeekday,
  formatDay,
  formatDayLong,
  formatShort,
  WEEKDAY_SHORT,
  WEEKDAY_LONG,
} from "@/lib/dates";
import {
  nextOpenDays,
  cutoffFor,
  demoNow,
  isCutoffPassed,
  isServiceDay,
  isHoliday,
  HOLIDAYS,
} from "@/lib/cutoff";
import { formatCurrency, cn } from "@/lib/utils";
import { bumpCart } from "@/lib/fly-to-cart";
import { toast } from "@/store/use-toast-store";
import { confirm } from "@/store/use-confirm-store";
import type { MenuItem, OrderType } from "@/data/types";

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
  // Individual (single-serving) vs. family-style (shared) menu. Drives which
  // items, prices and cutoff rules are shown. Defaults to individual.
  const [menuType, setMenuType] = React.useState<OrderType>("individual");

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
  // Branded category tag (e.g. "Stack, Wrap & Roll"). "" = All.
  const [category, setCategory] = React.useState("");
  // Two distinct filters: allergens to AVOID (hide matches) and dietary
  // preferences to REQUIRE (show only matches). This is for *extra* allergens
  // the user wants to avoid today — their saved profile allergens are ALWAYS
  // hidden (hard safety filter below), so this starts empty.
  const [allergens, setAllergens] = React.useState<string[]>([]);
  const [diets, setDiets] = React.useState<string[]>([]);

  // Add-on sheet
  const [customizing, setCustomizing] = React.useState<MenuItem | null>(null);

  // Collapse the attached box (Ordering for / day strip) while scrolling down,
  // restore it when scrolling back up. `boxOverflowVisible` lets the Change-date
  // dropdown escape once the box is fully expanded (overflow is clipped mid-slide).
  const [boxCollapsed, setBoxCollapsed] = React.useState(false);
  const [boxOverflowVisible, setBoxOverflowVisible] = React.useState(true);
  const boxCollapsedRef = React.useRef(false);

  const cart = useCartStore();
  const router = useRouter();
  const setActiveOrderDate = useUiStore((s) => s.setActiveOrderDate);
  const setPlannedDays = useUiStore((s) => s.setPlannedDays);
  const openCart = useUiStore((s) => s.openCart);
  const cartOpen = useUiStore((s) => s.cartOpen);
  const rangePickerRequested = useUiStore((s) => s.rangePickerRequested);
  const clearRangePicker = useUiStore((s) => s.clearRangePicker);
  // "Edit a placed order from the full menu" context (set by the change-order popup).
  const editingOrder = useUiStore((s) => s.editingOrder);
  const startEditingOrder = useUiStore((s) => s.startEditingOrder);
  const clearEditingOrder = useUiStore((s) => s.clearEditingOrder);
  // DoorDash-style horizontal rows — capped at 2 per row so each card keeps its
  // width; drop to a single column earlier while the cart side panel is open.
  const gridCols = cn(
    "grid grid-cols-1 gap-4",
    cartOpen ? "xl:grid-cols-2" : "lg:grid-cols-2",
  );

  React.useEffect(() => {
    const today = startOfToday();
    // SuperFine can't deliver same-day. Default to the next service day whose
    // cutoff hasn't passed — that's tomorrow at the earliest, and auto-shifts
    // forward if tomorrow's cutoff is already gone or it's a weekend/holiday.
    const open = nextOpenDays(toISODate(today), 8);
    const firstOpen = open[0] ?? nextServiceDays(today, MULTI_DAY_NUMS, 1).map(toISODate)[0] ?? "";
    setSelectedDate(firstOpen);
    setActiveDate(firstOpen);
    const week = nextServiceDays(today, MULTI_DAY_NUMS, 3).map(toISODate);
    setRangeStart(week[0] ?? "");
    setRangeEnd(week[week.length - 1] ?? "");

    // Editing a placed order takes precedence: focus one-day mode on the edited
    // day so the "Select from full menu" hand-off lands on the right menu.
    const editing = useUiStore.getState().editingOrder;
    if (editing) {
      setMode("single");
      setSelectedDate(editing.date);
      setActiveDate(editing.date);
    } else {
      // Keep multi-day mode active if the cart already holds a multi-day order:
      // resume the day-by-day plan (and its "days remaining" prompt) spanning the
      // cart's days, instead of resetting to one-day mode on every return to /menu.
      const cartDates = useCartStore.getState().dates();
      if (cartDates.length > 1) {
        setMode("multi");
        setRangeChosen(true);
        setRangeStart(cartDates[0]);
        setRangeEnd(cartDates[cartDates.length - 1]);
        setActiveDate(cartDates[0]);
      }
    }
    setMounted(true);
  }, []);

  // Hide the attached box on scroll-down, show it on scroll-up (and near the top).
  React.useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    let locked = false;
    let lockTimer: ReturnType<typeof setTimeout> | undefined;

    function apply(next: boolean) {
      if (boxCollapsedRef.current === next) return;
      boxCollapsedRef.current = next;
      setBoxCollapsed(next);
      // Collapsing: clip overflow immediately. Expanding: restore on transition end.
      if (next) setBoxOverflowVisible(false);
      // Lock out further toggles while the slide + reflow settle. Collapsing the
      // header shifts content above the viewport, so the browser's scroll
      // anchoring nudges scrollY — without this lock that feeds back and the box
      // oscillates (the glitch). After it settles we re-baseline lastY.
      locked = true;
      if (lockTimer) clearTimeout(lockTimer);
      lockTimer = setTimeout(() => {
        locked = false;
        lastY = window.scrollY;
      }, 380);
    }
    function update() {
      ticking = false;
      if (locked) return;
      const y = window.scrollY;
      if (y <= 8) apply(false);
      else if (y > lastY + 6 && y > 96) apply(true);
      else if (y < lastY - 6) apply(false);
      lastY = y;
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (lockTimer) clearTimeout(lockTimer);
    };
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
  // The plan is the union of the chosen range and any day that already has cart
  // items — so deleting the last item from a day keeps that day selected, and
  // the cart still prompts the user to fill it before checkout.
  React.useEffect(() => {
    const planned =
      mode === "multi" && rangeChosen
        ? Array.from(new Set([...rangeDays, ...cart.dates()])).sort()
        : [];
    setPlannedDays(planned);
  }, [mode, rangeChosen, rangeDays, cart, setPlannedDays]);

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

  // Branded category tags for the current menu type (all 9 show for Individual;
  // Family shows the subset that has family items). Day-limited categories still
  // appear — picking one on a day it isn't served shows the empty state.
  const availableCategories = React.useMemo<string[]>(() => categoriesForType(menuType), [menuType]);

  const dayMenu = React.useMemo(() => {
    if (!day) return [];
    const weekday = isoWeekday(fromISODate(day));
    // Menu fetch keys off (menu type × date) — both mandatory.
    let items = menuFor(menuType, weekday);
    // Branded category tag (ignored if it isn't in this menu — e.g. after a
    // type/day switch — so the grid never blanks out unexpectedly).
    if (category && availableCategories.includes(category)) {
      items = items.filter((i) => menuCategory(i) === category);
    }
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
    // Allergens: the employee's saved allergens are ALWAYS hidden (never shown,
    // not greyed), plus any extra allergens chosen in the filter.
    const avoid = [...me.allergens, ...allergens];
    if (avoid.length) items = items.filter((i) => !itemHasAnyAllergen(i, avoid));
    // Dietary: show only items matching every selected preference.
    if (diets.length) items = items.filter((i) => diets.every((d) => (i.tags as string[]).includes(d)));
    return items;
  }, [day, menuType, category, availableCategories, query, cuisine, priceMax, allergens, diets]);

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

  // Editing a placed order: picking a meal opens a confirm dialog ("change from
  // X to this item?"). On confirm we drop edit mode and return to My Orders with
  // a success toast — no cart, no banner.
  async function requestChange(item: MenuItem) {
    if (!editingOrder) return;
    const ok = await confirm({
      title: "Change your meal?",
      description: `Change from ${editingOrder.originalItemName} to ${item.name} for ${editingOrder.dateLabel}?`,
      confirmLabel: "Confirm change",
    });
    if (!ok) return;
    clearEditingOrder();
    toast.success("Order updated", `${editingOrder.originalItemName} → ${item.name} for ${editingOrder.dateLabel}.`);
    router.push("/orders");
  }

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-full" />
        <Skeleton className="h-16 rounded-2xl" />
        <div className={gridCols}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const cartCount = cart.count();
  const cartTotal = cart.subtotal();
  const cartOwed = cart.totalEmployeePaid();

  // Single-day delivery-date framing (next 12 days for the picker; service days
  // before cutoff are selectable, everything else is greyed with a reason).
  const datePickerDays = Array.from({ length: 12 }, (_, i) => {
    const d = addDays(startOfToday(), i + 1); // start tomorrow — never same-day
    const iso = toISODate(d);
    let disabled = false;
    let reason = "";
    if (isHoliday(iso)) {
      disabled = true;
      reason = HOLIDAYS[iso] ?? "Holiday";
    } else if (!isServiceDay(iso)) {
      disabled = true;
      reason = "Weekend";
    } else if (isCutoffPassed(iso)) {
      disabled = true;
      reason = "Cutoff passed";
    }
    return { iso, date: d, disabled, reason };
  });

  // Cutoff prompt for the selected single day.
  const selDateObj = selectedDate ? fromISODate(selectedDate) : null;
  const cutoff = selectedDate ? cutoffFor(selectedDate) : null;
  const msToCutoff = cutoff ? cutoff.getTime() - demoNow().getTime() : 0;
  // Cutoff urgency for the selected single day. "Soon" (≤ 6h left) surfaces a
  // live "N to cutoff" countdown flag; the final 2h escalate it to a red alarm.
  const cutoffSoon = msToCutoff > 0 && msToCutoff <= 6 * 60 * 60 * 1000;
  const cutoffUrgent = msToCutoff > 0 && msToCutoff < 2 * 60 * 60 * 1000;
  const cutoffTimeLabel = cutoff
    ? cutoff.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";
  const cutoffWeekday = cutoff ? WEEKDAY_LONG[cutoff.getDay()] : "";
  const deliveryWeekday = selDateObj ? WEEKDAY_LONG[selDateObj.getDay()] : "";
  const isFamily = menuType === "family_style";
  // An attached box hangs off the bottom of the header card: the "Ordering for"
  // row in one-day mode, or the day strip in multi-day mode.
  // While editing a placed order the date is fixed, so the whole date box (and
  // its "Change date" control) is hidden — the editing header shows the day.
  const oneDayBoxOpen = !editingOrder && mode === "single" && Boolean(selectedDate);
  const attachedOpen = !editingOrder && (oneDayBoxOpen || daysBoxOpen);

  // One-day / Multi-day mode segments — bare buttons that live INSIDE the unified
  // control bar (alongside the date picker), so the whole thing reads as one
  // connected pill rather than separate controls.
  const modeSegments = (
    <>
      {[
        { id: "single", label: "One day" },
        { id: "multi", label: "Multiple days" },
      ].map((t) => {
        const active = mode === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              const m = t.id as Mode;
              setMode(m);
              // Switching to multi-day opens the date picker straight away.
              if (m === "multi" && !rangeChosen) setRangePickerOpen(true);
            }}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="space-y-5 pb-4">
      {/* Start an order — date selection. The sticky wrapper pins flush to the
          topbar with a solid background so nothing shows through the float gap,
          while the inner card sits below it with a shadow (floating look). */}
      <div className="sticky top-16 z-20 bg-background pb-1 pt-2">
      {/* One shadow on the whole card so the attached box never gets the header
          card's drop shadow cast onto it (which read as a gradient). */}
      <div className="relative z-10 rounded-2xl shadow-raised">
      <section
        className={cn(
          "relative z-10 rounded-2xl border border-border bg-card p-4 sm:p-5",
          attachedOpen && !boxCollapsed && "rounded-b-none",
        )}
      >
        {editingOrder ? (
          // Editing a placed order: a plain heading (the topbar reads "Changing
          // Order" and the cards show the change icon; picking one confirms).
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Choose a replacement meal</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Pick a new meal for <strong className="text-foreground">{editingOrder.dateLabel}</strong> —
              you&apos;ll confirm the change.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Hi {me.firstName}, what would you like to eat?
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {program.company} covers {formatCurrency(program.subsidyPerDay)} a day.
              </p>
            </div>
            {/* Prominent meal-style toggle (was a dropdown in the filter bar). */}
            <Tabs
              tabs={[
                { id: "individual", label: "Individual" },
                { id: "family_style", label: "Family Style" },
              ]}
              value={menuType}
              onValueChange={(v) => setMenuType(v as OrderType)}
            />
          </div>
        )}

        {/* Filter bar — search + Meal Style / Allergens / Dietary / Cuisine /
            Price, separated by vertical dividers. */}
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

      </section>

      {/* Attached box under the header card — one-day "Ordering for" row, or the
          multi-day day strip. Collapses on scroll-down, expands on scroll-up via a
          grid-rows slide; clips overflow mid-slide so it tucks under the card. */}
      {attachedOpen ? (
        <div
          className={cn(
            "grid transition-all duration-300 ease-out",
            boxCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
          )}
          onTransitionEnd={() => {
            if (!boxCollapsedRef.current) setBoxOverflowVisible(true);
          }}
        >
          <div className={cn("min-h-0", boxOverflowVisible ? "overflow-visible" : "overflow-hidden")}>
            <div className="rounded-b-2xl border border-t-0 border-border bg-card px-4 py-3 sm:px-5">
              {oneDayBoxOpen ? (
                // Unified control bar: [ One day | Multiple days | 📅 date ▾ ] all
                // in one connected pill, with the cutoff as a quiet helper beside it.
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
                  <div
                    className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-sm"
                    role="tablist"
                    aria-label="Order length"
                  >
                    {modeSegments}
                    <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />
                    <DatePickerDropdown
                      days={datePickerDays}
                      selected={selectedDate}
                      onSelect={(iso) => {
                        setSelectedDate(iso);
                        setActiveDate(iso);
                      }}
                      renderTrigger={({ open, toggle }) => (
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={open}
                          onClick={toggle}
                          className={cn(
                            "flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-teal-deep transition-colors",
                            open ? "bg-teal-wash" : "hover:bg-teal-wash",
                          )}
                        >
                          <CalendarDays className="size-4 shrink-0 text-primary" />
                          <span className="truncate">{formatDayLong(fromISODate(selectedDate))}</span>
                          <ChevronDown
                            className={cn("size-4 shrink-0 text-primary transition-transform", open && "rotate-180")}
                          />
                        </button>
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "flex min-w-0 items-center gap-1.5 text-2xs",
                      !isFamily && cutoffUrgent
                        ? "font-semibold text-danger"
                        : !isFamily && cutoffSoon
                          ? "font-semibold text-coral-deep"
                          : "text-muted-foreground",
                    )}
                  >
                    {!isFamily && cutoffSoon ? <AlarmClock className="size-3.5 shrink-0" /> : null}
                    <span className="truncate">
                      {isFamily
                        ? "Order 72 hours ahead"
                        : cutoffSoon
                          ? `${remainingLabel(msToCutoff)} left to order`
                          : `Order by ${cutoffTimeLabel} ${cutoffWeekday}`}
                    </span>
                  </span>
                </div>
              ) : (
                <div>
                  {/* Same unified bar for multi-day; the day strip sits below. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
                    <div
                      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-sm"
                      role="tablist"
                      aria-label="Order length"
                    >
                      {modeSegments}
                      <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />
                      <button
                        type="button"
                        onClick={() => setRangePickerOpen(true)}
                        className="flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-teal-deep transition-colors hover:bg-teal-wash"
                      >
                        <CalendarRange className="size-4 shrink-0 text-primary" />
                        <span className="truncate">
                          {formatDay(fromISODate(rangeStart))} – {formatDay(fromISODate(rangeEnd))}
                        </span>
                        <ChevronDown className="size-4 shrink-0 text-primary" />
                      </button>
                    </div>
                    <span className="min-w-0 truncate text-2xs font-semibold text-muted-foreground">
                      {daysAdded}/{rangeDays.length} days added
                    </span>
                  </div>

                <div className="mt-3">
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
                  <div className="mt-2.5">
                    <Button variant="teal" block onClick={openCart}>
                      <Check className="size-4" /> All {rangeDays.length} days added · Review cart
                    </Button>
                  </div>
                ) : null}
              </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      </div>

      {/* Category tags — branded SFK sections, horizontally scrollable. */}
      {availableCategories.length ? (
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryChip active={!category} onClick={() => setCategory("")}>
            All
          </CategoryChip>
          {availableCategories.map((c) => (
            <CategoryChip key={c} active={category === c} onClick={() => setCategory(category === c ? "" : c)}>
              {c}
            </CategoryChip>
          ))}
        </div>
      ) : null}

      </div>

      {/* Promo push — sits under the category tags, above the grid. Hidden while
          changing a placed order. */}
      {!editingOrder ? <PromoBanner /> : null}

      {/* Menu grid */}
      {dayMenu.length ? (
        <div className={gridCols}>
          {dayMenu.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              inCart={inCartFor(item.id)}
              showPrice={program.showPrices}
              editing={Boolean(editingOrder)}
              onAdd={() => (editingOrder ? requestChange(item) : quickAdd(item))}
              onCustomize={() => (editingOrder ? requestChange(item) : handleAdd(item))}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">
          No items match your filters for this day. Try clearing filters or pick another day.
        </div>
      )}

      {/* Sticky review-cart bar — mobile only (desktop uses the topbar cart) */}
      {cartCount > 0 && !editingOrder ? (
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
                "relative flex min-w-[60px] flex-col items-center rounded-xl border px-3 py-1.5 transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : cell.has
                    ? "border-success-border bg-success-bg text-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              <span className="text-2xs font-semibold uppercase">{cell.weekday}</span>
              <span className="font-display text-base font-semibold leading-none">{cell.dayNum}</span>
              <span
                className={cn(
                  "mt-0.5 text-[10px]",
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

interface Promo {
  id: string;
  title: string;
  body: React.ReactNode;
  href: string;
  cta: string;
  image: string;
  alt: string;
}

/** Campaigns shown in the promo carousel; paged two-at-a-time. */
const PROMOS: Promo[] = [
  {
    id: "save10",
    title: "Get 10% off your first order",
    body: (
      <>
        Up to $10 off your share. Code{" "}
        <span className="font-semibold text-teal-deep">SAVE10</span>. Valid this week.
      </>
    ),
    href: "/account",
    cta: "Learn more",
    image: "https://www.themealdb.com/images/media/meals/bqx8mc1782684286.jpg",
    alt: "Fresh harvest salad",
  },
  {
    id: "freedelivery",
    title: "Free delivery on team orders",
    body: (
      <>
        Order for 5+ and delivery is on us. Code{" "}
        <span className="font-semibold text-teal-deep">TEAM5</span>. All month.
      </>
    ),
    href: "/account",
    cta: "Learn more",
    image: "https://www.themealdb.com/images/media/meals/1548772327.jpg",
    alt: "Shared family-style spread",
  },
  {
    id: "newmenu",
    title: "New summer menu is live",
    body: (
      <>
        Fresh seasonal bowls and grills, added this week. Explore what&apos;s new.
      </>
    ),
    href: "/menu",
    cta: "See the menu",
    image: "https://www.themealdb.com/images/media/meals/uttupv1511797099.jpg",
    alt: "Summer grain bowl",
  },
  {
    id: "refer",
    title: "Refer a coworker, get $15",
    body: (
      <>
        You both earn $15 in credit on their first order. Share your link.
      </>
    ),
    href: "/account",
    cta: "Get your link",
    image: "https://www.themealdb.com/images/media/meals/1550441882.jpg",
    alt: "Chef plating a dish",
  },
];

/** One promo card — copy + CTA on the left, food photo on the right. */
function PromoCard({ promo }: { promo: Promo }) {
  return (
    <div className="relative flex items-stretch overflow-hidden rounded-2xl border border-teal-soft bg-teal-wash shadow-card">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-5 pl-5 pr-3 sm:pl-6">
        <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-teal-deep sm:text-xl">
          {promo.title}
        </h3>
        <p className="text-[13px] leading-snug text-teal-deep/75">{promo.body}</p>
        <Link
          href={promo.href}
          className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-teal-deep px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary"
        >
          {promo.cta} <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Full-bleed real food photo on the right (DoorDash-style promo image). */}
      <FoodPhoto
        src={promo.image}
        alt={promo.alt}
        className="hidden w-[38%] max-w-[220px] shrink-0 self-stretch sm:flex"
        iconClassName="size-10"
      />
    </div>
  );
}

/**
 * Top promo carousel — seasonal / campaign menu pushes shown two cards at a
 * time. Left/right arrows page through {@link PROMOS}; edit that list to run
 * different promotions.
 */
function PromoBanner() {
  const perPage = 2;
  const pageCount = Math.ceil(PROMOS.length / perPage);
  const [page, setPage] = React.useState(0);

  const canLeft = page > 0;
  const canRight = page < pageCount - 1;
  const visible = PROMOS.slice(page * perPage, page * perPage + perPage);

  return (
    <div className="relative">
      {/* Two-card row (one per column on mobile, two on sm+). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
      </div>

      {/* Move arrows — page left/right through the promos. */}
      {pageCount > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous promotions"
            disabled={!canLeft}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="absolute -left-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-raised transition hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next promotions"
            disabled={!canRight}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="absolute -right-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-raised transition hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight className="size-5" />
          </button>

          {/* Page dots. */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to promotions page ${i + 1}`}
                aria-current={i === page}
                onClick={() => setPage(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === page ? "w-4 bg-teal-deep" : "w-1.5 bg-teal-deep/30 hover:bg-teal-deep/50",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Human "time left until cutoff" — e.g. "2 hours", "1 hour 20 min", "15 minutes". */
function remainingLabel(ms: number) {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins >= 120) return `${Math.round(mins / 60)} hours`;
  if (mins >= 60) {
    const rem = mins % 60;
    return rem ? `1 hour ${rem} min` : "1 hour";
  }
  return `${mins} minutes`;
}

/** A branded category tag chip (single-select, with an "All" reset). */
function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-card"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

interface DateOption {
  iso: string;
  date: Date;
  disabled: boolean;
  reason: string;
}

/**
 * Themed single-day picker. Shows upcoming calendar days; service days before
 * cutoff are selectable, weekends/holidays/past-cutoff days are greyed with a
 * reason. Matches the site dropdown style (cream surface, teal highlight).
 */
function DatePickerDropdown({
  days,
  selected,
  onSelect,
  renderTrigger,
}: {
  days: DateOption[];
  selected: string;
  onSelect: (iso: string) => void;
  /** Custom trigger; falls back to the default "Change date" pill when absent. */
  renderTrigger?: (o: { open: boolean; toggle: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      {renderTrigger ? (
        renderTrigger({ open, toggle: () => setOpen((o) => !o) })
      ) : (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-[13px] font-semibold text-teal-deep shadow-sm transition-colors",
            open ? "border-primary ring-2 ring-ring/30" : "border-border hover:border-primary/40 hover:bg-teal-wash",
          )}
        >
          <CalendarDays className="size-4 text-primary" /> Change date
          <ChevronDown className={cn("size-4 text-primary transition-transform", open && "rotate-180")} />
        </button>
      )}

      {open ? (
        <MiniCalendar
          days={days}
          selected={selected}
          onSelect={(iso) => {
            onSelect(iso);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Small month-calendar popover for the single-day picker. Only the upcoming
 * service days before cutoff are pickable; weekends, holidays and past-cutoff
 * days are greyed (with their reason on hover). You can pick exactly one day.
 */
function MiniCalendar({
  days,
  selected,
  onSelect,
}: {
  days: DateOption[];
  selected: string;
  onSelect: (iso: string) => void;
}) {
  const byIso = React.useMemo(() => {
    const m = new Map<string, DateOption>();
    for (const d of days) m.set(d.iso, d);
    return m;
  }, [days]);

  // First and last day the window covers — bounds month navigation.
  const firstIso = days[0]?.iso ?? "";
  const lastIso = days[days.length - 1]?.iso ?? "";

  // Open on the selected date's month, else the first selectable day's month.
  const anchor = selected
    ? fromISODate(selected)
    : days.find((d) => !d.disabled)?.date ?? days[0]?.date ?? startOfToday();
  const [view, setView] = React.useState(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1));

  const year = view.getFullYear();
  const month = view.getMonth();
  const monthStartIso = toISODate(new Date(year, month, 1));
  const monthEndIso = toISODate(new Date(year, month + 1, 0));
  const canPrev = Boolean(firstIso) && firstIso < monthStartIso;
  const canNext = Boolean(lastIso) && lastIso > monthEndIso;

  // Calendar cells: leading blanks to align the 1st, then each day of the month.
  const leading = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  return (
    <div
      role="dialog"
      aria-label="Choose a delivery date"
      className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border bg-card p-3 shadow-raised"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="rounded-lg p-1 text-primary transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-[13px] font-semibold text-foreground">
          {view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="rounded-lg p-1 text-primary transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_SHORT.map((w) => (
          <span key={w} className="py-1 text-center text-2xs font-semibold text-muted-foreground">
            {w[0]}
          </span>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <span key={`blank-${i}`} />
          ) : (
            (() => {
              const iso = toISODate(d);
              const opt = byIso.get(iso);
              const selectable = Boolean(opt) && !opt!.disabled;
              const active = iso === selected;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!selectable}
                  title={opt?.disabled ? opt.reason : undefined}
                  aria-pressed={active}
                  onClick={() => selectable && onSelect(iso)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg text-[13px] font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : selectable
                        ? "text-foreground hover:bg-teal-wash"
                        : "cursor-not-allowed text-muted-foreground/40",
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })()
          ),
        )}
      </div>
    </div>
  );
}
