"use client";
import { useState } from "react";
import * as api from "@/lib/api";
import { ToothChart, toothLabel } from "./ToothChart";

const inputStyle:any = {width:"100%",border:"2px solid #E2E8F0",borderRadius:12,padding:"12px 14px",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:10,fontFamily:"inherit"};

// ─── GENERIC MODAL WRAPPER ──────────────────────────
export function Modal({title,onClose,children}:{title:string,onClose:()=>void,children:any}){
  return(
    <div style={{position:"fixed",inset:0,background:"#00000055",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:24,padding:28,width:520,maxWidth:"95vw",maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 60px #00000030"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:20}}>{title}</div>
          <button onClick={onClose} style={{border:"none",background:"#F1F5F9",borderRadius:10,width:36,height:36,fontSize:18,cursor:"pointer"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── ADD/EDIT MEDICINE ──────────────────────────────
export function MedicineModal({med,onClose,onSaved}:{med?:any,onClose:()=>void,onSaved:()=>void}){
  const [name,setName]=useState(med?.name||"");
  const [category,setCat]=useState(med?.category||"Antibiotic");
  const [strength,setStr]=useState(med?.default_strength||"");
  const [dose,setDose]=useState(med?.default_dose||"");
  const [freq,setFreq]=useState(med?.default_frequency||"");
  const [dur,setDur]=useState(med?.default_duration||"");
  const [instr,setInstr]=useState(med?.instructions||"");
  const [contra,setContra]=useState(med?.contraindications||"");
  const [saving,setSaving]=useState(false);
  const cats=["Antibiotic","Painkiller","Antacid","Mouthwash","Topical","Topical Steroid","Antifungal","Anti-allergy","Steroid","Oral Care","Home Remedy"];

  const save=async()=>{
    if(!name){alert("Name required");return;}
    setSaving(true);
    try{
      if(med?.id) await api.updateMedicine(med.id,{name,category,default_strength:strength,default_dose:dose,default_frequency:freq,default_duration:dur,instructions:instr});
      else await api.addMedicine({name,category,default_strength:strength,default_dose:dose,default_frequency:freq,default_duration:dur,instructions:instr,strengths:[strength],frequencies:[freq],contraindications:contra});
      onSaved();onClose();
    }catch(e:any){alert(e.message);}
    finally{setSaving(false);}
  };

  return(<Modal title={med?"Edit Medicine":"Add Medicine"} onClose={onClose}>
    <input style={inputStyle} placeholder="Medicine name *" value={name} onChange={e=>setName(e.target.value)}/>
    <select style={inputStyle} value={category} onChange={e=>setCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <input style={inputStyle} placeholder="Strength (e.g. 500mg)" value={strength} onChange={e=>setStr(e.target.value)}/>
      <input style={inputStyle} placeholder="Dose (e.g. 1 tablet)" value={dose} onChange={e=>setDose(e.target.value)}/>
      <input style={inputStyle} placeholder="Frequency" value={freq} onChange={e=>setFreq(e.target.value)}/>
      <input style={inputStyle} placeholder="Duration" value={dur} onChange={e=>setDur(e.target.value)}/>
    </div>
    <input style={inputStyle} placeholder="Instructions" value={instr} onChange={e=>setInstr(e.target.value)}/>
    <input style={inputStyle} placeholder="Contraindications (optional)" value={contra} onChange={e=>setContra(e.target.value)}/>
    <button disabled={saving} onClick={save} style={{width:"100%",padding:14,borderRadius:14,border:"none",background:"#6366F1",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",marginTop:8}}>{saving?"Saving...":med?"Update Medicine":"Add Medicine"}</button>
  </Modal>);
}

// ─── ADD/EDIT PROCEDURE ─────────────────────────────
export function ProcedureModal({proc,onClose,onSaved}:{proc?:any,onClose:()=>void,onSaved:()=>void}){
  const [name,setName]=useState(proc?.name||"");
  const [category,setCat]=useState(proc?.category||"Diagnostic");
  const [cost,setCost]=useState(proc?.default_cost?.toString()||"");
  const [costMin,setCostMin]=useState(proc?.cost_min?.toString()||"");
  const [costMax,setCostMax]=useState(proc?.cost_max?.toString()||"");
  const [followup,setFollowup]=useState(proc?.followup_days?.toString()||"");
  const [saving,setSaving]=useState(false);
  const cats=["Diagnostic","Preventive","Restorative","Endodontics","Prosthodontics","Surgery","Implantology","Orthodontics","Periodontics","Pediatric","Cosmetic"];

  const save=async()=>{
    if(!name){alert("Name required");return;}
    setSaving(true);
    try{
      const data={name,category,default_cost:parseFloat(cost)||0,cost_min:parseFloat(costMin)||0,cost_max:parseFloat(costMax)||0,followup_days:followup?parseInt(followup):null};
      if(proc?.id) await api.updateProcedure(proc.id,data);
      else await api.addProcedure({...data,common_advice:[],medicine_ids:[]});
      onSaved();onClose();
    }catch(e:any){alert(e.message);}
    finally{setSaving(false);}
  };

  return(<Modal title={proc?"Edit Procedure":"Add Procedure"} onClose={onClose}>
    <input style={inputStyle} placeholder="Procedure name *" value={name} onChange={e=>setName(e.target.value)}/>
    <select style={inputStyle} value={category} onChange={e=>setCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
      <input style={inputStyle} placeholder="Default Cost ₹" type="number" value={cost} onChange={e=>setCost(e.target.value)}/>
      <input style={inputStyle} placeholder="Min Cost ₹" type="number" value={costMin} onChange={e=>setCostMin(e.target.value)}/>
      <input style={inputStyle} placeholder="Max Cost ₹" type="number" value={costMax} onChange={e=>setCostMax(e.target.value)}/>
    </div>
    <input style={inputStyle} placeholder="Follow-up days (optional)" type="number" value={followup} onChange={e=>setFollowup(e.target.value)}/>
    <button disabled={saving} onClick={save} style={{width:"100%",padding:14,borderRadius:14,border:"none",background:"#6366F1",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",marginTop:8}}>{saving?"Saving...":proc?"Update":"Add Procedure"}</button>
  </Modal>);
}

// ─── PAYMENT COLLECTION (Bundle X — multi-mode restored) ─────
export function PaymentModal({patientId,planId,clinicId,balance,appointmentId,onClose,onSaved}:{patientId:string,planId?:string,clinicId:string,balance?:number,appointmentId?:string,onClose:()=>void,onSaved:()=>void}){
  const [splits,setSplits]=useState<{mode:string;amount:string;reference:string}[]>([
    {mode:"cash",amount:balance?.toString()||"",reference:""}
  ]);
  const [remarks,setRemarks]=useState("");
  const [saving,setSaving]=useState(false);
  const modes=["cash","upi","card","razorpay","bank_transfer","other"];

  const addSplit=()=>setSplits([...splits,{mode:"upi",amount:"",reference:""}]);
  const removeSplit=(i:number)=>setSplits(splits.filter((_,j)=>j!==i));
  const updateSplit=(i:number,field:string,val:string)=>{
    const next=[...splits]; (next[i] as any)[field]=val; setSplits(next);
  };

  const total=splits.reduce((s,sp)=>s+parseFloat(sp.amount||"0"),0);

  const save=async()=>{
    const validSplits=splits.filter(s=>parseFloat(s.amount||"0")>0);
    if(validSplits.length===0){alert("Enter at least one payment amount");return;}
    const upiMissingRef=validSplits.find(s=>s.mode==="upi"&&parseFloat(s.amount||"0")>0&&!s.reference?.trim());
    if(upiMissingRef){alert("UPI reference is required for UPI payments");return;}
    setSaving(true);
    try{
      if(validSplits.length===1){
        // Single mode: use original endpoint for back-compat
        await api.collectPayment({patient_id:patientId,plan_id:planId||null,clinic_id:clinicId,
          appointment_id:appointmentId||null,
          amount:parseFloat(validSplits[0].amount),payment_mode:validSplits[0].mode,
          remarks:[remarks,validSplits[0].reference?`[ref: ${validSplits[0].reference}]`:""].filter(Boolean).join(" ")});
      }else{
        // Multi-mode: use new endpoint
        await api.collectPaymentMulti({patient_id:patientId,plan_id:planId||null,clinic_id:clinicId,
          appointment_id:appointmentId||null,
          splits:validSplits.map(s=>({mode:s.mode,amount:parseFloat(s.amount),reference:s.reference||undefined})),
          remarks:remarks||undefined});
      }
      onSaved();onClose();
    }catch(e:any){alert(e.message);}
    finally{setSaving(false);}
  };

  return(<Modal title="Collect Payment" onClose={onClose}>
    {balance!=null&&balance>0&&<div style={{background:"#FEF3C7",borderRadius:12,padding:12,marginBottom:14,fontSize:14,color:"#92400E",fontWeight:600}}>Outstanding balance: ₹{balance.toLocaleString()}</div>}

    {splits.map((sp,i)=>(
      <div key={i} style={{background:"#F8FAFC",borderRadius:12,padding:12,marginBottom:10,border:"1px solid #E2E8F0"}}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:700,color:"#64748B"}}>Split {i+1}</span>
          {splits.length>1&&<button onClick={()=>removeSplit(i)} style={{marginLeft:"auto",border:"none",background:"#FEE2E2",color:"#DC2626",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Remove</button>}
        </div>
        <input style={{...inputStyle,fontSize:20,fontWeight:700,textAlign:"center",marginBottom:8}} placeholder="₹ Amount" type="number" value={sp.amount} onChange={e=>updateSplit(i,"amount",e.target.value)}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:8}}>
          {modes.map(m=><button key={m} onClick={()=>updateSplit(i,"mode",m)} style={{padding:"10px 0",borderRadius:10,border:`2px solid ${sp.mode===m?"#0E7C7B":"#E2E8F0"}`,background:sp.mode===m?"#0E7C7B14":"#fff",color:sp.mode===m?"#0E7C7B":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",textTransform:"capitalize"}}>{m==="cash"?"💵":m==="upi"?"📱":m==="card"?"💳":m==="razorpay"?"🔷":m==="bank_transfer"?"🏦":"📋"} {m.replace("_"," ")}</button>)}
        </div>
        {sp.mode!=="cash"&&<input style={{...inputStyle,fontSize:13}} placeholder={`${sp.mode} reference / txn ID (optional)`} value={sp.reference} onChange={e=>updateSplit(i,"reference",e.target.value)}/>}
      </div>
    ))}

    <button onClick={addSplit} style={{width:"100%",padding:10,borderRadius:12,border:`2px dashed #0E7C7B`,background:"#0E7C7B08",color:"#0E7C7B",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10}}>+ Add Another Payment Mode</button>

    {splits.length>1&&<div style={{background:"#EFF6FF",borderRadius:12,padding:12,marginBottom:10,fontSize:15,fontWeight:800,color:"#1E40AF",textAlign:"center"}}>
      Total: ₹{total.toLocaleString()}{balance!=null&&total!==balance&&<span style={{color:total>balance?"#DC2626":"#F59E0B",fontSize:12,fontWeight:600}}>{` (balance: ₹${balance.toLocaleString()})`}</span>}
    </div>}

    <input style={inputStyle} placeholder="Remarks (optional)" value={remarks} onChange={e=>setRemarks(e.target.value)}/>
    <button disabled={saving} onClick={save} style={{width:"100%",padding:14,borderRadius:14,border:"none",background:"#10B981",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>
      {saving?"Recording...":`✅ Record Payment${splits.length>1?` (${splits.length} modes)`:""}`}
    </button>
  </Modal>);
}

// ─── HEALTH HISTORY FORM ────────────────────────────
export function HealthModal({patientId,current,onClose,onSaved}:{patientId:string,current?:any,onClose:()=>void,onSaved:()=>void}){
  const [data,setData]=useState({
    diabetes:current?.diabetes||false, hypertension:current?.hypertension||false,
    heart_disease:current?.heart_disease||false, thyroid:current?.thyroid||false,
    asthma:current?.asthma||false, kidney_disease:current?.kidney_disease||false,
    liver_disease:current?.liver_disease||false, pregnant:current?.pregnant||false,
    blood_thinner:current?.blood_thinner||false, smoking:current?.smoking||false,
    tobacco:current?.tobacco||false, allergies:current?.allergies||"",
    previous_surgeries:current?.previous_surgeries||"", current_medicines:current?.current_medicines||"",
    other_conditions:current?.other_conditions||"",
  });
  const [saving,setSaving]=useState(false);
  const toggle=(k:string)=>setData({...data,[k]:!(data as any)[k]});

  const save=async()=>{
    setSaving(true);
    try{await api.saveHealthHistory(patientId,data);onSaved();onClose();}
    catch(e:any){alert(e.message);}
    finally{setSaving(false);}
  };

  const bools:[string,string][]=[ ["diabetes","🔴 Diabetes"],["hypertension","🟠 Hypertension / High BP"],["heart_disease","❤️ Heart Disease"],["thyroid","Thyroid"],["asthma","🫁 Asthma"],["kidney_disease","Kidney Disease"],["liver_disease","Liver Disease"],["pregnant","🤰 Pregnant"],["blood_thinner","💉 On Blood Thinners"],["smoking","🚬 Smoking"],["tobacco","Tobacco Use"]];

  return(<Modal title="Patient Health History" onClose={onClose}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
      {bools.map(([k,l])=><button key={k} onClick={()=>toggle(k)} style={{padding:"10px 14px",borderRadius:12,border:`2px solid ${(data as any)[k]?"#EF4444":"#E2E8F0"}`,background:(data as any)[k]?"#FEE2E2":"#fff",color:(data as any)[k]?"#991B1B":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer",textAlign:"left"}}>{(data as any)[k]?"✓ ":""}{l}</button>)}
    </div>
    <input style={inputStyle} placeholder="Allergies (e.g. Penicillin, Sulfa)" value={data.allergies} onChange={e=>setData({...data,allergies:e.target.value})}/>
    <input style={inputStyle} placeholder="Current medicines" value={data.current_medicines} onChange={e=>setData({...data,current_medicines:e.target.value})}/>
    <input style={inputStyle} placeholder="Previous surgeries" value={data.previous_surgeries} onChange={e=>setData({...data,previous_surgeries:e.target.value})}/>
    <input style={inputStyle} placeholder="Other conditions" value={data.other_conditions} onChange={e=>setData({...data,other_conditions:e.target.value})}/>
    <button disabled={saving} onClick={save} style={{width:"100%",padding:14,borderRadius:14,border:"none",background:"#6366F1",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>{saving?"Saving...":"Save Health History"}</button>
  </Modal>);
}

// ─── PRESCRIPTION PREVIEW ───────────────────────────
export function RxPreviewModal({rxData,clinicName,doctorName,allMedicines,onClose,onSend,onPrint}:{rxData:any,clinicName:string,doctorName:string,allMedicines?:any[],onClose:()=>void,onSend:(data:any)=>void,onPrint:(data:any)=>void}){
  const [meds,setMeds]=useState(rxData.medicines||[]);
  const [advice,setAdvice]=useState(rxData.visible_advice||"");
  const [followup,setFollowup]=useState(rxData.followup_date||"");
  const [complaint,setComplaint]=useState(rxData.complaint||"");
  const [diagnosis,setDiagnosis]=useState(rxData.diagnosis||"");
  const [treatmentDone,setTreatmentDone]=useState(rxData.treatment_done||"");
  const [showMedPicker,setShowMedPicker]=useState(false);
  const [medSearch,setMedSearch]=useState("");
  const [customMed,setCustomMed]=useState({name:"",strength:"",dose:"1 tablet",frequency:"Three times daily",duration:"5 days",instructions:"After meals"});
  const updateMed=(i:number,k:string,v:string)=>{const m=[...meds];m[i]={...m[i],[k]:v};setMeds(m);};
  const removeMed=(i:number)=>setMeds(meds.filter((_:any,idx:number)=>idx!==i));
  const addMedFromCatalog=(m:any)=>{setMeds([...meds,{name:m.name,strength:m.default_strength||"",dose:m.default_dose||"",frequency:m.default_frequency||"",duration:m.default_duration||"",instructions:m.instructions||""}]);setShowMedPicker(false);};
  const addCustomMedicine=()=>{if(!customMed.name.trim())return;setMeds([...meds,{...customMed}]);setCustomMed({name:"",strength:"",dose:"1 tablet",frequency:"Three times daily",duration:"5 days",instructions:"After meals"});setShowMedPicker(false);};
  const buildFinalData=()=>({...rxData, medicines:meds, visible_advice:advice, followup_date:followup, complaint, diagnosis, treatment_done:treatmentDone, doctor_raw_notes:treatmentDone});

  return(<Modal title="📄 Prescription — Review & Edit Before Sending" onClose={onClose}>
    <div style={{background:"#F0F4FF",borderRadius:12,padding:12,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
      <div><b>{rxData.patient_name}</b> · Age {rxData.patient_age}</div>
      <div style={{fontSize:12,color:"#6366F1",fontWeight:700}}>Rx Preview</div>
    </div>
    <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>Chief Complaint</div>
    <textarea value={complaint} onChange={e=>setComplaint(e.target.value)} placeholder="Patient's complaint..." style={{width:"100%",border:"2px solid #E2E8F0",borderRadius:12,padding:10,fontSize:14,minHeight:40,resize:"none",boxSizing:"border-box",marginBottom:10,fontFamily:"inherit"}}/>
    <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>Diagnosis</div>
    <textarea value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} placeholder="Diagnosis..." style={{width:"100%",border:"2px solid #E2E8F0",borderRadius:12,padding:10,fontSize:14,minHeight:40,resize:"none",boxSizing:"border-box",marginBottom:10,fontFamily:"inherit"}}/>
    <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>Treatment / Procedures Done Today</div>
    <textarea value={treatmentDone} onChange={e=>setTreatmentDone(e.target.value)} placeholder="e.g. RCT access opening, X-Ray IOPA, Scaling" style={{width:"100%",border:"2px solid #E2E8F0",borderRadius:12,padding:10,fontSize:14,minHeight:40,resize:"none",boxSizing:"border-box",marginBottom:14,fontFamily:"inherit"}}/>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div style={{fontWeight:700,fontSize:14}}>💊 Medicines ({meds.length})</div>
      <button onClick={()=>setShowMedPicker(true)} style={{border:"2px solid #6366F1",background:"#EEF2FF",color:"#6366F1",borderRadius:10,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:12}}>+ Add Medicine</button>
    </div>

    {meds.map((m:any,i:number)=>(
      <div key={i} style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:12,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <input value={m.name+(m.strength?" "+m.strength:"")} onChange={e=>{const parts=e.target.value.split(" ");updateMed(i,"name",parts[0]);if(parts[1])updateMed(i,"strength",parts.slice(1).join(" "));}} style={{border:"none",fontWeight:700,fontSize:14,outline:"none",flex:1}}/>
          <button onClick={()=>removeMed(i)} style={{border:"none",background:"#FEE2E2",color:"#991B1B",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4}}>
          {(["dose","frequency","duration","instructions"] as const).map(k=>(
            <div key={k}><div style={{fontSize:9,color:"#94A3B8",textTransform:"uppercase"}}>{k}</div>
            <input value={m[k]||""} onChange={e=>updateMed(i,k,e.target.value)} style={{width:"100%",border:"1px solid #E2E8F0",borderRadius:6,padding:"4px 6px",fontSize:12,boxSizing:"border-box"}}/></div>
          ))}
        </div>
      </div>
    ))}

    {showMedPicker&&<div style={{background:"#F8FAFC",border:"2px solid #6366F1",borderRadius:16,padding:16,marginBottom:12}}>
      <div style={{fontWeight:700,marginBottom:8}}>Add from catalog or custom:</div>
      <input placeholder="Search medicines..." value={medSearch} onChange={e=>setMedSearch(e.target.value)} style={{width:"100%",border:"1.5px solid #E2E8F0",borderRadius:10,padding:8,fontSize:13,marginBottom:8,boxSizing:"border-box"}}/>
      <div style={{maxHeight:200,overflow:"auto",marginBottom:10}}>
        {(allMedicines||[]).filter((m:any)=>!medSearch||m.name.toLowerCase().includes(medSearch.toLowerCase())).map((m:any)=>(
          <button key={m.id} onClick={()=>addMedFromCatalog(m)} style={{display:"block",width:"100%",textAlign:"left",border:"none",background:"#fff",padding:"8px 10px",borderRadius:8,marginBottom:4,cursor:"pointer",fontSize:13}}>
            <b>{m.name}</b> <span style={{color:"#64748b"}}>{m.default_strength} · {m.default_frequency} · {m.default_duration}</span>
          </button>
        ))}
      </div>
      <div style={{borderTop:"1px solid #E2E8F0",paddingTop:10}}>
        <div style={{fontWeight:700,fontSize:12,marginBottom:6}}>Or add custom medicine:</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
          <input placeholder="Medicine name *" value={customMed.name} onChange={e=>setCustomMed({...customMed,name:e.target.value})} style={{border:"1px solid #E2E8F0",borderRadius:8,padding:6,fontSize:12}}/>
          <input placeholder="Strength" value={customMed.strength} onChange={e=>setCustomMed({...customMed,strength:e.target.value})} style={{border:"1px solid #E2E8F0",borderRadius:8,padding:6,fontSize:12}}/>
          <input placeholder="Dose" value={customMed.dose} onChange={e=>setCustomMed({...customMed,dose:e.target.value})} style={{border:"1px solid #E2E8F0",borderRadius:8,padding:6,fontSize:12}}/>
          <input placeholder="Frequency" value={customMed.frequency} onChange={e=>setCustomMed({...customMed,frequency:e.target.value})} style={{border:"1px solid #E2E8F0",borderRadius:8,padding:6,fontSize:12}}/>
        </div>
        <button onClick={addCustomMedicine} style={{marginTop:8,padding:"8px 16px",borderRadius:10,border:"none",background:"#6366F1",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>Add Custom</button>
      </div>
      <button onClick={()=>setShowMedPicker(false)} style={{marginTop:8,padding:"6px 12px",border:"1px solid #E2E8F0",background:"#fff",borderRadius:8,cursor:"pointer",fontSize:12}}>Close</button>
    </div>}

    <div style={{fontWeight:700,fontSize:13,margin:"8px 0 4px"}}>Advice</div>
    <textarea value={advice} onChange={e=>setAdvice(e.target.value)} style={{...inputStyle,minHeight:60,resize:"none"}}/>
    <div style={{fontWeight:700,fontSize:13,margin:"8px 0 4px"}}>Follow-up Date</div>
    <input type="date" value={followup} onChange={e=>setFollowup(e.target.value)} style={inputStyle}/>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12}}>
      <button onClick={()=>onSend(buildFinalData())} style={{padding:14,borderRadius:14,border:"none",background:"#10B981",color:"#fff",fontWeight:700,cursor:"pointer"}}>📤 Send & Done</button>
      <button onClick={()=>onPrint(buildFinalData())} style={{padding:14,borderRadius:14,border:"none",background:"#0F172A",color:"#fff",fontWeight:700,cursor:"pointer"}}>🖨️ Print</button>
      <button onClick={onClose} style={{padding:14,borderRadius:14,border:"2px solid #E2E8F0",background:"#fff",color:"#64748b",fontWeight:700,cursor:"pointer"}}>Cancel</button>
    </div>
  </Modal>);
}

// ─── STAFF MANAGEMENT MODAL ─────────────────────────
export function StaffModal({staff,clinicId,onClose,onSaved}:{staff?:any,clinicId:string,onClose:()=>void,onSaved:()=>void}){
  const [name,setName]=useState(staff?.name||"");
  const [phone,setPhone]=useState(staff?.phone||"");
  const [role,setRole]=useState(staff?.role||"nurse");
  const [pin,setPin]=useState("");
  const [saving,setSaving]=useState(false);

  const save=async()=>{
    if(!name||!phone){alert("Name and phone required");return;}
    setSaving(true);
    try{
      if(staff?.id){
        const data:any={name,phone,role};
        if(pin) data.pin=pin;
        await api.updateStaff(staff.id,data);
      }else{
        await api.addStaff({name,phone,role,pin:pin||"1234",clinic_id:clinicId});
      }
      onSaved();onClose();
    }catch(e:any){alert(e.message);}
    finally{setSaving(false);}
  };

  return(<Modal title={staff?"Edit Staff":"Add Staff Member"} onClose={onClose}>
    <input style={inputStyle} placeholder="Full name *" value={name} onChange={e=>setName(e.target.value)}/>
    <input style={inputStyle} placeholder="Phone number *" value={phone} onChange={e=>setPhone(e.target.value)}/>
    <select style={inputStyle} value={role} onChange={e=>setRole(e.target.value)}>
      <option value="doctor">Doctor</option><option value="nurse">Nurse</option><option value="receptionist">Receptionist</option><option value="admin">Admin</option>
    </select>
    <input style={inputStyle} placeholder={staff?"New PIN (leave blank to keep)":"PIN (default: 1234)"} type="password" value={pin} onChange={e=>setPin(e.target.value.slice(0,4))}/>
    <button disabled={saving} onClick={save} style={{width:"100%",padding:14,borderRadius:14,border:"none",background:"#6366F1",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>{saving?"Saving...":staff?"Update Staff":"Add Staff"}</button>
  </Modal>);
}

// ─── TREATMENT PLAN CREATION ────────────────────────
// Procedure category → colour (used to paint the tooth chart)
const CAT_COLOR:Record<string,string>={
  Restorative:"#3B82F6", Endodontics:"#F59E0B", Prosthodontics:"#8B5CF6",
  Surgery:"#EF4444", Implantology:"#14B8A6", Periodontics:"#10B981",
  Orthodontics:"#EC4899", Preventive:"#06B6D4", Cosmetic:"#A855F7",
  Pediatric:"#F97316", Diagnostic:"#64748B",
};
const catColor=(c?:string)=>CAT_COLOR[c||""]||"#64748B";

export function TreatmentPlanModal({patientId,patientName,clinicId,doctorId,procedures,onClose,onSaved}:{patientId:string,patientName:string,clinicId:string,doctorId:string,procedures:any[],onClose:()=>void,onSaved:()=>void}){
  const [name,setName]=useState("");
  const [complaint,setComplaint]=useState("");
  const [diagnosis,setDiagnosis]=useState("");
  const [items,setItems]=useState<any[]>([]);   // {procedure_catalog_id,procedure_name,tooth_number,estimated_cost,category}
  const [selTooth,setSelTooth]=useState<string|null>(null);
  const [sittings,setSittings]=useState("1");
  const [discount,setDiscount]=useState("0");
  const [procFilter,setProcFilter]=useState("");
  const [saving,setSaving]=useState(false);

  const addProc=(p:any)=>{
    // avoid the exact same procedure on the exact same tooth twice
    if(items.find(x=>x.procedure_catalog_id===p.id && x.tooth_number===selTooth)) return;
    setItems([...items,{procedure_catalog_id:p.id,procedure_name:p.name,tooth_number:selTooth,estimated_cost:p.default_cost||0,category:p.category}]);
  };
  const removeItem=(i:number)=>setItems(items.filter((_,idx)=>idx!==i));

  // teeth that have at least one procedure → colour them on the chart
  const marks:Record<string,{color:string,label:string}>={};
  items.forEach(it=>{ if(it.tooth_number) marks[it.tooth_number]={color:catColor(it.category),label:it.procedure_name}; });

  const total=items.reduce((s,p)=>s+(p.estimated_cost||0),0);
  const filtered=procFilter?procedures.filter((p:any)=>p.name.toLowerCase().includes(procFilter.toLowerCase())):procedures;

  const save=async()=>{
    if(!name){alert("Plan name required");return;}
    if(items.length===0){alert("Add at least one procedure");return;}
    setSaving(true);
    try{
      await api.createTreatmentPlan({
        patient_id:patientId,clinic_id:clinicId,doctor_id:doctorId,name,complaint,diagnosis,
        items:items.map(p=>({procedure_catalog_id:p.procedure_catalog_id,procedure_name:p.procedure_name,tooth_number:p.tooth_number||null,estimated_cost:p.estimated_cost||0})),
        total_sittings_planned:parseInt(sittings)||1,discount:parseFloat(discount)||0,extra_charges:0,
      });
      onSaved();onClose();
    }catch(e:any){alert(e.message);}
    finally{setSaving(false);}
  };

  return(<Modal title={`New Treatment Plan — ${patientName}`} onClose={onClose}>
    <input style={inputStyle} placeholder="Plan name * (e.g. RCT + Crown #26)" value={name} onChange={e=>setName(e.target.value)}/>
    <textarea style={{...inputStyle,minHeight:50,resize:"none"}} placeholder="Complaint" value={complaint} onChange={e=>setComplaint(e.target.value)}/>
    <textarea style={{...inputStyle,minHeight:50,resize:"none"}} placeholder="Diagnosis" value={diagnosis} onChange={e=>setDiagnosis(e.target.value)}/>

    <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>🦷 Tooth chart — tap a tooth, then pick a procedure below</div>
    <ToothChart marks={marks} selected={selTooth} onSelect={(id)=>setSelTooth(selTooth===id?null:id)}/>
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"8px 0 12px"}}>
      {selTooth
        ? <div style={{fontSize:13,fontWeight:700,color:"#10B981"}}>Selected: #{selTooth} <span style={{color:"#64748B",fontWeight:500}}>({toothLabel(selTooth)})</span></div>
        : <div style={{fontSize:13,color:"#94A3B8"}}>No tooth selected — procedures will be added as whole-mouth / general.</div>}
      {selTooth&&<button onClick={()=>setSelTooth(null)} style={{border:"1px solid #E2E8F0",borderRadius:8,padding:"3px 8px",background:"#fff",cursor:"pointer",fontSize:12}}>Clear</button>}
    </div>

    <input style={{...inputStyle,marginBottom:6}} placeholder="Search procedures…" value={procFilter} onChange={e=>setProcFilter(e.target.value)}/>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12,maxHeight:150,overflow:"auto"}}>
      {filtered.map((p:any)=>(
        <button key={p.id} onClick={()=>addProc(p)} title={`Add ${p.name}${selTooth?" on #"+selTooth:""}`} style={{border:`1px solid ${catColor(p.category)}55`,borderLeft:`4px solid ${catColor(p.category)}`,borderRadius:10,padding:"6px 10px",background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>+ {p.name} ₹{(p.default_cost||0).toLocaleString()}</button>
      ))}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <input style={inputStyle} placeholder="Planned sittings" type="number" value={sittings} onChange={e=>setSittings(e.target.value)}/>
      <input style={inputStyle} placeholder="Discount ₹" type="number" value={discount} onChange={e=>setDiscount(e.target.value)}/>
    </div>

    {items.length>0&&<div style={{background:"#F8FAFC",borderRadius:12,padding:12,marginBottom:12}}>
      {items.map((p,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,padding:"5px 0",borderBottom:"1px solid #EEF2F6"}}>
        <span style={{display:"flex",alignItems:"center",gap:6}}>
          {p.tooth_number&&<b style={{background:catColor(p.category),color:"#fff",borderRadius:6,padding:"1px 6px",fontSize:11}}>#{p.tooth_number}</b>}
          {p.procedure_name}
        </span>
        <span style={{display:"flex",alignItems:"center",gap:8}}><b>₹{(p.estimated_cost||0).toLocaleString()}</b><button onClick={()=>removeItem(i)} style={{border:"none",background:"#FEE2E2",color:"#EF4444",borderRadius:6,width:22,height:22,cursor:"pointer",fontWeight:700}}>×</button></span>
      </div>)}
      <div style={{marginTop:6,paddingTop:6,display:"flex",justifyContent:"space-between"}}><b>Final</b><b style={{fontSize:18,color:"#10B981"}}>₹{(total-parseFloat(discount||"0")).toLocaleString()}</b></div>
    </div>}
    <button disabled={saving} onClick={save} style={{width:"100%",padding:14,borderRadius:14,border:"none",background:"#10B981",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>{saving?"Creating...":"Create Treatment Plan"}</button>
  </Modal>);
}
