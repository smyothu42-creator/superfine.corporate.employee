"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LogIn } from "lucide-react";
import { NAV_ITEMS, isActive, visibleNav, requiresAccount } from "@/lib/nav";
import { useUiStore } from "@/store/use-ui-store";
import { useSessionStore } from "@/store/use-session-store";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { confirm } from "@/store/use-confirm-store";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onNavigate?: () => void;
}

/** Persistent deep-teal navigation rail (desktop) / drawer body (mobile). */
function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  // While changing a placed order, /menu is a sub-flow — don't light up "Menu".
  const editing = useUiStore((s) => Boolean(s.editingOrder));

  const account = useSessionStore((s) => s.account);
  const signOut = useSessionStore((s) => s.signOut);
  const openSignInPrompt = useUiStore((s) => s.openSignInPrompt);

  async function handleLogout() {
    const ok = await confirm({
      title: account?.company ? `Sign out of ${account.company}?` : "Sign out?",
      description: account?.company
        ? "Your company's pricing will no longer apply until you verify again."
        : "You can keep browsing, but you'll need to sign in again to order.",
      confirmLabel: "Sign out",
    });
    if (ok) {
      // Actually drop the session. The old code only navigated, which left the
      // subsidy applied to whoever sat down at the machine next.
      signOut();
      onNavigate?.();
      router.push("/login");
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center px-4 py-6">
        <Logo variant="light" size="xl" className="flex-1 items-center" />
      </div>

      <nav className="flex-1 space-y-2.5 overflow-y-auto px-3 py-1">
        {visibleNav(NAV_ITEMS, account).map((item) => {
          const active = isActive(pathname, item) && !(editing && item.href === "/menu");
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
