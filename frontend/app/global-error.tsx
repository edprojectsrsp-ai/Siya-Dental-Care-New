"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e2e8f0",
          padding: 24,
          fontFamily: "Outfit, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: "100%",
            background: "#fff",
            borderRadius: 24,
            padding: 32,
            boxShadow: "0 20px 60px rgba(15,23,42,0.15)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
            Application error
          </div>
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8 }}>
            A client-side exception occurred while rendering this screen.
          </div>
          {error?.message && (
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>
              {error.message}
            </div>
          )}
          <button
            onClick={reset}
            style={{
              border: "none",
              background: "#2563eb",
              color: "#fff",
              borderRadius: 14,
              padding: "12px 20px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
