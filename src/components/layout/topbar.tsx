"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  ChevronDown,
  CalendarOff,
  Clock,
  CheckCircle2,
  XCircle,
  CheckCheck,
  Repeat,
  Info,
  Ban,
} from "lucide-react";
import { NAV_ITEMS, isActive } from "@/lib/nav";
import { useUiStore } from "@/store/use-ui-store";
import { useCartStore } from "@/store/use-cart-store";
import { useAutoOrderStore, type AutoOrderHeader } from "@/store/use-auto-order-store";
import { useOOOStore } from "@/store/use-ooo-store";
import { useNotificationsStore } from "@/store/use-notifications-store";
import { Button } from "@/components/ui/button";
import { DateMultiModal } from "@/components/ui/date-multi-modal";
import { program } from "@/data/program";
import { toast } from "@/store/use-toast-store";
import { cutoffFor, demoNow } from "@/lib/cutoff";
import { fromISODate, formatDay } from "@/lib/dates";
import { formatCurrency, cn } from "@/lib/utils";

const TITLE_OVERRIDES: Record<string, string> = {
  "/menu": "Menu",
  "/plan": "Plan Week",
  "/cart": "Your Cart",
  "/checkout": "Checkout",
  "/orders": "My Orders",
  "/auto-order": "Auto-Order",
  "/account": "Account & Profile",
  "/notifications": "Notifications",
};

function deriveTitle(pathname: string) {
  if (TITLE_OVERRIDES[pathname]) return TITLE_OVERRIDES[pathname];
  if (pathname.startsWith("/menu/")) return "Item Details";
  if (pathname.startsWith("/orders/")) return "Order Details";
  const match = NAV_ITEMS.find((item) => isActive(pathname, item));
  return match?.label ?? "Menu";
}

