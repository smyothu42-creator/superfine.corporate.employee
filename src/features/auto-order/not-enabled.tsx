"use client";

import { Lock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { program, programAdmin } from "@/data/program";
import { AUTO_ORDER_BENEFITS, Benefit } from "./benefits";
import { TOUR_START_EVENT } from "./walkthrough";

/**
 * What an employee sees when their company's contract doesn't include
 * Auto-Order.
 *
 * The point of the screen is to be honest about two different things at once:
 * the feature is real and worth having, and you personally cannot switch it on.
 * Showing only the second — a bare "not available" — teaches people the page is
 * a dead end and they stop looking. Showing only the first sells something they
 * then can't buy, which is worse.
 *
 * So it reads as a locked feature, not an error: the status leads, the benefits
 * follow in the same words as the live intro, and turning it on is named as
 * someone else's job. There's no "Email corporate admin" button on purpose — a
 * primary-looking action would imply the employee can set this in motion
 * themselves. Instead a plain sentence points at the person who can, and the one
 * real thing to do from here — watch what you'd be asking for — is the single
 * unambiguous CTA.
 */
export function AutoOrderNotEnabled() {
  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        {/* Muted rather than the live intro's lemon-yellow hero: this is the
            same product, but nothing on this screen is switched on, and a hero
            that looks ready to use sets up a fall. */}
        <div className="border-b border-border bg-muted/40 px-6 py-8 text-center sm:py-10">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/70 text-warning">
            <Lock className="size-6" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Auto-Order isn&apos;t enabled
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            It&apos;s turned off for {program.company}&apos;s meal program right now. Auto-Order is
            part of your company&apos;s contract, so it&apos;s switched on for everyone at once —
            not per person.
          </p>
        </div>

        <div className="space-y-5 p-6 sm:p-7">
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            What you&apos;d get
          </p>

          {AUTO_ORDER_BENEFITS.map((b) => (
            <Benefit key={b.title} icon={b.icon} title={b.title} desc={b.desc} muted />
          ))}

          <div className="space-y-4 border-t border-border pt-5">
            {/* Who can turn it on — a plain sentence, not a button. The decision
                belongs to the program admin; dressing this as an action would
                suggest the employee can trigger it. */}
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Want it? Ask your program admin{programAdmin?.name ? `, ${programAdmin.name},` : ""} or
              whoever manages {program.company}&apos;s meal program to enable Auto-Order for your team.
            </p>

            {/* The tour still runs — it's a walkthrough of the feature, not of a
                live setup, so it's the closest thing to a demo we can offer
                someone deciding whether to go and ask for this. It's the only
                thing to do here, so it stands alone as the CTA. */}
            <Button
              variant="ghost"
              size="lg"
              block
              onClick={() => window.dispatchEvent(new Event(TOUR_START_EVENT))}
            >
              <BookOpen className="size-4" /> See how it works
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
