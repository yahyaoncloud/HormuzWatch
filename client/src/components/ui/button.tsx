import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "copper" | "ghost";
  size?: "default" | "sm";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className ?? ""}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
