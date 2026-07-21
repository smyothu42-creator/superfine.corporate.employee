"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThemeSelectOption {
  value: string;
  label: string;
}

interface ThemeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ThemeSelectOption[];
  "aria-label": string;
  /** "box" = full bordered pill (Favourites); "pill" = inline borderless (Menu). */
  variant?: "box" | "pill";
  /** Trigger height for the "box" variant. "sm" matches a small button. */
  size?: "sm" | "md";
  /** Which edge the open list aligns to. */
  align?: "left" | "right";
  className?: string;
  /** Extra classes merged onto the trigger button (e.g. to override height). */
  triggerClassName?: string;
  /** Leading icon in the trigger. Lets the control read as an icon button when
   *  its label is hidden (see `labelClassName`). */
  icon?: LucideIcon;
  /** Extra classes on the trigger's label span — e.g. `hidden sm:inline` to
   *  collapse to an icon-only trigger on small screens. */
  labelClassName?: string;
}

/** Air between the trigger and its open list, and between the list and the viewport edge. */
const GAP = 8;
const EDGE = 8;
/** The list never renders shorter than this — below it, it flips above the trigger instead. */
const MIN_H = 120;
const MAX_H = 288;

/** Where the open list lands, in viewport coordinates. */
interface Placement {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  minWidth: number;
  maxHeight: number;
}

/**
 * Brand-themed dropdown. Unlike a native <select>, the open option list is fully
 * styled (cream/white surface, teal selected highlight) so it matches the site
 * theme instead of the browser's default dark popup with an OS-blue highlight.
 *
 * The open list is portalled to `<body>` and positioned `fixed`, rather than
 * `absolute` inside this component. An `absolute` list is clipped by any
 * ancestor that hides its overflow, and the app has several by necessity —
 * checkout's section cards hide overflow to keep their tinted header band inside
 * the card's rounded corners, which sheared the delivery-time list down to a
 * few pixels. `z-index` cannot rescue a clipped box; leaving the ancestor is the
 * only fix. Escaping the card also means escaping its scroll box, so the list is
 * re-measured against the trigger on scroll and resize.
 */
export function ThemeSelect({
  value,
  onValueChange,
  options,
  variant = "box",
  size = "md",
  align = "left",
  className,
  triggerClassName,
  icon: Icon,
  labelClassName,
  ...props
}: ThemeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [placement, setPlacement] = React.useState<Placement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const measure = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    // Drop down by default; flip up only when below is genuinely too cramped to
    // use and above is roomier — a list that flips on a few pixels' difference
    // jumps sides as the page scrolls.
    const up = below < MIN_H && above > below;
    setPlacement({
      top: up ? undefined : r.bottom + GAP,
      bottom: up ? window.innerHeight - r.top + GAP : undefined,
      left: align === "right" ? undefined : r.left,
      right: align === "right" ? window.innerWidth - r.right : undefined,
      minWidth: r.width,
      maxHeight: Math.max(MIN_H, Math.min(MAX_H, up ? above : below)),
    });
  }, [align]);

  // Measured before paint, so the list never shows at a stale position for a frame.
  React.useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onReflow = () => measure();
    // Capture phase: the trigger may live inside a scrolling panel (the summary
    // rail), and a scroll there doesn't bubble to window.
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, measure]);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      // The list is portalled, so it is not inside the trigger's tree — testing
      // only the wrapper would close it on mousedown and swallow the click that
      // was about to pick an option.
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div
      className={cn(variant === "box" ? "inline-flex w-full" : "inline-flex shrink-0", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={props["aria-label"]}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center justify-between gap-1.5 font-semibold text-teal-deep outline-none transition-colors",
          variant === "box"
            ? cn(
                "w-full rounded-full border border-border bg-card shadow-sm hover:border-primary/40 hover:bg-teal-wash focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
                size === "sm" ? "h-8 pl-3.5 pr-2.5 text-[13px]" : "h-11 pl-4 pr-3 text-sm",
              )
            : "h-8 max-w-[9rem] rounded-full bg-transparent pl-2.5 pr-2 text-xs hover:bg-teal-wash focus-visible:bg-teal-wash sm:h-9 sm:pl-3 sm:text-[13px]",
          triggerClassName,
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0 text-primary" /> : null}
        <span className={cn("truncate", labelClassName)}>{current?.label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-primary transition-transform", open && "rotate-180")}
        />
      </button>

      {/* Waits on `placement`: rendering before the first measure would paint the
          list at the top-left corner for a frame. */}
      {open && placement
        ? createPortal(
            <div
              ref={listRef}
              role="listbox"
              style={{
                position: "fixed",
                top: placement.top,
                bottom: placement.bottom,
                left: placement.left,
                right: placement.right,
                minWidth: placement.minWidth,
                maxHeight: placement.maxHeight,
              }}
              className={cn(
                "z-50 overflow-auto rounded-2xl border border-border bg-card p-1.5 shadow-raised",
                variant === "pill" && "w-44",
              )}
            >
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onValueChange(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                      active
                        ? "bg-teal-wash font-semibold text-teal-deep"
                        : "font-medium text-foreground hover:bg-muted",
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
