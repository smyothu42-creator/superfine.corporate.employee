"use client";

import * as React from "react";
import Link from "next/link";
import {
  Send,
  PartyPopper,
  BadgeCheck,
  Check,
  Clock,
  PackageX,
  Replace,
  Droplets,
  Receipt,
  Smartphone,
  Building2,
  Lightbulb,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { useFeedbackStore, type FeedbackEntry } from "@/store/use-feedback-store";
import { useOrdersStore } from "@/store/use-orders-store";
import { useSessionStore } from "@/store/use-session-store";
import { fromISODate, formatDay, startOfToday, toISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useRoving } from "@/lib/roving";

/**
 * The order-problem form — pick the order, tap what happened, add a note if
 * there's more to say. Deliberately star-free: this is the logistics door (late,
 * missing, wrong, mischarged) and the stars on `/rate` are the food door,
 * because a delivery that never arrived used to come back as a one-star recipe
 * and the kitchen changed a dish that was fine.
 *
 * Three things it no longer asks for, because each was a step that cost a
 * decision and returned nothing:
 *
 * - **"Is this about a specific order? Yes / No."** An abstract question in
 *   front of the door. The order list *is* the answer — pick one or don't.
 * - **A typed order number.** Signed in, we know their orders; reading
 *   "ORD-2891" off a receipt to type it back to us is work we can do for them.
 *   The field survives for the signed-out path and for an order older than the
 *   list, folded away behind a link.
 * - **A sentence, before anything can be sent.** An empty textarea is the
 *   hardest control on any form. One tap on "Arrived late" is a complete report,
 *   and the note becomes the optional detail it always was.
 *
 * The same component behind every entrance — the `/feedback` route, the `/rate`
 * note view, signed in or out — so the wording someone meets is the same
 * wherever they came from and there is one place to change it.
 *
 * A blank or unrecognised order number is still accepted (recorded as unverified
 * for the kitchen); a valid one links the feedback and marks it verified.
 *
 * `initialOrder` pre-selects the order (the `/feedback?order=ORD-2891` deep
 * link, or the FAB opened from an order). `onDone`, when provided, is called
 * from the confirmation screen's primary button — the modal uses it to close
 * itself; the standalone page omits it and offers a "Browse the menu" link.
 */

interface Topic {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** What goes wrong with a delivery, in the order it goes wrong most often. */
const ORDER_TOPICS: Topic[] = [
  { id: "Arrived late", label: "Arrived late", icon: Clock },
  { id: "Something missing", label: "Something missing", icon: PackageX },
  { id: "Wrong item", label: "Wrong item", icon: Replace },
  { id: "Damaged or spilled", label: "Damaged or spilled", icon: Droplets },
  { id: "Billing or charge", label: "Billing or charge", icon: Receipt },
  { id: "Something else", label: "Something else", icon: MessageSquare },
];

/** Nothing to do with one delivery — the service itself. */
const GENERAL_TOPICS: Topic[] = [
  { id: "App or website", label: "App or website", icon: Smartphone },
  { id: "Billing or charge", label: "Billing or charge", icon: Receipt },
  { id: "My workplace plan", label: "My workplace plan", icon: Building2 },
  { id: "A suggestion", label: "A suggestion", icon: Lightbulb },
  { id: "Something else", label: "Something else", icon: MessageSquare },
];

/** How many recent orders the picker offers before "another order number". */
const RECENT_ORDERS = 3;

export function FeedbackForm({
  initialOrder = "",
  intro,
  onDone,
}: {
  initialOrder?: string;
  /** Heading to sit above the fields — and to step aside for the confirmation,
   *  which brings its own. The phone form has no hero above it, so the page
   *  hands its title down here rather than leaving it stranded over a
   *  "Thanks — we're on it" that has already replaced everything below. */
  intro?: React.ReactNode;
  onDone?: () => void;
}) {
  const submitFeedback = useFeedbackStore((s) => s.submit);
  const orders = useOrdersStore((s) => s.orders);
  // Signed out (the `/rate` path), there is no list to show — someone else's
  // order numbers are not ours to put on screen.
  const signedIn = Boolean(useSessionStore((s) => s.account));

  const [orderNumber, setOrderNumber] = React.useState(initialOrder.trim());
  const [topic, setTopic] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [typingOrder, setTypingOrder] = React.useState(false);
  const [submitted, setSubmitted] = React.useState<FeedbackEntry | null>(null);

  // Deliveries that have happened, newest first. An order still in the future
  // can't have gone wrong yet, and offering next Monday's lunch as the thing to
  // complain about is the picker answering a question nobody asked.
  const recent = React.useMemo(() => {
    if (!signedIn) return [];
    const today = toISODate(startOfToday());
    return orders
      .filter((o) => o.date <= today)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, RECENT_ORDERS);
  }, [orders, signedIn]);
  // A deep-linked order that isn't in the recent list still has to be visible —
  // otherwise the form says "which order?" while silently holding one.
  const picked = orderNumber.trim();
  const pickedIsListed = recent.some((o) => o.id === picked);
  const relatedToOrder = picked.length > 0;
  const topics = relatedToOrder ? ORDER_TOPICS : GENERAL_TOPICS;

  // A topic alone is a complete report; a note alone is too. "Something else"
  // is the one chip that says nothing on its own, so it asks for the words.
  const needsWords = !topic || topic === "Something else";
  const canSubmit = needsWords ? message.trim().length > 0 : true;

  function submit() {
    if (!canSubmit) return;
    setSubmitted(
      submitFeedback({
        orderNumber: picked,
        topic,
        message,
        relatedToOrder,
        source: "public",
      }),
    );
  }

  // The topic chips are one question, so they're one Tab stop with arrows
  // across them — not eleven stops between the order picker and the message.
  // Above the early return below, because hooks cannot run conditionally.
  const topicRoving = useRoving();

  if (submitted) return <ThankYou entry={submitted} onDone={onDone} />;

  return (
    <div className="space-y-6">
      {intro}

      {/* 1 — which order. Skippable: nothing picked means "not about an order",
          and the topics below change to match. */}
      <section className="space-y-2">
        <Label id="fb-order-label" className="mb-0">
          Which order?{" "}
          <span className="font-normal normal-case text-muted-foreground">
            (skip if it&apos;s not about one)
          </span>
        </Label>

        {recent.length > 0 || (picked && !pickedIsListed) ? (
          <RadioGroup className="space-y-2" aria-labelledby="fb-order-label">
            {picked && !pickedIsListed ? (
              <OrderOption
                id={picked}
                sub="From your link"
                selected
                onClick={() => setOrderNumber("")}
              />
            ) : null}
            {recent.map((o) => (
              <OrderOption
                key={o.id}
                id={o.id}
                sub={`${formatDay(fromISODate(o.date))} · ${mealCount(o.days)}`}
                selected={picked === o.id}
                // Tapping the selected order again clears it — the way out of a
                // choice is the control that made it, not a seventh option.
                onClick={() => setOrderNumber(picked === o.id ? "" : o.id)}
              />
            ))}
          </RadioGroup>
        ) : null}

        {/* The typed number: the only route when signed out, and the fallback
            for an order older than the list. */}
        {typingOrder || (!recent.length && !picked) ? (
          <Input
            id="fb-order"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. ORD-2891, from your receipt"
            aria-label="Order number"
            autoComplete="off"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTypingOrder(true);
              setOrderNumber("");
            }}
            className="text-2xs font-semibold text-primary underline underline-offset-2"
          >
            Another order number
          </button>
        )}
      </section>

      {/* 2 — what happened. One tap is a whole report. */}
      <section className="space-y-2">
        {/* The heading is tied to the chips below it. Without that link each
            chip announced only itself — "Arrived late, pressed" — and never the
            question it was answering. */}
        <Label id="fb-topic-label" className="mb-0">
          {relatedToOrder ? "What went wrong?" : "What's it about?"}
        </Label>
        {/* `toolbar`, not `group`: the arrows this implies are answered now. */}
        <div
          className="flex flex-wrap gap-2"
          role="toolbar"
          aria-labelledby="fb-topic-label"
          {...topicRoving.props}
        >
          {topics.map((t) => {
            const on = topic === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => setTopic(on ? "" : t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold transition-colors",
                  on
                    ? "border-primary bg-teal-wash text-teal-deep"
                    : "border-control bg-card text-muted-foreground hover:border-primary hover:text-foreground",
                )}
              >
                <t.icon className={cn("size-3.5 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                {t.label}
                {on ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3 — the note. Optional once a chip carries the point. */}
      <section className="space-y-2">
        <Label htmlFor="fb-message" className="mb-0">
          Anything to add?{" "}
          <span className="font-normal normal-case text-muted-foreground">
            {needsWords ? "" : "(optional)"}
          </span>
        </Label>
        <Textarea
          id="fb-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            relatedToOrder
              ? "e.g. it turned up an hour late and the soup had leaked."
              : "Anything about the service, the app, or your workplace plan."
          }
          maxLength={800}
          rows={3}
        />
      </section>

      <div className="space-y-2">
        <Button block size="lg" disabled={!canSubmit} onClick={submit}>
          <Send className="size-4" /> {relatedToOrder ? "Report the problem" : "Send to our team"}
        </Button>
        {!canSubmit ? (
          <p className="text-center text-2xs text-muted-foreground">
            {topic ? "Add a few words so we know what happened." : "Pick one above, or write a note."}
          </p>
        ) : null}
        {/* The other door, named where the mistake gets made — one quiet line
            rather than a boxed-off paragraph competing with the form. */}
        <p className="text-center text-2xs text-muted-foreground">
          Telling us how the food was?{" "}
          <Link
            href={picked ? `/rate?order=${picked}` : "/rate"}
            className="font-semibold text-primary underline underline-offset-2"
          >
            Rate the meals
          </Link>{" "}
          instead — stars go to the kitchen.
        </p>
      </div>
    </div>
  );
}

/** "3 meals" / "1 meal", across however many days the order covers. */
function mealCount(days: { items: unknown[] }[]) {
  const n = days.reduce((sum, d) => sum + d.items.length, 0);
  return `${n} meal${n === 1 ? "" : "s"}`;
}

/** One selectable order in the picker: the number, and when it came. One line,
 *  not two — three stacked two-line rows made choosing an order look like the
 *  main event on a form whose main event is saying what went wrong. */
function OrderOption({
  id,
  sub,
  selected,
  onClick,
}: {
  id: string;
  sub: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[13px] transition-colors",
        selected
          ? "border-primary bg-teal-wash"
          : "border-control bg-card hover:border-primary hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary" : "border-control",
        )}
      >
        {selected ? <span className="size-2.5 rounded-full bg-primary" /> : null}
      </span>
      <span className={cn("shrink-0 font-semibold", selected ? "text-teal-deep" : null)}>{id}</span>
      <span className="min-w-0 flex-1 truncate text-right text-2xs text-muted-foreground">
        {sub}
      </span>
    </button>
  );
}

/** Post-submit confirmation — reflects whether the order number verified. */
function ThankYou({ entry, onDone }: { entry: FeedbackEntry; onDone?: () => void }) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal-wash text-primary">
        <PartyPopper className="size-7" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">
        Thanks — we&apos;re on it
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Your note went to our operations team. They read every one, and they&apos;ll come back to
        you if there&apos;s anything to put right.
      </p>

      {/* A verified order gets a positive confirmation; unverified needs nothing. */}
      {entry.verified ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal-wash px-3.5 py-1.5 text-[13px] font-semibold text-teal-deep">
          <BadgeCheck className="size-4" /> Linked to order {entry.orderId}
        </div>
      ) : null}

      <div className="mt-7">
        {/* In the modal, close and return to wherever they were; on the standalone
            page, send them into the menu. */}
        {onDone ? (
          <Button variant="outline" onClick={onDone}>
            Done
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link href="/menu">Browse the menu</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
