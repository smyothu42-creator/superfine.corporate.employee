"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, UtensilsCrossed, KeyRound } from "lucide-react";
import { AuthLayout } from "@/components/brand/auth-hero";
import { Button } from "@/components/ui/button";
import { IdentityFlow, type AuthMode } from "@/features/auth/identity-flow";
import { useBrowseFlow } from "@/features/location/use-browse-flow";
import { cn } from "@/lib/utils";

/**
 * Sign in and sign up, on one screen.
 *
 * They are the same screen because for a passwordless flow they are the same
 * three steps — an address, a proof, and whatever we don't know yet. The toggle
 * exists so someone who came to *create* an account doesn't think they're in the
 * wrong place; it changes two labels and nothing else.
 *
 * This is not the front door for browsing. `/` lets anyone see the menu with a
 * ZIP and no account, and the individual's details are collected at checkout,
 * once they actually have something to deliver.
 */
export default function LoginPage() {
  return (
    <AuthLayout>
      <React.Suspense fallback={<div className="h-[520px] w-full max-w-lg" />}>
        <LoginCard />
      </React.Suspense>
    </AuthLayout>
  );
}

function LoginCard() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = React.useState<AuthMode>(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const { browse, locating, dialogNode } = useBrowseFlow();

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-9">
        <div className="mb-6 flex rounded-full border border-border bg-muted/60 p-1">
          <ModeTab active={mode === "signin"} onClick={() => setMode("signin")}>
            Sign in
          </ModeTab>
          <ModeTab active={mode === "signup"} onClick={() => setMode("signup")}>
            Sign up
          </ModeTab>
        </div>

        {/* Remounting on mode change resets a half-typed password — the toggle is
            a change of intent, and carrying the old state across it reads as a bug. */}
        {/* Nobody arriving through this form meets the menu's location gate. A
            new individual gives a ZIP on the last step of sign-up; a returning
            one answered when they registered; a corporate employee delivers to
            a contract address. Only browsing without an account is still asked. */}
        <IdentityFlow
          key={mode}
          mode={mode}
          showModeSwitch={false}
          onModeChange={setMode}
          onDone={() => router.push("/menu")}
        />

        {/* An individual who landed here by habit needs the door they actually
            wanted to be legible without being a second card competing with the
            form. It runs the browse flow in place — sending them back to `/` to
            press the same button again would be a loop, not a shortcut. */}
        <div className="mt-6 border-t border-border pt-5 text-center">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-[13px] underline"
            disabled={locating}
            onClick={browse}
          >
            {locating ? (
              <>
                <LoaderCircle className="size-4 animate-spin" /> Finding you…
              </>
            ) : (
              <>
                <UtensilsCrossed className="size-4" /> Browse the menu without signing up
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Demo affordance: a corporate employee whose account an admin created
          gets an email with a link to set their password. This stands in for
          opening that link — it lands on the Set Password screen. Sits outside
          the card, below it. */}
      <div className="mt-4 text-center">
        <Link
          href="/set-password"
          className="inline-flex items-center gap-1 text-2xs text-muted-foreground/70 underline underline-offset-2 hover:text-muted-foreground"
        >
          <KeyRound className="size-3" /> Admin created a corp employee account? Open the email link
          to set the password (demo)
        </Link>
      </div>

      {dialogNode}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
