import * as React from "react";

// ── Separator ────────────────────────────────────────────────────────────────
const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
  }
>(({ orientation = "horizontal", style, ...props }, ref) => (
  <div
    ref={ref}
    style={{
      ...(orientation === "horizontal"
        ? { height: "1px", width: "100%", background: "rgba(148,163,184,0.12)", margin: "16px 0" }
        : { width: "1px", alignSelf: "stretch", background: "rgba(148,163,184,0.12)", margin: "0 16px" }),
      flexShrink: 0,
      ...style,
    }}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };
