import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "light" for dark backgrounds (teal rail), "dark" for light backgrounds. */
  variant?: "light" | "dark";
  /** Wordmark height: "md" (default), "lg", "xl", or "2xl" for the largest mark. */
  size?: "md" | "lg" | "xl" | "2xl";
  showPlatform?: boolean;
  className?: string;
}

const logoHeights = {
  md: "h-8",
  lg: "h-12",
  xl: "h-16",
  "2xl": "h-20",
};

/** Pixel heights matching `logoHeights`, applied inline so the mark is sized
 *  even before/without the stylesheet (a missing `h-16` would otherwise render
 *  the image at its intrinsic 2220px and blow up the layout). */
const logoHeightPx = {
  md: 32,
  lg: 48,
  xl: 64,
  "2xl": 80,
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
        // Inline fallbacks so a slow/failed CSS load can't render the mark at its
        // intrinsic size or (for the light variant) in the wrong colour.
        style={{
          height: logoHeightPx[size],
          width: "auto",
          ...(isLight ? { filter: "brightness(0) invert(1)" } : null),
        }}
      />
      {showPlatform ? (
        <span
          className={cn(
            "block text-2xs font-medium",
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
