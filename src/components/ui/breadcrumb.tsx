import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

/** Accessible breadcrumb trail for sub-pages — improves wayfinding. */
function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px]">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="text-muted-foreground hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? "font-medium text-foreground" : "text-muted-foreground"} aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!last ? <ChevronRight className="size-3.5 text-muted-foreground" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumb };
