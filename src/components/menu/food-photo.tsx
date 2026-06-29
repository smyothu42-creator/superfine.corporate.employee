"use client";

import * as React from "react";
import { Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoodPhotoProps {
  src?: string;
  alt: string;
  /** Height/layout classes for the frame, e.g. "h-28". */
  className?: string;
  /** Size of the fallback utensils glyph. */
  iconClassName?: string;
}

/**
 * Food photo for menu cards / detail hero. Renders the mockup photo when one is
 * provided and falls back to the branded yellow placeholder while it loads or
 * if it fails (offline, blocked, missing).
 */
export function FoodPhoto({ src, alt, className, iconClassName = "size-9" }: FoodPhotoProps) {
  const [failed, setFailed] = React.useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-hero-yellow text-teal-deep",
        className,
      )}
    >
      {/* Placeholder sits underneath so it shows through until the photo paints. */}
      <Utensils className={cn("opacity-80", iconClassName)} />
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : null}
    </div>
  );
}
