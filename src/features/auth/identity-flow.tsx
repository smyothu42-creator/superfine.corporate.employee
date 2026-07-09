"use client";

import * as React from "react";
import { Mail, ArrowRight, ArrowLeft, Building2, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Field } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { resolveIdentity, lookupCorporate, demoCorporateEmail } from "@/data/roster";
import { useSessionStore, type Account } from "@/store/use-session-store";

type Step = "email" | "verify" | "individual";

/**
 * The single branch point of the whole auth flow: one email field.
 *
 * What happens next is decided by `resolveIdentity`, which tells us only which
 * channel to verify through — never whether the address was on a company
 * roster. That distinction is the security property: revealing "yes, this
 * address belongs to a Superfine customer" before the user has proved they own
 * the inbox would make this screen an oracle for enumerating a client's staff.
 * The company, the subsidy, and the corporate menu appear only after a magic
 * link is opened.
 */
export function IdentityFlow({ onDone }: { onDone?: (account: Account) => void }) {
  const signIn = useSessionStore((s) => s.signIn);
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  function complete(account: Account) {
    signIn(account);
    onDone?.(account);
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStep(resolveIdentity(email).channel === "magic_link" ? "verify" : "individual");
  }

  /**
   * Stands in for the user opening the emailed link. Only here — after proof of
   * inbox control — do we look up the entitlement and attach a companyId.
   */
  function openMagicLink() {
    const contract = lookupCorporate(email);
    if (!contract) {
      // Belt and braces: a roster change between send and open drops them to the
      // individual path rather than granting a subsidy we can't justify.
      setStep("individual");
      return;
    }
    complete({
      kind: "corporate",
      email: email.trim().toLowerCase(),
      companyId: contract.companyId,
      company: contract.company,
    });
  }

  if (step === "verify") {
    return (
      <div className="space-y-5">
        <Header
          icon={<Mail className="size-5" />}
          title="Check your inbox"
          subtitle={`We sent a sign-in link to ${email}. It expires in 15 minutes.`}
        />
        <Notice tone="info">
          Opening the link proves you control this inbox. Only then do we apply any company pricing
          — so nobody can claim a subsidy just by typing a work address.
        </Notice>

        {/* Demo affordance. In production the user opens the link from email. */}
        <Button block size="lg" onClick={openMagicLink}>
          <Sparkles className="size-4" /> Open the magic link (demo)
        </Button>
        <BackLink onClick={() => setStep("email")}>Use a different email</BackLink>
      </div>
    );
  }

  if (step === "individual") {
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          complete({ kind: "individual", email: email.trim().toLowerCase(), name, phone });
        }}
      >
        <Header
          icon={<Check className="size-5" />}
          title="Almost there"
          subtitle="Just a name and number so the driver can find you."
        />
        <Field>
          <Label htmlFor="id-name">Full name</Label>
          <Input id="id-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field>
          <Label htmlFor="id-phone">Phone</Label>
          <Input
            id="id-phone"
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            autoComplete="tel"
          />
        </Field>
        <Button block size="lg" type="submit">
          Continue <ArrowRight className="size-4" />
        </Button>
        <BackLink onClick={() => setStep("email")}>Use a different email</BackLink>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submitEmail}>
      <Header
        icon={<Building2 className="size-5" />}
        title="What's your email?"
        subtitle="Work or personal — we'll take it from there. No password required."
      />
      <Field>
        <Label htmlFor="id-email">Email</Label>
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
            autoComplete="email"
          />
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-2xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0 text-primary" />
          If your company covers lunch, we&apos;ll unlock it after you verify.
        </p>
      </Field>
      <Button block size="lg" type="submit">
        Continue <ArrowRight className="size-4" />
      </Button>
      <button
        type="button"
        onClick={() => setEmail(demoCorporateEmail)}
        className="block w-full text-center text-2xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Demo: use a corporate email
      </button>
    </form>
  );
}

function Header({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div>
      <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-wash text-primary">
        {icon}
      </span>
      <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">{title}</h2>
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
