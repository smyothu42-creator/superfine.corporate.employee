import * as React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

/** Lightweight labelled checkbox for option/diet pickers. */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, ...props },
  ref,
) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-[13px]", className)}>
      <input
        ref={ref}
        type="checkbox"
        className="size-4 rounded border-input accent-brand"
        {...props}
      />
      {label}
    </label>
  );
});

export { Checkbox };
