"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, ArrowRight } from "lucide-react";
import { AuthLayout } from "@/components/brand/auth-hero";
import { Button } from "@/components/ui/button";
import { Input, Label, Field } from "@/components/ui/input";
import { toast } from "@/store/use-toast-store";

/** Match the sign-up form's minimum so a password set here also passes login. */
const MIN_PASSWORD = 8;

/**
 * Where an invite email or a password-reset link lands. It asks for nothing but
 * a new password (the address is already proved by the emailed token), then
 * sends the user to Sign In to continue the normal login flow — the session is
 * only ever established there, never here.
 *
 * `?reset=1` distinguishes a reset ("choose a new password") from a first-time
 * invite ("set your password"); the two differ only in copy.
 */
export default function SetPasswordPage() {
  return (
    <AuthLayout>
      <React.Suspense fallback={<div className="h-[420px] w-full max-w-lg" />}>
        <SetPasswordCard />
      </React.Suspense>
    </AuthLayout>
  );
}

function SetPasswordCard() {
  const router = useRouter();
  const params = useSearchParams();
  const isReset = params.get("reset") === "1";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = password.length >= MIN_PASSWORD && confirm === password;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    // The token would be exchanged for the new password server-side here. Then
    // it's back to Sign In — deliberately not signed in automatically.
    toast.success(
      isReset ? "Password reset" : "Password set",
      "Sign in with your new password to continue.",
    );
    router.push("/login");
  }

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-9">
        <div>
          <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-teal-wash text-primary">
            <KeyRound className="size-5" />
          </span>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {isReset ? "Choose a new password" : "Set your password"}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {isReset
              ? "Pick a new password for your account, then sign in to continue."
              : "Create a password to finish setting up your account, then sign in to continue."}
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Field>
            <Label htmlFor="new-password">Password</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                required
                minLength={MIN_PASSWORD}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD} characters`}
                className="pl-10"
                autoComplete="new-password"
                /* The message below was on screen and nowhere else: a screen
                   reader had no way to know the field was rejected, let alone
                   why, because nothing tied the red text to the box it was
                   about. `aria-invalid` says something is wrong;
                   `aria-describedby` says what. */
                aria-invalid={tooShort || undefined}
                aria-describedby={tooShort ? "new-password-error" : undefined}
              />
            </div>
            {tooShort ? (
              <p id="new-password-error" role="alert" className="mt-1.5 text-2xs font-medium text-danger">
                At least {MIN_PASSWORD} characters.
              </p>
            ) : null}
          </Field>

          <Field>
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                className="pl-10"
                autoComplete="new-password"
                aria-invalid={mismatch || undefined}
                aria-describedby={mismatch ? "confirm-password-error" : undefined}
              />
            </div>
            {mismatch ? (
              <p id="confirm-password-error" role="alert" className="mt-1.5 text-2xs font-medium text-danger">
                Both passwords must match.
              </p>
            ) : null}
          </Field>

          <Button block size="lg" type="submit" disabled={!ready}>
            {isReset ? "Reset password" : "Set password"} <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
