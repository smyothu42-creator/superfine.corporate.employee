"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LogIn, Apple, MessageSquareHeart } from "lucide-react";
import { NAV_ITEMS, isActive, visibleNav, requiresAccount } from "@/lib/nav";
import { useUiStore } from "@/store/use-ui-store";
import { useSessionStore } from "@/store/use-session-store";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { useSignOut } from "@/features/auth/use-sign-out";
import { cn } from "@/lib/utils";

/** The rail's quiet foot-of-the-list links — not nav, and not styled like it. */
const SECONDARY_LINK =
  "flex items-center gap-2 py-1 text-2xs font-medium text-sidebar-muted transition-colors hover:text-white";

interface SidebarProps {
  onNavigate?: () => void;
}

/** Persistent deep-teal navigation rail (desktop) / drawer body (mobile). */
function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const account = useSessionStore((s) => s.account);
  const openSignInPrompt = useUiStore((s) => s.openSignInPrompt);
  const openFeedback = useUiStore((s) => s.openFeedbackModal);

  const handleLogout = useSignOut(onNavigate);

  return (
    // Width comes from `--sidebar-w` so a fixed element that has to start where
    // the content starts (checkout's docked CTA) can read the same number.
    <div className="flex h-full w-[var(--sidebar-w)] flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center px-4 py-6">
        <Logo variant="light" size="xl" className="flex-1 items-center" />
      </div>

      <nav className="flex-1 space-y-2.5 overflow-y-auto px-3 py-1">
        {visibleNav(NAV_ITEMS, account).map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          // A guest reaching for an account-only screen gets the sign-in prompt
          // in place — no navigation to a page there's nothing to show them on.
          const gated = !account && requiresAccount(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (gated) {
                  e.preventDefault();
                  openSignInPrompt(item.href);
                }
                onNavigate?.();
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-yellow text-teal-deep shadow-sm"
                  : "text-sidebar-muted hover:bg-sidebar-active hover:text-white",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Secondary site links — kept quiet at the foot of the rail. Nutrition
          lookup lives here (not beside the Menu title) because pulling accurate
          figures for some meals is hard, so we don't want to over-promise it.

          Feedback joined it here from a floating button that sat over the menu
          on every visit. Asking for feedback should be available, not insistent:
          in the rail it's found by someone who has something to say, and it no
          longer covers the meal in the bottom-right corner. Same quiet type as
          Nutrition rather than a nav pill — neither is a place in the app, and a
          pill among the pills would read as a sixth section. */}
      <div className="space-y-0.5 px-4 pb-1 pt-2">
        <Link
          href="/nutrition"
          onClick={onNavigate}
          className={SECONDARY_LINK}
        >
          <Apple className="size-3.5 shrink-0" /> Check the nutrition information
        </Link>
        {/* Signed in only: feedback is tied to an account and the orders behind
            it, and a guest has neither. */}
        {account ? (
          <button
            type="button"
            onClick={() => {
              openFeedback();
              // Closes the mobile drawer, or the sheet opens behind it.
              onNavigate?.();
            }}
            className={cn(SECONDARY_LINK, "w-full text-left")}
          >
            <MessageSquareHeart className="size-3.5 shrink-0" /> Share your feedback
          </button>
        ) : null}
      </div>

      {/* Profile — moved down from the topbar into the rail */}
      <div className="border-t border-sidebar-active/50 p-3">
        {/* A guest is a guest. The old footer showed the hardcoded employee to
            everyone, which is how "am I signed in?" became unanswerable. */}
        {account ? (
          <div className="flex items-center gap-2 rounded-full bg-sidebar-active/40 py-1 pl-1 pr-1.5">
            <Link
              href="/account"
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full p-1 transition-colors hover:bg-sidebar-active"
            >
              <Avatar name={account.name ?? account.email} className="bg-yellow text-teal-deep" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-semibold text-white">
                  {account.name ?? account.email}
                </span>
                <span className="block truncate text-2xs text-sidebar-muted">
                  {account.company ?? "Individual"}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="rounded-full p-2 text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-white"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              openSignInPrompt();
              onNavigate?.();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-sidebar-active/40 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sidebar-active"
          >
            <LogIn className="size-4" /> Sign in
          </button>
        )}
      </div>
    </div>
  );
}

export { Sidebar };