/** Sticky top bar: mobile menu trigger, page title, and cart. */
function Topbar() {
  const pathname = usePathname();
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);
  const toggleCart = useUiStore((s) => s.toggleCart);
  const cartOpen = useUiStore((s) => s.cartOpen);
  const activeOrderDate = useUiStore((s) => s.activeOrderDate);
  const editingOrder = useUiStore((s) => s.editingOrder);
  const cart = useCartStore();
  const cartCount = cart.count();
  const autoHeader = useAutoOrderStore((s) => s.header);
  const autoNavTitle = useAutoOrderStore((s) => s.navTitle);
  const onAutoOrder = pathname.startsWith("/auto-order");
  // Auto-order title is contextual (set per view state); fall back to the route default.
  // Editing a placed order reframes the menu as "Changing Order".
  const title =
    editingOrder && pathname === "/menu"
      ? "Changing Order"
      : onAutoOrder && autoNavTitle
        ? autoNavTitle
        : deriveTitle(pathname);
  const onOrders = pathname === "/orders";
  const onCheckout = pathname === "/checkout";
  const onNotifications = pathname === "/notifications";
  // Pages where the subsidy + cart header actions don't apply.
  const hideHeaderActions = pathname === "/account" || pathname === "/cart";

  // Today's budget for the day the menu is ordering for.
  const dayTotal = activeOrderDate ? cart.dayTotal(activeOrderDate) : 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileNav}
          aria-label="Open navigation"
          className="-ml-1 rounded-full border border-border bg-card p-2 text-foreground hover:bg-muted lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="font-display text-lg font-semibold tracking-tight">{title}</h1>
        {onAutoOrder && autoHeader ? (
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-2xs font-semibold text-foreground sm:flex">
            <Repeat className="size-3.5 text-primary" />
            <span className="nums">{autoHeader.poolCount}</span>{" "}
            {autoHeader.poolCount === 1 ? "meal" : "meals"} in rotation
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {onAutoOrder ? (
          /* Auto-Order: Stop ordering + Edit Auto Order in the nav. */
          autoHeader ? <AutoOrderControls header={autoHeader} /> : null
        ) : onOrders ? (
          /* Orders: out-of-office toggle instead of subsidy + cart. */
          <OutOfOfficeControl />
        ) : onCheckout ? (
          /* Checkout: per-day cutoff indicator instead of subsidy + cart. */
          <CheckoutCutoffIndicator />
        ) : onNotifications ? (
          /* Notifications: unread count + mark all read. */
          <NotificationsHeaderControl />
        ) : hideHeaderActions ? null : (
          <>
            {/* Editing a placed order hides the subsidy + cart entirely — the
                change is shown in the on-page "Changing order" banner. */}
            {activeOrderDate && !editingOrder ? <BudgetIndicator dayTotal={dayTotal} /> : null}

            {!editingOrder ? (
              <button
                id="cart-icon"
                type="button"
                onClick={toggleCart}
                aria-expanded={cartOpen}
                aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border text-sm font-semibold transition-colors",
                  cartOpen
                    ? "border-primary bg-teal-wash text-teal-deep"
                    : "border-border bg-card text-foreground hover:bg-muted",
                  cartCount > 0 ? "py-1.5 pl-3 pr-1.5" : "px-3 py-1.5",
                )}
              >
                <ShoppingCart className="size-5" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 ? (
                  <span className="flex min-w-[22px] items-center justify-center rounded-full bg-coral px-1.5 text-[13px] font-bold leading-[22px] text-white">
                    {cartCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </>
        )}
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------------- */
/* Auto-Order header controls — pool count + Edit / Stop ordering             */
/* ----------------------------------------------------------------------- */

function AutoOrderControls({ header }: { header: AutoOrderHeader }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Button variant="ghost" size="sm" onClick={header.onHowItWorks}>
        <Info className="size-4" /> How it works
      </Button>
      {header.onStop ? (
        <Button variant="ghost" size="sm" onClick={header.onStop} className="text-danger hover:text-danger">
          <Ban className="size-4" /> Turn Off Auto Order
        </Button>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Out-of-office toggle (Orders page) — opens a date picker, then alerts      */
/* ----------------------------------------------------------------------- */

/** Compact label for the out-of-office days, e.g. "Sat, Jul 4" or "Sat, Jul 4 +2 more". */
function oooLabel(dates: string[]) {
  if (!dates.length) return "";
  const first = formatDay(fromISODate(dates[0]));
  if (dates.length === 1) return first;
  return `${first} +${dates.length - 1} more`;
}

function OutOfOfficeControl() {
  const { active, dates, set } = useOOOStore();
  const [picker, setPicker] = React.useState(false);

  return (
    <>
      {active ? (
        <button
          type="button"
          onClick={() => setPicker(true)}
          aria-label={`Edit out of office (${oooLabel(dates)})`}
          className="flex items-center gap-2 rounded-full border border-primary bg-teal-wash px-3.5 py-1.5 text-[13px] font-semibold text-teal-deep transition-colors hover:bg-teal-wash/70"
        >
          <CalendarOff className="size-4 text-primary" />
          <span className="hidden sm:inline">Edit Out of Office</span>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-2xs font-semibold nums">
            {oooLabel(dates)}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <CalendarOff className="size-4 text-primary" /> Set Out of Office
        </button>
      )}

      {picker ? (
        <DateMultiModal
          title="Out of office"
          subtitle="Tap the days you'll be away."
          initialDates={dates}
          allowClear={active}
          emptyApplyLabel="Clear out of office"
          onClose={() => setPicker(false)}
          onApply={(picked) => {
            setPicker(false);
            set(picked);
            toast.success(
              picked.length ? "Out of office set" : "Out of office cleared",
              picked.length
                ? `Auto-orders paused for ${picked.length} day${picked.length > 1 ? "s" : ""}.`
                : "You're marked as in office again.",
            );
          }}
        />
      ) : null}
    </>
  );
}

/* ----------------------------------------------------------------------- */
/* Notifications header — unread count + mark all read                        */
/* ----------------------------------------------------------------------- */

function NotificationsHeaderControl() {
  const unread = useNotificationsStore((s) => s.items.filter((n) => !n.read).length);
  const markAll = useNotificationsStore((s) => s.markAll);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-[13px] text-muted-foreground">
        {unread > 0 ? `${unread} unread` : "You're all caught up"}
      </span>
      {unread > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            markAll();
            toast.success("All caught up", "Marked everything as read.");
          }}
        >
          <CheckCheck className="size-4" /> Mark all read
        </Button>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Checkout cutoff indicator — pill + hover/focus per-day cutoff dropdown     */
/* ----------------------------------------------------------------------- */

function CheckoutCutoffIndicator() {
  const cart = useCartStore();
  const dates = cart.dates();
  if (!dates.length) return null;

  const now = demoNow().getTime();
  const days = dates.map((date) => ({ date, passed: cutoffFor(date).getTime() - now <= 0 }));
  const passed = days.filter((d) => d.passed).length;
  const open = days.length - passed;
  const anyPassed = passed > 0;

  return (
    <div className="group relative">
      <button
        type="button"
        aria-haspopup="dialog"
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold outline-none transition-colors",
          anyPassed
            ? "border-danger-border bg-danger-bg text-danger"
            : "border-info-border bg-info-bg text-info",
        )}
      >
        {anyPassed ? <AlertTriangle className="size-3.5" /> : <Clock className="size-3.5" />}
        <span className="nums">
          {anyPassed
            ? `${passed} past cutoff`
            : `${open} ${open === 1 ? "day" : "days"} within cutoff`}
        </span>
        <ChevronDown className="size-3.5 opacity-70 transition-transform group-hover:rotate-180" />
      </button>

      <div
        role="dialog"
        aria-label="Order cutoffs"
        className="pointer-events-none invisible absolute right-0 top-full z-40 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-card p-4 text-foreground opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Clock className="size-3.5 text-primary" /> Order cutoffs
        </div>
        <div className="mt-3 space-y-1.5">
          {days.map((d) => (
            <div key={d.date} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-medium">{formatDay(fromISODate(d.date))}</span>
              {d.passed ? (
                <span className="flex items-center gap-1 font-semibold text-danger">
                  <XCircle className="size-3.5" /> Passed
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-success">
                  <CheckCircle2 className="size-3.5" /> Open
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-2xs text-muted-foreground">
          Each day closes at its day-before cutoff. Past-cutoff days are cancelled automatically.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Budget indicator — pill trigger + hover/focus breakdown dropdown          */
/* ----------------------------------------------------------------------- */

function BudgetIndicator({ dayTotal }: { dayTotal: number }) {
  const subsidy = program.subsidyPerDay;
  const companyCovers = Math.min(dayTotal, subsidy);
  const youCover = Math.max(0, dayTotal - subsidy);
  const remaining = Math.max(0, subsidy - dayTotal);
  const over = youCover > 0;

  return (
    <div className={cn("group relative", !over && "hidden sm:block")}>
      <button
        type="button"
        aria-haspopup="dialog"
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold outline-none transition-colors",
          over
            ? "border-danger-border bg-danger-bg text-danger"
            : remaining === 0
              ? "border-warning-border bg-warning-bg text-coral-deep"
              : "border-info-border bg-info-bg text-info",
        )}
      >
        {over ? <AlertTriangle className="size-3.5" /> : <Wallet className="size-3.5" />}
        <span className="nums">
          {over
            ? `Budget over · you pay ${formatCurrency(youCover)}`
            : remaining === 0
              ? "Budget used · extra is on you"
              : `${formatCurrency(remaining)} left today`}
        </span>
        <ChevronDown className="size-3.5 opacity-70 transition-transform group-hover:rotate-180" />
      </button>

      {/* Hover/focus breakdown */}
      <div
        role="dialog"
        aria-label="Today's budget breakdown"
        className="pointer-events-none invisible absolute right-0 top-full z-40 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-card p-4 text-foreground opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Wallet className="size-3.5 text-primary" /> Today&apos;s budget
        </div>

        <div className="mt-3 space-y-1.5 text-[13px]">
          <BudgetRow label="Daily allowance" value={formatCurrency(subsidy)} />
          <BudgetRow label="Meals this day" value={formatCurrency(dayTotal)} />
          <div className="my-1.5 border-t border-border" />
          <BudgetRow
            label={`${program.company} covers`}
            value={`-${formatCurrency(companyCovers)}`}
            tone="success"
          />
          <BudgetRow
            label="You cover"
            value={formatCurrency(youCover)}
            tone={youCover > 0 ? "danger" : "muted"}
          />
        </div>

        <div className="mt-3 rounded-xl bg-muted px-3 py-2 text-2xs text-muted-foreground">
          {over
            ? `Over the ${formatCurrency(subsidy)} allowance — the extra ${formatCurrency(youCover)} is charged to you.`
            : `${formatCurrency(remaining)} of your ${formatCurrency(subsidy)} allowance left · resets daily.`}
        </div>
      </div>
    </div>
  );
}

function BudgetRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold nums",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export { Topbar };
