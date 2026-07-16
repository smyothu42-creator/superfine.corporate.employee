"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  MapPin,
  Clock,
  CreditCard,
  CalendarDays,
  Lock,
  Mail,
  LogIn,
  ShoppingBag,
  X,
  Pencil,
  XCircle,
  AlertTriangle,
  Tag,
  ArrowRight,
  Package,
  Recycle,
  ChevronRight,
  MessageSquare,
  Building2,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Field } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { ThemeSelect } from "@/components/ui/theme-select";
import { DateField, TimeField } from "@/components/ui/datetime-fields";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ServingBreakdown } from "@/components/cart/serving-breakdown";
import { subsidyLabel } from "@/lib/subsidy";
import { IdentityModal } from "@/components/auth/identity-modal";
import { useUiStore } from "@/store/use-ui-store";
import { useOrderEditStore } from "@/store/use-order-edit-store";
import { useOrderEdit } from "@/features/orders/use-order-edit";
import {
  useSessionStore,
  isSubsidized,
  deliveryComplete,
  type Account,
} from "@/store/use-session-store";
import { useCartStore, type PackagingChoice } from "@/store/use-cart-store";
import { toast } from "@/store/use-toast-store";
import { program, addresses, getAddress, reusablePackagingFee } from "@/data/program";
import { checkZip, deliveryFeeForZip } from "@/data/service-areas";
import { me } from "@/data/me";
import { fromISODate, formatDay, startOfToday, toISODate, addDays } from "@/lib/dates";
import { CutoffIndicator } from "@/components/cutoff/cutoff-indicator";
import { formatCurrency, cn } from "@/lib/utils";
import type { PaymentChoice } from "@/data/types";

/**
 * Checkout's section headers wear the same teal band as the order cards on
 * /orders (see `orders-view.tsx`) — one shelf, one look.
 *
 * SECTION_CARD is not optional on a card that uses the band: the header paints
 * to its own square edges, so without `overflow-hidden` the colour spills past
 * the card's rounded corners.
 */
const SECTION_CARD = "overflow-hidden";
const SECTION_HEADER = "border-teal-soft bg-teal-wash";
const SECTION_TITLE = "text-teal-deep";

/** Demo promo codes — flat dollars off or a percentage of the employee balance. */
const PROMO_CODES: Record<string, { kind: "flat" | "percent"; value: number; label: string }> = {
  LUNCH5: { kind: "flat", value: 5, label: "$5 off" },
  SAVE10: { kind: "percent", value: 10, label: "10% off your share" },
  WELCOME: { kind: "flat", value: 3, label: "$3 off" },
};

type AppliedPromo = { code: string; kind: "flat" | "percent"; value: number; label: string };

/** Discount a promo yields against the current balance owed (clamped, 2dp). */
function promoDiscount(promo: AppliedPromo, owed: number) {
  const raw = promo.kind === "flat" ? promo.value : (owed * promo.value) / 100;
  return Math.min(owed, Math.round(raw * 100) / 100);
}

