"use client";

const INK = "#0F172A";

export function UndoToast({
  message,
  onUndo,
  onDismiss,
  accent = "#0E7C7B",
}: {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  accent?: string;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: INK,
        color: "#fff",
        borderRadius: 14,
        padding: "12px 18px",
        boxShadow: "0 8px 30px rgba(15,23,42,.35)",
        fontSize: 13.5,
        fontWeight: 700,
        maxWidth: "min(92vw, 480px)",
        animation: "cc-undo-in .25s ease",
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        style={{
          border: "none",
          background: accent,
          color: "#fff",
          borderRadius: 8,
          padding: "6px 14px",
          fontWeight: 800,
          fontSize: 12.5,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          border: "none",
          background: "transparent",
          color: "#94A3B8",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: "0 4px",
        }}
      >
        ×
      </button>
      <style>{`@keyframes cc-undo-in { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}