"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A `radiogroup` that answers the arrow keys it advertises.
 *
 * The app already drew radio groups correctly and announced them correctly —
 * `role="radiogroup"` around `role="radio"` buttons, `aria-checked` carrying the
 * choice. What none of them did was behave like one. A screen reader meeting
 * this markup says *"radio button, 1 of 5"*, which is a promise about the arrow
 * keys; pressing them did nothing. And because every option was its own Tab
 * stop, walking past the five packaging choices to reach the button underneath
 * cost five presses instead of one. Same broken promise the tab strips and star
 * ratings had, in the last place it was still standing.
 *
 * Two behaviours, both invisible:
 *
 * - **Arrows move between the options; Home/End jump to the ends.** They wrap.
 * - **The group is one Tab stop**, landing on the chosen option — a roving
 *   `tabIndex`, exactly as `tabs.tsx` does it.
 *
 * **Arrows move focus only; Space or Enter chooses.** The APG allows either
 * this or selection-following-focus, and here the choice is forced: several of
 * these options do something on selection beyond selecting. Picking a delivery
 * address fires a toast and closes the panel; *Custom pickup time* opens a
 * dialog. Selecting as the user merely arrows *past* an option would fire all
 * of that on the way through, so arrowing stays free and the commit stays
 * deliberate.
 *
 * Works off the DOM rather than a list of values, so it wraps the markup that
 * is already there — no call site had to be restructured, and nothing moved a
 * pixel.
 */
const RadioGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  function RadioGroup({ className, onKeyDown, children, ...rest }, forwarded) {
    const own = React.useRef<HTMLDivElement>(null);
    const ref = (forwarded ?? own) as React.RefObject<HTMLDivElement>;

    /**
     * The options, in document order.
     *
     * Scoped to *this* group: a `radiogroup` nested inside another would
     * otherwise have its options stolen by the outer one's arrow keys. Nothing
     * nests them today; the guard costs one comparison and stops the next
     * person finding out the hard way.
     *
     * Disabled options are skipped rather than focused-and-dead.
     */
    const options = React.useCallback(() => {
      const root = ref.current;
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>('[role="radio"]')).filter(
        (el) =>
          el.closest('[role="radiogroup"]') === root &&
          !el.hasAttribute("disabled") &&
          el.getAttribute("aria-disabled") !== "true",
      );
    }, [ref]);

    /**
     * Park the single Tab stop on the chosen option.
     *
     * No dependency array on purpose: `aria-checked` lives in the DOM of
     * children this component only passes through, so there is no value here to
     * depend on. Any change to the selection re-renders the parent, which
     * re-renders this, which re-runs the effect — which is the whole signal.
     *
     * With nothing chosen yet the first option holds the stop, so the group can
     * never fall out of the tab order entirely. That failure — a control the
     * keyboard cannot reach at all — is worse than starting the user at the top
     * of a list they were going to arrow through anyway.
     */
    React.useEffect(() => {
      const items = options();
      if (!items.length) return;
      const stop = items.find((el) => el.getAttribute("aria-checked") === "true") ?? items[0];
      for (const el of items) el.tabIndex = el === stop ? 0 : -1;
    });

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      // Let a call site's own handler go first, and stand down if it acted.
      onKeyDown?.(e);
      if (e.defaultPrevented) return;

      const items = options();
      if (items.length < 2) return;

      // Only when focus is on an option. Rows can hold controls of their own —
      // the saved card carries Replace and Remove buttons inside the radio's
      // row — and arrowing while focus sits on one of those is not this group's
      // event to take.
      const from = items.indexOf(document.activeElement as HTMLElement);
      if (from === -1) return;

      let to: number;
      switch (e.key) {
        // Both axes, because these groups are drawn both ways: the packaging
        // options stack, the delivery-time cards sit side by side. A user who
        // sees a row and presses Right should not have to discover it was
        // implemented as a column.
        case "ArrowDown":
        case "ArrowRight":
          to = (from + 1) % items.length;
          break;
        case "ArrowUp":
        case "ArrowLeft":
          to = (from - 1 + items.length) % items.length;
          break;
        case "Home":
          to = 0;
          break;
        case "End":
          to = items.length - 1;
          break;
        default:
          return;
      }

      // Otherwise the page scrolls under the group as focus moves through it.
      e.preventDefault();
      const target = items[to];
      // The Tab stop follows focus, so leaving the group and coming back returns
      // to where the user actually got to — not to whatever is still checked.
      for (const el of items) el.tabIndex = el === target ? 0 : -1;
      target.focus();
    }

    return (
      <div ref={ref} role="radiogroup" onKeyDown={handleKeyDown} className={cn(className)} {...rest}>
        {children}
      </div>
    );
  },
);

export { RadioGroup };
