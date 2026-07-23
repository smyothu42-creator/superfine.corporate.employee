"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LogIn, Apple, MessageSquareHeart } from "lucide-react";
import { NAV_ITEMS, isActive, visibleNav, requiresAccount } from "@/lib/nav";
import { useUiStore } from "@/store/use-ui-store";
import { useSessionStore } from "@/store/use-session-store";
import { useNotificationsStore } from "@/store/use-notifications-store";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { useSignOut } from "@/features/auth/use-sign-out";
import { useRoving } from "@/lib/roving";
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
  const unread = useNotificationsStore((s) => s.items.filter((n) => !n.read).length);

  const handleLogout = useSignOut(onNavigate);

  /**
   * Up and Down walk the rail; Home and End jump to its ends.
   *
   * Purely additive (`rove: false`) — every link keeps the Tab stop it already
   * had. These are five destinations, not one control with five settings, and
   * a rail that answered the arrows by *removing* four Tab presses would be
   * taking something away from the keyboard user it is meant to help. The
   * chip rows elsewhere collapse to one stop because a chip row genuinely is
   * one question; a nav is not.
   */
  const navRoving = useRoving({ orientation: "vertical", rove: false });

  return (
    // Width comes from `--sidebar-w` so a fixed element that has to start where
    // the content starts (checkout's docked CTA) can read the same number.
    // `data-dark-surface` switches the global focus outline to yellow in here —
    // the teal ring is all but invisible against this rail.
    <div
      data-dark-surface
      className="flex h-full w-[var(--sidebar-w)] flex-col bg-sidebar text-sidebar-foreground"
    >
      <div className="flex items-center px-4 py-6">
        <Logo variant="light" size="xl" className="flex-1 items-center" />
      </div>

      {/* Named. Two navigation regions used to sit on every page — this one is
          rendered by both the desktop rail and the mobile drawer — with no way
          for a screen reader to tell them apart when listing landmarks. */}
      <nav
        aria-label="Main"
        className="flex-1 space-y-2.5 overflow-y-auto px-3 py-1"
        {...navRoving.props}
      >
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
              <span className="flex-1">{item.label}</span>
              {/* The count, on the row it belongs to. The hamburger only says
                  "something is in here"; this is the row that says how much, and
                  it's the same answer in the drawer and the desktop rail. */}
              {item.href === "/notifications" && unread > 0 ? (
                <span
                  className={cn(
                    "flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-2xs font-bold leading-5",
                    active ? "bg-teal-deep text-white" : "bg-coral text-white",
                  )}
                >
                  {/* "Notifications 3" left the 3 unexplained. */}
                  {unread}
                  <span className="sr-only"> unread</span>
                </span>
              ) : null}
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
        {/* Open to guests now: `/rate` proves who you are with an order number
            and an email when there's no session to do it, so feedback is no
            longer gated on having an account. */}
        <Link href="/rate" onClick={onNavigate} className={SECONDARY_LINK}>
          <MessageSquareHeart className="size-3.5 shrink-0" /> Rate a meal or report a problem
        </Link>
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
