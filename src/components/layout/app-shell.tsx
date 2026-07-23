import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileDrawer } from "./mobile-nav";
import { CartPanel } from "./cart-panel";
import { SubsidyModelModal } from "./subsidy-model-modal";
import { OrderEditBanner } from "./order-edit-banner";
import { EditLeaveGuard } from "./edit-leave-guard";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Application chrome: fixed dark rail on desktop, slide-in drawer behind the
 * topbar's hamburger on phones (one nav, the full one — a five-tab bar could
 * only ever carry half of it, and it stole a strip of every page for the
 * privilege), a sticky topbar with the page title + cart, and a scrollable
 * content well.
 * Mounts the global toast region and confirmation dialog. Landmarks + a skip
 * link keep it keyboard- and screen-reader-friendly.
 */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    // `dvh`, not `vh`: mobile Safari's `100vh` is the height with the URL bar
    // *hidden*, so a `min-h-screen` page is always taller than what you can see
    // and the last row hides under the browser chrome until you scroll.
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-raised"
      >
        Skip to content
      </a>

      {/* Desktop rail. No label on the `aside` — an `aside` is a *complementary*
          region, so "Primary" was naming the wrong thing; the `nav` inside it
          carries the name now. */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          // `pb-floor` keeps the last card off the home indicator, and clear of
          // the docked CTA bars that several pages park on the viewport floor.
          className="pb-floor flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8"
        >
          {/* No transform/animation on this wrapper: a `transform` here (the old
              `animate-fade-in` used translateY) makes it the containing block for
              every inline `position: fixed` modal overlay, clipping them to the
              content area instead of the viewport. */}
          <div className="w-full">
            {/* Persistent "you're editing an order" bar — visible on every page
                until the edit is saved or discarded. */}
            <OrderEditBanner />
            {children}
          </div>
        </main>
      </div>

      {/* Slide-in cart — desktop push panel + mobile overlay drawer */}
      <CartPanel />


      <Toaster />
      <ConfirmDialog />
      <EditLeaveGuard />
      <SubsidyModelModal />
      <SignInModal />
    </div>
  );
}

export { AppShell };
