/**
 * The token in the public rating link, `/r/{token}`.
 *
 * It stands in for a session: whoever holds it can see one order's meals and
 * rate them, signed in or not. So it carries only what that needs — the order
 * id and when it was issued — and it is checksummed, so a hand-edited token
 * resolves to nothing rather than to somebody else's order.
 *
 * The checksum is not a security boundary. In production this is an opaque row
 * id in a `rating_tokens` table, signed server-side with a secret this bundle
 * never sees, revocable and rate-limited. Here it's self-contained because there
 * is no server to hold the table — what it does buy, even so, is that order ids
 * aren't enumerable by counting: `/r/ORD-2892` is not a valid link.
 */

/** How long a link stays live after it's issued. */
export const TOKEN_TTL_DAYS = 30;

export interface RatingTokenPayload {
  orderId: string;
  /** Issued-at, as an ISO date (day resolution is all the TTL needs). */
  issued: string;
}

export type TokenResult =
  | { status: "ok"; payload: RatingTokenPayload }
  | { status: "expired"; payload: RatingTokenPayload }
  | { status: "invalid" };

/** URL-safe base64 — `+/=` are all meaningful in a path segment. */
function b64url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

/**
 * A short non-cryptographic digest. Enough to make a mangled or guessed token
 * fail closed; explicitly not enough to stop someone who reads this file, which
 * is why the real thing signs server-side.
 */
function checksum(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, "0").slice(0, 7);
}

/** Mint the link that goes in the "how was lunch?" email. */
export function encodeRatingToken(orderId: string, issued = new Date()): string {
  const body = `${orderId}|${issued.toISOString().slice(0, 10)}`;
  return `${b64url(body)}.${checksum(body)}`;
}

/**
 * Read a token back. Expiry is reported rather than folded into "invalid": an
 * expired link belongs to a real order and can offer a signed-in route in, while
 * an invalid one must say nothing at all about whether that order exists.
 */
export function decodeRatingToken(token: string, now = new Date()): TokenResult {
  const [encoded, sum] = token.split(".");
  if (!encoded || !sum) return { status: "invalid" };
  let body: string;
  try {
    body = unb64url(encoded);
  } catch {
    return { status: "invalid" };
  }
  if (checksum(body) !== sum) return { status: "invalid" };

  const [orderId, issued] = body.split("|");
  if (!orderId || !issued) return { status: "invalid" };

  const ageDays = (now.getTime() - new Date(`${issued}T00:00:00`).getTime()) / 86_400_000;
  const payload = { orderId, issued };
  return ageDays > TOKEN_TTL_DAYS ? { status: "expired", payload } : { status: "ok", payload };
}
