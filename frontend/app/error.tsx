"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: 24,
        fontFamily: "Outfit, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "#fff",
          borderRadius: 24,
          padding: 32,
          boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
          Something went wrong
        </div>
        <div style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
          The page hit an unexpected error. You can try reloading this section.
        </div>
        <button
          onClick={reset}
          style={{
            border: "none",
            background: "#0f766e",
            color: "#fff",
            borderRadius: 14,
            padding: "12px 20px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
