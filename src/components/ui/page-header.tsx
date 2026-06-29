import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Action row for a page. The title/description are intentionally not rendered
 * here — the page title already appears in the Topbar — so only the optional
 * right-aligned actions are shown.
 */
function PageHeader({ actions, className }: PageHeaderProps) {
  if (!actions) return null;
  return (
    <div className={cn("mb-6 flex flex-wrap items-center justify-end gap-2", className)}>
      {actions}
    </div>
  );
}

export { PageHeader };
