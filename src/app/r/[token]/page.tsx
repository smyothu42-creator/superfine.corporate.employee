"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, LinkIcon, PackageX, MessageSquare } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { FoodDoodles } from "@/components/brand/food-doodles";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RateItems } from "@/features/ratings/rate-items";
import { StoreHydrator } from "@/store/store-hydrator";
import { decodeRatingToken } from "@/lib/rating-token";
import { getOrder } from "@/data/orders";
import { fromISODate, formatDay } from "@/lib/dates";

/**
 * The public rating link — `/r/{token}`, out of the emailed "how was lunch?"
 * message a couple of hours after delivery.
 *
 * Outside the `(app)` shell on purpose: no rail, no cart, no sign-in wall. The
 * token *is* the authorisation, and the whole point is that rating a meal costs
 * one tap from an email rather than a login. `/nutrition` establishes the same
 * pattern for a route that has to work signed-out.
 *
 * Everything it can say about an order — even "that order doesn't exist" — is
 * something it says to whoever holds the link, so the failure states are
 * deliberately uninformative about anything but the link itself.
 */
export default function RatingLinkPage({ params }: { params: { token: string } }) {
  const { token } = params;

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-background">
      {/* This route is outside the shell, so it mounts the store rehydration
          the shell would otherwise do — without it the page can't tell an
          already-rated meal from a fresh one. */}
      <StoreHydrator />

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <FoodDoodles />
      </div>

      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-center px-4">
          <Logo size="lg" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Body token={token} />
      </main>

      <footer className="mx-auto w-full max-w-2xl px-4 pb-8 pt-2 text-center">
        <p className="text-2xs text-muted-foreground">
          Ratings help the kitchen decide what stays on the menu.
        </p>
      </footer>
    </div>
  );
}

function Body({ token }: { token: string }) {
  /**
   * Decoded on the client, after mount. The token carries an issued-at that is
   * checked against the clock, and a server rendering "expired" at build time
   * would be wrong by however long the page sat in a cache.
   */
  const [state, setState] = React.useState<"loading" | "ok" | "expired" | "invalid" | "undelivered">(
    "loading",
  );
  const [orderId, setOrderId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const result = decodeRatingToken(token);
    if (result.status === "invalid") {
      setState("invalid");
      return;
    }
    const order = getOrder(result.payload.orderId);
    // A token for an order we can't find is treated exactly like a forged one.
    // Distinguishing them would turn this page into an order-id oracle: try
    // tokens until one says "that order exists but isn't delivered".
    if (!order) {
      setState("invalid");
      return;
    }
    if (result.status === "expired") {
      setState("expired");
      setOrderId(order.id);
      return;
    }
    if (order.status !== "delivered") {
      setState("undelivered");
      setOrderId(order.id);
      return;
    }
    setOrderId(order.id);
    setState("ok");
  }, [token]);

  if (state === "loading") return <Card><CardBody className="h-64" /></Card>;

  if (state === "invalid") {
    return (
      <Dead
        icon={LinkIcon}
        title="This link doesn't work"
        body="It may have been mistyped or cut short by an email client. Sign in and rate your meals from My Orders instead."
      />
    );
  }

  if (state === "expired") {
    return (
      <Dead
        icon={Clock}
        title="This link has expired"
        body="Rating links stay open for 30 days after delivery. You can still rate these meals from My Orders."
      />
    );
  }

  if (state === "undelivered") {
    return (
      <Dead
        icon={PackageX}
        title="This order hasn't been delivered yet"
        body="Come back once lunch has arrived — the same link will work."
      />
    );
  }

  const order = getOrder(orderId!)!;

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          How was {formatDay(fromISODate(order.date))}?
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Rate what you&apos;d like — one meal, a few, or all of them. No account needed.
        </p>
      </div>

      <Card>
        <CardBody>
          <RateItems order={order} source="public_link" />
        </CardBody>
      </Card>

      {/* The one bridge to the other flow, kept quiet and kept separate: a
          service failure is not a rating, and the two must not arrive in the
          same inbox. */}
      <p className="text-center">
        <Link
          href={`/feedback?order=${order.id}`}
          className="inline-flex items-center gap-1.5 text-2xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
        >
          <MessageSquare className="size-3.5" /> Something was wrong with this order?
        </Link>
      </p>
    </div>
  );
}

/** A link that goes nowhere, with the one route out that always works. */
function Dead({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-7" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mx-auto max-w-sm text-[13px] text-muted-foreground">{body}</p>
        </div>
        <Button asChild>
          <Link href="/orders">Go to My Orders</Link>
        </Button>
      </CardBody>
    </Card>
  );
}
