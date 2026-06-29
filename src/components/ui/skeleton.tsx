import * as React from "react";
import { cn } from "@/lib/utils";

/** Shimmer placeholder used by route-level loading states. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} {...props} />;
}

export { Skeleton };
