export default function LoadingSpinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "360px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
        <div className="spinner" />
        <p
          style={{
            fontSize: "0.8125rem",
            color: "#475569",
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          Loading intelligence data…
        </p>
      </div>
    </div>
  );
}
