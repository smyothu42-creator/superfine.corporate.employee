/**
 * Card-entry helpers: what a real checkout does in the browser *before* anything
 * is sent anywhere — recognise the brand from the first digits, format the
 * number as it's typed, and reject a number that can't exist. Catching a typo'd
 * digit here is the difference between "check that number" under the field and a
 * decline several seconds later with no explanation.
 *
 * None of this is a substitute for the processor's answer. It only rules out
 * what is impossible; whether a valid-looking card has funds is not knowable
 * here, and nothing in this file pretends otherwise.
 */

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

/** How each brand's numbers are shaped: display grouping, length, CVC length. */
const BRANDS: Record<
  Exclude<CardBrand, "unknown">,
  { label: string; test: RegExp; gaps: number[]; lengths: number[]; cvc: number }
> = {
  // Ranges are the issuer-assigned IINs. Mastercard's 2221–2720 block is the
  // 2017 expansion — a card starting with a 2 is not a typo.
  visa: { label: "Visa", test: /^4/, gaps: [4, 8, 12], lengths: [16, 19], cvc: 3 },
  mastercard: {
    label: "Mastercard",
    test: /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/,
    gaps: [4, 8, 12],
    lengths: [16],
    cvc: 3,
  },
  // Amex is the odd one out everywhere: 15 digits, 4-6-5 grouping, 4-digit CID.
  amex: { label: "Amex", test: /^3[47]/, gaps: [4, 10], lengths: [15], cvc: 4 },
  discover: {
    label: "Discover",
    test: /^(6011|65|64[4-9])/,
    gaps: [4, 8, 12],
    lengths: [16, 19],
    cvc: 3,
  },
};

/** Just the digits — the display string carries spaces the maths can't see. */
export function cardDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** The brand implied by the leading digits, or `unknown` until they say. */
export function detectBrand(value: string): CardBrand {
  const digits = cardDigits(value);
  if (!digits) return "unknown";
  for (const [brand, spec] of Object.entries(BRANDS)) {
    if (spec.test.test(digits)) return brand as CardBrand;
  }
  return "unknown";
}

/** The brand's name as it should appear on a saved card. */
export function brandLabel(brand: CardBrand): string {
  return brand === "unknown" ? "Card" : BRANDS[brand].label;
}

/** How many digits the security code has — 4 on Amex, 3 everywhere else. */
export function cvcLength(brand: CardBrand): number {
  return brand === "unknown" ? 3 : BRANDS[brand].cvc;
}

/** The longest number this brand issues, for `maxLength` on the field. */
export function maxCardDigits(brand: CardBrand): number {
  const lengths = brand === "unknown" ? [16, 19] : BRANDS[brand].lengths;
  return Math.max(...lengths);
}

/**
 * Group the digits the way the card itself is printed, so what's on screen and
 * what's in your hand can be compared a block at a time rather than digit by
 * digit.
 */
export function formatCardNumber(value: string): string {
  const brand = detectBrand(value);
  const gaps = brand === "unknown" ? [4, 8, 12] : BRANDS[brand].gaps;
  const digits = cardDigits(value).slice(0, maxCardDigits(brand));
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (gaps.includes(i)) out += " ";
    out += digits[i];
  }
  return out;
}

/**
 * The Luhn checksum every card number carries in its last digit. It catches a
 * mistyped or transposed digit — which is the overwhelming majority of what goes
 * wrong at this field — and nothing else.
 */
export function luhnValid(value: string): boolean {
  const digits = cardDigits(value);
  if (digits.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** A number this brand actually issues, that also passes the checksum. */
export function cardNumberValid(value: string): boolean {
  const brand = detectBrand(value);
  const digits = cardDigits(value);
  const lengths = brand === "unknown" ? [16, 19] : BRANDS[brand].lengths;
  return lengths.includes(digits.length) && luhnValid(digits);
}

/** `MM/YY`, typed as digits — the slash appears on its own. */
export function formatExpiry(value: string): string {
  const digits = cardDigits(value).slice(0, 4);
  // A lone 2–9 can only be a month if it's 02–09, so pad it and move on rather
  // than letting someone type "3" and wonder why "3/2" isn't March 2032.
  const padded = digits.length === 1 && Number(digits) > 1 ? `0${digits}` : digits;
  if (padded.length <= 2) return padded;
  return `${padded.slice(0, 2)}/${padded.slice(2)}`;
}

/**
 * A real month, not already gone. `now` is a parameter so this stays a pure
 * function — the caller passes the clock in.
 */
export function expiryValid(value: string, now: Date = new Date()): boolean {
  const digits = cardDigits(value);
  if (digits.length !== 4) return false;
  const month = Number(digits.slice(0, 2));
  const year = 2000 + Number(digits.slice(2));
  if (month < 1 || month > 12) return false;
  // A card is good through the last day of its printed month.
  const endOfMonth = new Date(year, month, 1);
  return endOfMonth > now;
}

/** The security code, given the brand's length. */
export function cvcValid(value: string, brand: CardBrand): boolean {
  return new RegExp(`^\\d{${cvcLength(brand)}}$`).test(cardDigits(value));
}
