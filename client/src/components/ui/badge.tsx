import * as React from "react";

type BadgeVariant =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "connected"
  | "disconnected"
  | "flight"
  | "area";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "info", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`badge badge-${variant} ${className ?? ""}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

// ── SeverityBadge — convenience wrapper ─────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const variant: BadgeVariant =
    severity === "critical" ? "critical" :
    severity === "high"     ? "high"     :
    severity === "medium"   ? "medium"   :
    severity === "low"      ? "low"      :
                              "info";
  return <Badge variant={variant}>{severity}</Badge>;
}

export { Badge, SeverityBadge };
export type { BadgeVariant };
