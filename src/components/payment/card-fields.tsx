"use client";

import * as React from "react";
import { AlertCircle, CreditCard, Info, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Field } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { useDialog } from "@/lib/use-dialog";
import { useCardsStore, type SavedCard } from "@/store/use-cards-store";
import {
  STRICT_CARD_VALIDATION,
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
import { cn } from "@/lib/utils";

/**
 * The card's shared parts — the form that captures one and the row a saved one
 * is shown in. Checkout captures a card mid-order; Account keeps the same card
 * between orders. Both are the same card, so they're the same component: a
 * second copy of a payment form is a second place a validation rule can go
 * stale.
 */

/**
 * The saved card, as a row.
 *
 * With `onSelect` it's a radio — checkout, where the card sits beside "company
 * invoice" and one of them wins. Without it, it's a plain summary: Account holds
 * exactly one card, and a radio group of one is a control that asks a question
 * with a single answer.
 *
 * Change card and Remove sit at the row's end, beside each other — they act on
 * *this* card, so they belong to it rather than to the section heading above it.
 * Both are siblings of the row's own button rather than nested inside it: a
 * button inside a button is invalid, and the inner one swallows the tap meant
 * for the row.
 */
export function SavedCardRow({
  card,
  active = false,
  onSelect,
  onReplace,
  onRemove,
}: {
  card: SavedCard;
  active?: boolean;
  onSelect?: () => void;
  onReplace?: () => void;
  onRemove?: () => void;
}) {
  const expired = isExpired(card);
  const selectable = Boolean(onSelect);

  const body = (
    <>
      {selectable ? (
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border",
            active ? "border-primary" : "border-control",
          )}
        >
          {active ? <span className="size-2.5 rounded-full bg-primary" /> : null}
        </span>
      ) : null}
      <BrandMark brand={card.brand} />
      {/* Truncates rather than wraps: a radio, a brand chip, two actions and a
          long name on the same 430px row otherwise pushes the card onto three
          lines, and the name is the least of what's being read here. */}
      <span className="min-w-0 flex-1">
        <strong className="block truncate nums">•••• {card.last4}</strong>
        <span
          className={cn(
            "block truncate text-2xs",
            expired ? "text-danger" : "text-muted-foreground",
          )}
        >
          {expired ? "Expired" : "Expires"} {expiryLabel(card)} · {card.name}
        </span>
      </span>
    </>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl border pr-1.5 transition-colors",
        active ? "border-primary bg-teal-wash" : "border-control bg-card",
        selectable && !active ? "hover:bg-muted/50" : null,
      )}
    >
      {selectable ? (
        <button
          type="button"
          role="radio"
          aria-checked={active}
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left text-[13px]"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 p-3 text-[13px]">{body}</div>
      )}
      {/* Carries its words as well as its glyph: a lone pencil beside a bin
          reads as "edit these digits", and there is nothing here to edit — the
          number was never kept. It swaps the card for a different one. */}
      {onReplace ? (
        <button
          type="button"
          onClick={onReplace}
          aria-label={`Change card ending ${card.last4}`}
          className="flex shrink-0 items-center gap-1 rounded-full touch-target px-2 py-1.5 text-2xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          <RefreshCw className="size-3.5" />
          Change card
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove card ending ${card.last4}`}
          className="shrink-0 rounded-full touch-target p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/** `08/2029` → `08/29`, the way it's printed on the card. */
export function expiryLabel(card: SavedCard) {
  return `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`;
}

/** A card is good through the last day of its printed month. */
export function isExpired(card: SavedCard) {
  return new Date(card.expYear, card.expMonth, 1) <= new Date();
}

/**
 * The brand, as a wordmark rather than a logo. Real marks are trademarked
 * artwork we don't have licence to ship, and a generic card glyph tells you
 * nothing the row doesn't already say.
 *
 * So the name has to *fit*: one chip width with one type size cropped
 * "MASTERCARD" against its own border. Each brand carries its own size and
 * tracking instead, and its own colour — near enough to the issuer's that the
 * chip is recognised before it's read, which is the whole job of a mark.
 */
const BRAND_MARK: Record<CardBrand, { className: string }> = {
  visa: { className: "border-[#1434cb]/20 bg-[#1434cb]/[0.07] text-[#1434cb] text-[11px] tracking-[0.1em]" },
  mastercard: { className: "border-[#a8442a]/20 bg-[#a8442a]/[0.07] text-[#a8442a] text-[7.5px] tracking-tight" },
  amex: { className: "border-[#006fcf]/20 bg-[#006fcf]/[0.07] text-[#006fcf] text-[11px] tracking-[0.06em]" },
  discover: { className: "border-[#e35205]/25 bg-[#e35205]/[0.07] text-[#c2450a] text-[8.5px] tracking-tight" },
  unknown: { className: "border-border bg-muted text-muted-foreground text-[9px] tracking-wide" },
};

/** Width of the brand chip, in the row and inside the card box alike. */
export const BRAND_MARK_WIDTH = "w-14";

export function BrandMark({ brand }: { brand: CardBrand }) {
  return (
    <span
      className={cn(
        "flex h-7 shrink-0 items-center justify-center rounded-md border font-bold uppercase leading-none",
        BRAND_MARK_WIDTH,
        BRAND_MARK[brand].className,
      )}
    >
      {brandLabel(brand)}
    </span>
  );
}

/** What happens to the number after Save. Said once, where it's being typed. */
export function SecurityNote() {
  return (
    <p className="flex items-start gap-1.5 text-2xs text-muted-foreground">
      <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" />
      <span>
        Encrypted in transit. We keep only the brand, the last four digits and the expiry — never
        the full number or the security code.
      </span>
    </p>
  );
}

/** Shared by the three cells of the card box: a field with no chrome of its own. */
const BARE_INPUT =
  "w-full border-0 bg-transparent p-0 text-base leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm";

/**
 * The card form.
 *
 * Number, expiry and code share one bordered box, split by hairlines, the way
 * every card reader and hosted card field is laid out — three separate framed
 * inputs read as three unrelated questions, when they're one number copied off
 * one piece of plastic. The box is what takes the focus ring and the error
 * state, so the whole thing lights up together.
 *
 * One line sits under the box and does the talking for all three cells: the
 * error if there is one, otherwise the next thing left to fill in. Three
 * separate error slots inside a box that's four rows tall would push the
 * cells apart every time one appeared.
 *
 * The checks it *can* apply are real ones — brand from the leading digits, the
 * number's own Luhn checksum, an expiry that hasn't happened — and a typo caught
 * under the field beats a decline several seconds later with no explanation.
 * They're switched off here: {@link STRICT_CARD_VALIDATION} is false while this
 * is a demo, so any number, expiry and code are accepted and the only thing
 * asked for is *some* number to take a last-four from. Flipping that one
 * constant restores every rule below.
 *
 * Formatting and the brand chip stay on regardless — they help someone type a
 * number rather than refuse the one they typed.
 *
 * Errors, when enforced, appear on blur rather than on every keystroke: a
 * half-typed card number is invalid by definition, and saying so mid-type is
 * nagging.
 *
 * `idPrefix` namespaces the label/input pairs so a second instance elsewhere on
 * a page can never steal the first one's labels.
 */
export function CardForm({
  onSaved,
  onCancel,
  idPrefix = "c",
  autoFocus = true,
  saveLabel = "Save card",
}: {
  onSaved: () => void;
  onCancel?: () => void;
  idPrefix?: string;
  autoFocus?: boolean;
  saveLabel?: string;
}) {
  const saveCard = useCardsStore((s) => s.save);

  const [number, setNumber] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [cvc, setCvc] = React.useState("");
  const [name, setName] = React.useState("");
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const brand = detectBrand(number);
  const cvcName = brand === "amex" ? "CID" : "CVV";
  const errors = STRICT_CARD_VALIDATION
    ? {
        number: cardNumberValid(number) ? "" : "Check this card number.",
        expiry: expiryValid(expiry) ? "" : "Use a future MM/YY.",
        cvc: cvcValid(cvc, brand) ? "" : `${cvcLength(brand)} digits, from the back of the card.`,
        name: name.trim() ? "" : "Add the name as printed.",
      }
    : {
        // Demo: the one thing still asked for is a digit to take a last-four
        // from, because a saved card reading "•••• " is not a card.
        number: cardDigits(number) ? "" : "Type any number to continue.",
        expiry: "",
        cvc: "",
        name: "",
      };
  const valid = Object.values(errors).every((e) => !e);
  const show = (field: keyof typeof errors) => (touched[field] ? errors[field] : "");
  /**
   * A field complains after it's been *used* and left, not merely left. Leaving
   * an empty field is how anyone moves through a form — and inside a dialog the
   * focus trap itself blurs the autofocused number field on open, which was
   * enough to greet people with "type any number to continue" before they'd
   * touched anything. Empty fields are still caught: Save marks all of them.
   */
  const blur = (field: string, value: string) => () => {
    if (value.trim()) setTouched((t) => ({ ...t, [field]: true }));
  };

  // The box speaks with one voice: the first complaint among its three cells,
  // and failing that, the next cell still waiting on something.
  const boxError = show("number") || show("expiry") || show("cvc");
  const boxHint = !cardDigits(number)
    ? "Enter your card number"
    : cardDigits(expiry).length < 4
      ? "Enter the expiration date"
      : cardDigits(cvc).length < cvcLength(brand)
        ? `Enter the ${cvcName === "CID" ? "card ID" : "security"} code`
        : "";

  function save() {
    if (!valid) {
      // Reveal every hole at once rather than one per attempt.
      setTouched({ number: true, expiry: true, cvc: true, name: true });
      return;
    }
    const digits = cardDigits(expiry);
    saveCard({
      brand,
      // The only part of the number that's kept — see `use-cards-store`.
      last4: cardDigits(number).slice(-4),
      // Fall back rather than store `NaN` from a blank or half-typed expiry:
      // the row renders this, and "•••• 4242 · Expires NaN/NaN" is worse than a
      // placeholder date on a card that was never going to be charged.
      expMonth: Number(digits.slice(0, 2)) || 12,
      expYear: digits.length === 4 ? 2000 + Number(digits.slice(2)) : new Date().getFullYear() + 3,
      name: name.trim() || "Demo card",
    });
    toast.success("Card saved", `${brandLabel(brand)} ending ${cardDigits(number).slice(-4)}.`);
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div>
        {/* One frame around all three cells. The border is the error state and
            the focus ring for whichever cell is active, so the group reads as
            one control rather than three that happen to be stacked. */}
        <div
          className={cn(
            "overflow-hidden rounded-xl border bg-card transition-colors",
            boxError
              ? "border-danger ring-2 ring-danger/20"
              : "border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30",
          )}
        >
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            {/* The brand appears as soon as the leading digits say what it is —
                the same confirmation a card reader gives you. */}
            <BrandMark brand={brand} />
            <div className="min-w-0 flex-1">
              <label
                htmlFor={`${idPrefix}-number`}
                className="block text-[13px] font-semibold leading-tight text-foreground"
              >
                Card number
              </label>
              <input
                id={`${idPrefix}-number`}
                value={number}
                onChange={(e) => setNumber(formatCardNumber(e.target.value))}
                onBlur={blur("number", number)}
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 5678 9012 3456"
                aria-invalid={Boolean(show("number"))}
                aria-describedby={`${idPrefix}-card-msg`}
                autoFocus={autoFocus}
                className={cn(BARE_INPUT, "nums")}
              />
            </div>
          </div>

          {/* Expiry and code share a row, split down the middle: they're the two
              short things printed on the same card, and a full-width field for
              three digits invites a phone number. */}
          <div className="grid grid-cols-2 border-t border-input">
            <div className="border-r border-input px-3.5 py-2.5">
              <input
                id={`${idPrefix}-expiry`}
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                onBlur={blur("expiry", expiry)}
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                aria-label="Expiration date"
                aria-invalid={Boolean(show("expiry"))}
                aria-describedby={`${idPrefix}-card-msg`}
                className={cn(BARE_INPUT, "nums font-semibold placeholder:font-semibold placeholder:text-foreground/80")}
              />
            </div>
            <div className="px-3.5 py-2.5">
              <input
                id={`${idPrefix}-cvc`}
                value={cvc}
                onChange={(e) =>
                  setCvc(cardDigits(e.target.value).slice(0, STRICT_CARD_VALIDATION ? cvcLength(brand) : 4))
                }
                onBlur={blur("cvc", cvc)}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder={cvcName}
                aria-label={`Security code (${cvcName})`}
                aria-invalid={Boolean(show("cvc"))}
                aria-describedby={`${idPrefix}-card-msg`}
                className={cn(BARE_INPUT, "nums")}
              />
            </div>
          </div>
        </div>

        {/* The box's one message line. It keeps its height either way so the
            fields below don't jump when guidance turns into an error. */}
        {boxError || boxHint ? (
          <p
            id={`${idPrefix}-card-msg`}
            role={boxError ? "alert" : undefined}
            className={cn(
              "mt-1.5 flex items-center gap-1.5 text-2xs",
              boxError ? "font-medium text-danger" : "text-muted-foreground",
            )}
          >
            {boxError ? (
              <AlertCircle className="size-3.5 shrink-0" />
            ) : (
              <Info className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {boxError || boxHint}
          </p>
        ) : (
          <span id={`${idPrefix}-card-msg`} className="sr-only">
            Card details complete.
          </span>
        )}
      </div>

      <Field>
        <Label htmlFor={`${idPrefix}-name`}>Name on card</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={blur("name", name)}
          autoComplete="cc-name"
          placeholder="Sam Rivera"
          aria-invalid={Boolean(show("name"))}
          // Points at the message, so returning to the field reads the reason
          // rather than just the word "invalid".
          aria-describedby={show("name") ? `${idPrefix}-name-err` : undefined}
          className={cn(show("name") && "border-danger")}
        />
        <FieldError id={`${idPrefix}-name-err`} message={show("name")} />
      </Field>

      <SecurityNote />
      {!STRICT_CARD_VALIDATION ? (
        <Notice tone="info" className="text-2xs">
          Demo — any card details are accepted and nothing is ever charged.
        </Notice>
      ) : null}

      {/* Save leads and takes the width; Cancel is the way back, not the offer.
          Save is never disabled — a greyed-out button leaves someone tapping a
          dead control with no idea which field is wrong. It presses, and points. */}
      <div className="flex gap-2.5 pt-1">
        {/* A padlock on the button was the third padlock-shaped promise in this
            form — the SecurityNote directly above already carries the shield and
            says what actually happens to the number. Repeating it on the button
            made "Change card" read as though it were the security control rather
            than the action. The card glyph names the thing being saved instead. */}
        <Button className="flex-1" onClick={save}>
          <CreditCard className="size-4" /> {saveLabel}
        </Button>
        {onCancel ? (
          <Button variant="outline" className="px-6" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The card form as a dialog — the same popup checkout uses, so adding a card is
 * one surface wherever it's reached from.
 *
 * A dialog rather than a panel that unfolds in place. A card form is a hosted,
 * focus-trapping surface in any real integration; and where there's already a
 * saved card, a form growing underneath it puts the card you're replacing and
 * the card you're typing on screen together, which is exactly the moment to be
 * sure which one you're looking at. The popup replaces that question with a
 * title.
 */
export function CardFormDialog({
  replacing,
  onClose,
  idPrefix = "d",
}: {
  /** The card being replaced, if there is one. Titles the dialog and warns. */
  replacing?: SavedCard | null;
  onClose: () => void;
  idPrefix?: string;
}) {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Mounted only while it's up, so it's open for its whole life.
  const dialog = useDialog({ open: true, onClose });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
        aria-label={replacing ? "Change your card" : "Add a card"}
        {...dialog.props}
        className={cn(
          "relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-3xl bg-card text-left shadow-raised transition-all duration-200",
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <CreditCard className="size-4 shrink-0 text-primary" />
              {replacing ? "Change your card" : "Add a card"}
            </h3>
            <p className="text-[13px] text-muted-foreground">
              Charged 24 hours before delivery — nothing today.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full border border-control bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* Said before the number goes in, not in a toast after the old card
              is already gone. */}
          {replacing ? (
            <p className="mb-3 text-2xs text-muted-foreground">
              This replaces your saved card ending {replacing.last4}.
            </p>
          ) : null}
          <CardForm
            idPrefix={idPrefix}
            saveLabel={replacing ? "Change card" : "Save card"}
            onSaved={onClose}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

/** One field's complaint, in the one place complaints appear. `id` lets the
 *  field it belongs to point back at it via `aria-describedby`. */
export function FieldError({ id, message }: { id?: string; message: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-2xs font-medium text-danger">
      {message}
    </p>
  );
}
