"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Search,
  Mail,
  AlertTriangle,
  Receipt,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { RateItems } from "@/features/ratings/rate-items";
import { FeedbackForm } from "@/features/feedback/feedback-form";
import { useSessionStore } from "@/store/use-session-store";
import { useOrdersStore } from "@/store/use-orders-store";
import { useRatingsStore } from "@/store/use-ratings-store";
import { lookupOrderForRating, findOrder } from "@/data/orders";
import { fromISODate, formatDayLong } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Order } from "@/data/types";

/**
 * The feedback page — `/rate`. Replaces the old "Rate your meals" sheet.
 *
 * The sheet could only ever offer one order: the newest delivery with something
 * left to rate. That is the wrong shape for the thing people actually want,
 * which is "the Tuesday one, the one that was cold" — so this is a page, it
 * lists every delivered order, and the choice of which to rate is the first
 * thing it asks rather than something it decides.
 *
 * Three views, one at a time, because a phone has room for one:
 *
 *   pick → rate   choose an order, then rate its meals
 *   pick → note   skip the orders and report a problem with the service
 *   rate → note   rate the meals, then raise a problem with that same order
 *
 * The two are kept apart on purpose. Stars answer "how was the food", and only
 * that; a late, missing or mischarged delivery goes down the `note` door to the
 * operations team. When one control took both, a driver who never turned up
 * arrived as a one-star recipe score, and every entrance to `note` now says so
 * in as many words.
 *
 * Two ways to prove which orders are yours. Signed in, you pick off a list.
 * Signed out, you supply the order number and the email it was sent to — the
 * same pair the confirmation email carries, which is why an emailed link can
 * put both in the query string and land you straight on the meals.
 *
 * `source` separates the two for the kitchen's reporting: from the signed-in
 * list it is `account`; through the lookup it is `public_link`, the same bucket
 * as the tokenised email link, since both are attested by an order number and an
 * address rather than by a session.
 */

type View =
  | { name: "pick" }
  | { name: "rate"; order: Order; source: "account" | "public_link" }
  | { name: "note"; orderId: string };

