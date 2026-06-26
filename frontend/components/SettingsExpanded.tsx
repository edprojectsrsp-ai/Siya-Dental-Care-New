"use client";
/**
 * components/SettingsExpanded.tsx — Bundle S
 *
 * 6 new tabs that extend SettingsHub (from Bundle Q+):
 *   - 🏥 Clinic Info     (logo, GST, license, doctor credentials)
 *   - 🕐 Hours           (per-day + holidays)
 *   - 📋 Services        (procedure catalog)
 *   - 💰 Fee Schedule    (seasonal/promo overrides)
 *   - 🎨 Branding        (colors, Rx layout, Rx language)
 *   - 🔌 n8n Hosting     (cloud / render / self-hosted picker with auto-generated URLs)
 *
 * Each tab is exported as a sub-component so it can be slotted into the
 * existing SettingsHub <Tab> structure or rendered standalone.
 */

import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const A_DEEP = "#0A5C5B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG = "#F8FAFC";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ═══════════════════════════════════════════════════════════════════════════
// 1. CLINIC INFO TAB
// ═══════════════════════════════════════════════════════════════════════════
export function ClinicInfoTab({ clinicId, show }: any) {
  const [info, setInfo] = useState<any>(null);
  const [dirty, setDirty] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await api.apiFetch?.(`/api/clinic-info/${clinicId}`);
      setInfo(d);
    })();
  }, [clinicId]); // eslint-disable-line

  const set = (k: string, v: any) => { setDirty({ ...dirty, [k]: v }); setInfo({ ...info, [k]: v }); };

  const save = async () => {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    try {
      await api.apiFetch?.(`/api/clinic-info/${clinicId}`, { method: "PATCH", body: JSON.stringify(dirty) });
      setDirty({}); show("✓ Saved");
    } catch (e: any) { show("Error: " + e.message); }
    finally { setSaving(false); }
  };

  if (!info) return <Loading />;

  return (
    <div>
      <SectionTitle>Identity</SectionTitle>
      <Field label="Logo URL">
        <Input value={info.logo_url} onChange={v => set("logo_url", v)} placeholder="https://…/logo.png" />
        {info.logo_url && (
          <img src={info.logo_url} alt="logo" style={{ marginTop: 8, maxHeight: 60, borderRadius: 8 }} />
        )}
      </Field>

      <div style={grid2}>
        <Field label="GST number"><Input value={info.gst_number} onChange={v => set("gst_number", v)} /></Field>
        <Field label="License number"><Input value={info.license_number} onChange={v => set("license_number", v)} /></Field>
      </div>

      <div style={grid2}>
        <Field label="Established year"><Input type="number" value={info.establishment_year} onChange={v => set("establishment_year", parseInt(v) || null)} /></Field>
        <Field label="Tagline"><Input value={info.tagline} onChange={v => set("tagline", v)} placeholder="Caring smiles since…" /></Field>
      </div>

      <SectionTitle>Primary doctor (printed on Rx)</SectionTitle>
      <Field label="Doctor name"><Input value={info.primary_doctor_name} onChange={v => set("primary_doctor_name", v)} placeholder="Dr. Madhu Edward" /></Field>
      <div style={grid2}>
        <Field label="Qualification"><Input value={info.primary_doctor_qual} onChange={v => set("primary_doctor_qual", v)} placeholder="BDS, MDS" /></Field>
        <Field label="Reg. number"><Input value={info.primary_doctor_reg} onChange={v => set("primary_doctor_reg", v)} placeholder="OD-28456" /></Field>
      </div>

      <SectionTitle>Public site</SectionTitle>
      <Field label="About text">
        <textarea value={info.public_about || ""} onChange={e => set("public_about", e.target.value)}
          style={{ ...inputStyle, minHeight: 80, fontFamily: "inherit" }} />
      </Field>
      <Field label="Emergency message">
        <Input value={info.public_emergency_msg} onChange={v => set("public_emergency_msg", v)}
          placeholder="For dental emergencies, call …" />
      </Field>

      <SaveBar dirty={dirty} saving={saving} onSave={save} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. BUSINESS HOURS TAB
// ═══════════════════════════════════════════════════════════════════════════
export function HoursTab({ clinicId, show }: any) {
  const [hours, setHours] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ holiday_date: "", reason: "", is_recurring: false });

  const load = async () => {
    const [h, hd] = await Promise.all([
      api.apiFetch?.(`/api/business-hours/${clinicId}`),
      api.apiFetch?.(`/api/business-hours/${clinicId}/holidays`),
    ]);
    setHours(h?.days || []);
    setHolidays(hd?.holidays || []);
  };
  useEffect(() => { load(); }, [clinicId]); // eslint-disable-line

  const setDay = (wd: number, key: string, val: any) => {
    setHours(hours.map(h => h.weekday === wd ? { ...h, [key]: val } : h));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.apiFetch?.(`/api/business-hours/${clinicId}`, {
        method: "PUT", body: JSON.stringify(hours),
      });
      show("✓ Hours saved");
    } catch (e: any) { show("Error: " + e.message); }
    finally { setSaving(false); }
  };

  const addHoliday = async () => {
    if (!newHoliday.holiday_date || !newHoliday.reason) return;
    try {
      await api.apiFetch?.(`/api/business-hours/${clinicId}/holidays`, {
        method: "POST", body: JSON.stringify(newHoliday),
      });
      setNewHoliday({ holiday_date: "", reason: "", is_recurring: false });
      load(); show("✓ Holiday added");
    } catch (e: any) { show("Error: " + e.message); }
  };

  const removeHoliday = async (id: string) => {
    await api.apiFetch?.(`/api/business-hours/${clinicId}/holidays/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <SectionTitle>Daily hours</SectionTitle>
      <div style={{ background: BG, borderRadius: 12, padding: 12 }}>
        {hours.map(h => (
          <div key={h.weekday} style={{
            display: "grid", gridTemplateColumns: "80px 90px 110px 110px 110px 110px",
            gap: 8, alignItems: "center" as const, padding: "6px 0",
            borderBottom: h.weekday !== 6 ? `1px solid ${LINE}` : "none",
          }}>
            <b style={{ fontSize: 13 }}>{h.weekday_name}</b>
            <Toggle on={!h.is_closed} onClick={() => setDay(h.weekday, "is_closed", !h.is_closed)} label={h.is_closed ? "Closed" : "Open"} />
            <input type="time" value={h.open_time || ""}
              onChange={e => setDay(h.weekday, "open_time", e.target.value)}
              disabled={h.is_closed} style={{ ...inputSm, opacity: h.is_closed ? 0.4 : 1 }} />
            <input type="time" value={h.close_time || ""}
              onChange={e => setDay(h.weekday, "close_time", e.target.value)}
              disabled={h.is_closed} style={{ ...inputSm, opacity: h.is_closed ? 0.4 : 1 }} />
            <input type="time" value={h.break_start || ""} placeholder="Lunch start"
              onChange={e => setDay(h.weekday, "break_start", e.target.value)}
              disabled={h.is_closed} style={{ ...inputSm, opacity: h.is_closed ? 0.4 : 1 }} />
            <input type="time" value={h.break_end || ""} placeholder="Lunch end"
              onChange={e => setDay(h.weekday, "break_end", e.target.value)}
              disabled={h.is_closed} style={{ ...inputSm, opacity: h.is_closed ? 0.4 : 1 }} />
          </div>
        ))}
        <button onClick={save} disabled={saving} style={{ ...btnPrimary, marginTop: 14, width: "100%" }}>
          {saving ? "Saving…" : "💾 Save hours"}
        </button>
      </div>

      <SectionTitle style={{ marginTop: 24 }}>Holidays</SectionTitle>
      <div style={{ background: BG, borderRadius: 12, padding: 12 }}>
        {holidays.length === 0 && (
          <div style={{ color: MUTE, fontSize: 13, fontStyle: "italic" as const, padding: 8 }}>No holidays set</div>
        )}
        {holidays.map(h => (
          <div key={h.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center" as const,
            padding: "8px 0", borderBottom: `1px solid ${LINE}`,
          }}>
            <div>
              <b style={{ fontSize: 13 }}>{new Date(h.holiday_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b>
              <span style={{ marginLeft: 10, fontSize: 12.5, color: MUTE }}>{h.reason}</span>
              {h.is_recurring && <span style={{ marginLeft: 8, fontSize: 10, color: A_DEEP, fontWeight: 700 }}>(yearly)</span>}
            </div>
            <button onClick={() => removeHoliday(h.id)} style={btnSmDanger}>✕</button>
          </div>
        ))}

        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr auto auto", gap: 8, marginTop: 12 }}>
          <input type="date" value={newHoliday.holiday_date}
            onChange={e => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })} style={inputSm} />
          <input placeholder="Reason (e.g. Diwali)" value={newHoliday.reason}
            onChange={e => setNewHoliday({ ...newHoliday, reason: e.target.value })} style={inputSm} />
          <label style={{ display: "flex", alignItems: "center" as const, gap: 4, fontSize: 12 }}>
            <input type="checkbox" checked={newHoliday.is_recurring}
              onChange={e => setNewHoliday({ ...newHoliday, is_recurring: e.target.checked })} />
            Yearly
          </label>
          <button onClick={addHoliday} style={btnPrimary}>Add</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SERVICE CATALOG TAB
// ═══════════════════════════════════════════════════════════════════════════
export function ServiceCatalogTab({ clinicId, show }: any) {
  const [services, setServices] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [category, setCategory] = useState<string>("");

  const load = async () => {
    const d = await api.apiFetch?.(`/api/service-catalog?clinic_id=${clinicId}`);
    setServices(d?.services || []);
  };
  useEffect(() => { load(); }, [clinicId]); // eslint-disable-line

  const categories = useMemo(() => Array.from(new Set(services.map(s => s.category))), [services]);
  const filtered = category ? services.filter(s => s.category === category) : services;

  const save = async (s: any) => {
    await api.apiFetch?.(`/api/service-catalog`, { method: "POST", body: JSON.stringify({ clinic_id: clinicId, ...s }) });
    setEditing(null); load(); show("✓ Saved");
  };
  const remove = async (id: string) => {
    if (!confirm("Remove this service?")) return;
    await api.apiFetch?.(`/api/service-catalog/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" as const, marginBottom: 14 }}>
        <SectionTitle>Services ({services.length})</SectionTitle>
        <button onClick={() => setEditing({ category: "consultation", name: "", default_duration_min: 30, default_price: 0, typical_sittings: 1 })} style={btnPrimary}>+ New service</button>
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" as const }}>
        <button onClick={() => setCategory("")} style={pillBtn(category === "")}>All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={pillBtn(category === c)}>{c} ({services.filter(s => s.category === c).length})</button>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${LINE}`, overflow: "hidden" as const }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
          <thead style={{ background: BG }}>
            <tr style={{ textAlign: "left" as const }}>
              <th style={th}>Service</th><th style={th}>Category</th>
              <th style={{ ...th, textAlign: "right" as const }}>Duration</th>
              <th style={{ ...th, textAlign: "right" as const }}>Price</th>
              <th style={th}>Flags</th>
              <th style={{ ...th, width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} style={{ borderTop: `1px solid ${LINE}` }}>
                <td style={td}>{s.name}{s.code && <span style={{ fontSize: 10, color: MUTE, marginLeft: 6 }}>{s.code}</span>}</td>
                <td style={{ ...td, color: MUTE, fontSize: 12 }}>{s.category}</td>
                <td style={{ ...td, textAlign: "right" as const }}>{s.default_duration_min}m</td>
                <td style={{ ...td, textAlign: "right" as const, fontWeight: 700 }}>{s.default_price ? `₹${s.default_price.toLocaleString()}` : "—"}</td>
                <td style={td}>
                  {s.requires_lab && <span style={tag("#0EA5E9")}>Lab</span>}
                  {s.requires_specialist && <span style={tag("#A855F7")}>Specialist</span>}
                  {s.typical_sittings > 1 && <span style={tag("#F59E0B")}>{s.typical_sittings} sittings</span>}
                </td>
                <td style={td}>
                  <button onClick={() => setEditing(s)} style={btnSmGhost}>Edit</button>
                  <button onClick={() => remove(s.id)} style={{ ...btnSmDanger, marginLeft: 4 }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <ServiceEditor service={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ServiceEditor({ service, onSave, onClose }: any) {
  const [s, setS] = useState({ ...service });
  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={e => e.stopPropagation()} style={modalCard}>
        <h2 style={{ margin: "0 0 12px" }}>{service.id ? "Edit service" : "New service"}</h2>
        <Field label="Name"><Input value={s.name} onChange={(v: any) => setS({ ...s, name: v })} /></Field>
        <div style={grid2}>
          <Field label="Category">
            <select value={s.category} onChange={e => setS({ ...s, category: e.target.value })} style={inputStyle}>
              {["consultation","restorative","endodontic","periodontal","oral_surgery","orthodontic","prosthodontic","pediatric","cosmetic","preventive","diagnostic"].map(c =>
                <option key={c}>{c}</option>
              )}
            </select>
          </Field>
          <Field label="Code (optional)"><Input value={s.code} onChange={(v: any) => setS({ ...s, code: v })} /></Field>
        </div>
        <div style={grid2}>
          <Field label="Duration (min)"><Input type="number" value={s.default_duration_min} onChange={(v: any) => setS({ ...s, default_duration_min: parseInt(v) || 30 })} /></Field>
          <Field label="Default price (₹)"><Input type="number" value={s.default_price} onChange={(v: any) => setS({ ...s, default_price: parseFloat(v) || 0 })} /></Field>
        </div>
        <div style={grid2}>
          <Field label="Typical sittings"><Input type="number" value={s.typical_sittings} onChange={(v: any) => setS({ ...s, typical_sittings: parseInt(v) || 1 })} /></Field>
          <Field label="">
            <div style={{ display: "flex", gap: 10, paddingTop: 18 }}>
              <label style={{ fontSize: 12, display: "flex", alignItems: "center" as const, gap: 4 }}>
                <input type="checkbox" checked={s.requires_lab} onChange={e => setS({ ...s, requires_lab: e.target.checked })} /> Requires lab
              </label>
              <label style={{ fontSize: 12, display: "flex", alignItems: "center" as const, gap: 4 }}>
                <input type="checkbox" checked={s.requires_specialist} onChange={e => setS({ ...s, requires_specialist: e.target.checked })} /> Specialist
              </label>
            </div>
          </Field>
        </div>
        <Field label="Description"><textarea value={s.description || ""} onChange={e => setS({ ...s, description: e.target.value })} style={{ ...inputStyle, minHeight: 60, fontFamily: "inherit" }} /></Field>
        <div style={{ display: "flex", justifyContent: "flex-end" as const, gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(s)} style={btnPrimary}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. BRANDING TAB (Rx layout + colors)
// ═══════════════════════════════════════════════════════════════════════════
export function BrandingTab({ clinicId, show }: any) {
  const [info, setInfo] = useState<any>(null);
  const [dirty, setDirty] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.apiFetch?.(`/api/clinic-info/${clinicId}`).then(setInfo);
  }, [clinicId]); // eslint-disable-line

  const set = (k: string, v: any) => { setDirty({ ...dirty, [k]: v }); setInfo({ ...info, [k]: v }); };
  const save = async () => {
    setSaving(true);
    try {
      await api.apiFetch?.(`/api/clinic-info/${clinicId}`, { method: "PATCH", body: JSON.stringify(dirty) });
      setDirty({}); show("✓ Saved");
    } finally { setSaving(false); }
  };

  if (!info) return <Loading />;

  return (
    <div>
      <SectionTitle>Colors</SectionTitle>
      <div style={grid2}>
        <Field label="Accent color">
          <div style={{ display: "flex", gap: 8 }}>
            <input type="color" value={info.accent_color || "#0E7C7B"} onChange={e => set("accent_color", e.target.value)} style={{ width: 50, height: 38, borderRadius: 8, border: "none" }} />
            <Input value={info.accent_color} onChange={v => set("accent_color", v)} />
          </div>
        </Field>
        <Field label="Secondary color">
          <div style={{ display: "flex", gap: 8 }}>
            <input type="color" value={info.secondary_color || "#0A5C5B"} onChange={e => set("secondary_color", e.target.value)} style={{ width: 50, height: 38, borderRadius: 8, border: "none" }} />
            <Input value={info.secondary_color} onChange={v => set("secondary_color", v)} />
          </div>
        </Field>
      </div>

      <SectionTitle style={{ marginTop: 24 }}>Prescription PDF</SectionTitle>
      <div style={grid2}>
        <Field label="Page size">
          <select value={info.rx_format || "A4"} onChange={e => set("rx_format", e.target.value)} style={inputStyle}>
            <option value="A4">A4 (full page)</option>
            <option value="A5">A5 (compact)</option>
          </select>
        </Field>
        <Field label="Language">
          <select value={info.rx_language || "en"} onChange={e => set("rx_language", e.target.value)} style={inputStyle}>
            <option value="en">English only</option>
            <option value="en+hi">English + Hindi</option>
            <option value="en+or">English + Odia</option>
          </select>
        </Field>
      </div>
      <Field label="Footer text"><Input value={info.rx_footer_text} onChange={v => set("rx_footer_text", v)} placeholder="Wishing you good health · Confidential" /></Field>
      <label style={{ display: "flex", alignItems: "center" as const, gap: 8, padding: "10px 0" }}>
        <input type="checkbox" checked={info.rx_show_qr !== false} onChange={e => set("rx_show_qr", e.target.checked)} />
        <span style={{ fontSize: 13 }}>Show QR code on Rx (for digital verification)</span>
      </label>

      <SaveBar dirty={dirty} saving={saving} onSave={save} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. N8N HOSTING PICKER TAB
// ═══════════════════════════════════════════════════════════════════════════
export function N8nHostingTab({ clinicId, show }: any) {
  const [settings, setSettings] = useState<any>(null);
  const [kind, setKind] = useState<string>("self_hosted");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.apiFetch?.(`/api/settings/clinic/${clinicId}`).then(s => {
      setSettings(s);
      setKind(s.n8n_hosting_kind || "self_hosted");
    });
  }, [clinicId]); // eslint-disable-line

  const save = async (patch: any) => {
    setSaving(true);
    try {
      await api.apiFetch?.(`/api/settings/clinic/${clinicId}`, { method: "PATCH", body: JSON.stringify(patch) });
      show("✓ Saved");
    } finally { setSaving(false); }
  };

  const setHosting = (newKind: string) => {
    setKind(newKind);
    // Auto-populate webhook URL based on kind
    let baseUrl = "";
    if (newKind === "n8n_cloud") baseUrl = "https://YOUR-INSTANCE.app.n8n.cloud";
    if (newKind === "render_hosted") baseUrl = "https://YOUR-SERVICE.onrender.com";
    if (newKind === "self_hosted") baseUrl = "https://n8n.YOUR-DOMAIN.com";
    if (newKind === "inprocess") baseUrl = "";
    save({ n8n_hosting_kind: newKind, n8n_webhook_base: baseUrl });
  };

  if (!settings) return <Loading />;

  return (
    <div>
      <SectionTitle>n8n hosting</SectionTitle>
      <P>Choose where automation runs. Same scheduler logic, different hosting tradeoffs.</P>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <HostingCard
          active={kind === "inprocess"} onClick={() => setHosting("inprocess")}
          icon="⚡" title="In-process (built-in)"
          subtitle="Free · Simplest" cost="₹0/mo"
          desc="Backend runs scheduler internally. No external n8n needed. Simplest setup but if backend restarts the scheduler resets." />
        <HostingCard
          active={kind === "n8n_cloud"} onClick={() => setHosting("n8n_cloud")}
          icon="☁️" title="n8n.cloud"
          subtitle="Managed · Easy" cost="$20/mo (~₹1,700)"
          desc="Fully managed by n8n. Sign up at n8n.cloud, get your instance URL, paste below. Best DX, no devops." />
        <HostingCard
          active={kind === "render_hosted"} onClick={() => setHosting("render_hosted")}
          icon="🚀" title="Render-hosted"
          subtitle="Same box · Cheap" cost="₹0–500/mo"
          desc="Run n8n as a Docker service on the same Render account as your backend. ~512MB RAM is enough." />
        <HostingCard
          active={kind === "self_hosted"} onClick={() => setHosting("self_hosted")}
          icon="🏠" title="Self-hosted VPS"
          subtitle="Full control · Cheapest at scale" cost="₹400-500/mo"
          desc="Hetzner CPX11 (€4.51/mo) or similar. Run n8n + Baileys on the same VPS. Most reliable for production." />
      </div>

      {kind !== "inprocess" && (
        <>
          <Field label="Webhook base URL">
            <Input value={settings.n8n_webhook_base} onChange={v => save({ n8n_webhook_base: v })}
              placeholder="https://n8n.yourdomain.com" />
          </Field>
          <Field label="Dashboard URL (your n8n admin)">
            <Input value={settings.n8n_dashboard_url} onChange={v => save({ n8n_dashboard_url: v })}
              placeholder="https://n8n.yourdomain.com/" />
          </Field>
        </>
      )}

      {/* Setup instructions per kind */}
      <div style={{ background: BG, borderRadius: 12, padding: 14, marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: A_DEEP, marginBottom: 8, letterSpacing: 0.3 }}>
          {kind === "inprocess" && "📘 In-process setup"}
          {kind === "n8n_cloud" && "📘 n8n.cloud setup"}
          {kind === "render_hosted" && "📘 Render setup"}
          {kind === "self_hosted" && "📘 Self-hosted setup"}
        </div>
        <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.6 }}>
          {kind === "inprocess" && (
            <>1. Uncomment <code style={code}>_daily_cron_loop</code> in <code style={code}>main.py</code><br />
            2. Restart backend<br />
            3. Done. No external config needed.</>
          )}
          {kind === "n8n_cloud" && (
            <>1. Sign up at <a href="https://n8n.cloud" target="_blank" rel="noopener noreferrer" style={{ color: A_DEEP }}>n8n.cloud</a><br />
            2. Import workflows from <code style={code}>n8n/daily_7am_digests.json</code> + <code style={code}>n8n/baileys_whatsapp.json</code><br />
            3. Update backend URLs in each workflow to your live backend<br />
            4. Paste your instance URL above</>
          )}
          {kind === "render_hosted" && (
            <>1. In Render, create a new <b>Web Service</b> using Docker image <code style={code}>n8nio/n8n</code><br />
            2. Set env vars: <code style={code}>WEBHOOK_URL</code>, <code style={code}>GENERIC_TIMEZONE=Asia/Kolkata</code><br />
            3. Add persistent disk (1GB)<br />
            4. Import workflows, paste URL above</>
          )}
          {kind === "self_hosted" && (
            <><code style={code}>docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n -e GENERIC_TIMEZONE=Asia/Kolkata n8nio/n8n</code><br /><br />
            1. SSH into your VPS<br />
            2. Run the Docker command above<br />
            3. Set up Nginx reverse proxy + SSL<br />
            4. Import workflows from <code style={code}>n8n/</code> folder</>
          )}
        </div>
      </div>
    </div>
  );
}

function HostingCard({ active, onClick, icon, title, subtitle, cost, desc }: any) {
  return (
    <button onClick={onClick} style={{
      textAlign: "left" as const, padding: 14, borderRadius: 12,
      border: active ? `2px solid ${A}` : `1.5px solid ${LINE}`,
      background: active ? `${A}10` : "#fff", cursor: "pointer", fontFamily: "inherit",
    }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" as const }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: INK }}>{title} {active && "✓"}</div>
        <div style={{ fontSize: 10, color: A_DEEP, fontWeight: 700 }}>{cost}</div>
      </div>
      <div style={{ fontSize: 11, color: A_DEEP, fontWeight: 700, marginTop: 2 }}>{subtitle}</div>
      <div style={{ fontSize: 12, color: MUTE, marginTop: 6, lineHeight: 1.4 }}>{desc}</div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════════════
function SectionTitle({ children, style }: any) {
  return <h3 style={{ margin: "0 0 8px", fontSize: 15, color: INK, ...style }}>{children}</h3>;
}
function P({ children }: any) {
  return <p style={{ fontSize: 13, color: MUTE, marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>{children}</p>;
}
function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 5 }}>{label}</div>}
      {children}
    </div>
  );
}
function Input({ value, onChange, type = "text", placeholder }: any) {
  return (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} style={inputStyle} />
  );
}
function Toggle({ on, onClick, label }: any) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 11px", borderRadius: 999,
      border: `1.5px solid ${on ? A : LINE}`,
      background: on ? `${A}14` : "#fff",
      color: on ? A_DEEP : MUTE, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    }}>{label}</button>
  );
}
function SaveBar({ dirty, saving, onSave }: any) {
  if (Object.keys(dirty).length === 0) return null;
  return (
    <div style={{
      position: "sticky" as const, bottom: 0, background: "#fff", paddingTop: 14,
      borderTop: `1px solid ${LINE}`, marginTop: 20,
      display: "flex", justifyContent: "flex-end" as const, gap: 8,
    }}>
      <span style={{ alignSelf: "center" as const, fontSize: 12, color: MUTE, marginRight: 6 }}>
        {Object.keys(dirty).length} unsaved {Object.keys(dirty).length === 1 ? "change" : "changes"}
      </span>
      <button onClick={onSave} disabled={saving} style={btnPrimary}>
        {saving ? "Saving…" : "💾 Save"}
      </button>
    </div>
  );
}
function Loading() {
  return <div style={{ padding: 30, textAlign: "center" as const, color: MUTE }}>⏳ Loading…</div>;
}

const inputStyle: any = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${LINE}`, fontSize: 14, outline: "none",
  boxSizing: "border-box" as const, fontFamily: "inherit", background: "#fff",
};
const inputSm: any = {
  padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${LINE}`,
  fontSize: 12, outline: "none", fontFamily: "inherit", background: "#fff",
  boxSizing: "border-box" as const,
};
const grid2: any = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
const btnPrimary: any = {
  background: A, color: "#fff", border: "none", padding: "10px 16px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnGhost: any = {
  background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, padding: "8px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnSmGhost: any = {
  background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, padding: "4px 10px",
  borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
};
const btnSmDanger: any = {
  background: "#FEE2E2", color: "#991B1B", border: "none", padding: "4px 8px",
  borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
};
const pillBtn = (active: boolean): any => ({
  border: active ? `2px solid ${A}` : `1.5px solid ${LINE}`,
  background: active ? `${A}14` : "#fff",
  color: active ? A_DEEP : MUTE, padding: "5px 11px", borderRadius: 999,
  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
const tag = (color: string): any => ({
  background: `${color}1A`, color, padding: "1px 7px", borderRadius: 999,
  fontSize: 9, fontWeight: 800, marginRight: 3, textTransform: "uppercase" as const, letterSpacing: 0.4,
});
const th: any = { padding: "10px 12px", fontSize: 11, fontWeight: 700, color: MUTE, letterSpacing: 0.3, textTransform: "uppercase" as const };
const td: any = { padding: "10px 12px", fontSize: 13, color: INK };
const code: any = {
  fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11,
  background: "#F1F5F9", color: "#1E293B", padding: "1px 6px", borderRadius: 4,
};
const modalBg: any = {
  position: "fixed", inset: 0, background: "#0f172a99", zIndex: 200,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};
const modalCard: any = {
  background: "#fff", borderRadius: 16, padding: 22,
  maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "auto",
};
