"use client";
import { useState, useEffect, useMemo } from "react";
import * as api from "@/lib/api";
import { ToothWidget, type ChartRegion } from "@/components/ToothWidget";
import { Camera, Plus, ArrowRight, Check } from "lucide-react";

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

function SectionTitle({ children }: any) { return <div style={{ fontWeight: 800, fontSize: 14.5, color: INK, marginBottom: 8 }}>{children}</div>; }
function ChipX({ text, bg, color, onX }: any) {
  return <span style={{ background: bg, color, padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>{text}<button onClick={onX} style={{ background: "transparent", border: "none", cursor: "pointer", color, padding: 0 }}>✕</button></span>;
}

export function ClinicalToothTab({
  W, A, show, reload, patientId, clinicId,
  issueCatalog, setIssueCatalog, examCatalog, setExamCatalog, diagCatalog, setDiagCatalog,
  catalog, setCatalog,
  chartSelectedTeeth, setChartSelectedTeeth,
  chartMultiSelect, setChartMultiSelect,
  chartChild, setChartChild,
  chartRegion, setChartRegion,
  onJumpToPlan,
  onEditPlanItem,
  onWorkspacePatch,
}: any) {
  const activeTeeth = chartSelectedTeeth;
  const primaryTooth = activeTeeth.length === 1 ? activeTeeth[0] : (activeTeeth[0] ?? null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [tlLoading, setTlLoading] = useState(false);
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
    if (!primaryTooth) { setTimeline([]); return; }
    setTlLoading(true);
    api.wsToothTimeline(patientId, primaryTooth).then((r: any) => setTimeline(r.events || [])).catch(() => setTimeline([])).finally(() => setTlLoading(false));
  }, [primaryTooth, patientId]);

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

  const toothColor = (n: number) => {
    const st = toothState(n);
    const treatments = st.t;
    const primary = treatments[0];
    const kind = (primary?.treatment_kind || classifyKind(primary?.treatment || primary?.treatment_name || "")) as any;
    const label = (toothLabels.get(n) || []).slice(0, 2).join("+");
    const base = { hasIssue: st.c.length > 0, kind: kind !== "other" && kind !== "scaling" ? kind : null, label: label || undefined, done: st.done, prog: st.prog, planned: st.planned };
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
      for (const t of teeth) await api.wsAddToothExam(patientId, { tooth_number: t, finding });
      show(`✓ Exam: ${finding} → ${teeth.join(", ")}`);
      reload();
    } catch (e: any) { show("Error: " + e.message); }
  };

  const addDiag = async (diagnosis: string) => {
    const teeth = targetTeeth();
    if (!teeth.length) { show("Select tooth/teeth first"); return; }
    const linkedExams = aggregateState?.ex.map((e: any) => e.finding) || [];
    try {
      for (const t of teeth) {
        await api.wsAddToothDiagnosis(patientId, { tooth_number: t, diagnosis, linked_exams: linkedExams });
      }
      for (const ex of linkedExams) api.wsRecordClinicalLink("exam_diag", ex, diagnosis).catch(() => {});
      show(`✓ Dx: ${diagnosis} → ${teeth.join(", ")}`);
      reload();
    } catch (e: any) { show("Error: " + e.message); }
  };

  const addToPlan = async (treatment: string) => {
    const teeth = targetTeeth();
    if (!teeth.length) { show("Select tooth/teeth first"); return; }
    const procMatch = catalog.find((c: any) => c.name.toLowerCase() === treatment.toLowerCase());
    const examSummary = aggregateState?.ex.map((e: any) => e.finding).join(", ") || "";
    const diagSummary = aggregateState?.dx.map((d: any) => d.diagnosis).join(", ") || "";
    const rate = (procMatch?.rate || 0) * teeth.length;
    try {
      const result = await api.wsAddPlanItem(patientId, {
        treatment_name: treatment, procedure_id: procMatch?.id || null,
        teeth, suggested_rate: rate, doctor_rate: rate,
        discount: 0, clinic_id: clinicId, examination_summary: examSummary, diagnosis: diagSummary,
      });
      const itemId = result.item_id || result.id;
      const kind = classifyKind(treatment);
      onWorkspacePatch?.((prev: any) => {
        const newItem = {
          id: itemId, treatment_name: treatment, procedure_id: procMatch?.id || null,
          teeth, suggested_rate: rate, doctor_rate: rate, discount: 0, final_amount: rate,
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
            total_value: (prev.financial?.total_value || 0) + rate,
            outstanding: (prev.financial?.outstanding || 0) + rate,
          },
        };
      });
      for (const dx of (aggregateState?.dx || []).map((d: any) => d.diagnosis)) {
        api.wsRecordClinicalLink("diag_treatment", dx, treatment).catch(() => {});
      }
      show(`✅ ${treatment} → tooth ${teeth.join(", ")} — chart updated live`);
      reload().catch(() => {});
      // IMPORTANT: Do NOT auto-jump to Plan tab. Stay here so user can add MULTIPLE treatments tooth-wise while the SVG acts as the live visual report.
      // User can click the Review button below if they want to see the full plan.
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

  const cycleTreatmentStatus = async (item: { name: string; itemIds: string[]; status: string }) => {
    // advised → in_progress → completed → advised
    const next = item.status === "advised" ? "in_progress" : item.status === "in_progress" ? "completed" : "advised";
    try {
      for (const id of item.itemIds) {
        await api.wsEditPlanItem(id, { status: next });
      }
      show(`✓ ${item.name} → ${next}`);
      await reload();
    } catch (e: any) { show("Error: " + e.message); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "5fr 4fr", gap: 14, alignItems: "start" }}>
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
          headerExtra={
            activeTeeth.length > 0 ? (
              <div style={{ fontSize: 11, color: A, fontWeight: 700, padding: "4px 8px", background: `${A}10`, borderRadius: 8 }}>
                Select teeth → record below (SVG updates live)
              </div>
            ) : null
          }
        />

        {/* Teeth Images / RVG Photos - "image" attachment for selected teeth */}
        {activeTeeth.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${LINE}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6, fontWeight: 700, fontSize: 12, color: INK }}>
              <Camera size={15} color={A} /> Teeth Images / RVG for #{activeTeeth.join(", ")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {activeTeeth.map((n: number) => (
                <div key={n} style={{ border: `1.5px dashed ${A}44`, borderRadius: 10, padding: 6, width: 78, background: "#fff", textAlign: "center" as const }}>
                  <div style={{ fontSize: 10, color: MUTE }}>#{n}</div>
                  <button onClick={() => show?.(`📎 Attach RVG/photo for tooth #${n}`)} style={{ ...chipGhost(A), fontSize: 10, padding: "3px 8px", marginTop: 3 }}>
                    <Camera size={12} /> Attach
                  </button>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9.5, color: MUTE, marginTop: 4 }}>Photos link to this tooth & appear in Files tab.</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", fontSize: 11, color: MUTE, fontWeight: 700 }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#FEFCE8", border: "1.5px solid #EAB308", marginRight: 4 }} />Examined only</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#FFF7ED", border: "1.5px solid #F97316", marginRight: 4 }} />Diagnosed</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: A + "15", border: "1.5px solid " + A, marginRight: 4 }} />Planned / In progress / Done (green)</span>
          <span style={{ color: "#0EA5E9", fontWeight: 900 }}>● Bright cyan outline + "S" badge = CURRENTLY SELECTED (the tooth you're recording for right now)</span>
        </div>
        <div style={{ fontSize: 10.5, color: "#059669", marginTop: 4, fontWeight: 600 }}>
          Tip: Select a tooth → add observations below → the chart colors it permanently. Switch teeth → previous reverts to its observation color (easy to tell at a glance).
        </div>
        {toothLabels.size > 0 && (
          <div style={{ marginTop: 10, padding: "8px 10px", background: SOFT, borderRadius: 10, border: `1px solid ${LINE}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, letterSpacing: 0.4, marginBottom: 6, textTransform: "uppercase" as const }}>Planned treatments on chart</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {Array.from(toothLabels.entries()).sort((a, b) => a[0] - b[0]).map(([tooth, tags]) => (
                <button key={tooth} type="button" onClick={() => setChartSelectedTeeth([tooth])}
                  style={{ border: `1.5px solid ${A}44`, background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11.5, fontWeight: 800, color: INK, fontFamily: "inherit" }}>
                  <span style={{ color: A }}>#{tooth}</span> {tags.join(" + ")}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {activeTeeth.length === 0 && (
          <div style={card}>
            <div style={{ fontSize: 14, color: MUTE, lineHeight: 1.6 }}>
              👈 <b>Select tooth/teeth</b> on the chart — use multi-select or region buttons (Full Mouth, Upper Right…).<br />
              <span style={{ fontSize: 12.5 }}>Workflow: <b>Examine → Diagnose → Treatment Plan</b> — selections carry into plan edit.</span>
            </div>
          </div>
        )}

        {activeTeeth.length > 0 && aggregateState && <>
          <div style={{ ...card, padding: "14px 18px" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: INK }}>
              {activeTeeth.length === 1 ? `Tooth ${activeTeeth[0]}` : `${activeTeeth.length} teeth selected`}
            </div>
            <div style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>{activeTeeth.join(" · ")}</div>
            <div style={{ fontSize: 11.5, color: "#059669", marginTop: 6, fontWeight: 600 }}>
              The chart on the left is your live SVG report — teeth turn colored only after you add observations here.
            </div>
            <button type="button" onClick={() => onJumpToPlan?.()} style={{ ...btn(A), marginTop: 10, padding: "8px 14px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
              Review Full Treatment Plan (all teeth) →
            </button>
          </div>

          <div style={card}>
            <SectionTitle>🔍 On Examination</SectionTitle>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: MUTE, fontStyle: "italic" }}>Select from suggestions or add new</p>
            {aggregateState.ex.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {aggregateState.ex.map((e: any) => (
                  <ChipX key={e.id} text={`${e.finding}${activeTeeth.length > 1 ? ` (#${e.tooth})` : ""}`} bg="#FEF3C7" color="#92400E"
                    onX={async () => { await api.wsRemoveToothExam(e.id).catch(() => {}); reload(); }} />
                ))}
              </div>
            )}
            <input value={examSearch} onChange={e => setExamSearch(e.target.value)} placeholder="Search & Select"
              style={{ ...inp, fontSize: 13, marginBottom: 8 }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 140, overflow: "auto" }}>
              {filteredExams.slice(0, 20).map((e: any) => (
                <button key={e.id} type="button" onClick={() => { addExam(e.name); setExamSearch(""); }} style={chipGhost("#EAB308")}>+ {e.name}</button>
              ))}
            </div>
            {examSearch.trim() && !examCatalog.some((e: any) => e.name.toLowerCase() === examSearch.trim().toLowerCase()) && (
              <button type="button" onClick={() => { addExam(examSearch.trim()); api.wsExamCatalog().then(setExamCatalog).catch(() => {}); setExamSearch(""); }}
                style={{ ...chipGhost("#8B5CF6"), marginTop: 6 }}>+ Add custom: &quot;{examSearch.trim()}&quot;</button>
            )}
          </div>

          <div style={card}>
            <SectionTitle>🏷 Diagnosis</SectionTitle>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: MUTE, fontStyle: "italic" }}>Select from suggestions or type diagnosis</p>
            {aggregateState.dx.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {aggregateState.dx.map((d: any) => (
                  <ChipX key={d.id} text={d.diagnosis} bg="#FFEDD5" color="#9A3412"
                    onX={async () => { await api.wsRemoveToothDiagnosis(d.id).catch(() => {}); reload(); }} />
                ))}
              </div>
            )}
            {learnedDiags.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: A, marginBottom: 4 }}>💡 Learned from your observations</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {learnedDiags.filter(n => !aggregateState.dx.some((d: any) => d.diagnosis.toLowerCase() === n.toLowerCase())).slice(0, 8).map(n => (
                    <button key={n} type="button" onClick={() => addDiag(n)} style={chipGhost(A)}>+ {n}</button>
                  ))}
                </div>
              </div>
            )}
            <input value={diagSearch} onChange={e => setDiagSearch(e.target.value)} placeholder="Search & Select"
              style={{ ...inp, fontSize: 13, marginBottom: 8 }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 120, overflow: "auto" }}>
              {filteredDiags.slice(0, 15).map((d: any) => {
                const already = aggregateState.dx.some((x: any) => x.diagnosis.toLowerCase() === d.name.toLowerCase());
                return already ? null : <button key={d.id} type="button" onClick={() => { addDiag(d.name); setDiagSearch(""); }} style={chipGhost("#F97316")}>+ {d.name}</button>;
              })}
            </div>
            {diagSearch.trim() && !diagCatalog.some((d: any) => d.name.toLowerCase() === diagSearch.trim().toLowerCase()) && (
              <button type="button" onClick={() => { addDiag(diagSearch.trim()); api.wsDiagCatalog().then(setDiagCatalog).catch(() => {}); setDiagSearch(""); }}
                style={{ ...chipGhost("#8B5CF6"), marginTop: 6 }}>+ Add custom: &quot;{diagSearch.trim()}&quot;</button>
            )}
          </div>

          <div style={card}>
            <SectionTitle>💡 Treatment Suggested <span style={{ color: "#DC2626" }}>*</span></SectionTitle>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: MUTE, fontStyle: "italic" }}>Add as many treatments as you want for these teeth — right here. The big SVG chart on the left is your live visual report (colors update after each add). Use the "Review Full Plan" button above only when you're ready to see everything.</p>

            {/* ─── Already added pills — bidirectional sync with Plan tab. Now with explicit EDIT from here (dropdown-like list + edit button) so you can tweak rate/teeth/notes without leaving the tooth/SVG view first. The lifted modal will open as overlay. */}
            {addedTreatments.length > 0 && (
              <div style={{ background: `${A}0A`, border: `1.5px solid ${A}33`, borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: A, letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" as const }}>
                  ✓ Already added ({addedTreatments.length}) — for tooth {activeTeeth.join(", ")} — click Edit to change details
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                  {addedTreatments.map(it => {
                    const statusColor = it.status === "completed" ? "#10B981" : it.status === "in_progress" ? "#F59E0B" : A;
                    const statusIcon = it.status === "completed" ? "✓" : it.status === "in_progress" ? "⏳" : "📝";
                    return (
                      <span key={it.name} style={{
                        background: "#fff", color: statusColor, border: `1.5px solid ${statusColor}55`,
                        padding: "5px 4px 5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800,
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        <button type="button" onClick={() => cycleTreatmentStatus(it)}
                          title={`Click to cycle status (now: ${it.status})`}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: statusColor, padding: 0, fontSize: 13, fontWeight: 900 }}>
                          {statusIcon}
                        </button>
                        {it.name}
                        {/* Edit from here (the "dropdown" context in tooth view) */}
                        <button type="button" onClick={() => {
                          if (onEditPlanItem) {
                            // Find the full item from W to pass to modal (it has all fields like notes, exact rates)
                            const fullItem = (W.items || []).find((x: any) => x.treatment_name === it.name && (x.teeth || []).some((t: number) => activeTeeth.includes(t)));
                            onEditPlanItem(fullItem || { treatment_name: it.name, teeth: it.teeth });
                          }
                        }} title="Edit this treatment (rate, teeth, notes, etc.)"
                          style={{ background: statusColor + "22", border: "none", cursor: "pointer", color: statusColor, marginLeft: 2, padding: "0 6px", fontSize: 11, fontWeight: 900, borderRadius: 4 }}>
                          ✎ Edit
                        </button>
                        <button type="button" onClick={() => removeFromPlan(it)} title="Remove from plan"
                          style={{ background: statusColor + "22", border: "none", cursor: "pointer", color: statusColor, marginLeft: 2, width: 18, height: 18, borderRadius: "50%", fontSize: 11, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Search OR dropdown — full catalog ─── */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" as const }}>
              <input value={treatSearch} onChange={e => setTreatSearch(e.target.value)} placeholder="🔍 Search treatment by name…"
                style={{ ...inp, flex: 1, minWidth: 200, fontSize: 13, marginBottom: 0 }} />
              <select value="" onChange={e => {
                if (!e.target.value) return;
                const name = e.target.value;
                const used = addedTreatmentNames.has(name.toLowerCase());
                if (used && onEditPlanItem) {
                  // Edit from dropdown: find matching item for the current teeth and open edit modal (overlay)
                  const fullItem = (W.items || []).find((x: any) => x.treatment_name === name && (x.teeth || []).some((t: number) => activeTeeth.includes(t)));
                  onEditPlanItem(fullItem || { treatment_name: name, teeth: activeTeeth });
                } else {
                  addToPlan(name);
                }
              }}
                style={{ ...inp, width: 200, fontSize: 13, marginBottom: 0, cursor: "pointer", background: "#fff" }}>
                <option value="">＋ Pick from catalog… (or edit if already added)</option>
                {catalog.map((c: any) => {
                  const used = addedTreatmentNames.has(c.name.toLowerCase());
                  return <option key={c.id} value={c.name}>{used ? "✎ Edit " : "＋ Add "}{c.name}{c.rate ? ` — ${fmt(c.rate)}` : ""}</option>;
                })}
              </select>
            </div>

            {treatSearch && (
              <div style={{ marginBottom: 10, border: `1px solid ${LINE}`, borderRadius: 12, maxHeight: 200, overflow: "auto" as const }}>
                {filteredCatalogTreats.length === 0 && (
                  <div style={{ padding: "10px 14px", fontSize: 12.5, color: MUTE }}>No match — use Custom below ↓</div>
                )}
                {filteredCatalogTreats.map((c: any) => {
                  const used = addedTreatmentNames.has(c.name.toLowerCase());
                  return (
                    <button key={c.id} type="button" onClick={() => { addToPlan(c.name); setTreatSearch(""); }}
                      style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "10px 14px", border: "none", borderBottom: `1px solid ${SOFT}`, background: used ? `${A}0A` : "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                      {used && <span style={{ color: A, marginRight: 6 }}>✓</span>}
                      {c.name} <span style={{ color: MUTE, fontWeight: 600 }}>{c.rate ? fmt(c.rate) : ""}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ─── AI-suggested chips ─── */}
            {allSuggestedTreats.length > 0 && (
              <>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: MUTE, letterSpacing: 0.4, marginBottom: 6, textTransform: "uppercase" as const }}>
                  🤖 Suggested for current diagnosis{learnedTreats.length > 0 ? " (learned from past visits)" : ""}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 10 }}>
                  {allSuggestedTreats.map(t => {
                    const used = addedTreatmentNames.has(t.toLowerCase());
                    return (
                      <button key={t} type="button" disabled={used} onClick={() => addToPlan(t)} title={used ? "Already added" : `Add ${t}`}
                        style={{
                          border: used ? `1.5px solid ${A}` : `1.5px solid ${A}55`,
                          background: used ? `${A}15` : "#fff",
                          color: used ? A : INK, borderRadius: 999, padding: "8px 14px",
                          cursor: used ? "default" : "pointer", fontWeight: 800, fontSize: 11.5,
                          fontFamily: "inherit", textTransform: "uppercase" as const,
                          opacity: used ? 0.7 : 1,
                        }}>
                        {used && "✓ "}{t.length > 24 ? t.slice(0, 22) + "…" : t}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ─── Custom entry ─── */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              <input value={customTreat} onChange={e => setCustomTreat(e.target.value)} placeholder="Type a custom treatment name…"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomTreatment(); } }}
                style={{ ...inp, flex: 1, minWidth: 160, fontSize: 13, margin: 0 }} />
              <button type="button" onClick={addCustomTreatment} disabled={!customTreat.trim()} style={{ ...btn("#6366F1"), padding: "10px 16px", fontSize: 13, opacity: customTreat.trim() ? 1 : 0.4 }}>+ Custom</button>
            </div>
          </div>

          {primaryTooth && (
            <div style={card}>
              <SectionTitle>📋 Tooth {primaryTooth} Timeline</SectionTitle>
              {tlLoading && <div style={{ fontSize: 13, color: MUTE }}>Loading…</div>}
              {!tlLoading && timeline.length === 0 && <div style={{ fontSize: 13, color: MUTE }}>No history yet.</div>}
              {!tlLoading && timeline.slice(0, 8).map((ev: any, i: number) => (
                <div key={i} style={{ fontSize: 13, padding: "6px 0", borderBottom: i < timeline.length - 1 ? `1px dashed ${SOFT}` : "none" }}>
                  <b>{ev.text}</b>
                  <div style={{ fontSize: 11, color: MUTE }}>{ev.at ? new Date(ev.at).toLocaleDateString("en-IN") : "—"}</div>
                </div>
              ))}
            </div>
          )}
        </>}
      </div>
    </div>
  );
}
