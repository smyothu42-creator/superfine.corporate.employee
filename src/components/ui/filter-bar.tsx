import * as React from "react";
import { cn } from "@/lib/utils";

/** Responsive wrapper for search inputs + filter selects above tables. */
function FilterBar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-wrap items-center gap-2", className)} {...props} />;
}

export { FilterBar };
