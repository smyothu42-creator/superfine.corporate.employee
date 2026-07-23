import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Coral CTA — the site's primary "Order Now →" pill
        default: "bg-coral text-white hover:bg-coral-deep shadow-sm",
        // Teal — structural / secondary primary
        teal: "bg-primary text-primary-foreground hover:bg-teal-deep shadow-sm",
        brand: "bg-primary text-primary-foreground hover:bg-teal-deep shadow-sm",
        // Yellow highlight
        yellow: "bg-yellow text-teal-deep hover:bg-yellow-deep",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-teal-wash",
        ghost: "border border-control bg-card text-foreground hover:bg-muted",
        danger: "bg-danger text-white hover:bg-danger/90",
        warning: "bg-warning text-white hover:bg-warning/90",
        success: "bg-success text-white hover:bg-success/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-8 px-4 text-[13px]",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Work is in flight. Swaps the leading content for a spinner, blocks further
   * presses, and marks the button busy for assistive tech — so a slow submit
   * can't be fired twice and doesn't look ignored.
   *
   * Ignored under `asChild`: the caller owns that element's content, and a
   * `Slot` accepts exactly one child, so there is nowhere to put the spinner.
   */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild = false, loading = false, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const busy = loading && !asChild;
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      // `disabled` alone would drop the button out of the tab order mid-task and
      // throw focus to the body; `aria-busy` is what actually says "working".
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? (
        <>
          {/* Gated on motion preference: the global reduced-motion rule freezes
              animations, which would leave a stationary spinner reading as a
              stuck icon rather than as progress. */}
          <LoaderCircle
            aria-hidden
            className="motion-safe:animate-spin motion-reduce:opacity-60"
          />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
});

export { Button, buttonVariants };
