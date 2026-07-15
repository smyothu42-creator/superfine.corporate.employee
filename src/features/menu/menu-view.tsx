"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CalendarRange,
  CalendarDays,
  Replace,
  X,
  ArrowRight,
  Sparkles,
  BadgePercent,
  Truck,
  Gift,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ThemeSelect } from "@/components/ui/theme-select";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { FoodPhoto } from "@/components/menu/food-photo";
import { AddOnModal } from "@/components/menu/add-on-modal";
import { FamilyStyleModal } from "@/components/menu/family-style-modal";
import { CutoffDayTooltip } from "@/components/cutoff/cutoff-day-tooltip";
import { DateRangeModal } from "@/features/menu/date-range-modal";
import {
  menuFor,
  isItemAvailableOn,
  categoriesForType,
  menuCategory,
  allergenOptions,
  dietaryPreferences,
  itemHasAnyAllergen,
  hasRequiredAddOns,
  hasOptionalAddOns,
  isFamilyStyle,
} from "@/data/menu";
import { program } from "@/data/program";
import { useSessionStore } from "@/store/use-session-store";
import { useProfileStore } from "@/store/use-profile-store";
import { useCartStore } from "@/store/use-cart-store";
import { useUiStore } from "@/store/use-ui-store";
import { useOrderEditStore } from "@/store/use-order-edit-store";
import { useOrdersStore } from "@/store/use-orders-store";
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
  weekdayOffset,
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

  // Who's browsing. `null` = guest: retail prices, no company anywhere on screen.
  const account = useSessionStore((s) => s.account);
  const firstName = account?.name?.trim().split(" ")[0] ?? "";

  // Filters
  const [query, setQuery] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  // Branded category tag (e.g. "Stack, Wrap & Roll"). "" = All.
  const [category, setCategory] = React.useState("");
  // Two distinct filters: allergens to AVOID (hide matches) and dietary
  // preferences to REQUIRE (show only matches). Both are backed by the shared
  // profile store, so the menu's chips and Account & Profile's Dietary
  // preferences always mirror each other — editing one updates the other.
  const allergens = useProfileStore((s) => s.allergens);
  const setAllergens = useProfileStore((s) => s.setAllergens);
  const diets = useProfileStore((s) => s.dietary);
  const setDiets = useProfileStore((s) => s.setDietary);

  // Individual meals open the option sheet; family packages open the headcount +
  // quantity configurator. They are never the same sheet.
  const [customizing, setCustomizing] = React.useState<MenuItem | null>(null);
  const [configuring, setConfiguring] = React.useState<MenuItem | null>(null);

  const cart = useCartStore();
  const setActiveOrderDate = useUiStore((s) => s.setActiveOrderDate);
  const setPlannedDays = useUiStore((s) => s.setPlannedDays);
  const openCart = useUiStore((s) => s.openCart);
  const cartOpen = useUiStore((s) => s.cartOpen);
  const rangePickerRequested = useUiStore((s) => s.rangePickerRequested);
  const clearRangePicker = useUiStore((s) => s.clearRangePicker);
  const focusDayRequested = useUiStore((s) => s.focusDayRequested);
  const clearFocusDay = useUiStore((s) => s.clearFocusDay);
  // Editing a placed order: the delivery date is fixed to the order's day(s), so
  // the date picker locks and the auto-snap-forward effects stand down.
  const editingOrderId = useOrderEditStore((s) => s.editingOrderId);
  // The order being edited (stable reference), and its day(s), which the menu
  // date pins to so added meals land on the order's day — never today's default.
  const editOrder = useOrdersStore((s) =>
    editingOrderId ? s.orders.find((o) => o.id === editingOrderId) : undefined,
  );
  const editOrderDays = React.useMemo(
    () => editOrder?.days.map((d) => d.date).sort() ?? [],
    [editOrder],
  );
  // An edit *session* can persist while the user steps out of it to browse — they
  // leave the menu, come back, and the banner offers to resume. Only while the
  // session is *active* (the order's meals are loaded into the cart) does the menu
  // lock to the order's day(s). When paused, the menu is a clean new-order flow —
  // the date picker unlocks and any day is orderable — until "Continue editing"
  // reloads the meals and re-locks the date.
  const editingActive = useOrderEditStore((s) => s.active);
  // DoorDash-style horizontal rows, two per row. The responsive breakpoints key
  // off the *viewport*, which can't see the ~400px the cart side panel carves
  // out of the content area — so two columns while the cart is open cram each
  // card until the meal names clip ("Marg Flatb"). Keep one full-width column
  // whenever the cart is open; two columns only when it's closed.
  const gridCols = cn("grid grid-cols-1 gap-4", cartOpen ? "" : "lg:grid-cols-2");

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

    // The menu always opens in its default state — individual meals, single day.
    // A pending focus-day request (e.g. from the "Change order" flow) is applied
    // by its own effect right after mount.
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
  // to the first day that's actually orderable for this style.
  React.useEffect(() => {
    // While actively editing a placed order the date is locked to the order's
    // day — never snap it forward, even if that day is now past its cutoff.
    if (editingActive || mode !== "single" || !selectedDate) return;
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
  }, [menuType, selectedDate, mode, editingActive]);

  // Same guard for the multi-day range start. The start can fall on a red
  // past-cutoff day (e.g. after switching to family-style, whose 72h cutoff
  // closes more near-term days than the range was first built for, or when
  // resuming an older plan). This is NOT gated on the committed mode: the range
  // is previewed in the picker's "Multi Days" tab even while single day is the
  // committed mode, and a range endpoint renders as selected (blue) *over* the
  // red cutoff styling — so a stale start would show a red day pre-selected.
  // Snap it forward to the first orderable service day for the current style.
  React.useEffect(() => {
    // Locked to the order's day(s) while actively editing — don't shift the range.
    if (editingActive || !rangeStart) return;
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
  }, [menuType, rangeStart, editingActive]);

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
    // While actively editing, the date is driven by the order's day(s) below —
    // ignore any focus request so it can't pull the menu onto a non-order day.
    if (editingActive) {
      clearFocusDay();
      return;
    }
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
  }, [focusDayRequested, cart, clearFocusDay, editingActive]);

  // Editing pins the delivery date to the order's own day(s) — deterministically,
  // so anything added from the menu lands on the day being edited, not today's
  // default. Single-day orders lock one day; multi-day orders keep their range.
  React.useEffect(() => {
    if (!editingActive || editOrderDays.length === 0) return;
    if (editOrderDays.length === 1) {
      setMode("single");
      setSelectedDate(editOrderDays[0]);
      setActiveDate(editOrderDays[0]);
    } else {
      setMode("multi");
      setRangeChosen(true);
      setRangeStart(editOrderDays[0]);
      setRangeEnd(editOrderDays[editOrderDays.length - 1]);
      setSelectedDate(editOrderDays[0]);
      setActiveDate(editOrderDays[0]);
    }
  }, [editingActive, editOrderDays]);

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
    // Two independent dietary systems, applied in priority order:
    //  1. Allergens (negative) — an item containing ANY avoided allergen is
    //     hidden outright. This is checked FIRST and always wins, so a dish that
    //     matches every dietary preference is still hidden if it has an allergen.
    //  2. Dietary preferences (positive) — with any selected, show ONLY items
    //     whose tags include ALL of them. None selected = show everything.
    items = items.filter((i) => {
      if (allergens.length && itemHasAnyAllergen(i, allergens)) return false;
      if (diets.length && !diets.every((d) => (i.tags as string[]).includes(d))) return false;
      return true;
    });
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
    if (isFamilyStyle(item)) {
      setConfiguring(item);
    } else if (hasRequiredAddOns(item) || hasOptionalAddOns(item)) {
      setCustomizing(item);
    } else {
      quickAdd(item);
    }
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

  const cartTotal = cart.subtotal();

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
            ? "Order cutoff passed. Family-style closes 72 hours before delivery"
            : "Order cutoff passed. Closes 4 PM the day before delivery";
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
  const attachedOpen = daysBoxOpen;

  // One unified date picker: a single dropdown whose internal "Single day / Date
  // range" toggle lets the user pick either a single delivery date or a Mon–Fri
  // range, without any separate mode segments beside it. While actively editing a
  // placed order the date is fixed to the order's day(s), so it becomes a locked
  // pill; with the cart closed the user is browsing normally, so it unlocks.
  const datePicker = editingActive ? (
    <LockedDatePill
      mode={mode}
      selectedDate={selectedDate}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
    />
  ) : (
    <UnifiedDatePicker
      mode={mode}
      onModeChange={setMode}
      selectedDate={selectedDate}
      singleDays={datePickerDays}
      onSelectSingle={(iso) => {
        // Switching back to a single day drops every other day's cart items so
        // the cart instantly reflects just this one day (was a multi-day plan).
        if (mode === "multi") {
          cart.retainRange(iso, iso);
          setSelectedDate(iso);
          setActiveDate(iso);
          return;
        }
        // Single → single: retarget the cart to the newly picked day. Menus
        // rotate by weekday, so any meal that isn't served on the new day can't
        // come along — it's dropped and the user is told to pick another.
        if (iso !== selectedDate) {
          const weekday = isoWeekday(fromISODate(iso));
          const dropped = cart.moveDay(selectedDate, iso, (itemId) =>
            isItemAvailableOn(itemId, weekday),
          );
          setSelectedDate(iso);
          setActiveDate(iso);
          const dayLabel = formatDayLong(fromISODate(iso));
          if (dropped.length) {
            toast.warning(
              `${dropped.length === 1 ? "Meal isn't" : "Meals aren't"} available on ${dayLabel}`,
              `${dropped.join(", ")}. This meal is not available for the selected date. Please choose another meal.`,
            );
          } else if (cart.itemsForDate(iso).length > 0) {
            toast.success("Date updated", `Your order now delivers ${dayLabel}.`);
          }
        }
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
      <div className="sticky top-[calc(4rem_+_var(--edit-banner-h,0px))] z-20 bg-background pb-1 pt-2">
      {/* One shadow on the whole card so the attached box never gets the header
          card's drop shadow cast onto it (which read as a gradient). */}
      <div className="relative z-10 rounded-2xl shadow-raised">
      <section
        className={cn(
          "relative z-10 rounded-2xl border border-border bg-card p-4 sm:p-5",
          attachedOpen && "rounded-b-none",
        )}
      >
        {/* The greeting and the meal-style / date controls share one line. The
            controls stay pinned to the opposite edge, and only fall below the
            greeting on genuinely narrow screens. */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {firstName ? `Hi ${firstName}, what` : "What"} would you like to eat?
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Fresh, globally inspired lunches delivered daily.
              </p>
            </div>
            {/* On phones this may wrap: single-day (short label) fits beside the
                tabs on one line, while the wider multi-day range pill drops to
                its own line so nothing overflows. Single line again at sm+. */}
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2.5 md:justify-end">
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

        {/* Filter bar — search + Allergens / Dietary / Price.
            On a phone the three filter pills are ~287px of fixed, unshrinkable
            width, so they can't share a row with the search box — it collapses
            to a sliver. Search takes its own row and the pills scroll under it.
            From `sm` up, `sm:contents` dissolves the wrapper and it's the
            one-line bar with dividers the design intends. */}
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-1.5 shadow-sm sm:flex-row sm:items-center sm:gap-1 sm:rounded-full">
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu…"
              aria-label="Search the menu"
              // text-base on phones: iOS zooms the page in below 16px.
              className="h-10 w-full rounded-full bg-transparent pl-9 pr-3 text-base text-foreground outline-none placeholder:text-muted-foreground/70 sm:h-9 sm:text-sm"
            />
          </div>
          {/* flex-nowrap (not overflow-x-auto): a scroll container clips the
              pills' absolutely-positioned dropdown panels on both axes, so
              they'd open invisibly on phones. The pills shrink on phones (see
              their own sm: breakpoints) so all three stay on one row. */}
          <div className="flex flex-nowrap items-center gap-1 sm:contents">
            <div className="hidden h-6 w-px shrink-0 bg-border sm:block" />
            <MultiSelectFilter
              label="Allergens"
              aria-label="Filter out allergens to avoid"
              options={allergenOptions}
              selected={allergens}
              onChange={setAllergens}
            />
            <div className="hidden h-6 w-px shrink-0 bg-border sm:block" />
            <MultiSelectFilter
              label="Dietary"
              aria-label="Filter by dietary preference"
              options={dietaryPreferences}
              selected={diets}
              onChange={setDiets}
            />
            <div className="hidden h-6 w-px shrink-0 bg-border sm:block" />
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

      {/* Promo push — sits under the category tags, above the grid. */}
      <PromoBanner />

      {/* Menu grid */}
      {dayMenu.length ? (
        <div className={gridCols}>
          {dayMenu.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              inCart={inCartFor(item.id)}
              showPrice={program.showPrices}
              onAdd={() => handleAdd(item)}
              onCustomize={() => handleAdd(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">
          No items match your filters for this day. Try clearing filters or pick another day.
        </div>
      )}

      {customizing ? (
        <AddOnModal
          item={customizing}
          dateLabel={formatDay(fromISODate(day))}
          onClose={() => setCustomizing(null)}
          onConfirm={(combos) => {
            // Each combo is packed as its own meal, so each becomes its own
            // line, carrying however many copies of it were asked for.
            // Identical combos merge on their own inside the cart.
            for (const combo of combos) {
              cart.add({
                date: day,
                itemId: customizing.id,
                name: customizing.name,
                basePrice: customizing.price,
                qty: combo.qty,
                addOns: combo.addOns,
                unitPrice: combo.unitPrice,
                type: customizing.type,
              });
            }
            setCustomizing(null);
            bumpCart();
          }}
        />
      ) : null}

      {configuring ? (
        <FamilyStyleModal
          item={configuring}
          dateLabel={formatDay(fromISODate(day))}
          onClose={() => setConfiguring(null)}
          onConfirm={(guests, servings, totalPrice) => {
            cart.add({
              date: day,
              itemId: configuring.id,
              name: configuring.name,
              basePrice: totalPrice,
              // A family package is one line: the headcount and the split live
              // on the line, so quantity means "how many of this package".
              qty: 1,
              addOns: [],
              unitPrice: totalPrice,
              type: configuring.type,
              guests,
              servings,
            });
            setConfiguring(null);
            bumpCart();
            toast.success(
              `${configuring.name} added`,
              `For ${guests} guests on ${formatDay(fromISODate(day))}.`,
            );
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
                  "mt-0.5 text-[11px]",
                  cell.has && "font-bold",
                  active ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {cell.subLabel}
              </span>
              {/* A finger has no hover, so the day's total — which the summary
                  card below only reveals on mouseover — is printed on the pill
                  itself for touch. Desktop keeps the roomier card. */}
              {cell.has && program.showPrices ? (
                <span
                  className={cn(
                    "text-[11px] font-semibold nums lg:hidden",
                    active ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {formatCurrency(cell.total)}
                </span>
              ) : null}
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
    id: "summerbowls",
    tag: "New",
    icon: Sparkles,
    title: "Try our new summer bowls",
    body: (
      <>
        Fresh seasonal bowls and grills, just added. See what&apos;s new on the menu.
      </>
    ),
    href: "/menu",
    cta: "See the menu",
    image: "https://www.themealdb.com/images/media/meals/rqtxvr1511792990.jpg",
    alt: "Summer grain bowl",
  },
  {
    id: "freedelivery",
    tag: "Limited",
    icon: Truck,
    title: "Free delivery this week only",
    body: (
      <>
        Delivery is on us on every order this week. No code needed.
      </>
    ),
    href: "/menu",
    cta: "Order now",
    image: "https://www.themealdb.com/images/media/meals/1548772327.jpg",
    alt: "Shared family-style spread",
  },
  {
    id: "christmas",
    tag: "Seasonal",
    icon: Gift,
    title: "Christmas specials now available",
    body: (
      <>
        Festive mains and sides, on the menu through the holidays.
      </>
    ),
    href: "/menu",
    cta: "See the menu",
    image: "https://www.themealdb.com/images/media/meals/1550441882.jpg",
    alt: "Holiday feast platter",
  },
  {
    id: "refer",
    tag: "New",
    icon: BadgePercent,
    title: "New referral rewards just launched",
    body: (
      <>
        You both earn $15 in credit on their first order. Share your link.
      </>
    ),
    href: "/account",
    cta: "Get your link",
    image: "https://www.themealdb.com/images/media/meals/bqx8mc1782684286.jpg",
    alt: "Fresh harvest salad",
  },
];

/** One promo card — copy + CTA on the left, food photo on the right. */
function PromoCard({ promo }: { promo: Promo }) {
  return (
    <div className="group relative flex items-stretch overflow-hidden rounded-2xl border border-teal-soft bg-gradient-to-br from-teal-wash via-teal-wash to-teal-soft/70 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-raised">
      {/* Soft decorative glow behind the copy for depth. */}
      <div className="pointer-events-none absolute -left-10 -top-12 size-40 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-5 pl-5 pr-3 sm:pl-6">
        <span className="inline-flex w-fit items-center rounded-full bg-coral px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-white shadow-sm">
          {promo.tag}
        </span>
        {/* Phones: no clamp + smaller font so the whole title shows (no "…");
            single-line clamp at the original size from sm+. */}
        <h3 className="mt-0.5 font-display text-sm font-bold leading-tight tracking-tight text-teal-deep sm:line-clamp-1 sm:text-xl">
          {promo.title}
        </h3>
        <p className="line-clamp-2 text-[13px] leading-snug text-teal-deep/75">{promo.body}</p>
        <Link
          href={promo.href}
          className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-teal-deep px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-primary"
        >
          {promo.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Full-bleed real food photo on the right, fading into the card gradient.
          Shown on every size — including mobile, where the card is a single box. */}
      <div className="relative block w-[38%] max-w-[220px] shrink-0 self-stretch">
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
  // One card per page on mobile (a single full-width box, not two stacked),
  // two on sm+. Mirrors the (max-width: 639px) breakpoint used elsewhere here.
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const perPage = isMobile ? 1 : 2;
  const pageCount = Math.ceil(PROMOS.length / perPage);
  const [page, setPage] = React.useState(0);

  // Keep the page in range when perPage flips across the breakpoint.
  React.useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

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

/** Sunday-first weekday header for the unified calendar. */
const CAL_COLS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Sunday-first month grid (leading/trailing blanks padded to full weeks). */
function calMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = weekdayOffset(first);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
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
/**
 * Read-only date pill shown in place of the picker while editing a placed order.
 * The delivery date is fixed to the order's day(s) — you're changing the meal,
 * not moving the order — so this is a non-interactive label with a lock icon.
 */
function LockedDatePill({
  mode,
  selectedDate,
  rangeStart,
  rangeEnd,
}: {
  mode: Mode;
  selectedDate: string;
  rangeStart: string;
  rangeEnd: string;
}) {
  return (
    <span
      title="You're editing this order — the delivery date is locked to the order's day."
      aria-label={
        mode === "single"
          ? `Delivery date locked to ${formatDayLong(fromISODate(selectedDate))} while editing this order`
          : `Delivery dates locked to ${formatDay(fromISODate(rangeStart))} through ${formatDay(fromISODate(rangeEnd))} while editing this order`
      }
      className="flex max-w-full items-center gap-1 rounded-full bg-muted px-2.5 py-2 text-xs font-semibold text-muted-foreground sm:gap-1.5 sm:px-3 sm:py-[11px] sm:text-[13px]"
    >
      <Lock className="size-3.5 shrink-0" />
      {mode === "single" ? (
        <>
          <span className="truncate sm:hidden">{formatDay(fromISODate(selectedDate))}</span>
          <span className="hidden truncate sm:inline">{formatDayLong(fromISODate(selectedDate))}</span>
        </>
      ) : (
        <>
          <span className="truncate">{formatShort(fromISODate(rangeStart))}</span>
          <ArrowRight className="size-3 shrink-0 sm:size-3.5" />
          <span className="truncate">{formatShort(fromISODate(rangeEnd))}</span>
        </>
      )}
    </span>
  );
}

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
  // Phone placement: the panel is wider than the space left of the trigger, so
  // an `absolute right-0` anchor pushes half the calendar off-screen. On <sm
  // it's `fixed`, horizontally centered, and clamped below the trigger instead.
  const [mobileTop, setMobileTop] = React.useState<number | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  // Which sub-mode the open dropdown is previewing (defaults to the committed mode).
  const [tab, setTab] = React.useState<Mode>(mode);
  // Draft range endpoints — committed to the parent only on Apply.
  const [dStart, setDStart] = React.useState(rangeStart);
  const [dEnd, setDEnd] = React.useState(rangeEnd);
  const [hovered, setHovered] = React.useState("");
  /** ISO of the closed day whose reason bubble is pinned open by a tap (touch
   *  has no hover, so the contact links would otherwise be unreachable). */
  const [revealed, setRevealed] = React.useState("");
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
    setRevealed("");
    const a = fromISODate((mode === "single" ? selectedDate : rangeStart) || toISODate(startOfToday()));
    setCursor({ y: a.getFullYear(), m: a.getMonth() });
    if (triggerRef.current && window.matchMedia("(max-width: 639px)").matches) {
      setMobileTop(triggerRef.current.getBoundingClientRect().bottom + 8);
    } else {
      setMobileTop(null);
    }
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
        ref={triggerRef}
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
          // Shrinks on phones so the tabs + date sit on one line; restored at sm+.
          "flex max-w-full items-center gap-1 rounded-full px-2.5 py-2 text-xs font-semibold text-teal-deep transition-colors sm:gap-1.5 sm:px-3 sm:py-[11px] sm:text-[13px]",
          open ? "bg-teal-soft" : "bg-teal-wash hover:bg-teal-soft",
        )}
      >
        {mode === "single" ? (
          <>
            <CalendarDays className="size-4 shrink-0 text-primary" />
            {/* Short weekday/month on phones ("Wed, Jul 15"); full label at sm+. */}
            <span className="truncate sm:hidden">{formatDay(fromISODate(selectedDate))}</span>
            <span className="hidden truncate sm:inline">{formatDayLong(fromISODate(selectedDate))}</span>
          </>
        ) : (
          <>
            <CalendarRange className="size-4 shrink-0 text-primary" />
            {/* Drop the weekday on phones ("Jul 15") so the range + count fit;
                full "Wed, Jul 15" at sm+. */}
            <span className="truncate sm:hidden">{formatShort(fromISODate(rangeStart))}</span>
            <span className="hidden truncate sm:inline">{formatDay(fromISODate(rangeStart))}</span>
            <ArrowRight className="size-3 shrink-0 text-primary/60 sm:size-3.5" />
            <span className="truncate sm:hidden">{formatShort(fromISODate(rangeEnd))}</span>
            <span className="hidden truncate sm:inline">{formatDay(fromISODate(rangeEnd))}</span>
            {/* Day-count badge is hidden on phones (the count also shows in the
                plan roll-up below the header); visible from sm+. */}
            <span className="ml-0.5 hidden shrink-0 rounded-full bg-card px-1.5 py-0.5 text-[11px] font-bold text-teal-deep shadow-sm sm:inline-block sm:px-2">
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
          style={mobileTop != null ? { top: mobileTop } : undefined}
          className={cn(
            "z-50 rounded-2xl border border-border bg-card p-3 shadow-raised",
            mobileTop != null
              ? "fixed left-1/2 w-[min(19.5rem,calc(100vw-1.5rem))] -translate-x-1/2"
              : "absolute right-0 top-full mt-2 w-[19.5rem]",
          )}
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
                    // The disabled button below is `pointer-events-none`, so a tap
                    // on a closed day lands here and pins its reason bubble open.
                    onClick={() => opt?.disabled && opt.reason && setRevealed((r) => (r === iso ? "" : iso))}
                    className={cn(
                      "relative flex items-center justify-center py-0.5",
                      // Disabled buttons don't fire hover, so the reason tooltip
                      // lives on the (enabled) wrapper and reveals on group-hover.
                      opt?.disabled && opt.reason && "group",
                    )}
                  >
                    {opt?.disabled && opt.reason ? (
                      <CutoffDayTooltip reason={opt.reason} cutoff={cutoffClosed} open={revealed === iso} />
                    ) : null}
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
                        // Let taps fall through to the wrapper so the reason +
                        // contact links can pin open on touch.
                        !selectable && "pointer-events-none",
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
                  // Disabled range days are `pointer-events-none`, so the tap
                  // lands here and pins the reason bubble open (touch).
                  onClick={() => disabled && info.reason && setRevealed((r) => (r === iso ? "" : iso))}
                  className={cn(
                    "relative flex items-center justify-center py-0.5",
                    disabled && info.reason && "group",
                  )}
                >
                  {disabled && info.reason ? (
                    <CutoffDayTooltip reason={info.reason} cutoff={cutoffClosed} open={revealed === iso} />
                  ) : null}
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
                      // Taps fall through to the wrapper for the pinned bubble.
                      disabled && "pointer-events-none",
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
              (hover or tap for contact options).
            </p>
          ) : (
            <>
              <p className="mt-2 text-2xs text-muted-foreground">
                {dStart
                  ? `${formatDay(fromISODate(dStart))} → ${formatDay(fromISODate(draftEnd))} · ${draftCount} ${draftCount === 1 ? "day" : "days"}`
                  : "Tap a start and end day. Weekends are skipped."}
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
