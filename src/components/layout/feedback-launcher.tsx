"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MessageSquareHeart, X } from "lucide-react";
import { FeedbackForm } from "@/features/feedback/feedback-form";
import { useUiStore } from "@/store/use-ui-store";
import { useSessionStore } from "@/store/use-session-store";
import { cn } from "@/lib/utils";

/**
 * The everyday way into feedback: a floating action button pinned to the
 * bottom-right, shown only on the Menu page for a signed-in user. It replaces
 * the old "Feedback" rail item — tucked out of the primary nav, but right where
 * people browse meals. Tapping it opens the general feedback form as a modal
 * (the same form the `/feedback` route renders full-page).
 */
function FeedbackLauncher() {
  const account = useSessionStore((s) => s.account);
  const open = useUiStore((s) => s.openFeedbackModal);
  const cartOpen = useUiStore((s) => s.cartOpen);
  const pathname = usePathname();

  // Signed in, and only on the Menu page — the FAB (and the modal it owns) don't
  // appear anywhere else.
  if (!account || pathname !== "/menu") return null;

  return (
    <>
      {/* Hidden while the cart side panel is open — the FAB sits in the same
          bottom-right corner as the cart's Checkout button and would cover it. */}
      {!cartOpen ? (
        <button
          type="button"
          onClick={() => open()}
          aria-label="Share your feedback"
          title="Share your feedback"
          className={cn(
            "group above-tab-bar fixed right-4 z-40 flex h-14 items-center justify-center rounded-full px-4 sm:right-6",
            // A little depth: teal gradient, a hairline white ring to lift it off
            // the content, and a soft coloured shadow.
            "bg-gradient-to-br from-primary to-teal-deep text-primary-foreground ring-1 ring-white/20 shadow-lg shadow-teal-deep/30",
            // Lifts and deepens its shadow on hover; presses back down on tap.
            "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <MessageSquareHeart className="size-6 shrink-0" />
          {/* Collapsed to an icon by default; slides out a label on hover (desktop). */}
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-[6rem] group-hover:opacity-100">
            Feedback
          </span>
        </button>
      ) : null}
      <FeedbackModal />
    </>
  );
}

/** The feedback form in a bottom-sheet (mobile) / centered (desktop) modal. */
function FeedbackModal() {
  const isOpen = useUiStore((s) => s.feedbackModalOpen);
  const order = useUiStore((s) => s.feedbackModalOrder);
  const close = useUiStore((s) => s.closeFeedbackModal);
  const [shown, setShown] = React.useState(false);

  // Drive the enter transition on mount, and close on Escape.
  React.useEffect(() => {
    if (!isOpen) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-raised transition-all duration-200 sm:rounded-3xl",
          shown
            ? "translate-y-0 sm:scale-100 sm:opacity-100"
            : "translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 id="feedback-modal-title" className="font-display text-lg font-semibold tracking-tight">
              Share your feedback
            </h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              A quick rating and a few words. The kitchen reads every one.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <FeedbackForm initialOrder={order ?? ""} onDone={close} />
        </div>
      </div>
    </div>
  );
}

export { FeedbackLauncher };
