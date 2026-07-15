"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as api from "@/lib/api";
import { ToothWidget, type ChartRegion } from "@/components/ToothWidget";
import { Camera } from "lucide-react";
import { UndoToast } from "@/components/clinical/UndoToast";
import ToothSummaryGrid from "@/components/clinical/ToothSummaryGrid";
import { GroupedToothBanner } from "@/components/clinical/GroupedToothBanner";
import { ClinicalAddPanel } from "@/components/clinical/ClinicalAddPanel";
import Tooth3DPanel from "@/components/clinical/Tooth3DPanel";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

const KIND_LABELS: Record<string, string> = {
  rct: "RCT", crown: "CRN", bridge: "BRG", filling: "FILL", implant: "IMP",
  veneer: "VNR", extraction: "EXT", cavity: "CAV", scaling: "SCL", missing: "MISS",
};

function abbrevTreatment(name: string, kind?: string | null) {
  if (kind && KIND_LABELS[kind]) return KIND_LABELS[kind];
  const n = (name || "").trim();
  if (!n) return "";
  const lower = n.toLowerCase();
  if (lower.includes("root canal") || lower.includes("rct")) return "RCT";
  if (lower.includes("crown")) return "CRN";
  if (lower.includes("bridge")) return "BRG";
  if (lower.includes("implant")) return "IMP";
  if (lower.includes("filling") || lower.includes("composite")) return "FILL";
  if (lower.includes("scaling") || lower.includes("clean")) return "SCL";
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 6);
  return words.map(w => w[0]).join("").slice(0, 4).toUpperCase();
}

function classifyKind(name: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("extract")) return "extraction";
  if (lower.includes("implant")) return "implant";
  if (lower.includes("crown") || lower.includes("cap")) return "crown";
  if (lower.includes("rct") || lower.includes("root canal")) return "rct";
  if (lower.includes("bridge")) return "bridge";
  if (lower.includes("fill") || lower.includes("composite") || lower.includes("gic")) return "filling";
  if (lower.includes("scaling") || lower.includes("clean")) return "scaling";
  if (lower.includes("veneer")) return "veneer";
  return "other";
}

const card: any = { background: "#fff", borderRadius: 20, padding: 22, boxShadow: SHADOW };
const chipGhost = (c: string): any => ({ background: c + "0D", color: c, border: `1.5px solid ${c}44`, padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
const inp: any = { width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, boxSizing: "border-box", outline: "none", fontFamily: "inherit", background: "#fff" };
const btn = (c: string): any => ({ background: c, color: "#fff", border: "none", padding: "12px 20px", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 14.5, fontFamily: "inherit" });

// Inline price-confirm — shown the moment a treatment is tapped, so rate/discount
// are set right here instead of switching to the Plan tab to edit afterward.
function PriceConfirm({ A, data, onChange, onCancel, onConfirm }: any) {
  const final = Math.max(0, (data.rate || 0) - (data.discount || 0));
  const num = (v: string) => Math.max(0, parseFloat(v.replace(/[^0-9.]/g, "")) || 0);
  const field: any = { width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, fontWeight: 700, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 20, width: 340, maxWidth: "100%", boxShadow: "0 20px 60px rgba(15,23,42,.3)" }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: INK }}>{data.treatment}</div>
        <div style={{ fontSize: 12.5, color: MUTE, marginTop: 3, marginBottom: 14 }}>Tooth #{data.teeth.join(", ")} · {data.teeth.length} tooth{data.teeth.length !== 1 ? "s" : ""}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, marginBottom: 4, textTransform: "uppercase" as const }}>Rate (₹)</div>
            <input autoFocus type="text" inputMode="numeric" value={data.rate} onChange={e => onChange({ ...data, rate: num(e.target.value) })} style={field} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, marginBottom: 4, textTransform: "uppercase" as const }}>Discount (₹)</div>
            <input type="text" inputMode="numeric" value={data.discount} onChange={e => onChange({ ...data, discount: num(e.target.value) })} style={field} />
          </div>
        </div>
        <div style={{ marginTop: 14, padding: "10px 14px", background: `${A}0D`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: MUTE }}>Patient pays</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: A }}>₹{final.toLocaleString("en-IN")}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} style={{ flex: 1, background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 2, background: A, color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Add to plan ✓</button>
        </div>
      </div>
    </div>
  );
}

