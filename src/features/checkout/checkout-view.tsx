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
  ShoppingBag,
  X,
  Pencil,
  XCircle,
  AlertTriangle,
  Tag,
  ArrowRight,
  Package,
  Recycle,
  Leaf,
  ChevronRight,
  MessageSquare,
  Building2,
  Plus,
  Trash2,
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
import { useCheckoutProgress } from "@/features/checkout/use-checkout-progress";
import {
  useSessionStore,
  isSubsidized,
  deliveryComplete,
  type Account,
} from "@/store/use-session-store";
import { useCartStore, type PackagingChoice } from "@/store/use-cart-store";
import { useCardsStore, type SavedCard } from "@/store/use-cards-store";
import {
  brandLabel,
  cardDigits,
  cardNumberValid,
  cvcLength,
  cvcValid,
  detectBrand,
  expiryValid,
  formatCardNumber,
  formatExpiry,
  type CardBrand,
} from "@/lib/card";
import { toast } from "@/store/use-toast-store";
import { program, addresses, getAddress, reusablePackagingFee } from "@/data/program";
import { checkZip, deliveryFeeForZip } from "@/data/service-areas";
import { me } from "@/data/me";
import { fromISODate, formatDay, startOfToday, toISODate, addDays } from "@/lib/dates";
import { CutoffIndicator } from "@/components/cutoff/cutoff-indicator";
import { useDialog } from "@/lib/use-dialog";
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
   * Payment opens a dialog rather than a panel: a card form is its own
   * focus-trapping surface, and it needs a container it can own rather than a
   * row that folds shut underneath it.
   */
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  /**
   * The card the order would be charged to — the wallet's selection, restored
   * from the last order, so a returning customer arrives with payment already
   * answered instead of retyping sixteen digits.
   */
  const savedCards = useCardsStore((s) => s.cards);
  const selectedCardId = useCardsStore((s) => s.selectedId);
  const selectedCard = savedCards.find((c) => c.id === selectedCardId) ?? null;
  /**
   * Deferring to a company invoice has no card to point at, so it needs its own
   * record of having been chosen — the pay-later default is what this page
   * *assumed*, and assuming is not consenting.
   */
  const [invoiceConfirmed, setInvoiceConfirmed] = React.useState(false);
  /** Where "Enter payment" scrolls to — the Payment section, not the dialog. */
  const paymentRef = React.useRef<HTMLDivElement>(null);
  const [openRow, setOpenRow] = React.useState<RowName | null>(null);
  const toggleRow = React.useCallback(
    (r: RowName) => setOpenRow((cur) => (cur === r ? null : r)),
    [],
  );
  const closeRow = React.useCallback(() => setOpenRow(null), []);

  /**
   * The gate to placing an order: the first step still unmet (sign in, or an
   * individual's delivery address), or null when the order is ready. The docked
   * CTA reads it to decide whether a tap places the order or jumps to the field
   * at fault — so a blocked button leads somewhere instead of sitting greyed out.
   *
   * Derived above the early returns below — Rules of Hooks — so it's computed on
   * every render, blocked or ready.
   */
  const { firstIncomplete } = useCheckoutProgress();

  /**
   * The tap that clears the first incomplete step: open the sign-in dialog, or
   * open and scroll to the address row. Fired by the docked CTA when the order
   * isn't ready to place yet.
   */
  const runStep = React.useCallback(
    (id: string) => {
      if (id === "identity") setIdentityOpen(true);
      else if (id === "address") setOpenRow("address");
    },
    [setOpenRow],
  );

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
      : cart.packaging === "compostable"
        ? "Compostable · nothing to return"
        : "Disposable · nothing to return";

  /**
   * The last gate, after the session checklist: a balance to settle and nothing
   * to settle it with — no card in the wallet, or an invoice nobody has opted
   * into. Nothing owed means nothing to choose, so a fully covered order never
   * waits on this.
   */
  const paymentPending =
    finalOwed > 0 &&
    (effectivePayment === "pay_later" ? !invoiceConfirmed : !selectedCard);

  const paymentValue =
    corporate && owed === 0
      ? `Fully covered by ${program.company}`
      : effectivePayment === "pay_later"
        ? "Company invoice · nothing to pay now"
        : selectedCard
          ? `${brandLabel(selectedCard.brand)} •••• ${selectedCard.last4}`
          : "Add a card";

  /**
   * The docked CTA's label — the next unmet step while blocked, else the commit.
   */
  const ctaLabel = firstIncomplete
    ? firstIncomplete.label
    : paymentPending
      ? "Enter payment"
      : editActive
        ? "Save changes"
        : "Place order";

  /** True while the tap leads somewhere rather than commits. */
  const ctaLeads = Boolean(firstIncomplete) || paymentPending;

  /**
   * The one primary action the docked bar fires. While the checklist has a hole
   * it jumps to that step instead of placing the order; only once every step is
   * clear does it place (or, mid-edit, save). A blocked button that leads
   * somewhere beats a disabled one that only tells you it can't.
   */
  function primaryAction() {
    if (firstIncomplete) {
      runStep(firstIncomplete.id);
      return;
    }
    // Scroll to the section rather than throwing the dialog straight up: the
    // Payment card carries the charge-timing promise and the flagged row, and
    // someone deciding how to pay should see both before the sheet covers them.
    if (paymentPending) {
      paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    placeOrder();
  }

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

          {/* Wrapped so "Enter payment" has something to scroll to — Card takes no
              ref, and `scroll-mt-20` keeps the heading clear of the topbar. */}
          <div ref={paymentRef} className="scroll-mt-20">
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
                /* Not flagged amber while it waits. Yellow on this card read as
                   a warning about the payment itself — a card problem — when
                   nothing is wrong; the row simply hasn't been answered yet.
                   "Choose how to pay" says that, and the docked CTA that scrolls
                   here says the rest. */
                /* Never disabled, even with one method: this row is where someone
                   checks which card is about to be charged, and a greyed-out row
                   answers that by refusing to open. */
                onClick={() => setPaymentOpen(true)}
              />
            </RowGroup>
          </Card>
          </div>
        </div>

        {/* Summary. On desktop the rail sticks and the *item list* is what
            scrolls inside it — capping the whole card would let a seven-day cart
            push Place order below the viewport with no way to reach it, which is
            exactly the failure the sticky rail exists to prevent. Header and
            totals+CTA are shrink-0; only the middle gives.

            The sticky offset is the content well's own top — the topbar plus
            `main`'s `py-6` — so this card's resting place and its stuck place are
            the same line, and it starts level with Cutoff check beside it. Any
            larger and sticky would shunt it *down* the difference at scroll 0,
            leaving it hanging below the left column. The max-height is keyed to
            the same offset: it's what keeps the card's foot 1rem clear of the
            viewport, so the two move together. */}
        <div>
          <Card
            className={cn(
              "lg:sticky lg:top-[calc(var(--topbar-h)_+_1.5rem)] lg:flex lg:max-h-[calc(100dvh_-_var(--topbar-h)_-_2.5rem)] lg:flex-col",
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

          `bottom-dock` rests it on the viewport floor; `pb-safe` keeps the
          iPhone home indicator off it. */}
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
            onClick={primaryAction}
            className="min-w-0 shrink lg:min-w-[16rem]"
          >
            <span className="truncate">{ctaLabel}</span>
            {/* An arrow when the tap leads to the next step rather than commits —
                the button is taking you somewhere, not refusing you. */}
            {ctaLeads ? <ArrowRight className="size-4 shrink-0" /> : null}
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
          /* Picking a method *is* entering payment — a saved card or an opted-in
             invoice is what flips the docked CTA to the commit. */
          onChange={(p) => {
            setPayment(p);
            if (p === "pay_later") setInvoiceConfirmed(true);
          }}
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
 *
 * An open row keeps the card's white: the turned chevron and the panel unfolded
 * beneath it already say which row is open, and tinting the row on top of that
 * only broke the white run of the rows around it.
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
      className="flex w-full scroll-mt-20 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55"
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
            inputMode="tel"
            placeholder="+1 (555) 123-4567"
            autoComplete="tel"
          />
        </Field>
      </div>

      {/* `role="alert"` (assertive) rather than a polite region: this appears
          asynchronously, after the ZIP lookup resolves, and it blocks the order
          outright. Waiting for a pause in speech would let someone carry on
          filling the form toward a checkout that can't dispatch. */}
      {zipStatus === "unserviceable" ? (
        <Notice tone="warning" role="alert">
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
 * How you're paying: the wallet, and the form that adds to it.
 *
 * A dialog, not a panel. A card form is a hosted, focus-trapping surface in any
 * real integration, and it can't live in a row that folds shut under it while
 * it's collecting a number. Same reason it opens even when there's only one
 * saved card: this is where someone checks *which card is about to be charged*,
 * and a row that refuses to open doesn't answer that.
 *
 * Nothing here is charged. The card is captured now and charged 24 hours before
 * delivery, which is what the note under the title promises.
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
  const cards = useCardsStore((s) => s.cards);
  const selectedId = useCardsStore((s) => s.selectedId);
  const selectCard = useCardsStore((s) => s.select);
  const removeCard = useCardsStore((s) => s.remove);

  /**
   * An empty wallet opens straight into the form: a list holding one "Add a
   * card" button is a menu whose only item is "open the thing you actually
   * wanted". Unless there's an invoice to defer to — then there *is* a choice,
   * and opening on the form would hide the option that needs no card at all.
   */
  const [adding, setAdding] = React.useState(cards.length === 0 && !payLaterAvailable);

  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Mounted only while it's up, so it's open for its whole life.
  const dialog = useDialog({ open: true, onClose });

  function useCard(id: string) {
    selectCard(id);
    onChange("pay_now");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      {/* The dialog is the panel, not the box that also holds the scrim, so the
          trap ends where the panel does. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Payment method"
        {...dialog.props}
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
              <CreditCard className="size-4 shrink-0 text-primary" />
              {adding && !covered ? "Add a card" : "Payment method"}
            </h3>
            <p className="text-[13px] text-muted-foreground">
              {covered
                ? "Nothing to pay on this order."
                : "Charged 24 hours before delivery — nothing today."}
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
          ) : adding ? (
            <CardForm
              onSaved={onClose}
              /* No way back out of the form when the wallet is empty — "Cancel"
                 would land on an empty list with nothing to do but re-open it. */
              onCancel={cards.length ? () => setAdding(false) : undefined}
            />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2" role="radiogroup" aria-label="Payment method">
                {cards.map((card) => (
                  <SavedCardRow
                    key={card.id}
                    card={card}
                    active={value === "pay_now" && card.id === selectedId}
                    onSelect={() => useCard(card.id)}
                    onRemove={() => removeCard(card.id)}
                  />
                ))}

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

              <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
                <Plus className="size-4" /> Add a card
              </Button>

              <SecurityNote />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * One saved card: the radio that charges it, and a separate control that forgets
 * it. Two buttons side by side rather than one inside the other — a button
 * nested in a button is invalid, and the inner one swallows the tap that was
 * meant for the row.
 */
function SavedCardRow({
  card,
  active,
  onSelect,
  onRemove,
}: {
  card: SavedCard;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const expired = isExpired(card);
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl border pr-1.5 transition-colors",
        active ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left text-[13px]"
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border",
            active ? "border-primary" : "border-border",
          )}
        >
          {active ? <span className="size-2.5 rounded-full bg-primary" /> : null}
        </span>
        <BrandMark brand={card.brand} />
        <span className="min-w-0 flex-1">
          <strong className="nums">•••• {card.last4}</strong>
          <span className={cn("block text-2xs", expired ? "text-danger" : "text-muted-foreground")}>
            {expired ? "Expired" : "Expires"} {expiryLabel(card)} · {card.name}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove card ending ${card.last4}`}
        className="shrink-0 rounded-full touch-target p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/** `08/2029` → `08/29`, the way it's printed on the card. */
function expiryLabel(card: SavedCard) {
  return `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`;
}

/** A card is good through the last day of its printed month. */
function isExpired(card: SavedCard) {
  return new Date(card.expYear, card.expMonth, 1) <= new Date();
}

/**
 * The brand, as a wordmark rather than a logo. Real marks are trademarked
 * artwork we don't have licence to ship, and a generic card glyph on every row
 * makes four saved cards look identical at a glance — the name is what tells
 * them apart.
 */
function BrandMark({ brand }: { brand: CardBrand }) {
  return (
    <span className="flex h-7 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
      {brandLabel(brand)}
    </span>
  );
}

/** What happens to the number after Save. Said once, where it's being typed. */
function SecurityNote() {
  return (
    <p className="flex items-start gap-1.5 text-2xs text-muted-foreground">
      <Lock className="mt-px size-3 shrink-0 text-success" />
      Encrypted in transit. We keep only the brand, the last four digits and the expiry — never
      the full number or the security code.
    </p>
  );
}

/**
 * The card form. Everything here is checked in the browser before anything is
 * sent: the brand comes from the leading digits, the number has to pass its own
 * checksum, and the expiry has to be a month that hasn't happened. A typo caught
 * under the field beats a decline several seconds later with no explanation.
 *
 * Errors appear on blur, not on every keystroke — a half-typed card number is
 * invalid by definition, and saying so while it's being typed is nagging.
 */
function CardForm({ onSaved, onCancel }: { onSaved: () => void; onCancel?: () => void }) {
  const addCard = useCardsStore((s) => s.add);

  const [number, setNumber] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [cvc, setCvc] = React.useState("");
  const [name, setName] = React.useState("");
  const [zip, setZip] = React.useState("");
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const brand = detectBrand(number);
  const errors = {
    number: cardNumberValid(number) ? "" : "Check this card number.",
    expiry: expiryValid(expiry) ? "" : "Use a future MM/YY.",
    cvc: cvcValid(cvc, brand) ? "" : `${cvcLength(brand)} digits, from the back of the card.`,
    name: name.trim() ? "" : "Add the name as printed.",
    zip: /^\d{5}$/.test(zip) ? "" : "5-digit billing ZIP.",
  };
  const valid = Object.values(errors).every((e) => !e);
  const show = (field: keyof typeof errors) => (touched[field] ? errors[field] : "");
  const blur = (field: string) => () => setTouched((t) => ({ ...t, [field]: true }));

  function save() {
    if (!valid) {
      // Reveal every hole at once rather than one per attempt.
      setTouched({ number: true, expiry: true, cvc: true, name: true, zip: true });
      return;
    }
    const digits = cardDigits(expiry);
    addCard({
      brand,
      // The only part of the number that's kept — see `use-cards-store`.
      last4: cardDigits(number).slice(-4),
      expMonth: Number(digits.slice(0, 2)),
      expYear: 2000 + Number(digits.slice(2)),
      name: name.trim(),
      zip,
    });
    toast.success("Card saved", `${brandLabel(brand)} ending ${cardDigits(number).slice(-4)}.`);
    onSaved();
  }

  return (
    <div className="space-y-3">
      <Field>
        <Label htmlFor="c-number">Card number</Label>
        <div className="relative">
          <Input
            id="c-number"
            value={number}
            onChange={(e) => setNumber(formatCardNumber(e.target.value))}
            onBlur={blur("number")}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 5678 9012 3456"
            aria-invalid={Boolean(show("number"))}
            className={cn("pr-16", show("number") && "border-danger")}
            autoFocus
          />
          {/* The brand appears as soon as the leading digits say what it is —
              the same confirmation a card reader gives you. */}
          {brand !== "unknown" ? (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <BrandMark brand={brand} />
            </span>
          ) : null}
        </div>
        <FieldError message={show("number")} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="c-expiry">Expiry</Label>
          <Input
            id="c-expiry"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            onBlur={blur("expiry")}
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            aria-invalid={Boolean(show("expiry"))}
            className={cn(show("expiry") && "border-danger")}
          />
          <FieldError message={show("expiry")} />
        </Field>
        <Field>
          <Label htmlFor="c-cvc">{brand === "amex" ? "CID" : "CVC"}</Label>
          <Input
            id="c-cvc"
            value={cvc}
            onChange={(e) => setCvc(cardDigits(e.target.value).slice(0, cvcLength(brand)))}
            onBlur={blur("cvc")}
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder={brand === "amex" ? "4 digits" : "3 digits"}
            aria-invalid={Boolean(show("cvc"))}
            className={cn(show("cvc") && "border-danger")}
          />
          <FieldError message={show("cvc")} />
        </Field>
      </div>

      <Field>
        <Label htmlFor="c-name">Name on card</Label>
        <Input
          id="c-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={blur("name")}
          autoComplete="cc-name"
          placeholder="Sam Rivera"
          aria-invalid={Boolean(show("name"))}
          className={cn(show("name") && "border-danger")}
        />
        <FieldError message={show("name")} />
      </Field>

      <Field>
        <Label htmlFor="c-zip">Billing ZIP</Label>
        <Input
          id="c-zip"
          value={zip}
          onChange={(e) => setZip(cardDigits(e.target.value).slice(0, 5))}
          onBlur={blur("zip")}
          inputMode="numeric"
          autoComplete="billing postal-code"
          placeholder="94105"
          aria-invalid={Boolean(show("zip"))}
          className={cn(show("zip") && "border-danger")}
        />
        {/* Why we're asking, so it doesn't read as one more field for its own
            sake: the ZIP is what the bank checks the charge against. The hint
            steps aside for the error rather than stacking two lines under one
            field. */}
        {show("zip") ? (
          <FieldError message={show("zip")} />
        ) : (
          <p className="mt-1 text-2xs text-muted-foreground">
            Checked against your bank&apos;s records when the card is charged.
          </p>
        )}
      </Field>

      <SecurityNote />

      <div className="flex gap-2 pt-1">
        {onCancel ? (
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {/* Never disabled: a greyed-out Save leaves someone tapping a dead button
            with no idea which field is wrong. It presses, and points. */}
        <Button className="flex-1" onClick={save}>
          <Lock className="size-4" /> Save card
        </Button>
      </div>
    </div>
  );
}

/** One field's complaint, in the one place complaints appear. */
function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-2xs font-medium text-danger">
      {message}
    </p>
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
  const card = useCardsStore((s) => s.cards.find((c) => c.id === s.selectedId) ?? null);

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
            /* Names the card that will actually be charged — "your card" is the
               one detail someone re-reads a confirmation for. */
            <>
              We&apos;ll charge{" "}
              {card ? `your ${brandLabel(card.brand)} •••• ${card.last4}` : "your card"}{" "}
              {formatCurrency(owed)} 24 hours before delivery.
            </>
          )}
        </p>

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
 * How an individual order is packed: single-trip disposable, single-trip
 * compostable, or reusable containers that come back to the kitchen. Only
 * reusable arranges anything — it adds a flat fee that scales with container
 * count and needs a pickup window, and a pickup outside the admin's included
 * windows adds a ZIP-based fee. Every charge lands in the checkout total; there
 * is no deposit-and-refund.
 *
 * A row that opens a panel, not a segmented control. Two choices fit on the row
 * beside the label; three don't — the segments wrapped or squeezed the value out
 * on a phone — and each of these needs a line explaining what happens to the
 * container afterwards, which is the whole difference between disposable and
 * compostable. Same shape as the address and payment rows around it.
 *
 * Renders a fragment so the row and its panel land as siblings in the RowGroup
 * and the group's hairline divider falls between them like every other row.
 */
function PackagingRow({ zip, value }: { zip: string; value: string }) {
  const cart = useCartStore();
  const windows = program.reusablePackaging.includedPickupWindows;
  const qty = cart.packagingQty();
  const fee = reusablePackagingFee(qty);
  const specialFee = deliveryFeeForZip(zip);

  const [open, setOpen] = React.useState(false);
  const [customOpen, setCustomOpen] = React.useState(false);

  /**
   * Reusable containers have to get back to the kitchen, so choosing reusable
   * settles a default window in the same tap — the pickup question is part of
   * the choice, not a follow-up someone has to think to go looking for. Leaving
   * reusable drops the pickup (the store does that) and closes the custom-time
   * dialog with it.
   *
   * The panel stays open on a tap: the three options are a comparison, and
   * folding it on the first one makes changing your mind cost a re-open.
   */
  function choose(next: PackagingChoice) {
    cart.setPackaging(next);
    if (next === "reusable") {
      if (!cart.pickupWindow && !cart.specialPickup) cart.setPickupWindow(windows[0] ?? "");
    } else {
      setCustomOpen(false);
    }
  }

  const reusable = cart.packaging === "reusable";
  const Icon = reusable ? Recycle : cart.packaging === "compostable" ? Leaf : Package;

  return (
    <>
      <SettingRow
        icon={Icon}
        label="Packaging"
        value={value}
        expanded={open}
        onClick={() => setOpen((o) => !o)}
      />

      {open ? (
        <RowPanel>
          <div className="space-y-3">
            <div className="space-y-2" role="radiogroup" aria-label="Packaging">
              {/* Both single-trip options say what happens to the container
                  after the meal — that's the only thing separating them, and
                  "Disposable" vs "Compostable" alone leaves it to be guessed. */}
              <PackOption
                active={cart.packaging === "disposable"}
                onClick={() => choose("disposable")}
                title="Disposable"
                subtitle="Recyclable containers. Nothing to return."
                trailing="Free"
              />
              <PackOption
                active={cart.packaging === "compostable"}
                onClick={() => choose("compostable")}
                title="Compostable"
                subtitle="Plant-based containers for your compost or green bin."
                trailing="Free"
              />
              <PackOption
                active={reusable}
                onClick={() => choose("reusable")}
                title="Reusable"
                subtitle="Sturdy containers we collect at a pickup you choose."
                trailing={qty > 0 ? formatCurrency(fee) : "Free"}
              />
            </div>

            {/* Only reusable has a follow-up, and it unfolds under the option
                that caused it rather than in a sheet of its own. */}
            {reusable ? (
              <div className="space-y-3 border-t border-border pt-3">
                {/* At the top, and highlighted: this is what reusable *costs*, and
                    at the foot of the list it was a footnote to a decision already
                    made. */}
                <Notice tone="info" className="text-xs">
                  Reusable packaging is{" "}
                  <strong className="font-semibold">
                    {qty > 0 ? formatCurrency(fee) : "free"}
                  </strong>{" "}
                  for {qty} {qty === 1 ? "meal" : "meals"}, added to your total. Pickup in an
                  included window is free; a custom time adds {formatCurrency(specialFee)}.
                </Notice>

                <div className="text-overline">Pickup window</div>
                {/* Tapping a window is the answer — it applies in place, no Save
                    to hunt for. Custom is the one row that opens something. */}
                <div className="space-y-2" role="radiogroup" aria-label="Pickup window">
                  {windows.map((w) => (
                    <PackOption
                      key={w}
                      active={!cart.specialPickup && cart.pickupWindow === w}
                      onClick={() => {
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
            ) : null}
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
  // Mounted only while it's up, so it's open for its whole life.
  const dialog = useDialog({ open: true, onClose });

  // Valid once a day and a start are set; if an end is given it must be later.
  const orderedTimes = !end || start < end;
  const valid = Boolean(date && start && orderedTimes);
  const label = valid
    ? `${formatDay(fromISODate(date))}, ${formatTime(start)}${end ? ` – ${formatTime(end)}` : ""}`
    : "";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      {/* The dialog is the panel, not the box that also holds the scrim, so the
          trap ends where the panel does. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Custom pickup time"
        {...dialog.props}
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