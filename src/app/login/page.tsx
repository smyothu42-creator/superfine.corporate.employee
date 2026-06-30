import Link from "next/link";
import { Mail, KeyRound, ArrowRight, Leaf } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label, Field } from "@/components/ui/input";
import { me } from "@/data/me";

/**
 * Employee sign-in. Addresses the #1 interview pain point: one front door —
 * sign in with the company email (or an invite link from your corp admin) and
 * land straight on the right company menu, with the correct subsidy applied.
 * No "individual vs. family" detour, no special calendar link to click first.
 */
export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand hero — lemon-yellow with hand-drawn texture (site signature) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-hero-yellow p-10 lg:flex">
        {/* Hand-drawn food-doodle pattern on the lemon background */}
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full text-[#8f7c00] opacity-[0.18]">
          <defs>
            <pattern id="food-doodles" width="160" height="160" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {/* fork */}
                <path d="M26 20v10M30 20v10M34 20v10M26 30h8M30 30v26" />
                {/* spoon */}
                <ellipse cx="64" cy="26" rx="5" ry="8" />
                <path d="M64 34v22" />
                {/* chef hat */}
                <path d="M100 48q-6-2-4-10-3-9 7-9 2-9 11-6 9-4 11 5 9 0 6 9 4 7-3 11z" />
                <path d="M100 48h22v7h-22z" />
                {/* pan */}
                <circle cx="40" cy="100" r="12" />
                <path d="M52 100h15" />
                {/* heart */}
                <path d="M78 92c-3-6-12-4-12 2 0 7 8 12 12 17 4-5 12-10 12-17 0-6-9-8-12-2z" />
                {/* plate */}
                <circle cx="118" cy="112" r="14" />
                <circle cx="118" cy="112" r="9" />
                {/* triangle + dots */}
                <path d="M150 138l6 10h-12z" />
                <circle cx="20" cy="74" r="1.6" fill="currentColor" stroke="none" />
                <circle cx="146" cy="64" r="1.6" fill="currentColor" stroke="none" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#food-doodles)" />
        </svg>

        <div className="relative">
          <Logo variant="dark" size="xl" />
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-teal-deep">
            Fresh, globally inspired lunches on your company&apos;s tab.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-teal-deep/80">
            Order in a couple of taps for one day or the whole week. Your subsidy is applied
            automatically. No math, no surprises.
          </p>
        </div>
        <div className="relative flex items-center gap-2 text-[13px] font-medium text-teal-deep/80">
          <Leaf className="size-4" /> Certified SF Green Business · Made daily in our SF kitchen
        </div>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-col items-center justify-center bg-background px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo variant="dark" showPlatform />
          </div>

          <div className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-9">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              For Superfine Kitchen meal program
            </p>

            <p className="mt-5 rounded-xl border border-info-border bg-info-bg px-4 py-3 text-[13px] leading-relaxed text-info">
              Sign in with your company email or the invite link from your office admin. You&apos;ll
              land straight on your company menu with the right prices.
            </p>

            <form className="mt-6 space-y-4">
              <Field>
                <Label htmlFor="email">Company Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" defaultValue={me.email} className="pl-10" autoComplete="email" />
                </div>
              </Field>

              <Field>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" defaultValue="superfine" className="pl-10" autoComplete="current-password" />
                </div>
              </Field>

              <Button asChild block size="lg" className="mt-1">
                <Link href="/menu">
                  Sign In <ArrowRight className="size-4" />
                </Link>
              </Button>
            </form>

            <p className="mt-5 text-center text-[13px] text-muted-foreground">
              Or{" "}
              <Link href="/menu" className="font-semibold text-primary underline underline-offset-2">
                use your invite link
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-2xs text-muted-foreground">
            © {new Date().getFullYear()} Superfine Kitchen · Corporate Employee
          </p>
        </div>
      </div>
    </div>
  );
}
