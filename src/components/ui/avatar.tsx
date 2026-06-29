import * as React from "react";
import { cn, initials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "size-8 text-2xs",
  md: "size-10 text-xs",
  lg: "size-14 text-lg",
};

/** Initial avatar with the brand's warm teal/cream tone. */
function Avatar({ name, size = "sm", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-teal-soft font-display font-semibold text-teal-deep",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export { Avatar };
