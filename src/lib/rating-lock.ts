/**
 * The 24-hour, per-item rating lock, kept in a cookie.
 *
 * One entry per rated line, each expiring on its own 24 hours after it was
 * written. Per *item*, deliberately — rating the Bibimbap must not also lock the
 * Shawarma that arrived beside it, and someone rating three of four meals has to
 * be able to come back for the fourth an hour later.
 *
 * This is friction, not enforcement. A cookie is the user's to delete, and
 * anyone who does gets past it; what stops them next is the store's own
 * uniqueness check on `(lineId, rater)`, which is the real guarantee. In
 * production this cookie is `HttpOnly` and signed with a server secret, and the
 * server re-checks it — here there is no server, so it lives in `document.cookie`
 * and is read by the same code that writes it. That is enough for the job it's
 * given: stopping casual repeat-rating from one browser, cheaply, before a
 * request is made.
 */

const COOKIE = "sfk_rl";
/** The lock itself. */
export const LOCK_HOURS = 24;
/** The cookie outlives any single lock — entries expire individually inside it. */
const COOKIE_DAYS = 30;
/**
 * Cap on entries. A cookie rides on every request, so it can't grow forever;
 * past this, the oldest locks are dropped, which at worst lets someone re-rate
 * something they rated weeks and dozens of meals ago.
 */
const MAX_ENTRIES = 60;

/** `lineId` → epoch ms at which its lock lapses. */
type LockMap = Record<string, number>;

/**
 * Short digest of the line id. The cookie is visible to whoever holds it, and
 * raw ids would hand them a readable list of what was ordered and when.
 */
function key(lineId: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < lineId.length; i += 1) {
    h ^= lineId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).slice(0, 6);
}

function read(): LockMap {
  if (typeof document === "undefined") return {};
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as LockMap;
    // Prune on read as well as write: a lapsed entry must not keep an item
    // locked just because nothing has been rated since it expired.
    const now = Date.now();
    return Object.fromEntries(Object.entries(parsed).filter(([, exp]) => exp > now));
  } catch {
    // A corrupt cookie locks nothing rather than everything.
    return {};
  }
}

function write(map: LockMap) {
  if (typeof document === "undefined") return;
  const entries = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_ENTRIES);
  const value = encodeURIComponent(JSON.stringify(Object.fromEntries(entries)));
  const maxAge = COOKIE_DAYS * 24 * 60 * 60;
  // `SameSite=Lax` so the lock survives arriving from the emailed link, which is
  // a top-level cross-site navigation — `Strict` would drop it on exactly the
  // journey this feature is built around.
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

/** Is this line locked on this device right now? */
export function isLocked(lineId: string): boolean {
  return Boolean(read()[key(lineId)]);
}

/** Every currently-locked line among the ones asked about. */
export function lockedAmong(lineIds: string[]): Set<string> {
  const map = read();
  return new Set(lineIds.filter((id) => map[key(id)]));
}

/** Lock these lines for the next 24 hours. Called after a rating is accepted. */
export function lock(lineIds: string[]) {
  const map = read();
  const until = Date.now() + LOCK_HOURS * 60 * 60 * 1000;
  lineIds.forEach((id) => {
    map[key(id)] = until;
  });
  write(map);
}

/** When this line's lock lapses, or null if it isn't locked. */
export function lockedUntil(lineId: string): Date | null {
  const exp = read()[key(lineId)];
  return exp ? new Date(exp) : null;
}