export function RateEntry({
  initialOrder = "",
  initialEmail = "",
  initialView,
}: {
  initialOrder?: string;
  initialEmail?: string;
  /** `?view=note` — the "tell us something else" link in an email. */
  initialView?: "note";
}) {
  const account = useSessionStore((s) => s.account);
  /**
   * Read through the store, not the seed module: an order rated or re-ordered
   * this session is the store's, and the page must show what the rest of the app
   * shows.
   */
  const orders = useOrdersStore((s) => s.orders);
  const ratings = useRatingsStore((s) => s.ratings);

  const [view, setView] = React.useState<View>(
    initialView === "note" ? { name: "note", orderId: initialOrder } : { name: "pick" },
  );

  /** Delivered orders, newest first, each with how much is left to rate. */
  const rateable = React.useMemo(() => {
    const rated = new Set(ratings.map((r) => r.lineId));
    return orders
      .filter((o) => o.status === "delivered")
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((order) => {
        const lines = order.days.flatMap((d) => d.items);
        return {
          order,
          meals: lines.length,
          unrated: lines.filter((l) => !rated.has(l.lineId)).length,
        };
      });
  }, [orders, ratings]);

  /**
   * An emailed link carrying both halves opens straight onto the meals — that
   * is the entire point of putting them in the URL. Runs once: re-resolving on
   * every render would yank the user back to `rate` the moment they navigated
   * away from it.
   */
  const resolved = React.useRef(false);
  React.useEffect(() => {
    if (resolved.current || initialView === "note" || !initialOrder) return;

    if (initialEmail) {
      const result = lookupOrderForRating(initialOrder, initialEmail);
      if (result.status === "ok") {
        resolved.current = true;
        setView({ name: "rate", order: result.order, source: "public_link" });
        return;
      }
    }
    /**
     * Signed in, no email needed: the session already says who they are, so a
     * bare `?order=` off an in-app link is enough.
     *
     * The latch is set here rather than on entry because the session arrives
     * *after* mount — `StoreHydrator` rehydrates it — so the first run of this
     * effect always sees `account === null`. Latching on entry burned the one
     * attempt before there was anything to decide with, and a signed-in
     * `?order=` link silently fell through to the picker. Now the effect stays
     * armed until the session is known, and only then commits.
     */
    if (account) {
      resolved.current = true;
      const own = findOrder(initialOrder);
      if (own && own.status === "delivered") {
        setView({ name: "rate", order: own, source: "account" });
      }
    }
  }, [initialOrder, initialEmail, initialView, account]);

  /**
   * Move focus to the new view's heading. The control that was pressed unmounts
   * on the same tick, so without this focus falls to `<body>` and a
   * screen-reader user is told nothing changed.
   */
  const heading = React.useRef<HTMLHeadingElement>(null);
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
  }, [view]);

  if (view.name === "rate") {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => setView({ name: "pick" })}>Choose a different order</BackLink>

        <div className="space-y-1">
          <h2 ref={heading} tabIndex={-1} className={HEADING}>
            How was {formatDayLong(fromISODate(view.order.date))}?
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Order {view.order.id} · stars are for the food only — rate what you&apos;d like, one
            meal, a few, or all of them.
          </p>
        </div>

        <Card>
          <CardBody>
            <RateItems order={view.order} source={view.source} />
          </CardBody>
        </Card>

        {/* Order-level problems. Kept a separate destination from the stars: a
            1-star Bibimbap and a missing delivery need different people to read
            them, and someone whose lunch never arrived will happily give the
            recipe one star to say so unless there's somewhere better to go. */}
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted-foreground">
              Late, missing, wrong item or a delivery issue?
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView({ name: "note", orderId: view.order.id })}
            >
              <AlertTriangle className="size-3.5" aria-hidden /> Problem with your order?
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (view.name === "note") {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => setView({ name: "pick" })}>Back</BackLink>
        <div className="space-y-1">
          <h2 ref={heading} tabIndex={-1} className={HEADING}>
            Problem with your order?
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Late, missing, wrong item, a refund to chase, or anything else about the service. Goes
            to our operations team — no stars involved.
          </p>
        </div>
        <Card>
          <CardBody>
            <FeedbackForm initialOrder={view.orderId} />
          </CardBody>
        </Card>
      </div>
    );
  }

  /**
   * Signed in, the order list *is* the page and the lookup is an edge case, so
   * it folds away behind "My order isn't listed". Signed out there is no list,
   * so the lookup is the only way through and stands on its own.
   *
   * Both were previously stacked as equal, always-open sections under `OR`
   * rules, which made a page with one obvious action look like a page with
   * three.
   */
  return (
    <div className="space-y-6">
      <Link
        href="/menu"
        className="inline-flex min-h-[24px] items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to menu
      </Link>

      {account ? (
        <OrderPicker
          name={account.name ?? account.email}
          rows={rateable}
          onPick={(order) => setView({ name: "rate", order, source: "account" })}
        />
      ) : (
        <OrderLookup
          standalone
          initialOrder={initialOrder}
          initialEmail={initialEmail}
          onFound={(order) => setView({ name: "rate", order, source: "public_link" })}
        />
      )}

      <div className="space-y-1.5 border-t border-border pt-5">
        {account ? (
          <Disclosure id="rate-lookup-disclosure" label="My order isn't listed">
            <OrderLookup
              initialOrder={initialOrder}
              initialEmail={initialEmail}
              onFound={(order) => setView({ name: "rate", order, source: "public_link" })}
            />
          </Disclosure>
        ) : null}

        {/* The logistics path, which needs no order at all — a quiet row,
            because almost everyone arriving here has a specific lunch in mind. */}
        <button
          type="button"
          onClick={() => setView({ name: "note", orderId: "" })}
          className={QUIET_ROW}
        >
          <AlertTriangle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="flex-1">Problem with your order? Delivery, billing or service</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * A quiet row that opens its own content in place. Used for the paths that
 * matter to a few people and would otherwise cost every visitor a decision.
 */
function Disclosure({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const panel = React.useRef<HTMLDivElement>(null);

  /** Land the caret in the panel, not back at the top of the page. */
  React.useEffect(() => {
    if (open) panel.current?.querySelector("input")?.focus();
  }, [open]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        // Only while the panel exists. Pointing at an id that isn't in the page
        // is a broken reference, and some screen readers report it as one.
        aria-controls={open ? id : undefined}
        className={QUIET_ROW}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex-1">{label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={id} ref={panel} className="px-3 pb-2 pt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* ── Shared bits ────────────────────────────────────────────────────────── */

const HEADING = "font-display text-lg font-semibold tracking-tight focus:outline-none";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";

/**
 * A pressable order row. Cream-filled rather than white, because the content
 * column is white — a white tile on white reads as nothing to press.
 */
const ROW = cn(
  "mt-2 flex w-full items-center gap-3 rounded-2xl border border-control bg-background p-3.5 text-left transition-colors hover:border-primary hover:bg-teal-wash/40",
  FOCUS,
);

/**
 * The rows at the foot of the page. Styled as secondary buttons — bordered and
 * in body ink — rather than muted text: they are still the lesser path, but a
 * borderless grey row reads as a caption, and someone who genuinely can't find
 * their order has to be able to see the way out.
 */
const QUIET_ROW = cn(
  "flex w-full items-center gap-2.5 rounded-xl border border-control bg-card px-3.5 py-3 text-left text-[13px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-muted",
  FOCUS,
);

function BackLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[24px] items-center gap-1.5 rounded-lg text-[13px] font-semibold text-primary hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden /> {children}
    </button>
  );
}

/* ── Door 1: signed in — every delivered order ──────────────────────────── */

/** Orders shown before the list collapses — about a fortnight of lunches. */
const INITIAL_ROWS = 10;

function OrderPicker({
  name,
  rows,
  onPick,
}: {
  name: string;
  rows: { order: Order; meals: number; unrated: number }[];
  onPick: (order: Order) => void;
}) {
  /**
   * Genuinely long histories collapse, because the order someone came here to
   * rate is nearly always recent — but the cut-off is set at roughly a
   * fortnight of lunches rather than a handful.
   *
   * It was five, which meant a six-order history rendered a "Show all 6" link
   * that revealed exactly one more row: all of the cost of a decision for none
   * of the benefit. A collapse has to hide enough to be worth the press.
   */
  const [all, setAll] = React.useState(false);
  const shown = all ? rows : rows.slice(0, INITIAL_ROWS);

  return (
    <section aria-labelledby="rate-signed-in">
      <h2 id="rate-signed-in" className={HEADING}>
        Select your order
      </h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Signed in as {name}. Only delivered orders can be rated, and stars cover the food only.
      </p>

      {rows.length ? (
        <>
          <ul>
            {shown.map(({ order, meals, unrated }) => (
              <li key={order.id}>
                <button type="button" onClick={() => onPick(order)} className={ROW}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-wash text-primary">
                    <Receipt className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[15px] font-semibold tracking-tight">
                      {formatDayLong(fromISODate(order.date))}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {order.id} · {meals} {meals === 1 ? "meal" : "meals"}
                    </span>
                  </span>
                  {/* Progress, not a gate — a fully rated order stays pressable,
                      because "see what I said" is a reason to come back. */}
                  {unrated > 0 ? (
                    <span className="shrink-0 rounded-full bg-coral-soft px-2 py-0.5 text-2xs font-bold text-coral-deep">
                      {unrated} to rate
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 text-2xs font-semibold text-success">
                      <Star className="size-3 fill-success" aria-hidden /> Rated
                    </span>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ul>

          {!all && rows.length > INITIAL_ROWS ? (
            <button
              type="button"
              onClick={() => setAll(true)}
              className="mt-3 inline-flex min-h-[24px] items-center gap-1 rounded-lg text-[13px] font-semibold text-primary hover:underline"
            >
              Show all {rows.length} delivered orders
            </button>
          ) : null}
        </>
      ) : (
        <p className="mt-3 rounded-2xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-muted-foreground">
          Nothing to rate yet — meals become rateable once they&apos;ve been delivered.
        </p>
      )}
    </section>
  );
}

/* ── Door 2: signed out, or an order under another address ──────────────── */

const LOOKUP_ERRORS: Record<string, string> = {
  "not-found":
    "We couldn't find an order with that number and email. Check both against your confirmation email.",
  undelivered: "That order hasn't been delivered yet. Come back once lunch has arrived.",
  cancelled: "That order was cancelled, so there's nothing to rate.",
  incomplete: "Enter both your order number and the email the order was placed under.",
};

function OrderLookup({
  standalone = false,
  initialOrder,
  initialEmail,
  onFound,
}: {
  /** True when this is the page's main event (signed out), false inside the
   *  disclosure, where the surrounding row already supplies the heading. */
  standalone?: boolean;
  initialOrder: string;
  initialEmail: string;
  onFound: (order: Order) => void;
}) {
  const [orderNumber, setOrderNumber] = React.useState(initialOrder);
  const [email, setEmail] = React.useState(initialEmail);
  const [error, setError] = React.useState<keyof typeof LOOKUP_ERRORS | null>(null);

  function find() {
    if (!orderNumber.trim() || !email.trim()) {
      setError("incomplete");
      return;
    }
    const result = lookupOrderForRating(orderNumber, email);
    if (result.status === "ok") {
      setError(null);
      onFound(result.order);
      return;
    }
    setError(result.status);
  }

  const describedBy = error ? "rate-lookup-error" : "rate-lookup-hint";

  return (
    <section aria-labelledby={standalone ? "rate-lookup" : undefined}>
      {standalone ? (
        <>
          <h2 id="rate-lookup" className={HEADING}>
            Find your order
          </h2>
          <p id="rate-lookup-hint" className="mt-0.5 text-[13px] text-muted-foreground">
            No account needed — both details are on your confirmation email.
          </p>
        </>
      ) : (
        <p id="rate-lookup-hint" className="text-[13px] text-muted-foreground">
          Enter the order number and the email it was placed under.
        </p>
      )}

      <div className="mt-3 space-y-3">
        <div>
          <Label htmlFor="rate-order">Order number</Label>
          <Input
            id="rate-order"
            value={orderNumber}
            onChange={(e) => {
              setOrderNumber(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && find()}
            placeholder="e.g. ORD-2855"
            autoComplete="off"
            spellCheck={false}
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
        </div>

        <div>
          <Label htmlFor="rate-email">Email associated with the order</Label>
          <Input
            id="rate-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && find()}
            placeholder="you@company.com"
            autoComplete="email"
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
        </div>

        {/* Announced, not merely painted — the lookup is the one step here that
            can fail, and it fails without moving focus. */}
        <p
          id="rate-lookup-error"
          role="alert"
          className="text-2xs font-semibold text-danger empty:hidden"
        >
          {error ? LOOKUP_ERRORS[error] : ""}
        </p>

        <Button block size="lg" onClick={find}>
          <Search className="size-4" aria-hidden /> Find my order
        </Button>
      </div>

      {/* Only worth saying where the lookup is the whole story. Inside the
          disclosure the reader is already signed in and has a list. */}
      {standalone ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-muted/60 p-3.5 text-2xs text-muted-foreground">
          <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Arrived from the &ldquo;How was your lunch?&rdquo; email? That link fills both fields in for
            you — nothing to type.{" "}
            <Link
              href="/orders"
              className="font-semibold text-primary underline underline-offset-2"
            >
              Or sign in
            </Link>{" "}
            to pick from your orders.
          </span>
        </p>
      ) : null}
    </section>
  );
}
