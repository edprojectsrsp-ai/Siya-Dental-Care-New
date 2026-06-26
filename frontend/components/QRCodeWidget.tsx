"use client";
/**
 * components/QRCodeWidget.tsx — Bundle W
 *
 * Generates and displays a QR code for any resource (Rx, lab order, portal, smile).
 * Drops into:
 *   - Prescription PDF preview (Rx link)
 *   - Lab order card (vendor tracking)
 *   - Patient portal link generator
 *
 * Usage:
 *   <QRCodeWidget clinicId={cid} kind="rx" targetId={rxId} accent={accentColor} />
 */

import { useEffect, useState } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";

export default function QRCodeWidget({
  clinicId, kind, targetId, accent = A, label,
  show,
}: {
  clinicId: string;
  kind: "rx" | "lab_order" | "patient_portal" | "smile" | "custom";
  targetId?: string;
  accent?: string;
  label?: string;
  show?: (m: string) => void;
}) {
  const [qr, setQr] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const d = await api.qrCreate({
        clinic_id: clinicId, kind,
        target_id: targetId,
        base_url: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      setQr(d);
    } catch (e: any) {
      show?.("QR generation failed: " + e.message);
    } finally { setLoading(false); }
  };

  const download = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = api.qrPngUrl(qr.qr_id);
    a.download = `qr-${qr.short_code}.png`;
    a.click();
  };

  const shareWA = () => {
    if (!qr) return;
    const text = `${label || "Here's your link"}: ${qr.target_url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div style={{
      padding: 14, borderRadius: 12, background: "#fff", border: `1px solid ${LINE}`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    }}>
      {!qr ? (
        <button onClick={generate} disabled={loading} style={{
          padding: "10px 16px", borderRadius: 10, border: `1px solid ${accent}`,
          background: "#fff", color: accent, fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>{loading ? "Generating…" : "📱 Generate QR code"}</button>
      ) : (
        <>
          <img src={api.qrPngUrl(qr.qr_id)} alt="QR" style={{
            width: 180, height: 180, borderRadius: 8, border: `1px solid ${LINE}`,
          }} />
          <div style={{ fontSize: 12, color: MUTE, textAlign: "center" }}>
            Code: <b style={{ color: INK, fontFamily: "monospace" }}>{qr.short_code}</b>
          </div>
          <div style={{ fontSize: 10, color: MUTE, wordBreak: "break-all", textAlign: "center",
            maxWidth: 220 }}>
            {qr.target_url}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={download} style={btnSmall(accent)}>⬇️ Download</button>
            <button onClick={shareWA} style={btnSmall("#25D366")}>💬 Share</button>
          </div>
        </>
      )}
    </div>
  );
}

const btnSmall = (color: string): React.CSSProperties => ({
  padding: "6px 12px", borderRadius: 8, border: `1px solid ${color}`,
  background: "#fff", color, fontSize: 11, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
});