export function CheckoutView() {
  const [mounted, setMounted] = React.useState(false);
  const [placed, setPlaced] = React.useState(false);
  const cart = useCartStore();
  // Subscribed, not just read: the cart's own store holds no subsidy state, so
  // these are what re-render the totals when the contract is switched, or when a
  // guest verifies into a corporate account and the subsidy starts applying.
  const subsidyMode = useUiStore((s) => s.subsidyMode);
  const account = useSessionStore((s) => s.account);
  const hydrated = useSessionStore((s) => s.hydrated);
  const delivery = useSessionStore((s) => s.delivery);

  /** The one branch everything below reads: subsidy, address, payment, receipt. */
  const corporate = isSubsidized(account);

  React.useEffect(() => setMounted(true), []);

  // While editing a placed order, checkout is the last step of the edit: the same
  // review screen, but the CTA saves the changes back onto the order instead of
  // placing a new one.
  const editActive = useOrderEditStore((s) => s.active);
  const editingOrderId = useOrderEditStore((s) => s.editingOrderId);
  const { saveEdit } = useOrderEdit();

  const [identityOpen, setIdentityOpen] = React.useState(false);
  const autoPrompted = React.useRef(false);

  /**
   * Ask who they are the moment checkout settles. Everything below — the subsidy,
   * which address question we even ask, whether "pay later" exists — is decided
   * by the answer, so asking later would mean rearranging a form they'd already
   * started filling in.
   *
   * Waits for `hydrated` rather than `mounted`: a returning corporate employee's
   * account arrives from localStorage a tick after first paint, and prompting on
   * mount would flash a sign-in dialog at someone already signed in. The ref
   * makes this a one-shot — dismissing it must not re-trigger on re-render.
   */
  React.useEffect(() => {
    if (!hydrated || account || autoPrompted.current) return;
    autoPrompted.current = true;
    setIdentityOpen(true);
  }, [hydrated, account]);

  function announceIdentity(a: Account) {
    if (a.kind === "corporate") {
      toast.success(
        `${a.company} pricing applied`,
        "Your company's share is now reflected in the total.",
      );
    } else {
      toast.success("You're signed in", "Confirmation will go to your email.");
    }
  }

  const owed = mounted ? cart.totalEmployeePaid() : 0;
  const [payment, setPayment] = React.useState<PaymentChoice>(
    me.permissions.payLater ? "pay_later" : "pay_now",
  );
  // Deferring to a company invoice needs a company. An individual who signed in
  // after picking "pay later" as a guest must not keep it, so this is derived
  // from the account rather than reset in an effect that a re-render could miss.
  const payLaterAvailable = corporate && me.permissions.payLater;
  const effectivePayment: PaymentChoice = payLaterAvailable ? payment : "pay_now";
  const [commonWindow, setCommonWindow] = React.useState(program.deliveryWindows[1]);

  /**
   * "Edit order" hands the user back the menu with their cart open beside it —
   * the same place they built the order — rather than a modal copy of the cart
   * that can only delete lines. Swapping a meal or fixing a quantity needs the
   * menu behind it, and a modal never had one.
   *
   * Mirrors `beginEdit` in use-order-edit.ts: push, then open. The cart panel
   * keeps itself open on /menu.
   */
  const router = useRouter();
  const openCart = useUiStore((s) => s.openCart);
  function editOrder() {
    router.push("/menu");
    openCart();
  }
  /**
   * One row open at a time. Each row states its current answer and expands in
   * place to change it — the page stays a readable summary of the order rather
   * than every form it contains, unfolded at once.
   *
   * Accordion, not free-for-all: two open forms is two places to look, and the
   * whole point of the collapsed row is that you can see the shape of the order
   * without opening anything.
   */
  /**
   * Payment opens a dialog rather than a panel: Square's card form is its own
   * hosted surface, and it needs a container it can own rather than a row that
   * folds shut underneath it.
   */
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [openRow, setOpenRow] = React.useState<RowName | null>(null);
  const toggleRow = React.useCallback(
    (r: RowName) => setOpenRow((cur) => (cur === r ? null : r)),
    [],
  );
  const closeRow = React.useCallback(() => setOpenRow(null), []);

  // Promo code (applied against the employee-paid balance).
  const [promoInput, setPromoInput] = React.useState("");
  const [promo, setPromo] = React.useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = React.useState("");

  const discount = promo ? promoDiscount(promo, owed) : 0;
  // Tax applies to the employee-paid portion after any promo (0 when covered).
  const taxable = Math.max(0, owed - discount);
  const tax = Math.round(taxable * program.taxRate * 100) / 100;
  // Reusable packaging (individual orders only): a flat fee by container count,
  // plus a ZIP-based pickup fee when a special (out-of-window) pickup is chosen.
  // Both ride on top of the taxed food total — they aren't themselves taxed.
  const reusable = !corporate && cart.packaging === "reusable";
  const packagingFee = mounted ? cart.packagingFee() : 0;
  const pickupFee = reusable && cart.specialPickup ? deliveryFeeForZip(delivery.zip) : 0;
  const finalOwed = taxable + tax + packagingFee + pickupFee;

  if (!mounted) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  const dates = cart.dates();

  if (placed) {
    return (
      <Confirmation
        owed={finalOwed}
        payment={finalOwed === 0 ? "covered" : effectivePayment}
        account={account}
      />
    );
  }

  if (dates.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingBag className="size-7" />
          </span>
          <h2 className="font-display text-xl font-semibold tracking-tight">Nothing to check out</h2>
          <Button asChild>
            <Link href="/menu">Browse the menu</Link>
          </Button>
        </CardBody>
      </Card>
    );
  }

  const address = getAddress(cart.addressId);
  const subtotal = cart.subtotal();
  const subsidy = cart.totalSubsidy();

  /* ---- What each row says when it's closed. --------------------------------
     A row has to answer its own question without being opened, or the collapse
     has just hidden the order behind five sheets. */

  const addressValue = corporate
    ? address.address
    : deliveryComplete(delivery)
      ? [delivery.street, delivery.apt, delivery.city, delivery.zip].filter(Boolean).join(", ")
      : "Add a delivery address";

  // Days can carry different windows (the per-day picker), so the row can't just
  // read `commonWindow` — it says so rather than naming one day's time for all.
  const chosenWindows = new Set(dates.map((d) => cart.windows[d] ?? commonWindow));
  const timeValue = chosenWindows.size === 1 ? [...chosenWindows][0] : "Varies by day";

  const packagingValue =
    cart.packaging === "reusable"
      ? `Reusable · pickup ${cart.pickupWindow || "not set"}`
      : "Disposable · nothing to return";

  const paymentValue =
    corporate && owed === 0
      ? `Fully covered by ${program.company}`
      : effectivePayment === "pay_later"
        ? "Company invoice · nothing to pay now"
        : "Square · •••• 4242";

  /**
   * The CTA renders twice — docked on a phone, in the rail on desktop — so its
   * label and its enabled-ness are derived once here. Two copies of this ternary
   * is two chances for one button to place an order the other one is blocking.
   *
   * An individual's order can't be driven anywhere without a street and a phone,
   * so the button waits on them the same way it waits on an account. Corporate
   * orders skip that check: the address is the contract's.
   */
  const placeDisabled = !account || (!corporate && !deliveryComplete(delivery));
  const ctaLabel = !account
    ? "Sign in to continue"
    : !corporate && !deliveryComplete(delivery)
      ? "Add a delivery address"
      : editActive
        ? "Save changes"
        : "Place order";

  // Per-day cutoff status — order type drives which rule applies (individual =
  // 4 PM day before, family = 72 h ahead), resolved inside CutoffIndicator.
  const cutoffs = dates.map((date) => {
    const dayItems = cart.itemsForDate(date);
    const type = dayItems.some((i) => i.type === "family_style") ? "family_style" : "individual";
    return { date, type } as const;
  });

  function applyCommonWindow(w: string) {
    setCommonWindow(w);
    dates.forEach((d) => cart.setWindow(d, w));
  }

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const def = PROMO_CODES[code];
    if (!def) {
      setPromo(null);
      setPromoError("That code isn't valid or has expired.");
      return;
    }
    setPromo({ code, ...def });
    setPromoError("");
    setPromoInput("");
    toast.success("Promo applied", `${code}: ${def.label}`);
  }

  function removePromo() {
    setPromo(null);
    setPromoError("");
  }

  function placeOrder() {
    const resolvedPayment: PaymentChoice = finalOwed === 0 ? "covered" : payment;
    cart.setPayment(resolvedPayment);
    // Editing an existing order: write the reviewed cart back onto the order,
    // restore the pre-edit cart and return to the order — no new order created.
    if (editActive) {
      saveEdit();
      return;
    }
    toast.success(
      "Order placed",
      finalOwed === 0 ? "Fully covered. Confirmation on its way." : "Confirmation on its way.",
    );
    setPlaced(true);
    cart.clear();
  }

  return (
    <div className="space-y-5">
      {/* Editing an order: a coral header so this checkout is visibly different
          from an ordinary one — you're updating a placed order, not placing a new
          one, and the CTA saves the change instead of charging a new order. */}
      {editActive ? (
        <div className="flex items-center gap-3 rounded-2xl border border-warning-border bg-warning-bg px-3 py-2.5 sm:px-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-warning-border bg-card text-coral-deep sm:size-10">
            <Pencil className="size-4 sm:size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-coral-deep">Editing {editingOrderId}</p>
            <p className="truncate text-[13px] text-coral-deep/80">
              Review your changes and save to update this order.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Identity — a guest is asked who they are first, because everything
              below (subsidy, address rules, payment) depends on the answer.
              Once signed in — corporate or individual — the sidebar already shows
              who they are, so we don't repeat it with an "Ordering as" card. */}
          {!corporate && !account ? (
            <IdentityGate onOpen={() => setIdentityOpen(true)} />
          ) : null}

          {/* Cutoff check — the one thing here that isn't a setting to change, so
              it stays a plain strip rather than a row that opens nothing. */}
          <CutoffStrip cutoffs={cutoffs} />

          {/* Delivery details. Each row states its current answer and expands in
              place to change it — the address form, the time picker and the
              packaging choice used to sit unfolded here at once, which is why
              Payment spent this whole page below the fold. */}
          <Card className={SECTION_CARD}>
            {/* The email promise rides beside the title, the way the cutoff rule
                does — it's a standing fact about the section, not a row someone
                acts on, so it doesn't earn a strip of its own at the bottom. */}
            <CardHeader className={cn("flex-wrap", SECTION_HEADER)}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <CardTitle className={SECTION_TITLE}>Delivery details</CardTitle>
                <SectionNote icon={Mail} tone="success">
                  You&apos;ll receive an email when your order is confirmed.
                </SectionNote>
              </div>
            </CardHeader>
            <RowGroup>
              <SettingRow
                icon={MapPin}
                label="Delivery address"
                value={addressValue}
                /* A corporate order goes to a contract-locked company site; an
                   individual types their own. Same row, different panel. */
                incomplete={!corporate && !deliveryComplete(delivery)}
                /* Locked until we have an email: a corporate employee who typed
                   their address here would have it thrown away the moment they
                   verify and the order snaps to the contract site. */
                disabled={!corporate && !account}
                expanded={openRow === "address"}
                onClick={() => toggleRow("address")}
              />
              {openRow === "address" ? (
                <RowPanel>
                  {corporate ? <AddressPanel onDone={closeRow} /> : <IndividualAddressPanel />}
                </RowPanel>
              ) : null}

              <SettingRow
                icon={CalendarDays}
                label="Delivery time"
                value={timeValue}
                expanded={openRow === "time"}
                onClick={() => toggleRow("time")}
              />
              {openRow === "time" ? (
                <RowPanel>
                  <TimePanel dates={dates} commonWindow={commonWindow} onApplyCommon={applyCommonWindow} />
                </RowPanel>
              ) : null}

              {!corporate ? (
                <>
                  <SettingRow
                    icon={MessageSquare}
                    label="Delivery instructions"
                    value={delivery.instructions || "Add a note for the driver"}
                    disabled={!account}
                    expanded={openRow === "instructions"}
                    onClick={() => toggleRow("instructions")}
                  />
                  {openRow === "instructions" ? (
                    <RowPanel>
                      <InstructionsPanel onRemoved={closeRow} />
                    </RowPanel>
                  ) : null}
                </>
              ) : null}

              {/* Packaging — individual orders only. Corporate contracts don't offer it. */}
              {!corporate ? <PackagingRow zip={delivery.zip} value={packagingValue} /> : null}
            </RowGroup>
          </Card>

          <Card className={SECTION_CARD}>
            <CardHeader className={cn("flex-wrap", SECTION_HEADER)}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <CardTitle className={SECTION_TITLE}>Payment</CardTitle>
                {/* Shortened to earn its place on the title's line — the strip it
                    came from could afford "never before. You can edit until then."
                    and a chip can't. What survives is the promise that matters:
                    nothing is charged today. */}
                <SectionNote icon={Lock} tone="success">
                  Charged 24 hours before delivery, never before.
                </SectionNote>
              </div>
            </CardHeader>
            <RowGroup>
              <SettingRow
                icon={corporate && owed === 0 ? CheckCircle2 : CreditCard}
                label="Payment method"
                value={paymentValue}
                /* Never disabled, even with one method: this row is where someone
                   checks which card is about to be charged, and a greyed-out row
                   answers that by refusing to open. */
                onClick={() => setPaymentOpen(true)}
              />
            </RowGroup>
          </Card>
        </div>

        {/* Summary. On desktop the rail sticks and the *item list* is what
            scrolls inside it — capping the whole card would let a seven-day cart
            push Place order below the viewport with no way to reach it, which is
            exactly the failure the sticky rail exists to prevent. Header and
            totals+CTA are shrink-0; only the middle gives. */}
        <div>
          <Card
            className={cn(
              "lg:sticky lg:top-32 lg:flex lg:max-h-[calc(100dvh-9rem)] lg:flex-col",
              SECTION_CARD,
              editActive && "border-warning-border",
            )}
          >
            <CardHeader className={cn("lg:shrink-0", SECTION_HEADER)}>
              <CardTitle className={SECTION_TITLE}>
                {editActive ? "Review your changes" : "Order summary"}
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={editOrder}>
                <Pencil className="size-3.5" /> Edit order
              </Button>
            </CardHeader>
            <CardBody className="space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {dates.map((date) => (
                <div key={date} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="text-overline">{formatDay(fromISODate(date))}</div>
                  <ul className="mt-1 space-y-2">
                    {cart.itemsForDate(date).map((line) => (
                      <li key={line.uid} className="flex justify-between gap-2 text-[13px]">
                        {/* A family line is a package, not a plate — the guest count and the
                            serving split are what the user is actually confirming here. */}
                        <div className="min-w-0">
                          <span className="text-muted-foreground">
                            {line.name} ×{line.qty}
                          </span>
                          {line.type === "family_style" ? (
                            <Badge tone="neutral" className="ml-1.5 align-middle">
                              Family Style · {line.guests} guests
                            </Badge>
                          ) : null}
                          {line.addOns.length ? (
                            <p className="mt-0.5 text-2xs text-muted-foreground">
                              {line.addOns.map((a) => a.name).join(" · ")}
                            </p>
                          ) : null}
                          {line.servings?.length ? (
                            <ServingBreakdown servings={line.servings} />
                          ) : null}
                        </div>
                        {program.showPrices ? (
                          <span className="shrink-0 nums">{formatCurrency(line.unitPrice * line.qty)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardBody>

            {/* Totals and the CTA — pinned below the scrolling list on desktop. */}
            <div className="space-y-3 border-t border-border p-5 lg:shrink-0">
              {program.showPrices ? (
                <div className="space-y-1.5">
                  <SummaryRow label="Meals total" value={formatCurrency(subtotal)} />
                  {corporate ? (
                    <SummaryRow label={subsidyLabel(subsidyMode)} value={`−${formatCurrency(subsidy)}`} tone="success" />
                  ) : null}
                  {discount > 0 && promo ? (
                    <SummaryRow
                      label={`Promo · ${promo.code}`}
                      value={`−${formatCurrency(discount)}`}
                      tone="success"
                    />
                  ) : null}
                  <SummaryRow label="Tax" value={formatCurrency(tax)} />
                  {packagingFee > 0 ? (
                    <SummaryRow
                      label={`Reusable packaging (${cart.packagingQty()})`}
                      value={formatCurrency(packagingFee)}
                    />
                  ) : null}
                  {pickupFee > 0 ? (
                    <SummaryRow label="Custom pickup" value={formatCurrency(pickupFee)} />
                  ) : null}
                  <div className="flex items-center justify-between border-t-2 border-foreground pt-2 text-base font-bold">
                    <span>You pay</span>
                    <span className="nums">{formatCurrency(finalOwed)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between border-t-2 border-foreground pt-2 text-base font-bold">
                  <span>You pay</span>
                  <span className="nums text-success">{formatCurrency(0)}</span>
                </div>
              )}

              {/* Promo sits with the total it moves, right above the commit. It's
                  the one control on this page whose whole job is to change the
                  number directly above it — in the Payment section it was two
                  columns away from the figure it edits. Bordered on its own so it
                  reads as an action among the totals' plain rows. */}
              {program.showPrices && owed > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <SettingRow
                    icon={Tag}
                    label="Promo code"
                    value={promo ? `${promo.code} · ${promo.label}` : "Add a promo code"}
                    expanded={openRow === "promo"}
                    onClick={() => toggleRow("promo")}
                  />
                  {openRow === "promo" ? (
                    <RowPanel>
                      <PromoPanel
                        promo={promo}
                        value={promoInput}
                        error={promoError}
                        onChange={(v) => {
                          setPromoInput(v);
                          if (promoError) setPromoError("");
                        }}
                        onApply={applyPromo}
                        onRemove={removePromo}
                      />
                    </RowPanel>
                  ) : null}
                </div>
              ) : null}

            </div>
          </Card>
        </div>
      </div>

      {/* The commit, docked at the foot of the viewport on every width — one bar,
          not a rail copy plus a phone copy.

          `fixed`, not `sticky`. Sticky is trapped in its containing block, and
          the shell's `main` carries a bottom padding: the bar could never reach
          the floor, so it stranded a strip of page background under itself at
          full scroll. Fixed escapes that; `lg:left-[var(--sidebar-w)]` is what
          keeps it off the desktop rail, reading the rail's own width rather than
          re-typing it.

          Opaque `bg-card`, not `bg-card/95`: this bar sits over live content, and
          at 95% the rows behind it ghosted through the total.

          `bottom-dock` rests it on the tab bar on a phone and on the floor on
          desktop; `pb-safe` keeps the iPhone home indicator off it. */}
      <div className="h-24" aria-hidden />
      <div className="bottom-dock pb-safe fixed inset-x-0 z-30 border-t border-border bg-card shadow-[0_-4px_16px_-8px_rgb(0_0_0/0.15)] lg:left-[var(--sidebar-w)]">
        {/* The safe-area inset is the outer element's padding and the bar's own
            padding is the inner element's. They can't share a box: `.pb-safe`
            *sets* padding-bottom, so on desktop — where the inset is 0 — it
            silently zeroed the bottom padding of a `py-3` and left the button
            sitting on the floor with 13px of air above it and none below. */}
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            <div className="text-2xs text-muted-foreground">
              {editActive ? "Updated total" : "You pay"}
            </div>
            <div className={cn("truncate text-base font-bold nums", finalOwed === 0 && "text-success")}>
              {formatCurrency(program.showPrices ? finalOwed : 0)}
            </div>
          </div>
          <Button
            size="lg"
            onClick={placeOrder}
            disabled={placeDisabled}
            className="min-w-0 shrink lg:min-w-[16rem]"
          >
            <span className="truncate">{ctaLabel}</span>
          </Button>
        </div>
      </div>

      <IdentityModal
        open={identityOpen}
        onClose={() => setIdentityOpen(false)}
        onDone={announceIdentity}
      />

      {paymentOpen ? (
        <PaymentModal
          value={effectivePayment}
          onChange={setPayment}
          payLaterAvailable={payLaterAvailable}
          covered={corporate && owed === 0}
          onClose={() => setPaymentOpen(false)}
        />
      ) : null}

    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* The row/sheet pair the whole page is built from                          */
/* ---------------------------------------------------------------------- */

type RowName = "address" | "time" | "instructions" | "promo";

/**
 * The rows of a section, hairline-divided. No border or radius of its own — the
 * Card it sits in draws those, and a second border here would double the line
 * under the header.
 */
function RowGroup({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border">{children}</div>;
}

/**
 * What a row opens into: the form for that one setting, inline under its row.
 *
 * Tinted, because an expanded panel and the next collapsed row are both just
 * bands in the same stack — without a shade behind it, the fields read as
 * belonging to the row below rather than the one above.
 */
function RowPanel({ children }: { children: React.ReactNode }) {
  return <div className="bg-muted/30 px-4 py-4">{children}</div>;
}

/**
 * The standing fact that rides beside a section title — what a cutoff is, where
 * the confirmation goes, when the card is charged. A chip rather than a strip:
 * these are notes *about* the section, not rows anyone acts on.
 *
 * Tone is the section's own weather, not the message's severity. Warning is the
 * cutoff, where missing the time cancels the day; success is the two sections
 * whose note is a reassurance rather than a deadline.
 */
function SectionNote({
  icon: Icon,
  tone,
  children,
}: {
  icon: React.ElementType;
  tone: "success" | "warning";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium leading-snug",
        tone === "warning" ? "bg-warning-bg text-warning" : "bg-success-bg text-success",
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span>{children}</span>
    </span>
  );
}

/**
 * One setting, closed: what it is, what it currently says, and a chevron into the
 * sheet that changes it.
 *
 * `incomplete` is not styling — it's the difference between "Disposable" (an
 * answer) and "Add a delivery address" (a hole). A row that reads like an answer
 * when it's actually blank is how someone reaches a disabled Place-order button
 * with no idea which row is at fault.
 */
function SettingRow({
  icon: Icon,
  label,
  value,
  onClick,
  disabled,
  incomplete,
  expanded,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
  incomplete?: boolean;
  expanded?: boolean;
}) {
  /**
   * Bring the row to the top when it opens, so its panel is on screen instead of
   * somewhere below the fold — the row nearest the bottom would otherwise expand
   * entirely out of sight.
   *
   * Anchored on the row rather than the panel: a panel can be taller than what's
   * left of the viewport, and scrolling that into view would land its middle on
   * screen with its first field above the top. `scroll-mt-20` keeps the row clear
   * of the sticky topbar. Keyed on `expanded`, so re-renders while open (typing
   * an address, picking a window) never yank the page.
   */
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!expanded) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [expanded]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      // Only a disclosure claims this. A row that opens a dialog leaves it off,
      // or it announces a panel that never appears.
      aria-expanded={disabled || expanded === undefined ? undefined : expanded}
      className={cn(
        "flex w-full scroll-mt-20 items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:bg-muted/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55",
        expanded ? "bg-muted/30" : "hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl",
          incomplete ? "bg-warning-bg text-warning" : "bg-teal-wash text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">{label}</span>
        <span
          className={cn(
            "block truncate text-2xs",
            incomplete ? "font-medium text-warning" : "text-muted-foreground",
          )}
        >
          {value}
        </span>
      </span>
      {/* The chevron turns down when the row is open — the row is a disclosure,
          and a chevron that always points right promises a page it never goes to. */}
      {disabled ? null : (
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-90",
          )}
        />
      )}
    </button>
  );
}

/**
 * The chrome every sheet shares — backdrop, entrance, Escape, header, scrollable
 * body, pinned footer. This file grew four hand-rolled copies of it; they drifted
 * (one lost its rounded footer, one its max-height) and every new sheet was a
 * fresh chance to forget the Escape listener.
 */

/* ---------------------------------------------------------------------- */
/* The sheets each row opens                                                */
/* ---------------------------------------------------------------------- */

/**
 * Everything the kitchen and the driver need for an order that isn't going to a
 * company office. It writes straight to the session store on each keystroke
 * rather than holding a local draft: a user who wanders back to the cart to
 * change a meal returns to a filled-in form, and the Place-order button's
 * readiness check reads the same source the order will be built from.
 */

/**
 * Everything the kitchen and the driver need for an order that isn't going to a
 * company office. It writes straight to the session store on each keystroke
 * rather than holding a local draft: the Place-order button's readiness check
 * reads the same source the order will be built from, so there is no window
 * where the form looks complete and the button disagrees.
 */

/**
 * Everything the kitchen and the driver need for an order that isn't going to a
 * company office. It writes straight to the session store on each keystroke
 * rather than holding a local draft: the row above it and the Place-order
 * button's readiness check read the same source the order will be built from,
 * so there is no window where the form looks complete and the button disagrees.
 *
 * No Save button — an inline panel that applies live has nothing to save, and
 * the row's own summary is the receipt for what was typed.
 */
function IndividualAddressPanel() {
  const delivery = useSessionStore((s) => s.delivery);
  const setDelivery = useSessionStore((s) => s.setDelivery);
  const set = (field: keyof typeof delivery, value: string) =>
    setDelivery({ ...delivery, [field]: value });

  // The ZIP is prefilled from the serviceability check, but the field stays
  // editable — people move, and typo'd. Only the failing case speaks up: if they
  // edit it out of the zone, say so here rather than letting the order fail
  // after payment.
  const zipStatus = checkZip(delivery.zip);

  return (
    <div className="space-y-3">
      <Field>
        <Label htmlFor="d-street">Street address</Label>
        <Input
          id="d-street"
          value={delivery.street}
          onChange={(e) => set("street", e.target.value)}
          placeholder="123 Market St"
          autoComplete="address-line1"
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field className="sm:col-span-2">
          <Label htmlFor="d-city">City</Label>
          <Input
            id="d-city"
            value={delivery.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="San Francisco"
            autoComplete="address-level2"
          />
        </Field>
        <Field>
          <Label htmlFor="d-apt">Apt, suite</Label>
          <Input
            id="d-apt"
            value={delivery.apt}
            onChange={(e) => set("apt", e.target.value)}
            placeholder="Apt 4B"
            autoComplete="address-line2"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <Label htmlFor="d-zip">ZIP code</Label>
          <Input
            id="d-zip"
            inputMode="numeric"
            maxLength={5}
            value={delivery.zip}
            onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))}
            placeholder="94105"
            autoComplete="postal-code"
          />
        </Field>
        <Field>
          <Label htmlFor="d-phone">Phone</Label>
          <Input
            id="d-phone"
            type="tel"
            value={delivery.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+1 (555) 123-4567"
            autoComplete="tel"
          />
        </Field>
      </div>

      {zipStatus === "unserviceable" ? (
        <Notice tone="warning">
          We don&apos;t deliver to {delivery.zip} yet. Use an address in our service area, or your
          order can&apos;t be dispatched.
        </Notice>
      ) : null}
    </div>
  );
}

/** The driver's note. Its own row, so it never costs height when it's empty. */
function InstructionsPanel({ onRemoved }: { onRemoved: () => void }) {
  const delivery = useSessionStore((s) => s.delivery);
  const setDelivery = useSessionStore((s) => s.setDelivery);

  return (
    <div className="space-y-2">
      <Textarea
        id="d-instructions"
        aria-label="Delivery instructions"
        value={delivery.instructions}
        onChange={(e) => setDelivery({ ...delivery, instructions: e.target.value })}
        placeholder="Gate code, buzzer, where to leave it…"
        autoFocus
      />
      {delivery.instructions ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Clearing, not hiding: a note kept out of sight still rides along
            // on the order and the driver acts on it.
            setDelivery({ ...delivery, instructions: "" });
            onRemoved();
          }}
        >
          <X className="size-3.5" /> Remove note
        </Button>
      ) : null}
    </div>
  );
}

/**
 * How you're paying. A dialog, not a panel: this is where Square's card form
 * will mount, and a hosted payment surface needs a container of its own — not a
 * row that can fold shut under it while it's collecting a card number.
 *
 * Opens even when there's only one method: the row is where someone goes to
 * check *what card they're about to be charged on*, and a greyed-out row answers
 * that question by refusing to.
 */
function PaymentModal({
  value,
  onChange,
  payLaterAvailable,
  covered,
  onClose,
}: {
  value: PaymentChoice;
  onChange: (p: PaymentChoice) => void;
  payLaterAvailable: boolean;
  covered: boolean;
  onClose: () => void;
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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-3xl bg-card text-left shadow-raised transition-all duration-200",
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        {/* Plain hairline header — the teal band is for the page's section cards;
            every dialog in the app wears white. */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <CreditCard className="size-4 shrink-0 text-primary" /> Payment method
            </h3>
            <p className="text-[13px] text-muted-foreground">
              {covered ? "Nothing to pay on this order." : "How would you like to pay?"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {covered ? (
            <Notice tone="success">
              <CheckCircle2 className="inline size-3.5" /> Your order is fully covered by{" "}
              {program.company}. <strong>No payment needed</strong>, so there&apos;s no method to
              choose.
            </Notice>
          ) : (
            <div className="space-y-2" role="radiogroup" aria-label="Payment method">
              <PayOption
                active={value === "pay_now"}
                onClick={() => {
                  onChange("pay_now");
                  onClose();
                }}
                icon={CreditCard}
                title="Square · •••• 4242"
                subtitle="Charged 24 hours before delivery"
              />
              {/* Deferring to an invoice needs a company to send it to. */}
              {payLaterAvailable ? (
                <PayOption
                  active={value === "pay_later"}
                  onClick={() => {
                    onChange("pay_later");
                    onClose();
                  }}
                  icon={Building2}
                  title="Company invoice"
                  subtitle="On your company's monthly invoice. Nothing to pay now"
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Cutoff check — the one thing on the page that isn't a setting, so it stays a
 * plain strip. The header says what a cutoff *is*; each row says when that day's
 * falls. It used to recite the rule ("individual meals 4 PM the day before,
 * family style 72 h ahead"), which is both a mouthful and redundant: every row
 * already resolves that rule into a real time for that day's order type.
 *
 * "order or change" is the whole rule, not half of it — `cutoffInfo` picks its
 * verb from context (order vs edit) and locks both at the same instant.
 */
function CutoffStrip({
  cutoffs,
}: {
  cutoffs: readonly { date: string; type: "individual" | "family_style" }[];
}) {
  return (
    <Card className={SECTION_CARD}>
      <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b px-5 py-3.5", SECTION_HEADER)}>
        <h2 className={cn("font-display text-lg font-semibold tracking-tight", SECTION_TITLE)}>
          Cutoff check
        </h2>
        <SectionNote icon={AlertTriangle} tone="warning">
          The last time you can order or change a day&apos;s meals.
        </SectionNote>
      </div>
      {/* Day + deadline flow inline, two to a row: a five-day plan as a labelled
          table was one row per day and half again the height, and this list is
          scanned for the day that's close, not read top to bottom.

          The roles carry without column headings: the delivery day is teal like
          every other heading on this page, and the chip beside it says "Order
          by …" in its own words. No calendar icon per day — the chip already has
          a clock, and two icons on one line is decoration, not signal. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
        {cutoffs.map((c) => (
          <span key={c.date} className="inline-flex items-center gap-1.5">
            <span className="whitespace-nowrap text-2xs font-semibold text-teal-deep">
              {formatDay(fromISODate(c.date))}
            </span>
            <CutoffIndicator deliveryISO={c.date} type={c.type} variant="inline" />
          </span>
        ))}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Delivery address picker — the contract sites, as a sheet                 */
/* ---------------------------------------------------------------------- */



/** The contract's sites. Picking one applies it and folds the row back up. */
function AddressPanel({ onDone }: { onDone: () => void }) {
  const cart = useCartStore();
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Delivery address">
      {addresses.map((a) => {
        const active = a.id === cart.addressId;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              cart.setAddress(a.id);
              toast.success("Delivery address updated");
              onDone();
            }}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
              active ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                active ? "border-primary" : "border-border",
              )}
            >
              {active ? <span className="size-2.5 rounded-full bg-primary" /> : null}
            </span>
            <span className="min-w-0 flex-1 text-[13px]">
              <span className="block font-semibold">{a.name}</span>
              <span className="block text-muted-foreground">{a.address}</span>
              {a.instructions ? (
                <span className="mt-1 block text-2xs text-muted-foreground">{a.instructions}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Identity — guest → individual or corporate, resolved here at checkout    */
/* ---------------------------------------------------------------------- */

/**
 * The guest's branch point. Nothing above it required an account.
 *
 * The dialog asks the actual question; this card is what's left behind if they
 * close it. It has to stand on its own, because a dismissed modal is otherwise
 * a dead end — the address below is locked and nothing on screen would say why.
 */
function IdentityGate({ onOpen }: { onOpen: () => void }) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-wash text-primary">
            <LogIn className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Sign in to continue checkout
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Sign in or create an account to place your order. If your company covers lunch,
              signing in with your work email unlocks the subsidy before you pay.
            </p>
          </div>
        </div>
        <Button block size="lg" onClick={onOpen}>
          Sign in to continue <ArrowRight className="size-4" />
        </Button>
      </CardBody>
    </Card>
  );
}



/**
 * Delivery time. A multi-day order picks one window for the lot or one per day;
 * a single-day order has no such question, so it never sees the choice.
 */
function TimePanel({
  dates,
  commonWindow,
  onApplyCommon,
}: {
  dates: string[];
  commonWindow: string;
  onApplyCommon: (w: string) => void;
}) {
  const cart = useCartStore();
  const options = program.deliveryWindows.map((w) => ({ value: w, label: w }));
  const multiDay = dates.length > 1;

  /**
   * Open on whichever mode the order is actually in: if the days already carry
   * different windows, this is a per-day order and saying "Same for every day"
   * would be a lie the first render tells.
   *
   * Read once, on mount — after that the toggle owns it, or picking a day's time
   * would re-derive `each` and fight the user mid-edit.
   */
  const [mode, setMode] = React.useState<"all" | "each">(() =>
    new Set(dates.map((d) => cart.windows[d] ?? commonWindow)).size > 1 ? "each" : "all",
  );

  if (!me.permissions.flexibleDelivery) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px]">
        <Clock className="size-3.5 shrink-0 text-primary" />
        <span className="text-muted-foreground">Your company sets the window:</span>{" "}
        <strong className="font-semibold">{program.deliveryWindows[1]}</strong>
      </div>
    );
  }

  /**
   * Switching back to "Same for every day" flattens the per-day windows onto the
   * common one. Otherwise the toggle would only hide the overrides — the order
   * would still deliver at four different times while the row claimed one.
   */
  function choose(next: "all" | "each") {
    setMode(next);
    if (next === "all") onApplyCommon(commonWindow);
  }

  return (
    <div className="space-y-3">
      {/* One day is one answer; the choice only exists for a multi-day order.
          Two cards rather than a segmented pill: the pill is for the packaging
          row, where it stands in for a chevron in a one-line row. This one is a
          full-width either/or at the top of a panel, so it reads as the two
          options it is. No subtitles — the labels are already the whole idea. */}
      {multiDay ? (
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Delivery time mode">
          <PackOption
            active={mode === "all"}
            onClick={() => choose("all")}
            title="Same for every day"
          />
          <PackOption
            active={mode === "each"}
            onClick={() => choose("each")}
            title="Set for each day"
          />
        </div>
      ) : null}

      {mode === "all" || !multiDay ? (
        <ThemeSelect
          value={commonWindow}
          onValueChange={onApplyCommon}
          options={options}
          aria-label="Delivery time for all days"
        />
      ) : (
        <div className="space-y-2">
          {dates.map((date) => (
            <div
              key={date}
              className="flex items-center justify-between gap-3 border-b border-border pb-2.5 last:border-0 last:pb-0"
            >
              {/* "Wednesday, Jul 15" beside a select overflows a narrow panel if
                  neither can give. The label truncates; the select narrows. */}
              <span className="flex min-w-0 items-center gap-2 truncate text-[13px] font-semibold">
                <CalendarDays className="size-3.5 shrink-0 text-primary" />
                {formatDay(fromISODate(date))}
              </span>
              <div className="w-36 shrink-0 sm:w-52">
                <ThemeSelect
                  value={cart.windows[date] ?? commonWindow}
                  onValueChange={(v) => cart.setWindow(date, v)}
                  options={options}
                  aria-label={`Delivery time for ${formatDay(fromISODate(date))}`}
                  size="sm"
                  align="right"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Confirmation({
  owed,
  payment,
  account,
}: {
  owed: number;
  payment: PaymentChoice;
  account: Account | null;
}) {
  // The receipt has to describe the order that was actually placed — quoting a
  // company an individual has no relationship with is worse than saying nothing.
  const corporate = isSubsidized(account);
  const email = account?.email ?? me.email;

  return (
    <Card className="overflow-hidden">
      <CardBody className="flex flex-col items-center gap-5 px-6 py-12 text-center sm:py-14">
        {/* Success mark with a soft layered halo. */}
        <span className="relative flex size-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-success-bg" />
          <span className="absolute inset-[0.55rem] rounded-full bg-success/15" />
          <CheckCircle2 className="relative size-10 text-success" />
        </span>

        <div className="space-y-2.5">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Order confirmed 🎉</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-2xs font-bold text-foreground nums">
            Order #ORD-2892
          </span>
        </div>

        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          We&apos;ve emailed your confirmation to{" "}
          <strong className="font-semibold text-foreground">{email}</strong>.{" "}
          {corporate && owed === 0 ? (
            <>This order is fully covered by {account?.company ?? me.company}. Nothing to pay.</>
          ) : corporate && payment === "pay_later" ? (
            <>The {formatCurrency(owed)} balance will appear on your company invoice.</>
          ) : (
            <>Square will charge your card {formatCurrency(owed)} 24 hours before delivery.</>
          )}
        </p>

        <Notice tone="info" className="max-w-md text-left text-xs">
          <Mail className="inline size-3.5" /> You&apos;ll get one email now, and a heads-up the day before
          delivery. No surprise &quot;payment taken&quot; emails.
        </Notice>

        <div className="grid w-full max-w-md grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
          <Button asChild block size="lg">
            <Link href="/orders">Track my orders</Link>
          </Button>
          <Button asChild block size="lg" variant="outline">
            <Link href="/menu">Order more</Link>
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/** One payment method: its own mark, what it is, and whether it's the one. */
function PayOption({
  active,
  onClick,
  title,
  subtitle,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-[13px] transition-colors",
        active ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted/50",
      )}
    >
      {/* Each method carries its own mark — a card and an invoice are not the
          same thing, and a shared CreditCard glyph said they were. */}
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-card text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate">{title}</strong>
        <span className="block text-muted-foreground">{subtitle}</span>
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          active ? "border-primary" : "border-border",
        )}
      >
        {active ? <span className="size-2.5 rounded-full bg-primary" /> : null}
      </span>
    </button>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium nums", tone === "success" && "text-success")}>{value}</span>
    </div>
  );
}


/**
 * Two options, so a toggle rather than a row that opens a list to hold two
 * items. It sits where the chevron used to: the chevron promised somewhere to
 * go, and the choice is right here.
 */
function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-2xs font-semibold transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            {/* The price rides on the segment so the cost of switching is on the
                control itself, not only in the panel it opens. */}
            {o.hint ? (
              <span className={cn("font-bold", active ? "text-primary" : "opacity-70")}>
                {o.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Reusable-vs-disposable for an individual order. Reusable adds a flat fee that
 * scales with container count and needs a pickup window; a pickup outside the
 * admin's included windows adds a ZIP-based fee. Every charge lands in the
 * checkout total — there is no deposit-and-refund.
 *
 * Not a `SettingRow`: this row *contains* controls, and a button wrapping
 * buttons is neither valid nor clickable in the way either one wants. It renders
 * a fragment so the row and its dropdown land as siblings in the RowGroup, and
 * the group's hairline divider falls between them like every other row.
 */
function PackagingRow({ zip, value }: { zip: string; value: string }) {
  const cart = useCartStore();
  const windows = program.reusablePackaging.includedPickupWindows;
  const qty = cart.packagingQty();
  const fee = reusablePackagingFee(qty);
  const specialFee = deliveryFeeForZip(zip);

  const [pickupOpen, setPickupOpen] = React.useState(false);
  const [customOpen, setCustomOpen] = React.useState(false);

  /**
   * Reusable containers have to get back to the kitchen, so choosing reusable
   * drops the window list open — the question is part of the choice, not a
   * follow-up someone has to think to go looking for. The default window is set
   * first, so collapsing the list again still leaves a schedulable pickup rather
   * than an order no driver collects.
   *
   * Tapping "Reusable" while already on reusable folds the list back up: with no
   * chevron on this row, the segment is the only handle on it.
   */
  function choose(next: PackagingChoice) {
    if (next === "disposable") {
      cart.setPackaging("disposable");
      setPickupOpen(false);
      setCustomOpen(false);
      return;
    }
    const alreadyReusable = cart.packaging === "reusable";
    cart.setPackaging("reusable");
    if (!cart.pickupWindow && !cart.specialPickup) cart.setPickupWindow(windows[0] ?? "");
    setPickupOpen(alreadyReusable ? !pickupOpen : true);
  }

  const Icon = cart.packaging === "reusable" ? Recycle : Package;
  const open = cart.packaging === "reusable" && pickupOpen;

  /**
   * Bring the row to the top when the list drops open, so the windows are on
   * screen instead of somewhere below the fold. Anchored on the *row*, not the
   * panel: the panel can be taller than what's left of the viewport, and
   * scrolling that into view would put its middle on screen and the "Pickup
   * window" heading above it. `scroll-mt-20` keeps it clear of the sticky topbar.
   */
  const rowRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    rowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  return (
    <>
      <div
        ref={rowRef}
        className={cn("flex w-full scroll-mt-20 items-center gap-3 px-4 py-3", open && "bg-muted/30")}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-teal-wash text-primary">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold">Packaging</span>
          <span className="block truncate text-2xs text-muted-foreground">{value}</span>
        </span>
        <SegmentedToggle
          ariaLabel="Packaging"
          value={cart.packaging}
          onChange={choose}
          options={[
            // No price on Disposable — it's the default and it's free, so the
            // only number worth carrying is the one switching would add.
            { value: "disposable", label: "Disposable" },
            {
              value: "reusable",
              label: "Reusable",
              hint: qty > 0 ? formatCurrency(fee) : "Free",
            },
          ]}
        />
      </div>

      {open ? (
        <RowPanel>
          <div className="space-y-3">
            {/* At the top, and highlighted: this is what reusable *costs*, and
                at the foot of the list it was a footnote to a decision already
                made. */}
            <Notice tone="info" className="text-xs">
              Reusable packaging is{" "}
              <strong className="font-semibold">
                {qty > 0 ? formatCurrency(fee) : "free"}
              </strong>{" "}
              for {qty} {qty === 1 ? "meal" : "meals"}, added to your total. Pickup in an included
              window is free; a custom time adds {formatCurrency(specialFee)}.
            </Notice>

            <div className="text-overline">Pickup window</div>
            {/* Tapping a window is the answer — it applies and folds up, no Save
                to hunt for. Custom is the one row that opens something. */}
            <div className="space-y-2" role="radiogroup" aria-label="Pickup window">
              {windows.map((w) => (
                <PackOption
                  key={w}
                  active={!cart.specialPickup && cart.pickupWindow === w}
                  onClick={() => {
                    // Stays open on purpose: the windows are a comparison, and
                    // folding the list on the first tap makes changing your mind
                    // cost a re-open. The segment is what closes it.
                    cart.setPickupWindow(w);
                    setCustomOpen(false);
                  }}
                  // No "Included — no extra charge" per row: the notice above
                  // already says an included window is free, and repeating it
                  // three times turned each option into two lines to say a time.
                  title={w}
                />
              ))}
              <PackOption
                active={cart.specialPickup}
                onClick={() => setCustomOpen(true)}
                title="Custom pickup time"
                subtitle={
                  cart.specialPickup && cart.pickupWindow
                    ? cart.pickupWindow
                    : "Outside the windows above — pick your own."
                }
                trailing={`+${formatCurrency(specialFee)}`}
              />
            </div>
          </div>
        </RowPanel>
      ) : null}

      {/* The one thing on this page that still opens a dialog. Naming a day and
          a time is a detour off the window list, not a refinement of it — and
          unlike every other panel it can't apply live, since three fields have
          to agree before there's a label to save. */}
      {customOpen ? (
        <CustomPickupModal
          fee={specialFee}
          onSave={(label) => cart.setCustomPickup(label)}
          onClose={() => setCustomOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * Pickup day + window for an out-of-window collection. Its own dialog because
 * the three fields compose into a single label — there is nothing to apply until
 * all of them agree, so there is nothing to show on the row until Save.
 *
 * State lives here rather than in the row above, so every open starts on a blank
 * form instead of whatever was half-typed and abandoned last time.
 */
function CustomPickupModal({
  fee,
  onSave,
  onClose,
}: {
  fee: number;
  onSave: (label: string) => void;
  onClose: () => void;
}) {
  const [shown, setShown] = React.useState(false);
  const [date, setDate] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");

  /**
   * Themed day + time pickers rather than `<input type="date">` / `type="time"`.
   * A native picker's popup is drawn by the browser — an OS calendar and an OS
   * spinner that no CSS reaches. See `datetime-fields.tsx`: same month grid and
   * same hour/minute/meridiem columns, in the site's paint.
   */
  const todayISO = toISODate(startOfToday());

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

  // Valid once a day and a start are set; if an end is given it must be later.
  const orderedTimes = !end || start < end;
  const valid = Boolean(date && start && orderedTimes);
  const label = valid
    ? `${formatDay(fromISODate(date))}, ${formatTime(start)}${end ? ` – ${formatTime(end)}` : ""}`
    : "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-3xl bg-card text-left shadow-raised transition-all duration-200",
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        {/* Plain hairline header — the teal band is for the page's section cards
            (see SECTION_HEADER); every dialog in the app wears white. */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <Clock className="size-4 shrink-0 text-primary" /> Custom pickup time
            </h3>
            <p className="text-[13px] text-muted-foreground">
              Choose any day and time that works for you. Adds a {formatCurrency(fee)} fee.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* No `overflow-y-auto`: the selects' lists are absolutely positioned and
            a scroll container would clip them. Three fields never need to scroll. */}
        <div className="min-h-0 flex-1 space-y-4 p-5">
          {/* The day is one answer and the times are a pair, so the layout says
              so: a full row for the date, then From and To side by side.
              No `htmlFor` — these are buttons, not inputs; each carries its own
              aria-label, and a label pointing at nothing is worse than none. */}
          <Field>
            <Label>Pickup day</Label>
            <DateField value={date} onChange={setDate} min={todayISO} aria-label="Pickup day" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <Label>From</Label>
              <TimeField value={start} onChange={setStart} aria-label="Pickup start time" />
            </Field>
            <Field>
              <Label>To (optional)</Label>
              <TimeField
                value={end}
                onChange={setEnd}
                placeholder="No end time"
                aria-label="Pickup end time"
              />
            </Field>
          </div>
          {end && !orderedTimes ? (
            <p className="text-2xs font-medium text-danger">
              The end time must be after the start time.
            </p>
          ) : null}
          {label ? (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[13px]">
              <span className="text-muted-foreground">Pickup:</span>{" "}
              <strong className="text-foreground">{label}</strong>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 rounded-b-3xl border-t border-border bg-card p-5">
          <Button
            block
            size="lg"
            disabled={!valid}
            onClick={() => {
              if (!valid) return;
              onSave(label);
              onClose();
            }}
          >
            Save pickup time
          </Button>
        </div>
      </div>
    </div>
  );
}

/** "17:30" (a 24h `<input type="time">` value) → "5:30 PM". */
function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Where the reusable containers get collected. Two steps behind one dialog: the
 * included (free) windows, and — when none of them work — a day and time the user
 * names themselves.
 *
 * The custom step *replaces* the list rather than opening a second dialog over
 * it. It's the same question answered a different way, and stacking would leave
 * someone two Escapes deep in a choice that should cost one.
 */

function PackOption({
  active,
  onClick,
  title,
  subtitle,
  trailing,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  trailing?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // It draws a radio dot and lives in a `radiogroup`; without these it was
      // announced as a plain button, so nothing conveyed which option was
      // chosen except the colour.
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-[13px] transition-colors",
        active ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          active ? "border-primary" : "border-border",
        )}
      >
        {active ? <span className="size-2.5 rounded-full bg-primary" /> : null}
      </span>
      {icon ?? null}
      <span className="min-w-0 flex-1">
        <strong>{title}</strong>
        {subtitle ? <span className="block text-muted-foreground">{subtitle}</span> : null}
      </span>
      {trailing ? (
        <span className="shrink-0 whitespace-nowrap text-2xs font-semibold text-muted-foreground">
          {trailing}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Promo-code entry above "Place order". Shows an input + Apply button while no
 * code is active; once applied it collapses into a removable success chip.
 */

/**
 * Promo entry, as a sheet. The field used to sit under the total in the rail,
 * which meant the one control that changes the total lived in the panel that
 * only reports it.
 */

/**
 * Promo entry, inline. Lives in the rail with the total it moves — the one
 * control on this page whose whole job is to change the number above it.
 */
function PromoPanel({
  promo,
  value,
  error,
  onChange,
  onApply,
  onRemove,
}: {
  promo: AppliedPromo | null;
  value: string;
  error: string;
  onChange: (v: string) => void;
  onApply: () => void;
  onRemove: () => void;
}) {
  if (promo) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-success-border bg-success-bg px-3 py-2.5 text-[13px]">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="truncate">
            {promo.code} applied · {promo.label}
          </span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove promo code ${promo.code}`}
          className="touch-target shrink-0 rounded-full p-1 text-success/80 transition-colors hover:bg-success/10 hover:text-success"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-xl border bg-card p-1.5 transition-colors focus-within:border-primary",
          error ? "border-danger-border" : "border-border",
        )}
      >
        <Tag className="ml-1.5 size-4 shrink-0 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onApply();
            }
          }}
          placeholder="Promo code"
          aria-label="Promo code"
          spellCheck={false}
          autoFocus
          className="h-9 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/70 sm:h-8 sm:text-[13px]"
        />
        <Button size="sm" variant="teal" onClick={onApply} disabled={!value.trim()}>
          Apply
        </Button>
      </div>
      {error ? (
        <p className="flex items-center gap-1 px-1 text-2xs font-medium text-danger">
          <XCircle className="size-3 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}