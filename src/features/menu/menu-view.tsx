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
  Replace,
  X,
  ArrowRight,
  Sparkles,
  BadgePercent,
  Truck,
  Gift,
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
} from "@/lib/dates";
import {
  nextOpenDays,
  isCutoffPassed,
  isServiceDay,
  isHoliday,
  isTooSoon,
  earliestDeliveryDate,
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

  const cart = useCartStore();
  const router = useRouter();
  const setActiveOrderDate = useUiStore((s) => s.setActiveOrderDate);
  const setPlannedDays = useUiStore((s) => s.setPlannedDays);
  const openCart = useUiStore((s) => s.openCart);
  const cartOpen = useUiStore((s) => s.cartOpen);
  const rangePickerRequested = useUiStore((s) => s.rangePickerRequested);
  const clearRangePicker = useUiStore((s) => s.clearRangePicker);
  const focusDayRequested = useUiStore((s) => s.focusDayRequested);
  const clearFocusDay = useUiStore((s) => s.clearFocusDay);
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
    // Default the multi-day range to the first *orderable* day onward, so the
    // pre-selected range never starts on a red (past-cutoff) day.
    const rangeAnchor = firstOpen ? fromISODate(firstOpen) : today;
    const week = nextServiceDays(rangeAnchor, MULTI_DAY_NUMS, 3).map(toISODate);
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
      // Keep multi-day mode active if a multi-day plan is in flight: resume the
      // day-by-day plan (and its "days remaining" prompt) spanning the planned
      // days, instead of resetting to one-day mode on every return to /menu. The
      // plan is the union of any days the cart already holds and the planned days
      // published by the store — so days picked but not yet filled survive too.
      const ui = useUiStore.getState();
      const planDays = Array.from(
        new Set([...useCartStore.getState().dates(), ...ui.plannedDays]),
      ).sort();
      if (planDays.length > 1) {
        setMode("multi");
        setRangeChosen(true);
        setRangeStart(planDays[0]);
        setRangeEnd(planDays[planDays.length - 1]);
        // Focus the day the user asked to order for (e.g. from an empty cart day),
        // falling back to the first planned day.
        setActiveDate(planDays.includes(ui.activeOrderDate) ? ui.activeOrderDate : planDays[0]);
      }
    }
    setMounted(true);
  }, []);

  // Resolve the multi-day range into service days (weekends auto-skipped).
  // Auto-selection never lands on a red day: holidays, already-passed days and
  // any weekday whose order cutoff has passed are dropped from the range.
  const rangeDays = React.useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const start = fromISODate(rangeStart);
    const end = fromISODate(rangeEnd);
    if (end < start) return [];
    const todayISO = toISODate(startOfToday());
    return serviceDaysInRange(start, end, MULTI_DAY_NUMS)
      .map(toISODate)
      .filter((iso) => iso >= todayISO && !isHoliday(iso) && !isCutoffPassed(iso, menuType));
  }, [rangeStart, rangeEnd, menuType]);

  // Keep the active multi-day tab valid.
  React.useEffect(() => {
    if (mode === "multi" && rangeDays.length && !rangeDays.includes(activeDate)) {
      setActiveDate(rangeDays[0]);
    }
  }, [mode, rangeDays, activeDate]);

  // Meal style drives the lead window (individual 1 day, family 3 days). When it
  // changes, if the selected single day is now too soon / closed, jump forward
  // to the first day that's actually orderable for this style. Editing a placed
  // order pins the date, so leave that alone.
  React.useEffect(() => {
    if (editingOrder || mode !== "single" || !selectedDate) return;
    const invalid =
      !isServiceDay(selectedDate) ||
      isHoliday(selectedDate) ||
      isTooSoon(selectedDate, menuType) ||
      isCutoffPassed(selectedDate, menuType);
    if (!invalid) return;
    const next = nextOpenDays(toISODate(startOfToday()), 1, menuType)[0];
    if (next) {
      setSelectedDate(next);
      setActiveDate(next);
    }
  }, [menuType, selectedDate, mode, editingOrder]);

  // Same guard for the multi-day range start. The start can fall on a red
  // past-cutoff day (e.g. after switching to family-style, whose 72h cutoff
  // closes more near-term days than the range was first built for, or when
  // resuming an older plan). This is NOT gated on the committed mode: the range
  // is previewed in the picker's "Multi Days" tab even while single day is the
  // committed mode, and a range endpoint renders as selected (blue) *over* the
  // red cutoff styling — so a stale start would show a red day pre-selected.
  // Snap it forward to the first orderable service day for the current style.
  React.useEffect(() => {
    if (!rangeStart) return;
    const invalid =
      !isServiceDay(rangeStart) ||
      isHoliday(rangeStart) ||
      isTooSoon(rangeStart, menuType) ||
      isCutoffPassed(rangeStart, menuType);
    if (!invalid) return;
    const open = nextOpenDays(toISODate(startOfToday()), 3, menuType);
    if (!open.length) return;
    setRangeStart(open[0]);
    // Keep a real multi-day span: only preserve the old end if it's still past
    // the new start, otherwise extend to the last of the next orderable days.
    setRangeEnd((prev) => (prev && prev > open[0] ? prev : open[open.length - 1]));
  }, [menuType, rangeStart]);

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

  // "Order for this day" (from an empty cart day) asks us to focus that exact day.
  // Works even when the menu is already mounted (cart opened as a side panel), so
  // the day strip's active tab follows the day the user tapped.
  React.useEffect(() => {
    if (!focusDayRequested) return;
    const planDays = Array.from(
      new Set([...cart.dates(), ...useUiStore.getState().plannedDays, focusDayRequested]),
    ).sort();
    if (planDays.length > 1) {
      setMode("multi");
      setRangeChosen(true);
      setRangeStart(planDays[0]);
      setRangeEnd(planDays[planDays.length - 1]);
    }
    setActiveDate(focusDayRequested);
    setSelectedDate(focusDayRequested);
    clearFocusDay();
  }, [focusDayRequested, cart, clearFocusDay]);

  // Multi-day progress.
  const daysBoxOpen = mode === "multi" && rangeChosen && rangeDays.length > 0;
  const daysAdded = rangeDays.filter((d) => cart.itemsForDate(d).length > 0).length;
  const daysRemaining = rangeDays.length - daysAdded;
  // Whole-plan roll-up shown once under the day strip (replaces the per-day
  // "You pay" / "added" labels that used to sit on each day card).
  const planTotal = rangeDays.reduce((s, d) => s + cart.dayTotal(d), 0);
  const planItemCount = rangeDays.reduce(
    (s, d) => s + cart.itemsForDate(d).reduce((n, l) => n + l.qty, 0),
    0,
  );

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
    if (priceMax) items = items.filter((i) => i.price <= Number(priceMax));
    // Allergens: the employee's saved allergens are ALWAYS hidden (never shown,
    // not greyed), plus any extra allergens chosen in the filter.
    const avoid = [...me.allergens, ...allergens];
    if (avoid.length) items = items.filter((i) => !itemHasAnyAllergen(i, avoid));
    // Dietary: show only items matching every selected preference.
    if (diets.length) items = items.filter((i) => diets.every((d) => (i.tags as string[]).includes(d)));
    return items;
  }, [day, menuType, category, availableCategories, query, priceMax, allergens, diets]);

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

  // Real-time day classification shared by both calendar tabs. Weekends and
  // holidays are *structural* closures (greyed). A weekday whose order cutoff
  // has already passed is a *time* closure (red) with an explanation — this
  // covers today (same-day is never orderable) and tomorrow once today's cutoff
  // passes. Days before today are simply greyed. Individual meals close 4 PM the
  // day before delivery (~24h); family-style closes 72h before delivery.
  const todayISO = toISODate(startOfToday());
  const dayInfo = (
    iso: string,
  ): { selectable: boolean; cutoff: boolean; reason: string } => {
    if (!isServiceDay(iso))
      return { selectable: false, cutoff: false, reason: "Weekends are closed" };
    if (isHoliday(iso))
      return { selectable: false, cutoff: false, reason: HOLIDAYS[iso] ?? "Holiday" };
    if (iso < todayISO)
      return { selectable: false, cutoff: false, reason: "This day has passed" };
    if (isCutoffPassed(iso, menuType)) {
      const reason =
        iso === todayISO
          ? "Same-day ordering is closed"
          : menuType === "family_style"
            ? "Order cutoff passed — family-style closes 72 hours before delivery"
            : "Order cutoff passed — closes 4 PM the day before delivery";
      return { selectable: false, cutoff: true, reason };
    }
    return { selectable: true, cutoff: false, reason: "" };
  };

  // Service days in a range that are actually orderable — drops red days
  // (past cutoff / holidays / past) so the range never auto-selects one.
  const openServiceDays = (startISO: string, endISO: string) =>
    serviceDaysInRange(fromISODate(startISO), fromISODate(endISO), MULTI_DAY_NUMS)
      .map(toISODate)
      .filter((iso) => dayInfo(iso).selectable);

  // Single-day picker window: today plus the next two weeks, each classified by
  // dayInfo (today & past-cutoff days show red; weekends/holidays grey).
  const datePickerDays = Array.from({ length: 15 }, (_, i) => {
    const d = addDays(startOfToday(), i);
    const iso = toISODate(d);
    const info = dayInfo(iso);
    return { iso, date: d, disabled: !info.selectable, cutoff: info.cutoff, reason: info.reason };
  });

  // Earliest orderable delivery date for the current meal style — feeds the
  // range picker's lead window (individual +1 day, family +3 days).
  const earliestISO = toISODate(earliestDeliveryDate(menuType));

  // The multi-day day strip hangs off the bottom of the header card. (The mode
  // toggle and date picker now live up in the header beside the meal-style tabs.)
  // While editing a placed order the date is fixed, so the strip is hidden.
  const attachedOpen = !editingOrder && daysBoxOpen;

  // One unified date picker: a single dropdown whose internal "Single day / Date
  // range" toggle lets the user pick either a single delivery date or a Mon–Fri
  // range, without any separate mode segments beside it.
  const datePicker = (
    <UnifiedDatePicker
      mode={mode}
      onModeChange={setMode}
      selectedDate={selectedDate}
      singleDays={datePickerDays}
      onSelectSingle={(iso) => {
        // Switching back to a single day drops every other day's cart items so
        // the cart instantly reflects just this one day (was a multi-day plan).
        if (mode === "multi") cart.retainRange(iso, iso);
        setSelectedDate(iso);
        setActiveDate(iso);
      }}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      rangeDays={rangeDays}
      serviceDayNums={MULTI_DAY_NUMS}
      minISO={earliestISO}
      dayInfo={dayInfo}
      onApplyRange={(start, end) => {
        setRangeStart(start);
        setRangeEnd(end);
        setRangeChosen(true);
        setMode("multi");
        // Drop cart items for days no longer in the range; days still inside it keep theirs.
        cart.retainRange(start, end);
        const days = openServiceDays(start, end);
        if (days[0]) setActiveDate(days[0]);
      }}
    />
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
          attachedOpen && "rounded-b-none",
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
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Hi {me.firstName}, what would you like to eat?
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {program.company} pays {formatCurrency(program.subsidyPerDay)} a day.
              </p>
            </div>
            {/* Meal-style toggle + the order-length / date controls, grouped so
                the date picker sits right beside the Individual / Family tabs. */}
            <div className="flex flex-col gap-2 xl:items-end">
              <div className="flex flex-wrap items-center gap-2.5">
                <Tabs
                  tabs={[
                    { id: "individual", label: "Individual" },
                    { id: "family_style", label: "Family Style" },
                  ]}
                  value={menuType}
                  onValueChange={(v) => setMenuType(v as OrderType)}
                />
                {datePicker}
              </div>
            </div>
          </div>
        )}

        {/* Filter bar — search + Allergens / Dietary / Price, separated by
            vertical dividers. */}
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
            value={priceMax}
            onValueChange={setPriceMax}
            aria-label="Filter by price"
            variant="pill"
            align="right"
            options={PRICE_OPTIONS}
          />
        </div>

      </section>

      {/* Attached box under the header card — the multi-day day strip, tucked
          flush under the header card (always visible, no scroll show/hide). */}
      {attachedOpen ? (
        <div className="rounded-b-2xl border border-t-0 border-border bg-card px-4 py-3 sm:px-5">
          <DayStrip
            cells={rangeDays.map((iso) => {
              const d = fromISODate(iso);
              const items = cart.itemsForDate(iso);
              const count = items.reduce((s, l) => s + l.qty, 0);
              const has = items.length > 0;
              return {
                iso,
                weekday: WEEKDAY_SHORT[d.getDay()],
                dayNum: d.getDate(),
                fullLabel: formatDay(d),
                has,
                total: cart.dayTotal(iso),
                itemCount: count,
                // No per-day "You pay"/"added" indicator — the whole-plan total
                // is rolled up under the strip. Filled days show their count.
                subLabel: has ? `${count} ${count === 1 ? "item" : "items"}` : formatShort(d).split(" ")[0],
              };
            })}
            activeDate={activeDate}
            onSelect={setActiveDate}
          />

          {/* Whole meal-plan roll-up — one total for the entire block. */}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-[13px] text-muted-foreground">
              {daysAdded}/{rangeDays.length} {rangeDays.length === 1 ? "day" : "days"}
              {planItemCount > 0
                ? ` · ${planItemCount} ${planItemCount === 1 ? "item" : "items"}`
                : ""}
            </span>
            <span className="flex items-baseline gap-1.5 text-[13px] text-muted-foreground">
              Meal plan total
              <span className="font-display text-base font-semibold nums text-foreground">
                {formatCurrency(planTotal)}
              </span>
            </span>
          </div>

          {daysRemaining === 0 ? (
            <div className="mt-2.5">
              <Button variant="teal" block onClick={openCart}>
                <Check className="size-4" /> All {rangeDays.length} days added · Review cart
              </Button>
            </div>
          ) : null}
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
          minISO={earliestISO}
          dayInfo={dayInfo}
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
            // Drop cart items for days no longer in the range; days still inside it keep theirs.
            cart.retainRange(start, end);
            const days = openServiceDays(start, end);
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
          <div className="mt-2 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {hover.cell.itemCount} {hover.cell.itemCount === 1 ? "item" : "items"}
              </span>
              <span className="font-semibold nums">{formatCurrency(hover.cell.total)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface Promo {
  id: string;
  /** Short eyebrow badge, e.g. "10% OFF" / "NEW". */
  tag: string;
  /** Icon shown in the eyebrow badge. */
  icon: React.ComponentType<{ className?: string }>;
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
    tag: "10% off",
    icon: BadgePercent,
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
    tag: "Free delivery",
    icon: Truck,
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
    tag: "New",
    icon: Sparkles,
    title: "New summer menu is live",
    body: (
      <>
        Fresh seasonal bowls and grills, added this week. Explore what&apos;s new.
      </>
    ),
    href: "/menu",
    cta: "See the menu",
    image: "https://www.themealdb.com/images/media/meals/rqtxvr1511792990.jpg",
    alt: "Summer grain bowl",
  },
  {
    id: "refer",
    tag: "$15 credit",
    icon: Gift,
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
  const TagIcon = promo.icon;
  return (
    <div className="group relative flex items-stretch overflow-hidden rounded-2xl border border-teal-soft bg-gradient-to-br from-teal-wash via-teal-wash to-teal-soft/70 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-raised">
      {/* Soft decorative glow behind the copy for depth. */}
      <div className="pointer-events-none absolute -left-10 -top-12 size-40 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-5 pl-5 pr-3 sm:pl-6">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-coral px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-white shadow-sm">
          <TagIcon className="size-3" /> {promo.tag}
        </span>
        <h3 className="mt-0.5 font-display text-lg font-bold leading-tight tracking-tight text-teal-deep sm:text-xl">
          {promo.title}
        </h3>
        <p className="text-[13px] leading-snug text-teal-deep/75">{promo.body}</p>
        <Link
          href={promo.href}
          className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-teal-deep px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-primary"
        >
          {promo.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Full-bleed real food photo on the right, fading into the card gradient. */}
      <div className="relative hidden w-[40%] max-w-[220px] shrink-0 self-stretch sm:block">
        <FoodPhoto src={promo.image} alt={promo.alt} className="size-full" iconClassName="size-10" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-teal-wash to-transparent" />
      </div>
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
  /** Closed specifically because its order cutoff has passed → shown in red. */
  cutoff: boolean;
  reason: string;
}

/** Monday-first weekday header for the unified calendar. */
const CAL_COLS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Monday-first month grid (leading/trailing blanks padded to full weeks). */
function calMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // 0 = Monday
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Hover bubble explaining why a calendar day is closed (e.g. "Order cutoff
 * passed…"). Rendered inside a `group` cell wrapper so it reveals on hover even
 * though the day button itself is disabled (disabled buttons don't fire hover).
 */
function DayTooltip({ reason }: { reason: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden w-40 -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-center text-2xs font-medium leading-snug text-background shadow-raised group-hover:block"
    >
      {reason}
      <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground" />
    </span>
  );
}

/**
 * Unified delivery-date picker — a single dropdown that handles BOTH modes.
 *
 * An in-menu "Single day / Date range" toggle switches the calendar between:
 *  - Single day: tap a service day (before its cutoff) to order for that day;
 *    weekends/holidays/past-cutoff days are greyed with a reason. Commits and
 *    closes on tap.
 *  - Date range: shadcn-style two-tap range (start → end) with a hover preview
 *    and a continuous teal band; "Apply" commits the Mon–Fri range.
 *
 * The trigger label reflects the currently *committed* selection; switching the
 * in-menu toggle only previews — nothing changes until you tap a day (single)
 * or press Apply (range).
 */
function UnifiedDatePicker({
  mode,
  onModeChange,
  selectedDate,
  singleDays,
  onSelectSingle,
  rangeStart,
  rangeEnd,
  rangeDays,
  serviceDayNums,
  minISO,
  dayInfo,
  onApplyRange,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  selectedDate: string;
  singleDays: DateOption[];
  onSelectSingle: (iso: string) => void;
  rangeStart: string;
  rangeEnd: string;
  rangeDays: string[];
  serviceDayNums: number[];
  /** Earliest selectable delivery date (ISO) for the range tab's lead window. */
  minISO: string;
  /** Per-day classification (open / weekend-holiday-past / past-cutoff) for the
   *  range tab — closed days grey out, cutoff days show red with a reason. */
  dayInfo: (iso: string) => { selectable: boolean; cutoff: boolean; reason: string };
  onApplyRange: (startISO: string, endISO: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  // Which sub-mode the open dropdown is previewing (defaults to the committed mode).
  const [tab, setTab] = React.useState<Mode>(mode);
  // Draft range endpoints — committed to the parent only on Apply.
  const [dStart, setDStart] = React.useState(rangeStart);
  const [dEnd, setDEnd] = React.useState(rangeEnd);
  const [hovered, setHovered] = React.useState("");
  const [cursor, setCursor] = React.useState(() => {
    const a = fromISODate(selectedDate || rangeStart || toISODate(startOfToday()));
    return { y: a.getFullYear(), m: a.getMonth() };
  });
  const ref = React.useRef<HTMLDivElement>(null);

  const singleByIso = React.useMemo(() => {
    const m = new Map<string, DateOption>();
    for (const d of singleDays) m.set(d.iso, d);
    return m;
  }, [singleDays]);

  // Opening resets the preview to the committed state (tab, drafts, month).
  function openMenu() {
    setTab(mode);
    setDStart(rangeStart);
    setDEnd(rangeEnd);
    setHovered("");
    const a = fromISODate((mode === "single" ? selectedDate : rangeStart) || toISODate(startOfToday()));
    setCursor({ y: a.getFullYear(), m: a.getMonth() });
    setOpen(true);
  }

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

  const today = startOfToday();
  const todayISO = toISODate(today);
  const cells = calMatrix(cursor.y, cursor.m);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Range highlight bounds: committed end, else hover preview past the start.
  const lo = dStart;
  const hi = dEnd || (dStart && hovered && hovered > dStart ? hovered : dStart);
  const hasRange = !!lo && !!hi && hi !== lo;
  const draftEnd = dEnd || dStart;
  const draftCount = React.useMemo(() => {
    if (!dStart) return 0;
    // Preview count mirrors the committed range: red days are never counted.
    return serviceDaysInRange(fromISODate(dStart), fromISODate(draftEnd), serviceDayNums)
      .map(toISODate)
      .filter((iso) => dayInfo(iso).selectable).length;
  }, [dStart, draftEnd, serviceDayNums, dayInfo]);

  function pickRange(iso: string) {
    if (!dStart || (dStart && dEnd)) {
      setDStart(iso);
      setDEnd("");
    } else if (iso < dStart) {
      setDStart(iso);
    } else {
      setDEnd(iso);
    }
  }

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          mode === "single"
            ? `Delivery date: ${formatDayLong(fromISODate(selectedDate))}. Change date`
            : `Delivery dates: ${formatDay(fromISODate(rangeStart))} to ${formatDay(fromISODate(rangeEnd))}, ${rangeDays.length} days. Change dates`
        }
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={cn(
          // py matches the Individual/Family toggle height (its p-1 + border add
          // ~10px around an identically-padded button), keeping the same pill style.
          "flex max-w-full items-center gap-1.5 rounded-full px-3 py-[11px] text-[13px] font-semibold text-teal-deep transition-colors",
          open ? "bg-teal-soft" : "bg-teal-wash hover:bg-teal-soft",
        )}
      >
        {mode === "single" ? (
          <>
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <span className="truncate">{formatDayLong(fromISODate(selectedDate))}</span>
          </>
        ) : (
          <>
            <CalendarRange className="size-4 shrink-0 text-primary" />
            <span className="truncate">{formatDay(fromISODate(rangeStart))}</span>
            <ArrowRight className="size-3.5 shrink-0 text-primary/60" />
            <span className="truncate">{formatDay(fromISODate(rangeEnd))}</span>
            <span className="ml-0.5 shrink-0 rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-teal-deep shadow-sm">
              {rangeDays.length} {rangeDays.length === 1 ? "day" : "days"}
            </span>
          </>
        )}
        <ChevronDown className={cn("size-4 shrink-0 text-primary transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose a delivery date"
          className="absolute right-0 top-full z-50 mt-2 w-[19.5rem] rounded-2xl border border-border bg-card p-3 shadow-raised"
        >
          {/* Single day / Date range toggle — the only mode control now. */}
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-full border border-border bg-muted/40 p-1" role="tablist">
            {[
              { id: "single", label: "Single day" },
              { id: "multi", label: "Multi Days" },
            ].map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id as Mode)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg p-1 text-primary transition-colors hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-[13px] font-semibold text-foreground">{monthLabel}</span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              className="rounded-lg p-1 text-primary transition-colors hover:bg-muted"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-2xs font-semibold uppercase text-muted-foreground">
            {CAL_COLS.map((d, i) => (
              <div key={d} className={cn("pb-1", i >= 5 && "text-muted-foreground/40")}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7" onMouseLeave={() => setHovered("")}>
            {cells.map((date, i) => {
              if (!date) return <div key={`x${i}`} />;
              const iso = toISODate(date);
              const isToday = iso === todayISO;

              if (tab === "single") {
                // Selectability keyed off the same cutoff-aware window as before;
                // days outside the upcoming window simply aren't pickable.
                const opt = singleByIso.get(iso);
                const selectable = Boolean(opt) && !opt!.disabled;
                const active = iso === selectedDate;
                // A day closed because its order cutoff has passed — shown in a
                // muted red (distinct from the plain grey of weekends/holidays).
                const cutoffClosed = Boolean(opt?.cutoff);
                return (
                  <div
                    key={iso}
                    className={cn(
                      "relative flex items-center justify-center py-0.5",
                      // Disabled buttons don't fire hover, so the reason tooltip
                      // lives on the (enabled) wrapper and reveals on group-hover.
                      opt?.disabled && opt.reason && "group",
                    )}
                  >
                    {opt?.disabled && opt.reason ? <DayTooltip reason={opt.reason} /> : null}
                    <button
                      type="button"
                      disabled={!selectable}
                      aria-pressed={active}
                      aria-label={
                        opt?.disabled
                          ? `${date.getDate()}, ${opt.reason}`
                          : undefined
                      }
                      onClick={() => {
                        if (!selectable) return;
                        onSelectSingle(iso);
                        onModeChange("single");
                        setOpen(false);
                      }}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full text-sm transition-colors",
                        active
                          ? "bg-primary font-semibold text-primary-foreground"
                          : selectable
                            ? "text-foreground hover:bg-teal-wash"
                            : cutoffClosed
                              ? "cursor-not-allowed bg-danger/10 font-semibold text-danger group-hover:bg-danger/20"
                              : "cursor-not-allowed text-muted-foreground/40",
                        isToday && !active && selectable && "ring-1 ring-inset ring-primary/60",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              }

              // Date-range tab: weekends/holidays/past grey out; a weekday past
              // its cutoff shows red with a reason; the rest are selectable.
              const info = dayInfo(iso);
              const disabled = !info.selectable;
              const cutoffClosed = info.cutoff;
              const isStart = !!lo && iso === lo;
              const isEnd = hasRange && iso === hi;
              const inMiddle = hasRange && iso > lo && iso < hi;
              const isEndpoint = isStart || isEnd;
              return (
                <div
                  key={iso}
                  className={cn(
                    "relative flex items-center justify-center py-0.5",
                    disabled && info.reason && "group",
                  )}
                >
                  {disabled && info.reason ? <DayTooltip reason={info.reason} /> : null}
                  {/* Continuous band — skipped on weekends so a range visibly hops them. */}
                  {inMiddle && !disabled ? <span className="absolute inset-y-0.5 inset-x-0 bg-teal-wash" /> : null}
                  {isStart && hasRange ? <span className="absolute inset-y-0.5 left-1/2 right-0 bg-teal-wash" /> : null}
                  {isEnd ? <span className="absolute inset-y-0.5 left-0 right-1/2 bg-teal-wash" /> : null}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => pickRange(iso)}
                    onMouseEnter={() => !disabled && dStart && !dEnd && setHovered(iso)}
                    aria-label={
                      disabled ? `${date.toDateString()}, ${info.reason}` : date.toDateString()
                    }
                    className={cn(
                      "relative z-10 flex size-9 items-center justify-center rounded-full text-sm transition-colors",
                      isEndpoint
                        ? "bg-primary font-semibold text-primary-foreground"
                        : cutoffClosed
                          ? "cursor-not-allowed bg-danger/10 font-semibold text-danger group-hover:bg-danger/20"
                          : disabled
                            ? "cursor-not-allowed text-muted-foreground/40"
                            : inMiddle
                              ? "text-teal-deep"
                              : "text-foreground hover:bg-muted",
                      isToday && !isEndpoint && !inMiddle && !disabled && "ring-1 ring-inset ring-primary/60",
                    )}
                  >
                    {date.getDate()}
                  </button>
                </div>
              );
            })}
          </div>

          {tab === "single" ? (
            <p className="mt-2 text-2xs text-muted-foreground">
              Grey = closed.{" "}
              <span className="rounded bg-danger/10 px-1 font-semibold text-danger">Red</span> = cutoff passed
              (hover to see why).
            </p>
          ) : (
            <>
              <p className="mt-2 text-2xs text-muted-foreground">
                {dStart
                  ? `${formatDay(fromISODate(dStart))} → ${formatDay(fromISODate(draftEnd))} · ${draftCount} ${draftCount === 1 ? "day" : "days"}`
                  : "Tap a start and end day — weekends are skipped."}
              </p>
              <Button
                variant="teal"
                block
                className="mt-2"
                disabled={!dStart}
                onClick={() => {
                  onApplyRange(dStart, draftEnd);
                  setOpen(false);
                }}
              >
                Apply dates
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
