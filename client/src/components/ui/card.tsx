import * as React from "react";

// ── Utility for className merging (no external dep) ──────────────────────────
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Card ─────────────────────────────────────────────────────────────────────
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "indigo" | "copper" | "flight" | "area";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantClass =
    variant === "indigo"
      ? "intel-panel-indigo"
      : variant === "copper"
      ? "intel-panel-copper"
      : variant === "flight"
      ? "intel-panel-flight"
      : variant === "area"
      ? "intel-panel-area"
      : "";

  return (
    <div
      ref={ref}
      className={cn("intel-panel", variantClass, className)}
      {...props}
    />
  );
});
Card.displayName = "Card";

// ── CardHeader ───────────────────────────────────────────────────────────────
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(className)}
    style={{
      padding: "16px 20px",
      borderBottom: "1px solid rgba(148,163,184,0.1)",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    }}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// ── CardTitle ────────────────────────────────────────────────────────────────
const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(className)}
    style={{
      fontSize: "0.9375rem",
      fontWeight: 700,
      color: "#f8fafc",
      letterSpacing: "-0.01em",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// ── CardContent ──────────────────────────────────────────────────────────────
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(className)}
    style={{ padding: "16px 20px", ...style }}
    {...props}
  />
));
CardContent.displayName = "CardContent";

// ── CardFooter ───────────────────────────────────────────────────────────────
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(className)}
    style={{
      padding: "12px 20px",
      borderTop: "1px solid rgba(148,163,184,0.1)",
      display: "flex",
      alignItems: "center",
    }}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
