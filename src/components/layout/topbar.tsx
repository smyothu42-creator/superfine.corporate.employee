"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  CheckCheck,
  Repeat,
  Ban,
  BookOpen,
  Percent,
  ArrowLeftRight,
} from "lucide-react";
import { NAV_ITEMS, isActive } from "@/lib/nav";
import { companyCovers, employeeCovers, budgetRemaining } from "@/lib/subsidy";
import { useSessionStore, isSubsidized } from "@/store/use-session-store";
import { useUiStore } from "@/store/use-ui-store";
import { useCartStore } from "@/store/use-cart-store";
import { useAutoOrderStore, type AutoOrderHeader } from "@/store/use-auto-order-store";
import { TOUR_START_EVENT } from "@/features/auto-order/walkthrough";
import { useNotificationsStore } from "@/store/use-notifications-store";
import { Button } from "@/components/ui/button";
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
  const autoInSetup = useAutoOrderStore((s) => s.inSetup);
  const onAutoOrder = pathname.startsWith("/auto-order");
  // While picking meals the header carries the "See how it works" tour trigger.
  const inAutoSetup = onAutoOrder && autoInSetup;
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
          /* Auto-Order: the wizard shows "See how it works"; the live dashboard
             shows Edit / Turn off auto order. */
          inAutoSetup ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.dispatchEvent(new Event(TOUR_START_EVENT))}
            >
              <BookOpen className="size-4" /> See how it works
            </Button>
          ) : autoHeader ? (
            <AutoOrderControls header={autoHeader} />
          ) : null
        ) : onOrders ? (
          /* Orders: no header action — out-of-office lives in Account & Profile. */
          null
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

            {/* Hidden while the cart panel is open — it has its own close control. */}
            {!editingOrder && !cartOpen ? (
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
    <div data-tour="dash-controls" className="flex items-center gap-2 sm:gap-3">
      {header.onStop ? (
        <Button variant="ghost" size="sm" onClick={header.onStop} className="text-danger hover:text-danger">
          <Ban className="size-4" /> Turn Off Auto Order
        </Button>
      ) : null}
    </div>
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

/**
 * Budget pill + a demo-only switch between the two subsidy contracts.
 *
 * The models read differently because they answer different questions. A fixed
 * daily allowance has a cap, so the useful number is headroom — "$8.50 left
 * today". A percentage share has no cap, so nothing is ever "left"; the useful
 * number is the employee's running share — "You pay $4.50 · 30%".
 */
function BudgetIndicator({ dayTotal }: { dayTotal: number }) {
  const mode = useUiStore((s) => s.subsidyMode);
  const toggleMode = useUiStore((s) => s.toggleSubsidyMode);
  const account = useSessionStore((s) => s.account);
  const percentMode = mode === "percent";

  // Guests and individual customers have no company budget. Showing them an
  // allowance — even an empty one — advertises pricing they aren't entitled to.
  if (!isSubsidized(account)) return null;

  const allowance = program.subsidyPerDay;
  const pct = program.subsidyPercent;

  const covered = companyCovers(dayTotal, mode);
  const youCover = employeeCovers(dayTotal, mode);
  const remaining = budgetRemaining(dayTotal, mode);
  // A percentage contract can never be "over" — the split holds at any total.
  const over = !percentMode && youCover > 0;
  const empty = dayTotal === 0;

  const label = percentMode
    ? empty
      ? `${program.company} pays ${pct}%`
      : `You pay ${formatCurrency(youCover)} · ${100 - pct}%`
    : over
      ? `Budget over · you pay ${formatCurrency(youCover)}`
      : remaining === 0
        ? "Budget used · extra is on you"
        : `${formatCurrency(remaining)} left today`;

  return (
    <div className={cn("flex items-center gap-1.5", !over && "hidden sm:flex")}>
      <div className="group relative">
        <button
          type="button"
          aria-haspopup="dialog"
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold outline-none transition-colors",
            over
              ? "border-danger-border bg-danger-bg text-danger"
              : !percentMode && remaining === 0
                ? "border-warning-border bg-warning-bg text-coral-deep"
                : "border-info-border bg-info-bg text-info",
          )}
        >
          {over ? (
            <AlertTriangle className="size-3.5" />
          ) : percentMode ? (
            <Percent className="size-3.5" />
          ) : (
            <Wallet className="size-3.5" />
          )}
          <span className="nums">{label}</span>
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
            <BudgetRow
              label={percentMode ? "Subsidy rate" : "Daily allowance"}
              value={percentMode ? `${pct}%` : formatCurrency(allowance)}
            />
            <BudgetRow label="Meals this day" value={formatCurrency(dayTotal)} />
            <div className="my-1.5 border-t border-border" />
            <BudgetRow
              label={percentMode ? `Company pays (${pct}%)` : "Company pays"}
              value={`-${formatCurrency(covered)}`}
              tone="success"
            />
            <BudgetRow
              label={percentMode ? `You pay (${100 - pct}%)` : "You pay"}
              value={formatCurrency(youCover)}
              tone={!percentMode && youCover > 0 ? "danger" : "muted"}
            />
          </div>

          {/* Fixed: a meter that depletes. Percent: a split that never moves. */}
          {percentMode ? (
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              <div className="h-full bg-coral" style={{ width: `${100 - pct}%` }} />
            </div>
          ) : null}

          <div className="mt-3 rounded-xl bg-muted px-3 py-2 text-2xs text-muted-foreground">
            {percentMode
              ? `${program.company} covers ${pct}% of every order — no daily cap. Your ${100 - pct}% share grows with the order.`
              : over
                ? `Over the ${formatCurrency(allowance)} allowance — the extra ${formatCurrency(youCover)} is charged to you.`
                : `${formatCurrency(remaining)} of your ${formatCurrency(allowance)} allowance left · resets daily.`}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleMode}
        aria-label={`Demo: switch to the ${percentMode ? "fixed daily allowance" : "percentage share"} subsidy model`}
        title="Demo: switch subsidy model"
        className="rounded-full border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeftRight className="size-3.5" />
      </button>
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
