import * as React from "react";
import { Info, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const noticeVariants = cva(
  "flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed",
  {
    variants: {
      tone: {
        info: "border-info-border bg-info-bg text-info [&>svg]:text-info",
        warning: "border-warning-border bg-warning-bg text-warning [&>svg]:text-warning",
        success: "border-success-border bg-success-bg text-success [&>svg]:text-success",
        locked: "border-border bg-muted text-muted-foreground [&>svg]:text-muted-foreground",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

const icons = { info: Info, warning: AlertTriangle, success: CheckCircle2, locked: Lock };

export interface NoticeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof noticeVariants> {}

function Notice({ className, tone = "info", children, ...props }: NoticeProps) {
  const Icon = icons[tone ?? "info"];
  return (
    <div className={cn(noticeVariants({ tone }), className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export { Notice };
