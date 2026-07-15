"use client";

import * as React from "react";
import Link from "next/link";
import {
  Mail,
  MailCheck,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  Building2,
  Send,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Field } from "@/components/ui/input";
import { lookupCorporate, demoCorporateEmail, demoGoogleEmail, demoMicrosoftEmail } from "@/data/roster";
import { useSessionStore, type Account } from "@/store/use-session-store";
import { useCartStore } from "@/store/use-cart-store";
import { useOrderEditStore } from "@/store/use-order-edit-store";

type Step = "form" | "verify" | "exists" | "forgot" | "reset-sent";

export type AuthMode = "signin" | "signup";

/**
 * Sign in and sign up, sharing one component because they share one branch
 * point: the email domain. Whoever proves an address on a contracted domain is a
 * corporate employee and sees their subsidy from that moment on; everyone else
 * is an individual and gives us a name and a number.
 *
 * An individual proves the address twice: a password on the form, then a
 * confirmation link we email to that address, which they open to create the
 * account — the same "is this inbox really yours" check any consumer sign-up
 * runs. Signing in skips it (the account already exists), and OAuth skips it
 * (the provider proved the address).
 *
 * A corporate employee never registers. Their account is provisioned from the
 * contract, so a sign-up attempt on a contracted domain is someone who already
 * has an account and doesn't know it. We say so and point them at sign in.
 *
 * OAuth skips all of it: the provider has already proved the address.
 */
