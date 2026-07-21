"use client";

import * as React from "react";
import { Star, Check, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { FoodPhoto } from "@/components/menu/food-photo";
import { getItem } from "@/data/menu";
import {
  useRatingsStore,
  RATING_TAGS,
  type RatingTag,
  type RatingInput,
  type ItemRating,
} from "@/store/use-ratings-store";
import { lockedAmong, LOCK_HOURS } from "@/lib/rating-lock";
import { fromISODate, formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Order, OrderItem } from "@/data/types";

/** One rateable line, flattened out of the order's day → items nesting. */
interface RateableLine extends OrderItem {
  date: string;
}

function linesOf(order: Order): RateableLine[] {
  return order.days.flatMap((d) => d.items.map((it) => ({ ...it, date: d.date })));
}

/**
 * Rate the meals in one order — the whole flow, minus its container.
 *
 * The same component behind all three doors: the rail's "Share your feedback",
 * a delivered order in My Orders, and the emailed public link. One
 * implementation because they are one interaction, and three copies of a star
 * control is three chances for the lock, the validation and the wording to
 * drift apart.
 *
 * Ratings are per line, and any subset is a complete answer: rating one meal and
 * ignoring the other three is the normal case, not an abandoned form.
 */
export function RateItems({
  order,
  source,
  onDone,
  compact,
}: {
  order: Order;
  source: ItemRating["source"];
  /** Called from the thank-you screen — the sheet closes itself with it. */
  onDone?: () => void;
  /** Tighter type and spacing, for the feedback sheet. */
  compact?: boolean;
}) {
  const lines = React.useMemo(() => linesOf(order), [order]);
  const submit = useRatingsStore((s) => s.submit);
  const saved = useRatingsStore((s) => s.ratings);

  /**
   * The cookie lock is read once, on mount, rather than per render: it's a
   * `document.cookie` parse, and the answer can't change while the sheet is
   * open except by this component's own submit — which updates `saved` anyway.
   *
   * Read in an effect, never during render: the server has no cookies, and a
   * lock consulted during the first render would paint rows the server didn't.
   */
  const [locked, setLocked] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    setLocked(lockedAmong(lines.map((l) => l.lineId)));
  }, [lines]);

  const byLine = React.useMemo(
    () => new Map(saved.map((r) => [r.lineId, r])),
    [saved],
  );

  const [draft, setDraft] = React.useState<Record<string, { stars: number; tags: RatingTag[]; note: string }>>({});
  const [done, setDone] = React.useState<{ saved: number; locked: number } | null>(null);

  const pending = Object.entries(draft).filter(([, d]) => d.stars > 0);

  const blank = { stars: 0, tags: [] as RatingTag[], note: "" };

  function setStars(lineId: string, stars: number) {
    setDraft((d) => ({ ...d, [lineId]: { ...(d[lineId] ?? blank), stars } }));
  }

  function toggleTag(lineId: string, tag: RatingTag) {
    setDraft((d) => {
      const cur = d[lineId] ?? blank;
      const tags = cur.tags.includes(tag)
        ? cur.tags.filter((t) => t !== tag)
        : [...cur.tags, tag];
      return { ...d, [lineId]: { ...cur, tags } };
    });
  }

  function setNote(lineId: string, note: string) {
    setDraft((d) => ({
      ...d,
      [lineId]: { ...(d[lineId] ?? blank), note: note.slice(0, 200) },
    }));
  }

  function send() {
    const payload: RatingInput[] = pending.map(([lineId, d]) => {
      const line = lines.find((l) => l.lineId === lineId)!;
      return {
        lineId,
        menuItemId: line.itemId,
        recipeVersion: line.recipeVersion,
        stars: d.stars,
        tags: d.tags,
        note: d.note,
      };
    });
    const results = submit({ orderId: order.id, source, ratings: payload });
    setDraft({});
    setDone({
      saved: results.filter((r) => r.status === "saved").length,
      locked: results.filter((r) => r.status !== "saved").length,
    });
  }

  if (done) return <ThankYou result={done} remaining={lines.length - byLine.size} onDone={onDone} />;

  return (
    <div className="space-y-4">
      <div className={cn("space-y-2.5", compact && "space-y-2")}>
        {lines.map((line) => {
          const already = byLine.get(line.lineId);
          return (
            <LineCard
              key={line.lineId}
              line={line}
              multiDay={order.days.length > 1}
              rated={already}
              /* A line locked by the cookie but with no stored rating is this
                 device having rated it under a wallet the store has since
                 forgotten — treat it as rated either way, and say why. */
              lockedOnly={!already && locked.has(line.lineId)}
              draft={draft[line.lineId]}
              onStars={(n) => setStars(line.lineId, n)}
              onTag={(t) => toggleTag(line.lineId, t)}
              onNote={(v) => setNote(line.lineId, v)}
            />
          );
        })}
      </div>

      <Button block size="lg" disabled={pending.length === 0} onClick={send}>
        {pending.length === 0
          ? "Pick a rating to send"
          : `Submit ${pending.length} rating${pending.length === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}

/**
 * One meal. Collapsed to a single row until it's rated — an untouched card is
 * one line tall, so a four-meal order fits a phone screen and the decision is
 * "which of these do I have something to say about", not "fill in this form".
 */
function LineCard({
  line,
  multiDay,
  rated,
  lockedOnly,
  draft,
  onStars,
  onTag,
  onNote,
}: {
  line: RateableLine;
  multiDay: boolean;
  rated?: ItemRating;
  lockedOnly: boolean;
  draft?: { stars: number; tags: RatingTag[]; note: string };
  onStars: (n: number) => void;
  onTag: (t: RatingTag) => void;
  onNote: (v: string) => void;
}) {
  const settled = Boolean(rated) || lockedOnly;
  const stars = rated?.stars ?? draft?.stars ?? 0;
  const open = !settled && stars > 0;

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 transition-colors",
        settled ? "border-border bg-muted/40" : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <FoodPhoto
          src={getItem(line.itemId)?.image}
          alt=""
          className="size-12 shrink-0 rounded-xl"
          iconClassName="size-5"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{line.name}</p>
          <p className="truncate text-2xs text-muted-foreground">
            {/* The day only earns its place when the order spans several — on a
                one-day order it's the same line on every card. */}
            {[multiDay ? formatDay(fromISODate(line.date)) : "", line.addOns.join(" · ")]
              .filter(Boolean)
              .join(" · ") || `×${line.qty}`}
          </p>
        </div>
        {settled ? (
          <span className="flex shrink-0 items-center gap-1 text-2xs font-semibold text-success">
            <Check className="size-3.5" /> Rated
          </span>
        ) : null}
      </div>

      <div className="mt-2.5">
        <Stars value={stars} readOnly={settled} onChange={onStars} />
        {lockedOnly ? (
          <p className="mt-1.5 text-2xs text-muted-foreground">
            Rated from this device — you can rate it again {LOCK_HOURS} hours later.
          </p>
        ) : null}
      </div>

      {/* Tags and the note stay out of the way until there's a rating to explain
          — asking "what was wrong?" before someone has said anything is a form,
          not a question. */}
      {open ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex flex-wrap gap-1.5">
            {RATING_TAGS.map((tag) => {
              const on = draft?.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onTag(tag)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-2xs font-semibold transition-colors",
                    on
                      ? "border-primary bg-teal-wash text-teal-deep"
                      : "border-border bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <Textarea
            value={draft?.note ?? ""}
            onChange={(e) => onNote(e.target.value)}
            placeholder="Anything else? (optional)"
            className="min-h-[60px] text-[13px]"
            maxLength={200}
          />
        </div>
      ) : null}
    </div>
  );
}

/** The rating control. 44px targets — this is the one thing on the card to hit. */
function Stars({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange: (n: number) => void;
  readOnly?: boolean;
}) {
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;

  return (
    <div
      role={readOnly ? undefined : "radiogroup"}
      aria-label={readOnly ? undefined : "Rating"}
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role={readOnly ? undefined : "radio"}
          aria-checked={readOnly ? undefined : value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          disabled={readOnly}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="touch-target -ml-0.5 rounded-full p-1 first:ml-0 disabled:cursor-default"
        >
          <Star
            className={cn(
              "size-6 transition-colors",
              n <= shown ? "fill-yellow text-yellow" : "fill-transparent text-muted-foreground/50",
            )}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * After submitting. Says what landed *and* what didn't — a line rejected by the
 * lock has to be accounted for, or the count silently disagrees with what was
 * tapped.
 */
function ThankYou({
  result,
  remaining,
  onDone,
}: {
  result: { saved: number; locked: number };
  remaining: number;
  onDone?: () => void;
}) {
  return (
    <div className="space-y-4 py-4 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-bg text-success">
        <PartyPopper className="size-7" />
      </span>
      <div className="space-y-1">
        <h3 className="font-display text-lg font-semibold tracking-tight">
          Thanks — the kitchen reads every one.
        </h3>
        <p className="text-[13px] text-muted-foreground">
          {result.saved} {result.saved === 1 ? "rating" : "ratings"} saved
          {result.locked
            ? `. ${result.locked} ${result.locked === 1 ? "meal was" : "meals were"} already rated from this device.`
            : "."}
          {remaining > 0
            ? ` ${remaining} more ${remaining === 1 ? "meal is" : "meals are"} still open if you want to come back.`
            : ""}
        </p>
      </div>
      {onDone ? (
        <Button block onClick={onDone}>
          Done
        </Button>
      ) : null}
    </div>
  );
}
