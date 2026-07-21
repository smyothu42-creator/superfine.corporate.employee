import { Leaf } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { FoodDoodles } from "@/components/brand/food-doodles";

/**
 * The lemon-yellow brand panel shared by every pre-app screen (ZIP entry,
 * sign-in). The headline no longer promises "your company's tab" — most people
 * arriving here have no company, and the old copy pre-committed them to a path
 * before we knew which one they were on.
 */
export function AuthHero() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-hero-yellow p-10 lg:flex">
      {/* Same food-doodle illustration as the Nutrition screen, tinted to read on
          the lemon-yellow panel. */}
      <FoodDoodles className="text-[#8f7c00] opacity-20" />

      <div className="relative">
        <Logo variant="dark" size="xl" />
      </div>
      <div className="relative max-w-md">
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-teal-deep">
          Fresh, globally inspired lunches. Delivered daily.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-teal-deep/80">
          Order for yourself, or through your company&apos;s meal program. Browse first. We&apos;ll
          sort out the details at checkout.
        </p>
      </div>
      <div className="relative flex items-center gap-2 text-[13px] font-medium text-teal-deep/80">
        <Leaf className="size-4" /> Certified SF Green Business · Made daily in our SF kitchen
      </div>
    </div>
  );
}

/**
 * The same lemon-yellow brand colour as {@link AuthHero}, but as a banner across
 * the top so the small screens read as two-tone like the desktop split rather
 * than one flat neutral page.
 */
function AuthHeroBanner() {
  return (
    <div className="relative flex flex-col items-center overflow-hidden bg-hero-yellow px-5 py-8 lg:hidden">
      <FoodDoodles patternId="food-doodles-auth-banner" className="text-[#8f7c00] opacity-20" />
      <div className="relative flex flex-col items-center">
        <Logo variant="dark" size="2xl" />
      </div>
    </div>
  );
}

/** Two-column shell: brand panel left, flow right. On mobile the columns stack
 *  into a yellow banner over the flow. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <AuthHero />
      <div className="flex flex-col bg-background lg:justify-center">
        <AuthHeroBanner />
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 lg:py-0">
          {children}
          <p className="mt-6 text-center text-2xs text-muted-foreground">
            © 2026 Superfine Kitchen
          </p>
        </div>
      </div>
    </div>
  );
}
