import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileDrawer, MobileTabBar } from "./mobile-nav";
import { CartPanel } from "./cart-panel";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Application chrome: fixed dark rail on desktop, slide-in drawer + persistent
 * bottom tab bar on phones (the platform is mobile-first for employees), a
 * sticky topbar with the page title + cart, and a scrollable content well.
 * Mounts the global toast region and confirmation dialog. Landmarks + a skip
 * link keep it keyboard- and screen-reader-friendly.
 */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-raised"
      >
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside aria-label="Primary" className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 pb-24 outline-none sm:px-6 lg:px-8 lg:pb-6"
        >
          {/* No transform/animation on this wrapper: a `transform` here (the old
              `animate-fade-in` used translateY) makes it the containing block for
              every inline `position: fixed` modal overlay, clipping them to the
              content area instead of the viewport. */}
          <div className="w-full">{children}</div>
        </main>
      </div>

      {/* Slide-in cart — desktop push panel + mobile overlay drawer */}
      <CartPanel />

      {/* Mobile bottom tab bar — first-class phone navigation */}
      <MobileTabBar />

      <Toaster />
      <ConfirmDialog />
    </div>
  );
}

export { AppShell };
