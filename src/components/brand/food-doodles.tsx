import { cn } from "@/lib/utils";

/**
 * A faint, repeating hand-drawn food-doodle wash (apple, carrot, leaf, fork &
 * knife, citrus, avocado, a bowl and a drop). Shared so the Nutrition and
 * sign-in screens carry the identical background illustration.
 *
 * Renders as an absolutely-positioned, non-interactive layer — drop it inside a
 * `relative` (usually `overflow-hidden`) container and keep the real content
 * above it with `relative z-10`. Colour/opacity is a `text-*` class, overridable
 * via `className`.
 */
export function FoodDoodles({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 size-full text-teal-deep/[0.05]", className)}
    >
      <defs>
        <pattern id="food-doodles-wash" width="240" height="240" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Apple */}
            <g transform="translate(24 24)">
              <path d="M22 12c-5-7-16-2-16 6 0 9 11 16 16 22 5-6 16-13 16-22 0-8-11-13-16-6z" />
              <path d="M22 8q1-6 7-7" />
              <path d="M27 4c5-3 10 0 9 5-5 2-8-1-9-5z" />
            </g>
            {/* Carrot */}
            <g transform="translate(116 18)">
              <path d="M6 14l20 5-11 21z" />
              <path d="M6 14q-4-8 2-10M13 15q-1-9 5-9M20 17q3-7 9-5" />
            </g>
            {/* Leaf */}
            <g transform="translate(184 30)">
              <path d="M2 22C2 9 15 2 28 2 28 15 15 24 2 22z" />
              <path d="M5 19C12 15 21 8 25 4" />
            </g>
            {/* Fork & knife */}
            <g transform="translate(30 108)">
              <path d="M2 0v11M7 0v11M12 0v11M2 11h10M7 11v30" />
              <path d="M26 0c-4 2-4 13 0 15v26M26 0c4 2 4 13 0 15" />
            </g>
            {/* Citrus half */}
            <g transform="translate(108 102)">
              <circle cx="16" cy="16" r="15" />
              <circle cx="16" cy="16" r="10" />
              <path d="M16 6v20M6 16h20M9 9l14 14M23 9 9 23" />
            </g>
            {/* Avocado */}
            <g transform="translate(190 118)">
              <path d="M14 2c8 0 13 8 13 17 0 10-6 17-13 17S1 29 1 19C1 10 6 2 14 2z" />
              <circle cx="14" cy="25" r="6" />
            </g>
            {/* Bowl with steam */}
            <g transform="translate(28 188)">
              <path d="M2 14h38a19 19 0 0 1-38 0z" />
              <path d="M14 9c-3-4 3-6 0-10M24 9c-3-4 3-6 0-10" />
            </g>
            {/* Drop */}
            <g transform="translate(124 196)">
              <path d="M10 2c6 8 8 12 8 16a8 8 0 0 1-16 0c0-4 2-8 8-16z" />
            </g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#food-doodles-wash)" />
    </svg>
  );
}
