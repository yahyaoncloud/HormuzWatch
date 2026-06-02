import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function ErrorBoundary() {
  const error = useRouteError();

  const getErrorMessage = (): { status: string; message: string } => {
    if (isRouteErrorResponse(error)) {
      return {
        status: error.status.toString(),
        message: error.statusText || error.data?.message || "An error occurred",
      };
    }

    if (error instanceof Error) {
      return {
        status: "ERROR",
        message: error.message,
      };
    }

    return {
      status: "UNKNOWN",
      message: "An unknown error occurred. Please try again.",
    };
  };

  const { status, message } = getErrorMessage();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#050816",
      color: "#f8fafc",
      fontFamily: "'Space Grotesk', sans-serif"
    }}>
      <div style={{
        maxWidth: "400px",
        textAlign: "center",
        padding: "32px",
        background: "rgba(15, 23, 42, 0.75)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        borderRadius: "10px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(239, 68, 68, 0.15)"
      }}>
        <AlertTriangle size={48} color="#ef4444" style={{ margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "8px", letterSpacing: "-0.02em" }}>{status}</h1>
        <p style={{ color: "#94a3b8", marginBottom: "24px", lineHeight: 1.6 }}>{message}</p>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#fca5a5",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "10px 20px",
            borderRadius: "7px",
            fontWeight: 600,
            fontSize: "0.875rem",
            textDecoration: "none",
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
            e.currentTarget.style.borderColor = "#ef4444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
          }}
        >
          <Home size={16} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
