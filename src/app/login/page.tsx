"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, KeyRound, ArrowRight } from "lucide-react";
import { AuthLayout } from "@/components/brand/auth-hero";
import { Button } from "@/components/ui/button";
import { Input, Label, Field } from "@/components/ui/input";
import { useSessionStore } from "@/store/use-session-store";
import { program } from "@/data/program";
import { me } from "@/data/me";

/**
 * Employee sign-in: company email and password, nothing else. This door is for
 * corporate employees, so signing in here *is* the corporate session — no magic
 * link, no roster check, no second question.
 *
 * That session is what every price downstream reads, so the subsidy, "pay later"
 * and the company address are all settled before the user reaches checkout.
 * Checkout never asks who they are again.
 *
 * This is not the front door for browsing: `/` asks for a ZIP and lets people
 * see the menu before they ever sign in.
 */
export default function LoginPage() {
  const router = useRouter();
  const signIn = useSessionStore((s) => s.signIn);
  const [email, setEmail] = React.useState(me.email);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    signIn({
      kind: "corporate",
      email: email.trim().toLowerCase(),
      name: me.name,
      company: program.company,
    });
    router.push("/menu");
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-9">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            For Superfine Kitchen meal program
          </p>

          <p className="mt-5 rounded-xl border border-info-border bg-info-bg px-4 py-3 text-[13px] leading-relaxed text-info">
            Sign in with your company email or the invite link from your office admin. You&apos;ll
            land straight on your company menu with the right prices.
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field>
              <Label htmlFor="email">Company Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </Field>

            <Field>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  defaultValue="superfine"
                  className="pl-10"
                  autoComplete="current-password"
                />
              </div>
            </Field>

            <Button type="submit" block size="lg" className="mt-1">
              Sign In <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
