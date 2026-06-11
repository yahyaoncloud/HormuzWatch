import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const DISCLAIMER_STORAGE_KEY = "hormuzwatch_disclaimer_acknowledged_v1";

export default function DisclaimerBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const isAcknowledged = localStorage.getItem(DISCLAIMER_STORAGE_KEY);
    if (!isAcknowledged) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isOpen]);

  const handleDismiss = () => {
    localStorage.setItem(DISCLAIMER_STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      // Trap focus on the single button
      e.preventDefault();
      buttonRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(5, 8, 22, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "600px",
          padding: "32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <ShieldAlert size={24} color="#6366f1" />
          <h2
            id="disclaimer-title"
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#f8fafc",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Before you continue: this is an educational project, not an intelligence tool.
          </h2>
        </div>

        <div
          style={{
            fontSize: "0.875rem",
            color: "#cbd5e1",
            lineHeight: 1.6,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <p style={{ margin: 0 }}>
            HormuzWatch is an educational and portfolio project built to demonstrate cloud architecture, real-time data engineering, and machine learning techniques. It is <strong>not an operational intelligence product</strong> and must not be used for navigation, security decisions, or any real-world safety-critical purpose.
          </p>
          <p style={{ margin: 0 }}>
            All data displayed is sourced exclusively from public, freely available APIs (such as AISStream, OpenSky, and GDELT). No classified or restricted data is accessed. The anomaly scores and threat assessments shown are illustrative outputs of statistical models—they may be inaccurate, delayed, or incomplete. 
          </p>
          <p style={{ margin: 0 }}>
            The platform is provided "as is" with no warranty. Terminology regarding "threats" refers purely to abstract anomaly-detection outputs and does not represent assertions about real-world intent or geopolitical events.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(148, 163, 184, 0.1)",
            paddingTop: "24px",
          }}
        >
          <Link
            to="/docs"
            style={{
              color: "#6366f1",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
            tabIndex={-1} // Prevent tabbing out of the trap
          >
            Read full terms →
          </Link>

          <button
            ref={buttonRef}
            onClick={handleDismiss}
            style={{
              background: "#4f46e5",
              color: "#ffffff",
              border: "none",
              padding: "10px 24px",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
              outline: "none",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#4338ca")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#4f46e5")}
            onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px rgba(99, 102, 241, 0.5)")}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            aria-label="I Understand and dismiss"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
