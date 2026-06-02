import * as React from "react";
import { useState } from "react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  let positionStyles: React.CSSProperties = {};
  switch (position) {
    case "top":
      positionStyles = { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: "8px" };
      break;
    case "bottom":
      positionStyles = { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "8px" };
      break;
    case "left":
      positionStyles = { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: "8px" };
      break;
    case "right":
      positionStyles = { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: "8px" };
      break;
  }

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          className="absolute z-50 px-2 py-1 text-xs font-medium text-slate-100 bg-slate-900 border border-slate-700 rounded shadow-md whitespace-nowrap pointer-events-none fade-up"
          style={positionStyles}
        >
          {content}
        </div>
      )}
    </div>
  );
}
