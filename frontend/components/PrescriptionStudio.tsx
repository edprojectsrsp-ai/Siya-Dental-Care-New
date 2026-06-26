"use client";
/** Final Rx Editor — opens from Rx tab; uses SiyaRxBuilder split layout */
import { useMemo, useState } from "react";
import SiyaRxBuilder, { buildSiyaRxForm, parseMedsText, type SiyaRxForm, type SiyaRxMed } from "@/components/SiyaRxBuilder";

export default function PrescriptionStudio({
  W, staff, clinicName, accent: _accent, show,
  activeItems, ticked,
  rxMeds, setRxMeds, advice, setAdvice,
  complaintText, setComplaintText, visitNotes, setVisitNotes,
  onClose, onFinalize,
}: {
  W: any; staff: any; clinicName: string; accent?: string; show: (m: string) => void;
  activeItems: any[]; ticked: any[];
  rxMeds: any[]; setRxMeds: (m: any[]) => void;
  advice: string; setAdvice: (s: string) => void;
  medCatalog?: any[];
  complaintText: string; setComplaintText?: (s: string) => void;
  visitNotes: string; setVisitNotes: (s: string) => void;
  onClose?: () => void;
  onFinalize?: (form: SiyaRxForm, meds: SiyaRxMed[]) => void | Promise<void>;
  finalizeOnly?: boolean;
  toggleStep?: (item: any, step: string) => void;
  toggleItemComplete?: (item: any) => void;
}) {
  const [finalizing, setFinalizing] = useState(false);
  const initial = useMemo(() => buildSiyaRxForm({
    W, complaintText, visitNotes, activeItems, ticked, rxMeds, advice,
  }), [W, complaintText, visitNotes, activeItems, ticked, rxMeds, advice]); // eslint-disable-line

  const onApply = (form: ReturnType<typeof buildSiyaRxForm>, meds: ReturnType<typeof parseMedsText>) => {
    setComplaintText?.(form.complaint);
    setAdvice(form.advice);
    setVisitNotes(form.findings);
    setRxMeds(meds.map(m => ({
      name: m.name,
      strength: m.strength || "",
      dose: m.frequency || m.dose || "",
      frequency: m.frequency || "",
      duration: m.duration || "",
      instructions: m.instructions || "",
    })));
  };

  const handleFinalize = async (form: SiyaRxForm, meds: SiyaRxMed[]) => {
    if (!onFinalize) return;
    setFinalizing(true);
    try { await onFinalize(form, meds); } finally { setFinalizing(false); }
  };

  const builder = (
    <SiyaRxBuilder
      clinicName={clinicName}
      staff={staff}
      initial={initial}
      onApply={onApply}
      show={show}
      onClose={onClose}
      onFinalize={onFinalize ? handleFinalize : undefined}
      finalizing={finalizing}
    />
  );

  if (!onClose) return builder;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400, background: "rgba(15,23,42,.5)",
      backdropFilter: "blur(3px)", overflow: "auto",
    }}>
      {builder}
    </div>
  );
}