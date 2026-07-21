"use client";

import * as React from "react";

/**
 * The four things every layer owes a keyboard or screen-reader user, in one
 * hook: Escape closes it, Tab stays inside it, focus starts inside it and
 * returns to whatever opened it, and the page behind it stops scrolling.
 *
 * Each of those was previously either hand-rolled per dialog or missing, which
 * is why they disagreed with each other. Spread the returned props onto the
 * dialog's own element (the panel, not the scrim):
 *
 *     const dialog = useDialog({ open, onClose: close });
 *     <div role="dialog" aria-modal="true" {...dialog.props}>…</div>
 *
 * Pass `onClose: undefined` for a deliberately undismissable dialog — the
 * location gate is one — and Escape stands down while the trap stays on. A
 * layer you can't leave and can't tab out of is a trap in the bad sense.
 */
export function useDialog({
  open,
  onClose,
}: {
  open: boolean;
  /** Omit to make the dialog undismissable by keyboard. */
  onClose?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  // Read at close time, not render time: the element that opened the dialog is
  // whatever had focus the moment it went up.
  const opener = React.useRef<Element | null>(null);

  // Focus in on open, back out on close. Restoring is the half people notice —
  // without it a keyboard user lands on <body> and re-tabs the whole page.
  React.useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const panel = ref.current;
    // A dialog that exists to collect one value — the location gate's ZIP, a
    // search sheet's query — should land on that field, not on its own close
    // button. `autoFocus` can't express this: React fires it on mount, before
    // this effect runs, so we'd focus straight over it. Marking the field lets
    // the dialog say where focus belongs and keeps the two from fighting.
    const preferred = panel?.querySelector<HTMLElement>("[data-autofocus]");
    // Otherwise the first thing the user can act on; failing that the panel
    // itself, so a screen reader at least announces where it now is.
    const first = preferred ?? (panel ? focusable(panel)[0] : null);
    (first ?? panel)?.focus({ preventScroll: true });

    return () => {
      const back = opener.current;
      opener.current = null;
      if (back instanceof HTMLElement && document.contains(back)) {
        back.focus({ preventScroll: true });
        return;
      }
      // The opener is gone — some triggers swap themselves out while their
      // layer is up (the cart button becomes a close button). Focus would
      // otherwise fall to <body>, which drops a keyboard user back to the very
      // top of the page. The main landmark is the nearest honest answer: it is
      // where the content they were working in lives.
      const main = document.querySelector<HTMLElement>("main");
      if (!main) return;
      // Only a focus target, never a Tab stop of its own.
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    };
  }, [open]);

  // Escape to close, Tab to cycle within.
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (!onClose) return;
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = ref.current;
      if (!panel) return;
      const stops = focusable(panel);
      if (stops.length === 0) {
        // Nothing tabbable inside — hold focus on the panel rather than letting
        // Tab escape to the page behind.
        e.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      // Wrap at both ends. The `!panel.contains` case catches focus that has
      // already escaped — clicking the scrim, say — and pulls it back in.
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }
    // Capture phase so a nested layer's handler doesn't swallow Escape first.
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  useScrollLock(open);

  return {
    props: {
      ref,
      // Focusable so the panel itself is a valid focus destination when it holds
      // no controls, without becoming a Tab stop of its own.
      tabIndex: -1,
    },
  };
}

/**
 * Freeze the page behind a layer. Counted, because two dialogs can overlap —
 * the sign-in wall over the location gate — and the inner one closing must not
 * hand scrolling back while the outer one is still up.
 */
function useScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    const body = document.body;
    const depth = Number(body.dataset.scrollLocks ?? "0");
    body.dataset.scrollLocks = String(depth + 1);
    if (depth === 0) {
      // Hold the scroll position: `overflow: hidden` alone drops iOS Safari to
      // the top of the page, and the user finds a different scroll offset
      // waiting for them when the layer closes.
      const y = window.scrollY;
      body.dataset.scrollY = String(y);
      body.style.position = "fixed";
      body.style.top = `-${y}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.overflow = "hidden";
    }
    return () => {
      const next = Number(body.dataset.scrollLocks ?? "1") - 1;
      if (next > 0) {
        body.dataset.scrollLocks = String(next);
        return;
      }
      delete body.dataset.scrollLocks;
      const y = Number(body.dataset.scrollY ?? "0");
      delete body.dataset.scrollY;
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.overflow = "";
      window.scrollTo(0, y);
    };
  }, [active]);
}

/** Tabbable descendants, in document order, skipping anything not really there. */
function focusable(root: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      // `offsetParent` is null for `display: none` subtrees; the rect check
      // catches a collapsed-but-displayed element (an accordion mid-transition).
      (el.offsetParent !== null || el.getClientRects().length > 0),
  );
}
