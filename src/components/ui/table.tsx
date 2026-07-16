import * as React from "react";
import { cn } from "@/lib/utils";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Classes applied to the outer scroll wrapper (border, radius, shadow). */
  wrapperClassName?: string;
}

function Table({ className, wrapperClassName, ...props }: TableProps) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-2xl border border-border bg-card shadow-card",
        wrapperClassName,
      )}
    >
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-teal-wash", className)} {...props} />;
}

function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-border last:border-0 hover:bg-muted/50", className)}
      {...props}
    />
  );
}

function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-left text-2xs font-bold text-teal-deep",
        className,
      )}
      {...props}
    />
  );
}

function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-foreground", className)} {...props} />;
}

export { Table, THead, TBody, TR, TH, TD };
