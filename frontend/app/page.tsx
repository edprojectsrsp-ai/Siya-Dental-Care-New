"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import * as api from "@/lib/api";
import { MedicineModal, ProcedureModal, PaymentModal } from "@/components/Modals";
import PatientsDatabase from "@/components/PatientsDatabase";
import { AppointmentHub } from "@/components/AppointmentHub";
import { DoctorQueue } from "@/components/DoctorQueue";
import { TreatmentWorkspace } from "@/components/TreatmentWorkspace";
import { StaffManagement } from "@/components/StaffManagement";
import { WebsiteManager } from "@/components/WebsiteManager";
import { SpecialistManager } from "@/components/SpecialistManager";
import SettingsHub from "@/components/SettingsHub";
import PhoneConsultQueue from "@/components/PhoneConsultQueue";
import MessageLog from "@/components/MessageLog";
import BulkWhatsApp from "@/components/BulkWhatsApp";
import LabManagement from "@/components/LabManagement";

import TreatmentKanban from "@/components/TreatmentKanban";
import RescheduleRequestsPanel from "@/components/RescheduleRequestsPanel";
import DashboardHome from "@/components/DashboardHome";
import SpecialistModule from "@/components/SpecialistModule";
import WorkshopTrackers from "@/components/WorkshopTrackers";
import RevenueDashboard from "@/components/RevenueDashboard";
import CaseManager from "@/components/CaseManager";
import { CLINIC_THEMES, APPOINTMENT_STATUS, APPOINTMENT_SOURCE, SIYA } from "@/lib/theme";
import { Button, ErrorBanner, FieldLabel, Spinner } from "@/lib/ui";

