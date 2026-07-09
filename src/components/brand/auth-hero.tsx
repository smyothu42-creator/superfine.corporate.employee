import { Leaf } from "lucide-react";
import { Logo } from "@/components/brand/logo";

/**
 * The lemon-yellow brand panel shared by every pre-app screen (ZIP entry,
 * sign-in). The headline no longer promises "your company's tab" — most people
 * arriving here have no company, and the old copy pre-committed them to a path
 * before we knew which one they were on.
 */
export function AuthHero() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-hero-yellow p-10 lg:flex">
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full text-[#8f7c00] opacity-[0.18]">
        <defs>
          <pattern id="food-doodles" width="160" height="160" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M26 20v10M30 20v10M34 20v10M26 30h8M30 30v26" />
              <ellipse cx="64" cy="26" rx="5" ry="8" />
              <path d="M64 34v22" />
              <path d="M100 48q-6-2-4-10-3-9 7-9 2-9 11-6 9-4 11 5 9 0 6 9 4 7-3 11z" />
              <path d="M100 48h22v7h-22z" />
              <circle cx="40" cy="100" r="12" />
              <path d="M52 100h15" />
              <path d="M78 92c-3-6-12-4-12 2 0 7 8 12 12 17 4-5 12-10 12-17 0-6-9-8-12-2z" />
              <circle cx="118" cy="112" r="14" />
              <circle cx="118" cy="112" r="9" />
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
          Fresh, globally inspired lunches. Delivered daily.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-teal-deep/80">
          Order for yourself, or through your company&apos;s meal program. Browse first — we&apos;ll
          sort out the details at checkout.
        </p>
      </div>
      <div className="relative flex items-center gap-2 text-[13px] font-medium text-teal-deep/80">
        <Leaf className="size-4" /> Certified SF Green Business · Made daily in our SF kitchen
      </div>
    </div>
  );
}

/** Two-column shell: brand panel left, flow right. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthHero />
      <div className="flex flex-col items-center justify-center bg-background px-5 py-10">
        <div className="mb-6 flex justify-center lg:hidden">
          <Logo variant="dark" showPlatform />
        </div>
        {children}
        <p className="mt-6 text-center text-2xs text-muted-foreground">
          © 2026 Superfine Kitchen
        </p>
      </div>
    </div>
  );
}