export function IdentityFlow({
  mode: initialMode = "signin",
  /** Off where the parent already renders a sign-in / sign-up control. */
  showModeSwitch = true,
  /**
   * Whether a newly signed-in individual should be asked for their delivery
   * location on the menu. False everywhere the user is already past the location
   * gate — the checkout modal and the guest sign-in wall both sit on top of a
   * page they only reached with a serviceable ZIP, so re-asking is the friction
   * we set out to remove. True on `/login`, the one front door that isn't behind
   * the gate: someone signing in there hasn't answered "where", so we drop any
   * stale ZIP and let the menu ask. Corporate employees are never asked either
   * way — their orders go to a contract-locked address.
   */
  resetLocation = false,
  onModeChange,
  onDone,
}: {
  mode?: AuthMode;
  showModeSwitch?: boolean;
  resetLocation?: boolean;
  /** Told when the flow switches mode itself, so a parent's tabs can follow. */
  onModeChange?: (mode: AuthMode) => void;
  onDone?: (account: Account) => void;
}) {
  const signIn = useSessionStore((s) => s.signIn);
  const clearZip = useSessionStore((s) => s.clearZip);
  const clearCart = useCartStore((s) => s.clear);
  const endEdit = useOrderEditStore((s) => s.end);
  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [step, setStep] = React.useState<Step>("form");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  /** Sign up only — a typo in a password you can't see is a locked-out account. */
  const [confirm, setConfirm] = React.useState("");
  /** Whether the "resend" affordance on the confirmation step was just used. */
  const [resent, setResent] = React.useState(false);

  function complete(account: Account) {
    // Signing in or up at the front door (`/login`) is a clean start: an empty
    // cart, not whatever a previous guest on this browser left behind, and no
    // stale edit session. `resetLocation` marks that front door — at checkout and
    // the guest sign-in wall it's false, so an in-progress cart is kept (the whole
    // point of deferring identity until checkout).
    if (resetLocation) {
      clearCart();
      endEdit();
    }
    signIn(account);
    onDone?.(account);
  }

  /** A corporate session for a proved address on a contracted domain, or null. */
  function corporateSession(proved: string): Account | null {
    const contract = lookupCorporate(proved);
    if (!contract) return null;
    return {
      kind: "corporate",
      email: proved.trim().toLowerCase(),
      companyId: contract.companyId,
      company: contract.company,
    };
  }

  /**
   * Leaving the credentials form. A contracted domain never registers — it
   * already has an account — so sign up on one is sent to "exists". A new
   * individual goes to the email-confirmation step before the account is made.
   * Signing in has nothing to confirm, so it resolves straight from the form.
   */
  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && lookupCorporate(email)) {
      setStep("exists");
    } else if (mode === "signup") {
      setResent(false);
      setStep("verify");
    } else {
      resolveVerified(email);
    }
  }

  /** "Resend" — stands in for mailing a fresh confirmation link. */
  function resendEmail() {
    setResent(true);
  }

  /**
   * The address is now proved. A contracted domain becomes a corporate employee;
   * everyone else is an individual. Whether that individual is asked for their
   * delivery area next is `resetLocation`'s call: from the checkout modal or the
   * guest sign-in wall they already answered on the menu, so we keep the ZIP and
   * don't re-ask; from `/login` they haven't, so we clear any stale ZIP and let
   * the menu's dialog settle it. Phone and address are collected at checkout, and
   * the account is seeded with a system-derived name they can rename in Account &
   * Profile.
   */
  function resolveVerified(proved: string) {
    const corporate = corporateSession(proved);
    if (corporate) {
      complete(corporate);
      return;
    }
    const address = proved.trim().toLowerCase();
    if (resetLocation) clearZip();
    complete({ kind: "individual", email: address, name: defaultNameFromEmail(address) });
  }

  /** Back to the top of the other form. A parent with tabs is told to follow. */
  function switchMode(next: AuthMode) {
    setMode(next);
    setPassword("");
    setConfirm("");
    setResent(false);
    setStep("form");
    onModeChange?.(next);
  }

  /** "Send reset link": stands in for mailing a reset link to the address. In
   *  production the link lands on /set-password; here we just confirm it's sent. */
  function sendReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStep("reset-sent");
  }

  function continueWithProvider(provider: "google" | "microsoft") {
    // Stands in for the OAuth round trip. The provider returns a proved address,
    // so there is nothing left for a verification email to establish — a work
    // domain becomes corporate, anyone else goes straight to the menu. Both demo
    // providers hand back a personal address, so each resolves to an individual.
    const returned = provider === "microsoft" ? demoMicrosoftEmail : demoGoogleEmail;
    setEmail(returned);
    resolveVerified(returned);
  }

  /**
   * Email confirmation — the individual sign-up gate. We email a confirmation
   * link to the address; opening it from the inbox proves the inbox is theirs
   * and creates the account. The demo button below stands in for that click —
   * in production the link lands back here already verified.
   */
  if (step === "verify") {
    const shownEmail = email.trim().toLowerCase();
    return (
      <div className="space-y-5">
        <Header
          icon={<MailCheck className="size-5" />}
          title="Confirm your email"
          subtitle={`We sent a confirmation link to ${shownEmail}. Open that email and tap Confirm to finish creating your account.`}
        />
        {resent ? (
          <p className="flex items-center gap-2 rounded-xl border border-border bg-teal-wash px-4 py-3 text-[13px] font-medium text-teal-deep">
            <Check className="size-4 shrink-0" /> A fresh confirmation link is on its way to {shownEmail}.
          </p>
        ) : null}
        {/* Demo affordance: stands in for opening the email and tapping its
            Confirm button. Clicking it proves the address and creates the
            account, just as opening the real link would. */}
        <Button block size="lg" onClick={() => resolveVerified(email)}>
          <MailCheck className="size-4" /> Open the confirmation link (demo)
        </Button>
        {/* Two ways out: get another email, or fix a mistyped address. */}
        <div className="flex items-center justify-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Didn&apos;t get it?</span>
          <button
            type="button"
            onClick={resendEmail}
            className="font-semibold text-primary underline underline-offset-2 hover:text-teal-deep"
          >
            Resend email
          </button>
        </div>
        <BackLink onClick={() => setStep("form")}>Use a different email</BackLink>
      </div>
    );
  }

  /**
   * A corporate employee's account exists before they ever visit us. Telling
   * them to "create" one they already have is how a person ends up with two
   * accounts and one subsidy.
   */
  if (step === "exists") {
    return (
      <div className="space-y-5">
        <Header
          icon={<Building2 className="size-5" />}
          title="You already have an account"
          subtitle={`${email.trim().toLowerCase()} is registered through your company's meal program. Sign in and your subsidised prices are already waiting.`}
        />
        <Button block size="lg" onClick={() => switchMode("signin")}>
          Sign in instead <ArrowRight className="size-4" />
        </Button>
        <BackLink onClick={() => setStep("form")}>Use a different email</BackLink>
      </div>
    );
  }

  /** Forgot password — collect the address to mail a reset link to. */
  if (step === "forgot") {
    return (
      <form className="space-y-5" onSubmit={sendReset}>
        <Header
          icon={<KeyRound className="size-5" />}
          title="Reset your password"
          subtitle="Enter your account email and we'll send you a link to set a new password."
        />
        <Field>
          <Label htmlFor="reset-email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pl-10"
              autoComplete="off"
            />
          </div>
        </Field>
        <Button block size="lg" type="submit" disabled={!email.trim()}>
          <Send className="size-4" /> Send reset link
        </Button>
        <BackLink onClick={() => setStep("form")}>Back to sign in</BackLink>
      </form>
    );
  }

  /** Confirmation that the reset link was sent. The demo link stands in for the
   *  link a real user would open from their inbox — it lands on /set-password. */
  if (step === "reset-sent") {
    return (
      <div className="space-y-5">
        <Header
          icon={<Mail className="size-5" />}
          title="Check your email"
          subtitle={`If an account exists for ${email.trim().toLowerCase()}, we've sent a link to reset your password. It expires in 30 minutes.`}
        />
        {/* Demo affordance. In production the user opens the link from email. */}
        <Button asChild block size="lg">
          <Link href="/set-password?reset=1">
            <KeyRound className="size-4" /> Open the reset link (demo)
          </Link>
        </Button>
        <BackLink onClick={() => setStep("form")}>Back to sign in</BackLink>
      </div>
    );
  }

  const signup = mode === "signup";
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;
  const passwordReady = password.length >= MIN_PASSWORD && confirm === password;

  return (
    <div className="space-y-4">
      {/* No icon badge here — the mode tabs directly above already say what this
          screen is, and a second marker just pushes the email field down. */}
      <Header
        title={signup ? "Create your account" : "Sign in"}
        subtitle="Order lunch, track deliveries, and manage your plan in one place."
      />

      {/* Email and password lead. They're what the screen is named after, and a
          returning user shouldn't have to read past two buttons they didn't use
          last time to find the field their password manager is already filling. */}
      <form className="space-y-4" onSubmit={submitForm}>
        <Field>
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="id-email">Email</Label>
            {/* Demo affordance, deliberately quiet — it fills the field for a
                walkthrough and shouldn't read as an option a real user has. */}
            <button
              type="button"
              onClick={() => setEmail(demoCorporateEmail)}
              className="text-2xs text-muted-foreground/70 underline underline-offset-2 hover:text-muted-foreground"
            >
              Demo: use a corporate email
            </button>
          </div>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="id-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pl-10"
              autoComplete="off"
            />
          </div>
        </Field>

        <Field>
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="id-password">{signup ? "Create password" : "Password"}</Label>
            {/* Sign in only — there's no password to forget while creating one. */}
            {!signup ? (
              <button
                type="button"
                onClick={() => setStep("forgot")}
                className="text-2xs font-semibold text-primary underline underline-offset-2 hover:text-teal-deep"
              >
                Forgot password?
              </button>
            ) : null}
          </div>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="id-password"
              type="password"
              required
              minLength={signup ? MIN_PASSWORD : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={signup ? `At least ${MIN_PASSWORD} characters` : "••••••••"}
              className="pl-10"
              autoComplete="off"
            />
          </div>
          {signup && tooShort ? (
            <p className="mt-1.5 text-2xs font-medium text-danger">
              At least {MIN_PASSWORD} characters.
            </p>
          ) : null}
        </Field>

        {signup ? (
          <Field>
            <Label htmlFor="id-confirm">Confirm password</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="id-confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                className="pl-10"
                autoComplete="off"
                aria-invalid={mismatch || undefined}
              />
            </div>
            {mismatch ? (
              <p className="mt-1.5 text-2xs font-medium text-danger">Both passwords must match.</p>
            ) : null}
          </Field>
        ) : null}

        <Button block size="lg" type="submit" disabled={signup && !passwordReady}>
          {signup ? "Create account" : "Sign in"} <ArrowRight className="size-4" />
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* OAuth for anyone who'd rather not type a password. In the demo both
          providers return a personal address, so each signs in as an individual;
          a corporate employee proves their work address on the form above. */}
      <div className="space-y-2">
        <ProviderButton onClick={() => continueWithProvider("google")} icon={<GoogleMark />}>
          Continue with Google
        </ProviderButton>
        <ProviderButton onClick={() => continueWithProvider("microsoft")} icon={<MicrosoftMark />}>
          Continue with Microsoft
        </ProviderButton>
      </div>

      {/* The modal at checkout has no tabs above it, so the flow carries its own
          way across. On /login the tabs are the control, and a second one that
          could disagree with them would be a bug waiting to be filed. */}
      {showModeSwitch ? (
        <button
          type="button"
          onClick={() => switchMode(signup ? "signin" : "signup")}
          className="block w-full text-center text-2xs text-muted-foreground hover:text-foreground"
        >
          {signup ? "Already have an account? " : "New here? "}
          <span className="font-semibold text-primary underline underline-offset-2">
            {signup ? "Sign in" : "Create one"}
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** Long enough to be worth having, short enough that nobody writes it on a note. */
const MIN_PASSWORD = 8;

/**
 * A friendly starter name derived from the email's local part, since we no
 * longer ask individuals for one at sign-up. "sam.rivera42@gmail.com" becomes
 * "Sam Rivera"; the user can change it any time in Account & Profile.
 */
function defaultNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const words = local
    .replace(/\d+/g, " ")
    .split(/[._+-]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.join(" ") || "New member";
}

function ProviderButton({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {icon}
      {children}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="size-4 shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="size-4 shrink-0">
      <path fill="#F25022" d="M0 0h8.5v8.5H0z" />
      <path fill="#7FBA00" d="M9.5 0H18v8.5H9.5z" />
      <path fill="#00A4EF" d="M0 9.5h8.5V18H0z" />
      <path fill="#FFB900" d="M9.5 9.5H18V18H9.5z" />
    </svg>
  );
}

function Header({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div>
      {icon ? (
        <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-teal-wash text-primary">
          {icon}
        </span>
      ) : null}
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function BackLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" /> {children}
    </button>
  );
}