// ═══════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════
const Pill=({bg,text,label}:{bg:string,text:string,label:string})=><span style={{background:bg,color:text,borderRadius:999,padding:"3px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;
const ST = APPOINTMENT_STATUS;
const SRC = APPOINTMENT_SOURCE;
function ModeToggle({activeMode,onChange,compact=false}:{activeMode:"auto"|"phone"|"web",onChange:(mode:"auto"|"phone"|"web")=>void,compact?:boolean}){
  const buttons: Array<["auto"|"phone"|"web", string]> = [["auto","Auto"],["phone",compact?"App":"📱 App"],["web",compact?"Website":"💻 Website"]];
  return (
    <div style={{display:"flex",background:compact?"#ffffff22":"#1E293B",borderRadius:999,padding:3,gap:3,backdropFilter:compact?"blur(8px)":"none"}}>
      {buttons.map(([id,label])=>(
        <button key={id} onClick={()=>onChange(id)} style={{border:"none",borderRadius:999,padding:compact?"6px 10px":"8px 14px",background:activeMode===id?"#fff":"transparent",color:activeMode===id?"#0F172A":compact?"#fff":"#94A3B8",fontWeight:activeMode===id?800:600,fontSize:compact?10:12,cursor:"pointer"}}>{label}</button>
      ))}
    </div>
  );
}
function Btn({children,color="#0F172A",variant="solid",onClick,full,small,disabled,loading}:{children:any,color?:string,variant?:string,onClick?:()=>void,full?:boolean,small?:boolean,disabled?:boolean,loading?:boolean}){
  const s=variant==="solid";
  return <button disabled={disabled||loading} onClick={onClick} style={{background:s?(disabled?"#94A3B8":color):"transparent",color:s?"#fff":color,border:s?"none":`2px solid ${color}`,borderRadius:14,padding:small?"8px 12px":"13px 16px",fontWeight:700,fontSize:small?12:14,cursor:disabled?"not-allowed":"pointer",flex:full?1:undefined,minHeight:small?36:48,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:s?`0 4px 12px ${color}33`:"none",opacity:disabled?.5:1}}>{loading?"⏳ Loading...":children}</button>;
}

// ─── 4-box PIN input ─────────────────────────────────
function PinBoxes({value,onChange,onEnter}:{value:string,onChange:(v:string)=>void,onEnter?:()=>void}){
  const r0=useRef<HTMLInputElement>(null);
  const r1=useRef<HTMLInputElement>(null);
  const r2=useRef<HTMLInputElement>(null);
  const r3=useRef<HTMLInputElement>(null);
  const refs=[r0,r1,r2,r3];
  const change=(i:number,v:string)=>{
    const d=v.replace(/\D/g,"").slice(-1);
    const arr=value.padEnd(4," ").split("");arr[i]=d;
    onChange(arr.join("").trimEnd());
    if(d&&i<3)refs[i+1].current?.focus();
  };
  const keyDown=(i:number,e:React.KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==="Backspace"&&!value[i]&&i>0){
      const arr=value.padEnd(4," ").split("");arr[i-1]=" ";
      onChange(arr.join("").trimEnd());refs[i-1].current?.focus();
    }
    if(e.key==="Enter")onEnter?.();
  };
  const paste=(e:React.ClipboardEvent)=>{
    e.preventDefault();
    const d=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,4);
    onChange(d);refs[Math.min(d.length,3)].current?.focus();
  };
  const boxStyle=(i:number):React.CSSProperties=>({
    width:64,height:64,textAlign:"center",
    border:`2px solid ${value[i]?"#6366F1":"#E2E8F0"}`,
    borderRadius:16,fontSize:20,fontWeight:900,outline:"none",
    boxSizing:"border-box",background:value[i]?"#EEF2FF":"#F8FAFC",
    color:"#4F46E5",cursor:"text",fontFamily:"monospace",
  });
  return(
    <div style={{display:"flex",gap:12,justifyContent:"center"}}>
      {[r0,r1,r2,r3].map((ref,i)=>(
        <input key={i} ref={ref} type="password" inputMode="numeric" maxLength={1}
          value={value[i]||""} onChange={e=>change(i,e.target.value)}
          onKeyDown={e=>keyDown(i,e)} onPaste={paste} autoFocus={i===0}
          style={boxStyle(i)}/>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function Home(){
  const [authed,setAuthed]=useState(false);
  const [staff,setStaff]=useState<any>(null);
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    const validate=async()=>{
      const t=api.getToken();const s=api.getStaffInfo();
      if(t&&s){
        try{
          await api.authMe();
          setAuthed(true);
          setStaff(s);
        }catch{
          api.clearToken();
        }
      }
      setChecking(false);
    };
    validate();
  },[]);

  useEffect(() => {
    const handleSessionExpired = () => {
      api.clearToken();
      setAuthed(false);
      setStaff(null);
    };
    window.addEventListener("dentassist:session-expired", handleSessionExpired);
    return () => window.removeEventListener("dentassist:session-expired", handleSessionExpired);
  }, []);

  if(checking) return <Spinner label="Loading Siya Dental Care…" />;
  if(!authed) return <LoginScreen onLogin={(d:any)=>{
    setStaff({staff_id:d.staff_id,name:d.name,role:d.role,clinic_id:d.clinic_id,clinic_name:d.clinic_name});setAuthed(true);
  }}/>;
  return <MainApp staff={staff} onLogout={()=>{api.logout();setAuthed(false);setStaff(null);}}/>;
}

// ═══════════════════════════════════════════════════════
// LOGIN  (desktop split-screen — staff dropdown + PIN)
// ═══════════════════════════════════════════════════════
function LoginScreen({onLogin}:{onLogin:(d:any)=>void}){
  const [staffList,setStaffList]=useState<any[]>([]);
  const [selStaff,setSelStaff]=useState<any>(null);
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    api.getStaffForLogin()
      .then(d=>setStaffList(d))
      .catch(()=>setErr("Cannot connect to backend — is Docker running?"));
  },[]);

  const handleLogin=async()=>{
    if(!selStaff||pin.length!==4){setErr("Select your name and enter your 4-digit PIN");return;}
    setLoading(true);setErr("");
    try{const d=await api.login(selStaff.phone,pin,selStaff.clinic_id);onLogin(d);}
    catch(e:any){setErr(e.message||"Login failed");}
    finally{setLoading(false);}
  };

  const multiClinic=new Set(staffList.map(s=>s.clinic_id)).size>1;

  return(
    <div className="siya-login-shell">
      <div className="siya-login-brand">
        <div style={{position:"relative",zIndex:1,marginBottom:48}}>
          <div style={{fontSize:68,lineHeight:1}}>🦷</div>
          <div style={{fontSize:46,fontWeight:900,color:"#fff",marginTop:14,lineHeight:1.1}}>Siya Dental</div>
          <div style={{fontSize:17,color:"#94A3B8",marginTop:10,lineHeight:1.5}}>Complete Dental Clinic<br/>Management System</div>
        </div>
        <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",gap:22}}>
          {[
            ["📋","Smart Queue","Track every patient from walk-in to discharge"],
            ["🦷","Treatment Plans","Multi-sitting plans with auto-medicine suggestions"],
            ["💊","Digital Rx","Generate & send prescriptions instantly"],
            ["💳","Billing","Revenue tracking with outstanding balance view"],
          ].map(([icon,title,desc],i)=>(
            <div key={i} style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <span style={{fontSize:22,marginTop:2}}>{icon}</span>
              <div>
                <div style={{color:"#E2E8F0",fontWeight:700,fontSize:15}}>{title}</div>
                <div style={{color:"#64748B",fontSize:13,marginTop:2}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{position:"relative",zIndex:1,marginTop:56,fontSize:12,color:"#475569"}}>Siya Dental Care · Dr. Madhu Edward · Rourkela</div>
      </div>

      <div className="siya-login-panel">
        <div style={{marginBottom:36}}>
          <div style={{fontSize:30,fontWeight:900,color:SIYA.ink}}>Welcome back</div>
          <div style={{fontSize:15,color:SIYA.inkMuted,marginTop:8}}>Select your profile and enter PIN</div>
        </div>

        <div style={{marginBottom:28}}>
          <FieldLabel>Doctor / Staff</FieldLabel>
          <div style={{position:"relative"}}>
            <select
              className="siya-select"
              value={selStaff?.id||""}
              onChange={e=>{const s=staffList.find(x=>x.id===e.target.value)||null;setSelStaff(s);setPin("");}}
              style={{color:selStaff?SIYA.ink:SIYA.slate}}
            >
              <option value="">Choose your name…</option>
              {staffList.map(s=>(
                <option key={s.id} value={s.id}>
                  {s.role==="doctor"?"Dr. ":""}{s.name}
                  {multiClinic?` — ${s.clinic_name}`:""}
                </option>
              ))}
            </select>
            <div style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:SIYA.slate,fontSize:20}}>▾</div>
          </div>
          {staffList.length===0&&!err&&<div style={{fontSize:12,color:SIYA.slate,marginTop:6}}>Loading staff…</div>}
        </div>

        {selStaff&&(
          <div style={{marginBottom:32}}>
            <FieldLabel>Enter 4-digit PIN</FieldLabel>
            <PinBoxes value={pin} onChange={setPin} onEnter={handleLogin}/>
          </div>
        )}

        {err&&<div style={{marginBottom:16}}><ErrorBanner message={err}/></div>}

        <Button
          onClick={handleLogin}
          disabled={!selStaff||pin.length!==4}
          loading={loading}
          full
          color={SIYA.accent}
        >
          {loading?"Signing in…":"Sign In →"}
        </Button>

        <div style={{textAlign:"center",marginTop:20,fontSize:12,color:SIYA.slate}}>
          Contact admin if you forgot your PIN
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP — PHONE + WEB TOGGLE
// ═══════════════════════════════════════════════════════
function MainApp({staff:initialStaff,onLogout}:{staff:any,onLogout:()=>void}){
  const [staff,setStaff]=useState<any>(initialStaff);
  const [allClinics,setAllClinics]=useState<any[]>([]);
  const [manualMode,setManualMode]=useState<"phone"|"web"|"auto">("auto");
  const [autoMode,setAutoMode]=useState<"phone"|"web">("web");
  const [toast,setToast]=useState<string|null>(null);
  const show=(m:string)=>{setToast(m);setTimeout(()=>setToast(null),2500);};

  // Clinic colour theme — derived from position in clinic list
  const clinicIdx=allClinics.findIndex(c=>c.id===staff?.clinic_id);
  const theme=CLINIC_THEMES[Math.max(0,clinicIdx)%CLINIC_THEMES.length];

  const switchClinic=(clinic:any)=>{
    const updated={...staff,clinic_id:clinic.id,clinic_name:clinic.name};
    setStaff(updated);
    api.setStaffInfo(updated);
    show(`Switched to ${clinic.name}`);
  };

  useEffect(()=>{
    api.getClinics().then(d=>setAllClinics(d)).catch(()=>{});
  },[]);

  useEffect(()=>{
    const syncMode=()=>setAutoMode(window.innerWidth<768?"phone":"web");
    syncMode();window.addEventListener("resize",syncMode);
    return()=>window.removeEventListener("resize",syncMode);
  },[]);

  const mode=manualMode==="auto"?autoMode:manualMode;
  const setMode=(next:"phone"|"web"|"auto")=>setManualMode(next);

  // ─── Shared data loading ───
  const [queue,setQueue]=useState<any[]>([]);
  const [pending,setPending]=useState<any[]>([]);
  const [stats,setStats]=useState<any>(null);
  const [medicines,setMedicines]=useState<any[]>([]);
  const [procedures,setProcedures]=useState<any[]>([]);
  const [balances,setBalances]=useState<any[]>([]);
  const [moduleVisibility,setModuleVisibility]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [hasLoaded,setHasLoaded]=useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);

  const loadAll=useCallback(async()=>{
    if(!staff?.clinic_id)return;
    if(!hasLoaded) setLoading(true);
    try{
      const [q,p,s,m,pr,b,mv]=await Promise.all([
        api.getTodayQueue(staff.clinic_id).catch(()=>[]),
        api.getPendingAppointments(staff.clinic_id).catch(()=>[]),
        api.getSidebarStats(staff.clinic_id).catch(()=>null),
        api.getMedicines().catch(()=>[]),
        api.getProcedures().catch(()=>[]),
        api.getOutstandingBalances(staff.clinic_id).catch(()=>[]),
        api.getModuleVisibility(staff.clinic_id).catch(()=>null),
      ]);
      setQueue(q);setPending(p);setStats(s);setMedicines(m);setProcedures(pr);setBalances(b);setModuleVisibility(mv?.matrix||null);
    }catch{}
    setHasLoaded(true);
    setLoading(false);
  },[staff?.clinic_id,hasLoaded]);

  useEffect(()=>{
    setHasLoaded(false);
    setLoading(true);
  },[staff?.clinic_id]);

  useEffect(()=>{loadAll();},[loadAll]);
  useEffect(()=>{const i=setInterval(loadAll,30000);return()=>clearInterval(i);},[loadAll]);

  const updateStatus=async(id:string,status:string)=>{
    try{await api.updateAppointmentStatus(id,status);show(`Status → ${status}`);loadAll();}catch(e:any){show(`Error: ${e.message}`);}
  };
  const confirmApt=async(id:string,apt:any)=>{
    try{await api.confirmAppointment(id,{confirmed_date:apt.requested_date,confirmed_time:apt.requested_time});show("Confirmed!");loadAll();}catch(e:any){show(`Error: ${e.message}`);}
  };
  const rejectApt=async(id:string)=>{
    try{await api.rejectAppointment(id);show("Rejected");loadAll();}catch(e:any){show(`Error: ${e.message}`);}
  };

  return(
    <div style={{fontFamily:"'Outfit',system-ui,sans-serif",background:"#F1F5F9",minHeight:"100vh",color:"#0F172A"}}>
      {mode==="web"&&(
        <div style={{background:"#0F172A",color:"#fff",padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,boxShadow:"0 4px 20px #0005"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>🦷</span>
            <div>
              <div style={{fontWeight:900,fontSize:16}}>Siya Dental</div>
              <div style={{fontSize:10,opacity:.5}}>{staff?.name} ({staff?.role})</div>
            </div>
          </div>
          {/* Clinic switcher pills — only if >1 clinic */}
          {allClinics.length>1&&(
            <div style={{display:"flex",gap:6}}>
              {allClinics.map((c,i)=>{
                const t=CLINIC_THEMES[i%CLINIC_THEMES.length];
                const active=c.id===staff?.clinic_id;
                return(
                  <button key={c.id} onClick={()=>switchClinic(c)}
                    style={{border:`2px solid ${active?t.accent:"#334155"}`,borderRadius:10,padding:"5px 14px",
                      background:active?t.accent:"transparent",color:active?"#fff":"#94A3B8",
                      cursor:"pointer",fontSize:13,fontWeight:active?800:500,transition:"all 0.2s"}}>
                    {c.short_name}
                  </button>
                );
              })}
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <ModeToggle activeMode={manualMode} onChange={setMode}/>
            <button onClick={onLogout} style={{border:"1px solid #334155",borderRadius:10,padding:"6px 14px",background:"transparent",color:"#94A3B8",cursor:"pointer",fontSize:12,fontWeight:600}}>Logout</button>
          </div>
        </div>
      )}

      {mode==="phone"&&(
        <div style={{background:"#0F172A",color:"#fff",padding:"8px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>🦷</span>
            <div><div style={{fontWeight:900,fontSize:14}}>Siya Dental</div><div style={{fontSize:9,opacity:.5}}>{staff?.name}</div></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <ModeToggle activeMode={manualMode} onChange={setMode} compact/>
            <button onClick={onLogout} style={{border:"1px solid #334155",borderRadius:8,padding:"4px 10px",background:"transparent",color:"#94A3B8",cursor:"pointer",fontSize:11,fontWeight:600}}>Logout</button>
          </div>
        </div>
      )}

      <WebView queue={queue} pending={pending} stats={stats} medicines={medicines} procedures={procedures} balances={balances} updateStatus={updateStatus} confirmApt={confirmApt} rejectApt={rejectApt} show={show} staff={staff} loading={loading} loadAll={loadAll} theme={theme} allClinics={allClinics} switchClinic={switchClinic} isMobile={mode==="phone"}/>

      {toast&&<div style={{position:"fixed",bottom:mode==="phone"?80:24,left:"50%",transform:"translateX(-50%)",background:"#0F172A",color:"#fff",padding:"12px 24px",borderRadius:16,fontWeight:600,fontSize:14,zIndex:200,boxShadow:"0 8px 32px #0005"}}>{toast}</div>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// WEBSITE VIEW
// ═══════════════════════════════════════════════════════
function WebView({queue,pending,stats,medicines,procedures,balances,show,staff,loading,loadAll,theme,allClinics,switchClinic,isMobile=false}:any){
  const [sec,setSec]=useState("dashboard");
  const [medCat,setMedCat]=useState("All");
  const [procCat,setProcCat]=useState("All");
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [modal,setModal]=useState<string|null>(null);
  const [modalData,setModalData]=useState<any>(null);
  const [selPatient,setSelPatient]=useState<any>(null);
  const [selectedAptId,setSelectedAptId]=useState<string|null>(null);
  const [activeSessionId,setActiveSessionId]=useState<string|null>(null);
  const [dailyRev,setDailyRev]=useState<any>(null);
  const [moduleVisibility,setModuleVisibility]=useState<any>(null);
  const [financeTab,setFinanceTab]=useState<"collections"|"workshop"|"revenue">("collections");
  const [workshopSubTab,setWorkshopSubTab]=useState<"spec_work"|"lab_orders"|"lab_pay"|"spec_pay"|undefined>(undefined);

  const loadDailyRev=async()=>{try{const r=await api.getDailyRevenue(undefined,staff?.clinic_id);setDailyRev(r);}catch(e:any){show("Error loading revenue: "+e.message);}};

  const selectPatient=async(pid:string, aptId?:string)=>{
    try{
      const p=await api.getPatient(pid);
      setSelPatient(p);setSelectedAptId(aptId||null);
    }catch(e:any){show("Error loading patient: "+e.message);}
  };

  useEffect(()=>{
    loadDailyRev();
    if (staff?.clinic_id) {
      api.getModuleVisibility(staff.clinic_id).then(r => setModuleVisibility(r?.matrix || null)).catch(() => setModuleVisibility(null));
    }
    // Specialist lands on "My Practice" instead of dashboard
    if (staff?.role === "specialist" && sec === "dashboard") {
      setSec("mypractice");
    }
  },[staff?.clinic_id]);

  useEffect(() => {
    if (sec === "workshop") { setFinanceTab("workshop"); setSec("billing"); }
  }, [sec]);

  const drillToWorkshop = (target: "lab_pay" | "spec_pay") => {
    setWorkshopSubTab(target);
    setFinanceTab("workshop");
    setSec("billing");
  };

  const medCats=["All",...Array.from(new Set(medicines.map((m:any)=>m.category)))];
  const procCats=["All",...Array.from(new Set(procedures.map((p:any)=>p.category)))];

  const sanitize = (s?: string | null) => (s || '').replace(/^\s*\?\?+\s*/, '').trim() || (s || '');

  const NAV=[
    {id:"dashboard",icon:"🏠",label:sanitize("Insights")},
    {id:"appointments",icon:"📅",label:sanitize("Appointments")},
    {id:"patients",icon:"👥",label:sanitize("Patients")},
    {id:"queue",icon:"🩺",label:sanitize("Queue")},
    {id:"kanban",icon:"🗂",label:sanitize("Kanban")},
    {id:"billing",icon:"💰",label:sanitize("Manage Finances")},
    {id:"medicines",icon:"💊",label:sanitize("Medicines")},
    {id:"procedures",icon:"🦷",label:sanitize("Procedures")},
    {id:"lab",icon:"🧪",label:sanitize("Lab")},

    {id:"specialists",icon:"👨‍⚕️",label:sanitize("Specialists")},
    {id:"staff",icon:"🧑‍💼",label:sanitize("User Control")},
    {id:"casemanager",icon:"🛟",label:sanitize("Case Manager")},
    {id:"website",icon:"🌐",label:sanitize("Website")},
    {id:"consult",icon:"📞",label:sanitize("Phone Consult")},
    {id:"messages",icon:"💬",label:sanitize("Messages")},
    {id:"bulkwa",icon:"📲",label:sanitize("Bulk WhatsApp")},
    {id:"settings",icon:"⚙️",label:sanitize("Settings")},
  ];

  NAV.splice(11, 0, {id:"mypractice",icon:"🩺",label:sanitize("My Practice")});
  const sidebarBg=theme?.sidebar||"#0F172A";
  const accentColor=theme?.accent||"#6366F1";
  // Modules that default to restricted roles when the visibility matrix hasn't set them.
  // (The matrix in Settings still overrides — admin can grant other roles explicitly.)
  const DOCTOR_DEFAULT_ONLY = new Set(["website"]);
  const ADMIN_DEFAULT_ONLY = new Set(["casemanager"]);
  const visibleNav = NAV.filter(n => {
    const vis = moduleVisibility?.[staff?.role]?.[n.id];
    if (vis === undefined && DOCTOR_DEFAULT_ONLY.has(n.id)) return staff?.role === "doctor";
    if (vis === undefined && ADMIN_DEFAULT_ONLY.has(n.id)) return ["doctor", "admin"].includes(staff?.role);
    return vis !== false;
  });
  // Specialist uses same interface — filtered queue + restricted workspace + "My Practice" sidebar module
  // (No separate portal redirect needed)

  const MOBILE_TABS: Record<string, {id:string,icon:string,label:string}[]> = {
    nurse: [{id:"appointments",icon:"📅",label:"Appts"},{id:"queue",icon:"📋",label:"Queue"},{id:"lab",icon:"🧪",label:"Lab"},{id:"patients",icon:"👥",label:"Patients"}],
    receptionist: [{id:"appointments",icon:"📅",label:"Appts"},{id:"queue",icon:"📋",label:"Queue"},{id:"lab",icon:"🧪",label:"Lab"},{id:"patients",icon:"👥",label:"Patients"}],
    doctor: [{id:"queue",icon:"📋",label:"Queue"},{id:"patients",icon:"👥",label:"Patients"},{id:"lab",icon:"🧪",label:"Lab"},{id:"dashboard",icon:"📈",label:"Insights"}],
    specialist: [{id:"queue",icon:"📋",label:"Queue"},{id:"mypractice",icon:"🩺",label:"Practice"},{id:"patients",icon:"👥",label:"Patients"},{id:"lab",icon:"🧪",label:"Lab"}],
    admin: [{id:"dashboard",icon:"🏠",label:"Insights"},{id:"appointments",icon:"📅",label:"Appts"},{id:"patients",icon:"👥",label:"Patients"},{id:"queue",icon:"📋",label:"Queue"}],
  };
  const mobileTabs = MOBILE_TABS[staff?.role] || MOBILE_TABS.doctor;
  const moreItems = visibleNav.filter(n => !mobileTabs.some(t => t.id === n.id));
  const [mobileMore, setMobileMore] = useState(false);

  return(
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":sidebarCollapsed?"60px 1fr":"240px 1fr",minHeight:"calc(100vh - 52px)",transition:"grid-template-columns 0.3s ease"}}>
      {/* Sidebar — collapsible */}
      {!isMobile&&(
      <div style={{background:sidebarBg,color:"#fff",padding:sidebarCollapsed?"12px 6px":22,transition:"all 0.3s ease",position:"relative",display:"flex",flexDirection:"column"}}>
        {/* Collapse button */}
        <button onClick={()=>setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed?"Expand":"Collapse"} style={{alignSelf:"flex-end",background:"transparent",border:"none",color:"#fff",fontSize:18,cursor:"pointer",padding:"4px 8px",marginBottom:sidebarCollapsed?4:12,opacity:0.7,transition:"opacity 0.2s",borderRadius:6}} onMouseEnter={e=>{(e.target as HTMLElement).style.opacity="1"}} onMouseLeave={e=>{(e.target as HTMLElement).style.opacity="0.7"}}>{sidebarCollapsed?"▶":"◀"}</button>

        {/* Logo + clinic name (hidden when collapsed) */}
        {!sidebarCollapsed&&(
          <>
            <div style={{fontWeight:900,fontSize:22,marginBottom:4}}>🦷 Siya Dental</div>
            <div style={{fontSize:13,color:"#ffffff66",marginBottom:4}}>{sanitize(staff?.clinic_name)}</div>
            {allClinics.length>1&&(
              <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
                {allClinics.map((c:any,i:number)=>{
                  const t=CLINIC_THEMES[i%CLINIC_THEMES.length];
                  const active=c.id===staff?.clinic_id;
                  return(
                    <button key={c.id} onClick={()=>switchClinic(c)}
                      style={{border:`1px solid ${active?t.accent+"88":"#ffffff22"}`,borderRadius:8,padding:"3px 10px",background:active?t.accent+"33":"transparent",color:active?"#fff":"#ffffff88",cursor:"pointer",fontSize:11,fontWeight:active?700:400}}>
                      {active?"✓ ":""}{c.short_name}
                    </button>
                  );
                })}
              </div>
            )}
            {!allClinics.length&&<div style={{marginBottom:16}}/>}
          </>
        )}

        {/* Nav items */}
        <div style={{flex:1}}>
          {visibleNav.map(n=><button key={n.id} onClick={()=>setSec(n.id)} title={sidebarCollapsed?n.label:undefined} style={{width:"100%",border:"none",textAlign:sidebarCollapsed?"center":"left",padding:sidebarCollapsed?"10px":"11px 14px",borderRadius:12,cursor:"pointer",marginBottom:2,background:sec===n.id?accentColor+"33":"transparent",color:sec===n.id?"#fff":"#94A3B8",fontWeight:sec===n.id?700:500,fontSize:sidebarCollapsed?18:15,display:"flex",alignItems:"center",justifyContent:sidebarCollapsed?"center":"flex-start",gap:8,borderLeft:sec===n.id?`3px solid ${accentColor}`:"3px solid transparent",overflow:"hidden",whiteSpace:"nowrap"}}><span>{n.icon}</span>{!sidebarCollapsed&&<span>{n.label}</span>}</button>)}
        </div>

        {/* View Live Site — opens the patient-facing website in a new tab (visible to all roles) */}
        <a href="/public" target="_blank" rel="noreferrer" title="View live site — what patients see"
          style={{display:"flex",alignItems:"center",justifyContent:sidebarCollapsed?"center":"flex-start",gap:8,marginTop:10,padding:sidebarCollapsed?"10px":"11px 14px",borderRadius:12,textDecoration:"none",background:"#ffffff10",border:"1px solid #ffffff22",color:"#E2E8F0",fontWeight:700,fontSize:sidebarCollapsed?18:14,whiteSpace:"nowrap",overflow:"hidden"}}>
          <span>🌐</span>{!sidebarCollapsed&&<span>View Live Site ↗</span>}
        </a>

        {/* Revenue box (hidden when collapsed) */}
        {!sidebarCollapsed&&(
          <div style={{marginTop:20,padding:14,background:"#ffffff15",borderRadius:14}}>
            <div style={{fontSize:13,color:"#ffffff66"}}>Today's Revenue</div>
            <div style={{fontSize:26,fontWeight:900,color:accentColor}}>₹{(stats?.revenue_today||0).toLocaleString()}</div>
          </div>
        )}
      </div>
      )}

      {/* Main */}
      <div style={{padding:isMobile?"12px 10px 80px":24,overflow:"auto"}}>
        {loading&&<div style={{textAlign:"center",padding:60,color:"#64748b"}}>Loading data from API...</div>}

        {/* DASHBOARD — real KPIs (separate from Appointment Hub) */}
        {!loading&&sec==="dashboard"&&<DashboardHome staff={staff} show={show} accent={accentColor} onDrillDown={drillToWorkshop} />}

        {/* APPOINTMENT HUB — Nurse Command Center */}
        {!loading&&sec==="appointments"&&<div>
          <RescheduleRequestsPanel clinicId={staff?.clinic_id} />
          <AppointmentHub view="hub" clinicId={staff?.clinic_id} staff={staff} accent={accentColor} show={show} onNavigate={setSec} />
        </div>}

        {/* PATIENT DATABASE - searchable directory with full per-patient drill-in */}
        {!loading&&sec==="patients"&&<PatientsDatabase
          staff={staff}
          show={show}
          accent={accentColor}
          onOpenWorkspace={(p:any) => {
            selectPatient(p.id);
            setSec("treatment");
          }}
          onBookAppointment={(p:any) => {
            try { sessionStorage.setItem("pdb_book_patient", JSON.stringify({id: p.id, name: p.name, phone: p.phone})); } catch {}
            setSec("appointments");
          }} />}

        {/* DOCTOR QUEUE — Expected / Waiting / Pay Pending / Collected */}
        {!loading&&sec==="queue"&&<div>
          <h1 style={{margin:"0 0 16px",fontSize:30}}>👨‍⚕️ Doctor Queue</h1>
          <DoctorQueue clinicId={staff?.clinic_id} staff={staff} accent={accentColor} show={show}
            onStartTreatment={(p:any,sessionId:string)=>{selectPatient(p.patient_id,p.apt_id);setActiveSessionId(sessionId||null);setSec("treatment");}} />
        </div>}

        {!loading&&sec==="kanban"&&<TreatmentKanban
          staff={staff}
          show={show}
          accent={accentColor}
          onOpenPlan={(plan:any)=>{
            if(plan?.patient_id){
              selectPatient(plan.patient_id);
              setSec("treatment");
            }
          }}
        />}

        {/* TREATMENT WORKSPACE (3-panel) — opened from Queue, not a sidebar item */}
        {!loading&&sec==="treatment"&&selPatient&&<TreatmentWorkspace
          patientId={selPatient.id} aptId={selectedAptId} sessionId={activeSessionId}
          clinicId={staff?.clinic_id} clinicName={staff?.clinic_name||"Siya Dental Care"}
          staff={staff} accent={accentColor} show={show}
          onExit={()=>{setActiveSessionId(null);setSec("queue");}} />}
        {!loading&&sec==="treatment"&&!selPatient&&<div style={{padding:60,textAlign:"center",color:"#64748B",fontWeight:700}}>
          Open a patient from the Queue to start treatment.
          <div style={{marginTop:14}}><button onClick={()=>setSec("queue")} style={{border:"2px solid #E2E8F0",borderRadius:10,padding:"10px 18px",background:"#fff",cursor:"pointer",fontWeight:800,fontFamily:"inherit"}}>← Go to Queue</button></div>
        </div>}

        {/* MEDICINES DATABASE */}
        {!loading&&sec==="medicines"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h1 style={{margin:0,fontSize:34}}>💊 Medicine Database ({medicines.length})</h1><Btn color="#0F172A" onClick={()=>{setModalData(null);setModal('addMed');}}>+ Add Medicine</Btn></div>
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>{medCats.map((c:string)=><button key={c} onClick={()=>setMedCat(c)} style={{border:medCat===c?"2px solid #6366F1":"1px solid #E2E8F0",borderRadius:10,padding:"7px 14px",fontSize:14,fontWeight:700,background:medCat===c?"#EEF2FF":"#fff",color:medCat===c?"#6366F1":"#64748b",cursor:"pointer"}}>{c}</button>)}</div>
          <div style={{background:"#fff",borderRadius:20,padding:4,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F8FAFC"}}>{["Medicine","Category","Strength","Dose","Frequency","Duration","Instructions",""].map(h=><th key={h} style={{padding:12,textAlign:"left",fontSize:14,color:"#64748b",borderBottom:"1px solid #E2E8F0",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{medicines.filter((m:any)=>medCat==="All"||m.category===medCat).map((m:any)=><tr key={m.id}><td style={{padding:12,fontWeight:700,fontSize:15,borderBottom:"1px solid #F1F5F9"}}>{m.name}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}><Pill bg="#EEF2FF" text="#4F46E5" label={m.category}/></td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}>{m.default_strength}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}>{m.default_dose}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}>{m.default_frequency}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}>{m.default_duration}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9",maxWidth:260,color:"#64748b"}}>{m.instructions}</td><td style={{padding:12,borderBottom:"1px solid #F1F5F9"}}><button onClick={()=>{setModalData(m);setModal('addMed');}} style={{border:"none",background:"#EEF2FF",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontWeight:700,fontSize:13,color:"#4F46E5"}}>Edit</button></td></tr>)}</tbody></table>
          </div>
        </div>}

        {/* PROCEDURES CATALOG */}
        {!loading&&sec==="procedures"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h1 style={{margin:0,fontSize:34}}>🔧 Procedure Catalog ({procedures.length})</h1><Btn color="#0F172A" onClick={()=>{setModalData(null);setModal('addProc');}}>+ Add Procedure</Btn></div>
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>{procCats.map((c:string)=><button key={c} onClick={()=>setProcCat(c)} style={{border:procCat===c?"2px solid #6366F1":"1px solid #E2E8F0",borderRadius:10,padding:"7px 14px",fontSize:14,fontWeight:700,background:procCat===c?"#EEF2FF":"#fff",color:procCat===c?"#6366F1":"#64748b",cursor:"pointer"}}>{c}</button>)}</div>
          <div style={{background:"#fff",borderRadius:20,padding:4,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F8FAFC"}}>{["Procedure","Category","Default Cost","Cost Range","Follow-up","Linked Medicines",""].map(h=><th key={h} style={{padding:12,textAlign:"left",fontSize:14,color:"#64748b",borderBottom:"1px solid #E2E8F0"}}>{h}</th>)}</tr></thead>
            <tbody>{procedures.filter((p:any)=>procCat==="All"||p.category===procCat).map((p:any)=><tr key={p.id}><td style={{padding:12,fontWeight:700,fontSize:15,borderBottom:"1px solid #F1F5F9"}}>{p.name}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}><Pill bg="#EEF2FF" text="#4F46E5" label={p.category}/></td><td style={{padding:12,fontSize:15,fontWeight:700,borderBottom:"1px solid #F1F5F9"}}>₹{(p.default_cost||0).toLocaleString()}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9",color:"#64748b"}}>₹{(p.cost_min||0).toLocaleString()} – ₹{(p.cost_max||0).toLocaleString()}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}>{p.followup_days?`${p.followup_days} days`:"—"}</td><td style={{padding:12,fontSize:13,borderBottom:"1px solid #F1F5F9",color:"#64748b"}}>{p.linked_medicine_ids?.length||0} medicines</td><td style={{padding:12,borderBottom:"1px solid #F1F5F9"}}><button onClick={()=>{setModalData(p);setModal('addProc');}} style={{border:"none",background:"#EEF2FF",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontWeight:700,fontSize:13,color:"#4F46E5"}}>Edit</button></td></tr>)}</tbody></table>
          </div>
        </div>}

        {/* MANAGE FINANCES — patient collections + lab/specialist payables & workshop */}
        {!loading&&sec==="billing"&&<div>
          <h1 style={{margin:"0 0 16px",fontSize:34}}>💰 Manage Finances</h1>
          <div style={{display:"inline-flex",gap:6,marginBottom:20,background:"#fff",borderRadius:14,padding:5,boxShadow:"0 2px 12px rgba(15,23,42,.06)",flexWrap:"wrap"}}>
            {[["collections","💳 Patient Collections"],["revenue","📈 Revenue (30 Days)"],["workshop","🏗️ Payables & Workshop"]].map(([id,label])=>(
              <button key={id} onClick={()=>{setFinanceTab(id as "collections"|"workshop"|"revenue");if(id!=="workshop")setWorkshopSubTab(undefined);}} style={{border:"none",borderRadius:10,padding:"10px 18px",cursor:"pointer",fontWeight:800,fontSize:13.5,background:financeTab===id?accentColor:"transparent",color:financeTab===id?"#fff":"#64748B"}}>{label}</button>
            ))}
          </div>
          {financeTab==="collections"&&<>
          <AppointmentHub view="billing" clinicId={staff?.clinic_id} staff={staff} accent={accentColor} show={show} />
          <h3 style={{margin:"24px 0 14px",fontSize:22}}>📊 Outstanding & Today Summary</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
            <div style={{background:"#fff",borderRadius:20,padding:18}}><div style={{fontSize:15,color:"#64748b"}}>💰 Today</div><div style={{fontSize:34,fontWeight:900,color:"#10B981",marginTop:4}}>₹{(stats?.revenue_today||0).toLocaleString()}</div>{dailyRev?.by_mode&&<div style={{fontSize:13,color:"#64748b",marginTop:4}}>{Object.entries(dailyRev.by_mode).map(([k,v]:any)=>`${k}: ₹${v.toLocaleString()}`).join(" · ")}</div>}</div>
            <div style={{background:"#fff",borderRadius:20,padding:18}}><div style={{fontSize:15,color:"#64748b"}}>⏳ Outstanding</div><div style={{fontSize:34,fontWeight:900,color:"#EF4444",marginTop:4}}>₹{(stats?.outstanding_total||0).toLocaleString()}</div></div>
            <div style={{background:"#fff",borderRadius:20,padding:18}}><div style={{fontSize:15,color:"#64748b"}}>📊 Patients Due</div><div style={{fontSize:34,fontWeight:900,color:"#F59E0B",marginTop:4}}>{balances.length}</div></div>
          </div>
          {balances.length>0&&<div style={{background:"#fff",borderRadius:20,padding:20}}>
            <h3 style={{margin:"0 0 14px",fontSize:22}}>Outstanding Balances</h3>
            <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F8FAFC"}}>{["Patient","Phone","Plan","Charged","Paid","Balance",""].map(h=><th key={h} style={{padding:10,textAlign:"left",fontSize:12,color:"#64748b",borderBottom:"1px solid #E2E8F0"}}>{h}</th>)}</tr></thead>
            <tbody>{balances.map((b:any,i:number)=><tr key={i}><td style={{padding:12,fontWeight:700,fontSize:15,borderBottom:"1px solid #F1F5F9"}}>{b.patient_name}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}>{b.patient_phone}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}>{b.plan_name}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}>₹{(b.final_payable||0).toLocaleString()}</td><td style={{padding:12,fontSize:14,borderBottom:"1px solid #F1F5F9"}}>₹{(b.total_paid||0).toLocaleString()}</td><td style={{padding:12,fontWeight:700,fontSize:15,color:"#EF4444",borderBottom:"1px solid #F1F5F9"}}>₹{(b.balance||0).toLocaleString()}</td><td style={{padding:12,borderBottom:"1px solid #F1F5F9"}}><Btn color="#10B981" small onClick={()=>{setModalData({patientId:b.patient_id,balance:b.balance});setModal('payment');}}>Collect</Btn></td></tr>)}</tbody></table>
          </div>}
          </>}
          {financeTab==="revenue"&&<RevenueDashboard clinicId={staff?.clinic_id} accent={accentColor} onDrillDown={drillToWorkshop} />}
          {financeTab==="workshop"&&<WorkshopTrackers clinicId={staff?.clinic_id} staff={staff} accent={accentColor} show={show} embedded defaultTab={workshopSubTab} />}
        </div>}

        {/* STAFF (User Control) */}
        {!loading&&sec==="lab"&&<LabManagement staff={staff} accent={accentColor} show={show} onNavigate={setSec} />}

        {!loading&&sec==="specialists"&&<SpecialistManager accent={accentColor} show={show} currentStaffRole={staff?.role} />}

        {!loading&&sec==="mypractice"&&<SpecialistModule staff={staff} accent={accentColor} show={show} />}

        {/* STAFF (User Control) */}
        {!loading&&sec==="staff"&&<StaffManagement accent={accentColor} show={show} currentStaff={staff} clinics={allClinics} />}

        {/* CASE MANAGER (admin status rescue for stuck appointments) */}
        {!loading&&sec==="casemanager"&&<CaseManager staff={staff} accent={accentColor} show={show} />}

        {/* WEBSITE (Gallery merged in as a tab) */}
        {!loading&&sec==="website"&&<WebsiteManager accent={accentColor} show={show} clinics={allClinics} />}

        {!loading&&sec==="consult"&&<PhoneConsultQueue staff={staff} show={show} accent={accentColor} />}

        {!loading&&sec==="messages"&&<MessageLog staff={staff} show={show} accent={accentColor} />}

        {!loading&&sec==="bulkwa"&&<BulkWhatsApp staff={staff} show={show} accent={accentColor} />}

        {!loading&&sec==="settings"&&<SettingsHub staff={staff} show={show} accent={accentColor} />}

        {modal==="addMed"&&<MedicineModal med={modalData} onClose={()=>setModal(null)} onSaved={()=>{loadAll();show("Medicine saved!");}}/>}
        {modal==="addProc"&&<ProcedureModal proc={modalData} onClose={()=>setModal(null)} onSaved={()=>{loadAll();show("Procedure saved!");}}/>}
        {modal==="payment"&&modalData&&<PaymentModal patientId={modalData.patientId} planId={modalData.planId} clinicId={staff?.clinic_id} balance={modalData.balance} onClose={()=>setModal(null)} onSaved={()=>{loadAll();show("Payment recorded!");}}/>}
      </div>

      {isMobile&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1.5px solid #E2E8F0",display:"flex",justifyContent:"space-around",padding:"6px 4px env(safe-area-inset-bottom, 10px)",zIndex:100,boxShadow:"0 -4px 16px rgba(0,0,0,.08)"}}>
          {mobileTabs.map(t=><button key={t.id} onClick={()=>{setSec(t.id);setMobileMore(false);}} style={{border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",padding:"4px 8px",borderRadius:10,color:sec===t.id?accentColor:"#94A3B8"}}>
            <span style={{fontSize:20}}>{t.icon}</span><span style={{fontSize:10,fontWeight:sec===t.id?800:600}}>{t.label}</span>
            {sec===t.id&&<div style={{width:4,height:4,borderRadius:2,background:accentColor,marginTop:1}}/>}
          </button>)}
          <button onClick={()=>setMobileMore(!mobileMore)} style={{border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",padding:"4px 8px",borderRadius:10,color:mobileMore?"#0F172A":"#94A3B8"}}>
            <span style={{fontSize:20}}>☰</span><span style={{fontSize:10,fontWeight:600}}>More</span>
          </button>
        </div>
      )}
      {isMobile&&mobileMore&&<div onClick={()=>setMobileMore(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.3)",zIndex:98}}/>}
      {isMobile&&mobileMore&&(
        <div style={{position:"fixed",bottom:66,left:8,right:8,background:"#fff",borderRadius:16,boxShadow:"0 -8px 32px rgba(0,0,0,.15)",zIndex:99,padding:12,maxHeight:"60vh",overflow:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {moreItems.map(n=><button key={n.id} onClick={()=>{setSec(n.id);setMobileMore(false);}} style={{border:`1.5px solid ${sec===n.id?accentColor:"#E2E8F0"}`,background:sec===n.id?accentColor+"15":"#fff",borderRadius:12,padding:"12px 8px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <span style={{fontSize:22}}>{n.icon}</span><span style={{fontSize:11,fontWeight:700,color:sec===n.id?accentColor:"#475569"}}>{n.label}</span>
            </button>)}
          </div>
        </div>
      )}
    </div>
  );
}