export function ClinicalToothTab({
  W, A, show, reload, patientId, clinicId, aptId, isSpec = false,
  issueCatalog, setIssueCatalog, examCatalog, setExamCatalog, diagCatalog, setDiagCatalog,
  catalog, setCatalog,
  chartSelectedTeeth, setChartSelectedTeeth,
  chartMultiSelect, setChartMultiSelect,
  chartChild, setChartChild,
  chartRegion, setChartRegion,
  onEditPlanItem,
  onWorkspacePatch,
  onJumpToPlan,
}: any) {
  const activeTeeth = chartSelectedTeeth;
  const primaryTooth = activeTeeth.length === 1 ? activeTeeth[0] : (activeTeeth[0] ?? null);
  // Undo + visual pulse feedback on every add (mis-taps happen constantly chairside)
  const [undoAction, setUndoAction] = useState<{ label: string; undo: () => Promise<void> } | null>(null);
  const [pulsingTeeth, setPulsingTeeth] = useState<number[]>([]);
  const [hoverTooth, setHoverTooth] = useState<number | null>(null);
  const [pricePopover, setPricePopover] = useState<{ treatment: string; teeth: number[]; procMatch: any; rate: number; discount: number } | null>(null);
  const [chartView, setChartView] = useState<"2d" | "3d">("2d");
  // RVG / photo uploads keyed by tooth number
  const [toothImages, setToothImages] = useState<Map<number, any[]>>(new Map());
  const [uploadingTooth, setUploadingTooth] = useState<number | null>(null);
  const rvgInputRef = useRef<HTMLInputElement>(null);
  const rvgTargetTooth = useRef<number | null>(null);
  const clinicalPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartView === "3d" && activeTeeth.length > 0) {
      const t = setTimeout(() => {
        clinicalPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [activeTeeth.join(","), chartView]); // eslint-disable-line

  const loadToothImages = useCallback(async () => {
    try {
      const uploads = await api.listPatientUploads(patientId);
      const map = new Map<number, any[]>();
      (uploads || []).forEach((u: any) => {
        if (u.tooth_number == null) return;
        const arr = map.get(u.tooth_number) || [];
        arr.push({ id: u.id, url: u.file_url, thumb: u.file_type === "image" ? u.file_url : null });
        map.set(u.tooth_number, arr);
      });
      setToothImages(map);
    } catch { /* non-fatal */ }
  }, [patientId]);
  useEffect(() => { loadToothImages(); }, [loadToothImages]);

  const triggerRvgUpload = (tooth: number) => {
    rvgTargetTooth.current = tooth;
    rvgInputRef.current?.click();
  };
  const onRvgFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const tooth = rvgTargetTooth.current;
    e.target.value = "";
    if (!file || tooth == null) return;
    setUploadingTooth(tooth);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tooth_number", String(tooth));
      form.append("file_kind", "rvg");
      form.append("caption", `Tooth ${tooth}`);
      if (aptId) form.append("appointment_id", aptId);
      await api.uploadPatientFile(patientId, form);
      show(`📷 Photo attached to tooth #${tooth}`);
      await loadToothImages();
    } catch (err: any) { show("Upload failed: " + err.message); }
    finally { setUploadingTooth(null); }
  };
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushUndo = useCallback((label: string, undo: () => Promise<void>) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoAction({ label, undo });
    undoTimer.current = setTimeout(() => setUndoAction(null), 6000);
  }, []);
  const pulse = useCallback((teeth: number[]) => {
    setPulsingTeeth(teeth);
    setTimeout(() => setPulsingTeeth([]), 2000);
  }, []);
  const [examSearch, setExamSearch] = useState("");
  const [diagSearch, setDiagSearch] = useState("");
  const [treatSearch, setTreatSearch] = useState("");
  const [customTreat, setCustomTreat] = useState("");
  const [learnedDiags, setLearnedDiags] = useState<string[]>([]);
  const [learnedTreats, setLearnedTreats] = useState<string[]>([]);
  const tts = W.tooth_treatments || [];
  const tcs = W.tooth_conditions || [];
  const tex = W.tooth_examinations || [];
  const tdx = W.tooth_diagnoses || [];

  const toothState = (n: number) => {
    const t = tts.filter((x: any) => x.tooth === n);
    const c = tcs.filter((x: any) => x.tooth === n);
    const ex = tex.filter((x: any) => x.tooth === n);
    const dx = tdx.filter((x: any) => x.tooth === n);
    return {
      t, c, ex, dx,
      done: t.some((x: any) => x.status === "completed"),
      prog: t.some((x: any) => x.status === "in_progress"),
      planned: t.length > 0, hasExam: ex.length > 0, hasDiag: dx.length > 0,
    };
  };

  const aggregateState = useMemo(() => {
    if (activeTeeth.length === 0) return null;
    const states = activeTeeth.map(toothState);
    return {
      ex: states.flatMap((s, i) => s.ex.map((e: any) => ({ ...e, tooth: activeTeeth[i] }))),
      dx: states.flatMap((s, i) => s.dx.map((d: any) => ({ ...d, tooth: activeTeeth[i] }))),
      t: states.flatMap(s => s.t),
      c: states.flatMap((s, i) => s.c.map((c: any) => ({ ...c, tooth: activeTeeth[i] }))),
    };
  }, [activeTeeth, tts, tcs, tex, tdx]); // eslint-disable-line

  useEffect(() => {
    const findings = aggregateState?.ex.map((e: any) => e.finding) || [];
    if (!findings.length) { setLearnedDiags([]); return; }
    Promise.all(findings.map((f: string) => api.wsClinicalSuggest("exam_diag", f).catch(() => ({ suggestions: [] }))))
      .then(results => {
        const ranked = new Map<string, number>();
        results.forEach((r: any) => (r.suggestions || []).forEach((s: any) => ranked.set(s.name, (ranked.get(s.name) || 0) + (s.score || 1))));
        setLearnedDiags(Array.from(ranked.entries()).sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 12));
      });
  }, [aggregateState?.ex]);

  useEffect(() => {
    const diags = aggregateState?.dx.map((d: any) => d.diagnosis) || [];
    if (!diags.length) { setLearnedTreats([]); return; }
    Promise.all(diags.map((d: string) => api.wsClinicalSuggest("diag_treatment", d).catch(() => ({ suggestions: [] }))))
      .then(results => {
        const ranked = new Map<string, number>();
        results.forEach((r: any) => (r.suggestions || []).forEach((s: any) => ranked.set(s.name, (ranked.get(s.name) || 0) + (s.score || 1))));
        setLearnedTreats(Array.from(ranked.entries()).sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 15));
      });
  }, [aggregateState?.dx]);

  const toothLabels = useMemo(() => {
    const map = new Map<number, string[]>();
    (W?.tooth_treatments || []).forEach((row: any) => {
      const tooth = row.tooth ?? row.tooth_number;
      if (!tooth) return;
      const name = row.treatment_name || row.treatment || row.treatment_type || "";
      const tag = abbrevTreatment(name, row.treatment_kind);
      if (!tag) return;
      const list = map.get(tooth) || [];
      if (!list.includes(tag)) list.push(tag);
      map.set(tooth, list);
    });
    return map;
  }, [W?.tooth_treatments]);

  // Per-tooth summary cards: every tooth that has any exam / diagnosis / treatment.
  const perToothCards = useMemo(() => {
    const teeth = new Set<number>();
    [...(W?.tooth_examinations || []), ...(W?.tooth_diagnoses || []), ...(W?.tooth_treatments || [])].forEach((r: any) => {
      const t = r.tooth ?? r.tooth_number; if (t) teeth.add(t);
    });
    return Array.from(teeth).sort((a, b) => a - b).map(n => ({
      tooth: n,
      exam: (W?.tooth_examinations || []).filter((e: any) => (e.tooth ?? e.tooth_number) === n).map((e: any) => e.finding).filter(Boolean),
      diag: (W?.tooth_diagnoses || []).filter((d: any) => (d.tooth ?? d.tooth_number) === n).map((d: any) => d.diagnosis).filter(Boolean),
      tx: (W?.tooth_treatments || []).filter((t: any) => (t.tooth ?? t.tooth_number) === n).map((t: any) => ({ name: t.treatment_name || t.treatment || "", status: t.status })).filter((t: any) => t.name),
    }));
  }, [W?.tooth_examinations, W?.tooth_diagnoses, W?.tooth_treatments]);

  const toothColor = (n: number) => {
    const st = toothState(n);
    const treatments = st.t;
    const primary = treatments[0];
    const kind = (primary?.treatment_kind || classifyKind(primary?.treatment || primary?.treatment_name || "")) as any;
    const label = (toothLabels.get(n) || []).slice(0, 2).join("+");
    // Structured hover card — exam / diagnosis / treatment on this tooth
    const card = {
      exam: st.ex.map((e: any) => e.finding).filter(Boolean),
      diag: st.dx.map((d: any) => d.diagnosis).filter(Boolean),
      tx: st.t.map((t: any) => ({ name: t.treatment_name || t.treatment || "", status: t.status })).filter((t: any) => t.name),
    };
    const base = { hasIssue: st.c.length > 0, kind: kind !== "other" && kind !== "scaling" ? kind : null, label: label || undefined, done: st.done, prog: st.prog, planned: st.planned, card };
    if (st.done) return { ...base, bg: "#D1FAE5", border: "#10B981" };
    if (st.prog) return { ...base, bg: "#FEF3C7", border: "#F59E0B" };
    if (st.planned) return { ...base, bg: A + "15", border: A };
    if (st.hasDiag) return { ...base, bg: "#FFF7ED", border: "#F97316" };
    if (st.hasExam) return { ...base, bg: "#FEFCE8", border: "#EAB308" };
    return { ...base, bg: "#fff", border: LINE };
  };

  const targetTeeth = () => activeTeeth.length ? activeTeeth : (primaryTooth ? [primaryTooth] : []);

  const addExam = async (finding: string) => {
    const teeth = targetTeeth();
    if (!teeth.length) { show("Select tooth/teeth first"); return; }
    try {
      const ids: string[] = [];
      for (const t of teeth) {
        const r = await api.wsAddToothExam(patientId, { tooth_number: t, finding });
        if (r?.id) ids.push(r.id);
      }
      pulse(teeth);
      pushUndo(`Exam: ${finding} → #${teeth.join(", ")}`, async () => {
        for (const id of ids) await api.wsRemoveToothExam(id).catch(() => {});
        reload();
      });
      reload();
    } catch (e: any) { show("Error: " + e.message); }
  };

  const addDiag = async (diagnosis: string) => {
    const teeth = targetTeeth();
    if (!teeth.length) { show("Select tooth/teeth first"); return; }
    const linkedExams = aggregateState?.ex.map((e: any) => e.finding) || [];
    try {
      const ids: string[] = [];
      for (const t of teeth) {
        const r = await api.wsAddToothDiagnosis(patientId, { tooth_number: t, diagnosis, linked_exams: linkedExams });
        if (r?.id) ids.push(r.id);
      }
      for (const ex of linkedExams) api.wsRecordClinicalLink("exam_diag", ex, diagnosis).catch(() => {});
      pulse(teeth);
      pushUndo(`Dx: ${diagnosis} → #${teeth.join(", ")}`, async () => {
        for (const id of ids) await api.wsRemoveToothDiagnosis(id).catch(() => {});
        reload();
      });
      reload();
    } catch (e: any) { show("Error: " + e.message); }
  };

  // Step 1: tapping a treatment opens the inline price-confirm popover (rate + discount editable).
  // Specialists never see prices — their add goes in at ₹0 for the owner to price & confirm.
  const addToPlan = (treatment: string) => {
    const teeth = targetTeeth();
    if (!teeth.length) { show("Select tooth/teeth first"); return; }
    const procMatch = catalog.find((c: any) => c.name.toLowerCase() === treatment.toLowerCase());
    if (isSpec) {
      commitPlan({ treatment, teeth, procMatch, rate: 0, discount: 0 });
      return;
    }
    const rate = (procMatch?.rate || 0) * teeth.length;
    setPricePopover({ treatment, teeth, procMatch, rate, discount: 0 });
  };

  // Step 2: confirm from the popover → actually create the plan item
  const commitPlan = async (p: { treatment: string; teeth: number[]; procMatch: any; rate: number; discount: number }) => {
    const { treatment, teeth, procMatch } = p;
    const rate = Math.max(0, p.rate);
    const discount = Math.max(0, p.discount);
    const final = Math.max(0, rate - discount);
    const examSummary = aggregateState?.ex.map((e: any) => e.finding).join(", ") || "";
    const diagSummary = aggregateState?.dx.map((d: any) => d.diagnosis).join(", ") || "";
    setPricePopover(null);
    try {
      const result = await api.wsAddPlanItem(patientId, {
        treatment_name: treatment, procedure_id: procMatch?.id || null,
        teeth, suggested_rate: rate, doctor_rate: rate,
        discount, clinic_id: clinicId, examination_summary: examSummary, diagnosis: diagSummary,
      });
      const itemId = result.item_id || result.id;
      const kind = classifyKind(treatment);
      onWorkspacePatch?.((prev: any) => {
        const newItem = {
          id: itemId, treatment_name: treatment, procedure_id: procMatch?.id || null,
          teeth, suggested_rate: rate, doctor_rate: rate, discount, final_amount: final,
          status: "advised", notes: null, area_label: null,
        };
        const newToothRows = teeth.map((t: number) => ({
          tooth: t, treatment, treatment_name: treatment, treatment_kind: kind,
          status: "planned", item_id: itemId,
        }));
        return {
          ...prev,
          items: [...(prev.items || []), newItem],
          tooth_treatments: [...(prev.tooth_treatments || []), ...newToothRows],
          financial: {
            ...(prev.financial || {}),
            total_value: (prev.financial?.total_value || 0) + final,
            outstanding: (prev.financial?.outstanding || 0) + final,
          },
        };
      });
      for (const dx of (aggregateState?.dx || []).map((d: any) => d.diagnosis)) {
        api.wsRecordClinicalLink("diag_treatment", dx, treatment).catch(() => {});
      }
      pulse(teeth);
      pushUndo(`${treatment} → #${teeth.join(", ")}${final > 0 ? ` · ₹${final.toLocaleString("en-IN")}` : ""}`, async () => {
        if (itemId) await api.wsDeletePlanItem(itemId).catch(() => {});
        reload();
      });
      reload().catch(() => {});
      show("✓ Added — review pricing on Treatment Plan tab");
    } catch (e: any) { show("Error: " + e.message); }
  };

  const addCustomTreatment = async () => {
    const name = customTreat.trim();
    if (!name) return;
    try {
      const r = await api.wsAddTreatment({ name, default_cost: 0, is_tooth_based: true });
      const fresh = await api.wsTreatments();
      setCatalog(fresh);
      setCustomTreat("");
      await addToPlan(name);
      show(`✓ Custom "${name}" saved & added`);
    } catch (e: any) { show("Error: " + e.message); }
  };

  const filteredExams = examCatalog.filter((e: any) => !examSearch || e.name.toLowerCase().includes(examSearch.toLowerCase()));
  const filteredDiags = diagCatalog.filter((d: any) => !diagSearch || d.name.toLowerCase().includes(diagSearch.toLowerCase()));
  const catalogNames = catalog.map((c: any) => c.name);
  const staticTreats: string[] = [];
  (aggregateState?.dx || []).forEach((dx: any) => {
    const cat = diagCatalog.find((c: any) => c.name.toLowerCase() === dx.diagnosis.toLowerCase());
    (cat?.suggested_treatments || []).forEach((t: string) => { if (!staticTreats.includes(t)) staticTreats.push(t); });
  });
  const allSuggestedTreats = Array.from(new Set([...learnedTreats, ...staticTreats]));
  const filteredCatalogTreats = catalog.filter((c: any) =>
    !treatSearch || c.name.toLowerCase().includes(treatSearch.toLowerCase())
  ).slice(0, 24);

  // Treatments ALREADY added on the active teeth — used to (a) show "added" pills with × to remove,
  // and (b) mark suggestion chips with ✓ instead of allowing duplicates.
  const addedTreatments: { name: string; itemIds: string[]; teeth: number[]; status: string }[] = useMemo(() => {
    if (!activeTeeth.length) return [];
    const byName = new Map<string, { itemIds: string[]; teeth: Set<number>; status: string }>();
    (aggregateState?.t || []).forEach((it: any) => {
      const key = (it.treatment_name || it.treatment || it.procedure_name || "").trim();
      if (!key) return;
      const ex = byName.get(key) || { itemIds: [], teeth: new Set<number>(), status: it.status || "advised" };
      const itemId = it.item_id || it.id;
      if (itemId && !ex.itemIds.includes(itemId)) ex.itemIds.push(itemId);
      const toothNum = it.tooth ?? it.tooth_number;
      if (toothNum && activeTeeth.includes(toothNum)) ex.teeth.add(toothNum);
      (it.teeth || []).forEach((n: number) => activeTeeth.includes(n) && ex.teeth.add(n));
      if (it.status === "completed") ex.status = "completed";
      else if (it.status === "in_progress" && ex.status !== "completed") ex.status = "in_progress";
      else if ((it.status === "planned" || it.status === "advised") && ex.status !== "completed" && ex.status !== "in_progress") ex.status = "advised";
      byName.set(key, ex);
    });
    return Array.from(byName.entries()).map(([name, info]) => ({
      name, itemIds: info.itemIds, teeth: Array.from(info.teeth).sort((a, b) => a - b), status: info.status,
    }));
  }, [activeTeeth, aggregateState?.t]);

  const addedTreatmentNames = useMemo(() => new Set(addedTreatments.map(t => t.name.toLowerCase())), [addedTreatments]);

  const treatmentRows = useMemo(() => addedTreatments.map(it => {
    const planItem = (W.items || []).find((x: any) =>
      x.treatment_name === it.name && (x.teeth || []).some((t: number) => activeTeeth.includes(t))
    );
    return { ...it, planItem: planItem ? {
      id: planItem.id,
      doctor_rate: planItem.doctor_rate,
      suggested_rate: planItem.suggested_rate,
      discount: planItem.discount,
      final_amount: planItem.final_amount,
    } : null };
  }), [addedTreatments, W.items, activeTeeth]);

  const removeFromPlan = async (item: { name: string; itemIds: string[] }) => {
    if (!confirm(`Remove "${item.name}" from the plan?`)) return;
    try {
      // Delete each plan_item by id — backend handles cascade for sittings etc.
      for (const id of item.itemIds) {
        await api.wsDeletePlanItem(id);
      }
      show(`✓ ${item.name} removed`);
      await reload();
    } catch (e: any) { show("Error: " + e.message); }
  };

  // 2D / 3D toggle — sits above the chart in both layouts
  const viewToggle = (
    <div style={{ display: "flex", gap: 4, background: chartView === "3d" ? "#152A47" : "#F1F5F9", borderRadius: 10, padding: 3, width: "fit-content", marginBottom: 10 }}>
      {(["2d", "3d"] as const).map(v => (
        <button key={v} onClick={() => setChartView(v)}
          style={{ border: "none", borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontWeight: 800, fontSize: 12.5, fontFamily: "inherit",
            background: chartView === v ? A : "transparent", color: chartView === v ? "#fff" : (chartView === "3d" ? "#7DA2C9" : "#64748B") }}>
          {v === "2d" ? "2D Chart" : "✨ 3D Mouth"}
        </button>
      ))}
    </div>
  );

  const toothHeroPanel = activeTeeth.length > 0 ? (
    <GroupedToothBanner
      teeth={activeTeeth}
      child={chartChild}
      accent={A}
      variant="sidebar"
      onFocusTooth={n => setChartSelectedTeeth([n])}
    />
  ) : null;

  const rvgPanel = (
    <div style={{
      background: "#fff", borderRadius: 14, border: `1.5px solid ${LINE}`,
      overflow: "hidden", boxShadow: "0 1px 6px rgba(15,23,42,.05)",
    }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${LINE}`, background: `linear-gradient(135deg, ${A}10, #fff)`, borderLeft: `4px solid ${A}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Camera size={17} color={A} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 14, color: INK }}>RVG / Photos</div>
            <div style={{ fontSize: 11, color: MUTE }}>Attach radiographs &amp; intraoral images</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <input ref={rvgInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={onRvgFilePicked} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {activeTeeth.length <= 8 ? activeTeeth.map((n: number) => {
            const imgs = toothImages.get(n) || [];
            return (
              <div key={n} style={{ border: `1.5px dashed ${A}44`, borderRadius: 10, padding: 6, width: 78, background: "#fff", textAlign: "center" as const }}>
                <div style={{ fontSize: 10, color: MUTE }}>#{n}{imgs.length ? ` · ${imgs.length}📷` : ""}</div>
                <button disabled={uploadingTooth === n} onClick={() => triggerRvgUpload(n)}
                  style={{ ...chipGhost(A), fontSize: 10, padding: "3px 8px", marginTop: 3, opacity: uploadingTooth === n ? 0.6 : 1 }}>
                  <Camera size={12} /> {uploadingTooth === n ? "…" : "Attach"}
                </button>
              </div>
            );
          }) : (
            <button onClick={() => triggerRvgUpload(activeTeeth[0])} style={chipGhost(A)}>
              <Camera size={14} /> Attach photo to selection
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const clinicalAddPanel = activeTeeth.length > 0 && aggregateState ? (
      <ClinicalAddPanel
        teeth={activeTeeth}
        accent={A}
        multi={activeTeeth.length > 1}
        layout="columns"
        exams={aggregateState.ex.map((e: any) => ({ id: e.id, finding: e.finding, tooth: e.tooth }))}
        diagnoses={aggregateState.dx.map((d: any) => ({ id: d.id, diagnosis: d.diagnosis, tooth: d.tooth }))}
        treatments={treatmentRows}
        onRemoveExam={id => { void api.wsRemoveToothExam(id).then(() => reload()); }}
        onRemoveDiag={id => { void api.wsRemoveToothDiagnosis(id).then(() => reload()); }}
        onRemoveTreatment={removeFromPlan}
        onStatusChange={(row, status) => {
          void (async () => {
            for (const id of row.itemIds) await api.wsEditPlanItem(id, { status });
            show(`✓ ${row.name} → ${status === "advised" ? "Planned" : status === "in_progress" ? "In Progress" : "Completed"}`);
            await reload();
          })();
        }}
        examSearch={examSearch}
        onExamSearchChange={setExamSearch}
        filteredExams={filteredExams}
        onAddExam={name => addExam(name)}
        onAddCustomExam={name => { addExam(name); api.wsExamCatalog().then(setExamCatalog).catch(() => {}); }}
        diagSearch={diagSearch}
        onDiagSearchChange={setDiagSearch}
        filteredDiags={filteredDiags}
        learnedDiags={learnedDiags}
        onAddDiag={name => addDiag(name)}
        onAddCustomDiag={name => { addDiag(name); api.wsDiagCatalog().then(setDiagCatalog).catch(() => {}); }}
        treatSearch={treatSearch}
        onTreatSearchChange={setTreatSearch}
        filteredTreats={filteredCatalogTreats}
        suggestedTreats={allSuggestedTreats}
        addedTreatmentNames={addedTreatmentNames}
        catalog={catalog}
        onAddTreatment={name => addToPlan(name)}
        customTreat={customTreat}
        onCustomTreatChange={setCustomTreat}
        onAddCustomTreatment={addCustomTreatment}
        fmt={fmt}
        rvgSlot={rvgPanel}
      />
  ) : null;

  const emptyClinicalHint = (
    <div style={{
      ...card, textAlign: "center", padding: "32px 24px",
      background: chartView === "3d" ? "linear-gradient(160deg, #0A1628, #12253F)" : `linear-gradient(160deg, ${A}08, #fff)`,
      border: chartView === "3d" ? "1px solid #1E3A5F" : `2px dashed ${A}44`,
      color: chartView === "3d" ? "#7DA2C9" : MUTE,
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🦷</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: chartView === "3d" ? "#E6EEF8" : INK, marginBottom: 8 }}>Tap a tooth to start</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
        Select a tooth in the {chartView === "3d" ? "3D mouth" : "chart"}. Record observation, diagnosis, and treatment right here.
      </div>
    </div>
  );

  const chartCard = (
    <div style={card}>
      <ToothWidget
        child={chartChild}
        onChildChange={setChartChild}
        multiSelect={chartMultiSelect}
        onMultiSelectChange={setChartMultiSelect}
        region={chartRegion}
        onRegionChange={setChartRegion}
        selected={chartSelectedTeeth}
        onSelectedChange={setChartSelectedTeeth}
        toothColor={toothColor}
        accent={A}
        pulsingTeeth={pulsingTeeth}
        focusMode={activeTeeth.length === 1}
        hoverTooth={hoverTooth}
        onHoverTooth={setHoverTooth}
        title="Select Tooth"
        headerExtra={
          activeTeeth.length > 0 ? (
            <div style={{ fontSize: 11, color: A, fontWeight: 700, padding: "4px 8px", background: `${A}10`, borderRadius: 8 }}>
              Selection updates clinical panels below
            </div>
          ) : null
        }
      />
      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", fontSize: 11, color: MUTE, fontWeight: 700 }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#FEFCE8", border: "1.5px solid #EAB308", marginRight: 4 }} />Examined</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#FFF7ED", border: "1.5px solid #F97316", marginRight: 4 }} />Diagnosed</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: A + "15", border: "1.5px solid " + A, marginRight: 4 }} />Planned</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#D1FAE5", border: "1.5px solid #10B981", marginRight: 4 }} />Done</span>
      </div>
    </div>
  );

  const chartAndHeroRow = (
    <div style={{
      display: "grid",
      gridTemplateColumns: chartView === "3d" ? "minmax(0, 1.15fr) minmax(260px, 320px)" : "minmax(0, 1fr) minmax(260px, 320px)",
      gap: 14, alignItems: "start",
    }}>
      {chartView === "3d" ? (
        <Tooth3DPanel
          child={chartChild}
          onChildChange={setChartChild}
          selected={chartSelectedTeeth}
          onSelectedChange={setChartSelectedTeeth}
          toothColor={toothColor}
          multiSelect={chartMultiSelect}
          accent={A}
          chartOnly={activeTeeth.length > 0}
        />
      ) : chartCard}
      <div style={{ position: "sticky", top: 12 }}>
        {toothHeroPanel || emptyClinicalHint}
      </div>
    </div>
  );

  return (
    <div>
      {viewToggle}

      <div ref={clinicalPanelRef} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {chartAndHeroRow}
        {clinicalAddPanel}
      </div>

      {undoAction && (
        <UndoToast
          message={`✓ ${undoAction.label}`}
          accent={A}
          onUndo={async () => { const u = undoAction; setUndoAction(null); await u.undo(); show("↩ Undone"); }}
          onDismiss={() => setUndoAction(null)}
        />
      )}

      {pricePopover && (
        <PriceConfirm A={A} data={pricePopover} onChange={setPricePopover}
          onCancel={() => setPricePopover(null)} onConfirm={() => commitPlan(pricePopover)} />
      )}
    </div>
  );
}
