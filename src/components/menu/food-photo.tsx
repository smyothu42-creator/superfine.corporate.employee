"use client";

import * as React from "react";
import { Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoodPhotoProps {
  src?: string;
  /**
   * The photo's accessible name — and a decision, not a formality.
   *
   * Pass `""` whenever the meal's name is already on screen next to the photo,
   * which is nearly everywhere in this app: a screen reader reads the visible
   * text *and* the photo, so a named thumbnail beside a named row says the meal
   * twice in a row. Pass the name only where the photo is the sole content of
   * something operable — a link or button with no text of its own — because
   * there the name is all that stands between the user and "link, link, link".
   */
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
      <Utensils aria-hidden className={cn("opacity-80", iconClassName)} />
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : alt ? (
        /**
         * The name survives the photo not arriving.
         *
         * Every food photo in this app is fetched from a third-party host. When
         * one of them fails — a blocked domain on a corporate network, an ad
         * blocker, a dropped connection, the host having a bad day — the `<img>`
         * is removed and its `alt` goes with it. On the menu the photo is wrapped
         * in its own link to the meal, and that link had no other text inside it,
         * so it collapsed to an unnamed "link" that a screen reader could not
         * identify and a voice-control user could not say the name of.
         *
         * Verified: with images blocked, five of the ten meal links on /menu had
         * no accessible name at all. The alt text belongs to the picture whether
         * or not the picture paints, so it is rendered either way.
         */
        <span className="sr-only">{alt}</span>
      ) : null}
    </div>
  );
}
