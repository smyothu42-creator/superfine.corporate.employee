"use client";

import * as React from "react";

/**
 * Arrow keys for the rows of controls that were never made into one control.
 *
 * The app already answers the arrow keys everywhere it *promises* them — tab
 * strips, radio groups, the four listboxes, the month grids, the star ratings.
 * What was left over is the shape none of those cover: a plain run of buttons
 * that visually reads as one thing and behaves as N things. A row of nine
 * category tags. Seven weekday toggles. The dietary chips. The account rail.
 *
 * Two costs, both invisible until you put the mouse down:
 *
 * - **Getting past it.** Nine chips is nine Tab presses on the way to the grid
 *   they filter. That is the same complaint the calendars had (31 presses for
 *   one month) in the last places it was still standing.
 * - **Getting around it.** Someone who sees a row and presses Right gets
 *   nothing, because "row" was a flex container, not a control.
 *
 * This is `radio-group.tsx`'s approach generalised: it works off the DOM rather
 * than a list of values, so it wraps markup that is already there. No call site
 * had to be restructured and nothing moved a pixel — the whole change is which
 * elements carry `tabIndex={0}` and what happens on keydown.
 *
 * Spread the returned props onto the container the items sit in:
 *
 *     const roving = useRoving({ orientation: "horizontal" });
 *     <div role="toolbar" {...roving.props}>{chips}</div>
 */
