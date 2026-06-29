import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "light" for dark backgrounds (teal rail), "dark" for light backgrounds. */
  variant?: "light" | "dark";
  /** Wordmark height: "md" (default), "lg", or "xl" for the largest mark. */
  size?: "md" | "lg" | "xl";
  showPlatform?: boolean;
  className?: string;
}

const logoHeights = {
  md: "h-8",
  lg: "h-12",
  xl: "h-16",
};

/**
 * Superfine Kitchen wordmark — the official logo image. On dark backgrounds
 * (the "light" variant) the navy mark is rendered white so it stays legible.
 */
function Logo({ variant = "dark", size = "md", showPlatform = false, className }: LogoProps) {
  const isLight = variant === "light";
  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <Image
        src="/brand/superfine-kitchen-logo.png"
        alt="Superfine Kitchen"
        width={2220}
        height={905}
        priority
        className={cn(logoHeights[size], "w-auto", isLight && "brightness-0 invert")}
      />
      {showPlatform ? (
        <span
          className={cn(
            "block text-2xs font-medium uppercase tracking-[0.14em]",
            isLight ? "text-sidebar-muted" : "text-muted-foreground",
          )}
        >
          Corporate Employee
        </span>
      ) : null}
    </div>
  );
}

export { Logo };
