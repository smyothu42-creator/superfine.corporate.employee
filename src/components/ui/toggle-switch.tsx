"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

/** Controlled-or-uncontrolled brand toggle — teal "on" state. */
function ToggleSwitch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  className,
  ...rest
}: ToggleSwitchProps) {
  const [internal, setInternal] = React.useState(defaultChecked);
  const isControlled = checked !== undefined;
  const value = isControlled ? checked : internal;

  function handleClick() {
    if (disabled) return;
    const next = !value;
    if (!isControlled) setInternal(next);
    onCheckedChange?.(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
        value ? "bg-primary" : "bg-input",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "inline-block size-4 transform rounded-full bg-white shadow transition-transform",
          value ? "translate-x-[22px]" : "translate-x-1",
        )}
      />
    </button>
  );
}

export { ToggleSwitch };