export function useRoving({
  orientation = "both",
  loop = true,
  rove = true,
  itemSelector = "a[href], button:not([disabled])",
  isCurrent,
  onMove,
  onKeyDown,
}: {
  /**
   * Which arrows move.
   *
   * `"both"` is the default and usually the honest answer: these rows are drawn
   * both ways and several of them *wrap*, so a row on a wide screen is a column
   * on a phone. A user who sees a row and presses Right should not have to
   * discover it was implemented as a column — or as a row that became one.
   */
  orientation?: "horizontal" | "vertical" | "both";
  /** Wrap around at the ends. Off for anything that reads as a scale. */
  loop?: boolean;
  /**
   * Whether the group collapses to a single Tab stop.
   *
   * `true` for a composite control — a toolbar of chips is one thing, and Tab
   * should step over it in one press. `false` for a list of links, where each
   * item is a destination in its own right and taking away its Tab stop would
   * remove something a keyboard user already had. In that mode the arrows are
   * purely additive: a new way in, nothing withdrawn.
   */
  rove?: boolean;
  /** Which descendants are items. Defaults to links and enabled buttons. */
  itemSelector?: string;
  /**
   * Which item should hold the Tab stop when focus is elsewhere. Defaults to
   * whichever item announces itself as chosen, so a keyboard user arrives on
   * their own answer rather than at the top of the row.
   */
  isCurrent?: (el: HTMLElement) => boolean;
  /**
   * Called with the item the arrows just moved to.
   *
   * This is the difference between the two activation models. Leave it off and
   * the arrows move focus while Enter or Space commits — right wherever landing
   * on an option *does* something (opening a dialog, firing a toast), because
   * arrowing past an option should not fire it on the way through. Pass it and
   * selection follows focus, which is what a tab strip wants when its panels
   * are cheap and already mounted.
   */
  onMove?: (el: HTMLElement) => void;
  /** The call site's own handler. Runs first, and can pre-empt this one. */
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
} = {}) {
  const ref = React.useRef<HTMLElement>(null);

  /**
   * The items, in document order.
   *
   * Scoped to *this* group by the `data-roving` marker the container carries:
   * one of these nested inside another — the account rail inside a drawer that
   * also roves — would otherwise have its items stolen by the outer one.
   *
   * Disabled items are skipped rather than focused-and-dead, and anything not
   * actually on screen is skipped too: several of these rows keep their markup
   * mounted while collapsed, and a Tab stop inside a `display: none` subtree is
   * a stop nobody can see.
   */
  const items = React.useCallback((): HTMLElement[] => {
    const root = ref.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(itemSelector)).filter(
      (el) =>
        el.closest("[data-roving]") === root &&
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-disabled") !== "true" &&
        el.getAttribute("aria-hidden") !== "true" &&
        (el.offsetParent !== null || el.getClientRects().length > 0),
    );
  }, [itemSelector]);

  /**
   * Park the single Tab stop on the chosen item.
   *
   * No dependency array, deliberately: the state this reads — `aria-pressed`,
   * `aria-current` — lives in the DOM of children this hook only sees through a
   * ref, so there is no value here to depend on. Any change to the selection
   * re-renders the call site, which re-runs this, which is the whole signal.
   * It costs one `querySelectorAll` per render of a row of buttons.
   *
   * With nothing chosen the first item holds the stop, so the group can never
   * fall out of the tab order altogether. That failure — a control the keyboard
   * cannot reach at all — is worse than starting someone at the top of a row
   * they were going to arrow through anyway. Same reasoning as `tabs.tsx`.
   */
  React.useEffect(() => {
    if (!rove) return;
    const list = items();
    if (!list.length) return;
    // Focus already inside the group wins: re-running this effect while the
    // user is arrowing must not drag the stop back to whatever is checked.
    const focused = list.find((el) => el === document.activeElement);
    const stop = focused ?? list.find((el) => (isCurrent ?? defaultIsCurrent)(el)) ?? list[0];
    for (const el of list) el.tabIndex = el === stop ? 0 : -1;
  });

  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    // Let the call site go first, and stand down if it acted.
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    /**
     * Never take a key out of a field or another composite.
     *
     * These rows sit next to search boxes and inside dialogs that hold their
     * own listboxes and calendars. Left/Right inside a text input moves the
     * caret, and Up/Down inside an open listbox moves its highlight — both are
     * the user's, not ours, and both bubble up to here.
     */
    const target = e.target as HTMLElement | null;
    if (!target || isTypingTarget(target)) return;
    // `[data-day]` is how the month grids mark their cells. They are pointedly
    // *not* `role="grid"` — they render a flat run of cells with no rows, and a
    // grid role without rows misleads more than no role does — so matching on
    // the role alone would miss them and steal the arrows they already answer.
    if (target.closest('[role="listbox"], [role="grid"], [data-day], [data-escape-layer]')) return;

    const list = items();
    if (list.length < 2) return;

    // Only when focus is on one of our own items. These containers hold nothing
    // else today, but a row that later grows a label or a count should not have
    // arrows fired at it from a child that isn't part of the run.
    const from = list.indexOf(document.activeElement as HTMLElement);
    if (from === -1) return;

    const horizontal = orientation !== "vertical";
    const vertical = orientation !== "horizontal";

    let to: number;
    switch (e.key) {
      case "ArrowRight":
        if (!horizontal) return;
        to = from + 1;
        break;
      case "ArrowLeft":
        if (!horizontal) return;
        to = from - 1;
        break;
      case "ArrowDown":
        if (!vertical) return;
        to = from + 1;
        break;
      case "ArrowUp":
        if (!vertical) return;
        to = from - 1;
        break;
      case "Home":
        to = 0;
        break;
      case "End":
        to = list.length - 1;
        break;
      default:
        return;
    }

    if (to < 0 || to >= list.length) {
      if (!loop) return;
      to = (to + list.length) % list.length;
    }

    // Otherwise the page scrolls under the group as focus moves through it.
    e.preventDefault();
    // And a group inside another group doesn't get handled twice.
    e.stopPropagation();

    const next = list[to];
    // The Tab stop follows focus, so leaving the group and coming back returns
    // to where the user actually got to — not to whatever is still selected.
    if (rove) for (const el of list) el.tabIndex = el === next ? 0 : -1;
    next.focus();
    // Several of these rows scroll sideways (the category tags) or sit in a
    // scrolling panel. Focus alone would leave the item off screen.
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
    onMove?.(next);
  }

  return {
    props: {
      ref: ref as React.RefObject<never>,
      onKeyDown: handleKeyDown,
      // The scoping marker `items()` reads. Also the thing that makes a nested
      // group's items its own rather than its parent's.
      "data-roving": "",
    },
  };
}

/**
 * "Chosen" across the four ways this app says it.
 *
 * `aria-pressed` on the toggle chips, `aria-checked` where a row is a radio,
 * `aria-selected` on tabs, and `aria-current="page"` on the nav rails. Reading
 * the DOM rather than being told means a call site can change which of these it
 * uses without also having to remember to update its keyboard wiring.
 */
function defaultIsCurrent(el: HTMLElement) {
  return (
    el.getAttribute("aria-pressed") === "true" ||
    el.getAttribute("aria-checked") === "true" ||
    el.getAttribute("aria-selected") === "true" ||
    (el.hasAttribute("aria-current") && el.getAttribute("aria-current") !== "false")
  );
}

/** Somewhere the arrow keys already mean something to the user. */
function isTypingTarget(el: HTMLElement) {
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}
