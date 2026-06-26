/**
 * DentAssist — Dental Medicine Database & Procedure Catalog
 * Pre-built with common dental medicines, dosages, and procedures
 */

// ─── MEDICINE DATABASE ───────────────────────────────
export interface Medicine {
  id: string;
  name: string;
  category: string;
  strengths: string[];
  defaultStrength: string;
  defaultDose: string;
  frequencies: { label: string; value: string; timesPerDay: number }[];
  defaultFrequency: string;
  defaultDuration: string;
  instructions: string;
  contraindications?: string;
}

export const MEDICINES: Medicine[] = [
  // ── ANTIBIOTICS ──
  {
    id: "amoxicillin",
    name: "Amoxicillin",
    category: "Antibiotic",
    strengths: ["250mg", "500mg"],
    defaultStrength: "500mg",
    defaultDose: "1 capsule",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "5 days",
    instructions: "After meals. Complete the full course.",
  },
  {
    id: "amoxclav",
    name: "Amoxicillin + Clavulanate (Augmentin)",
    category: "Antibiotic",
    strengths: ["375mg", "625mg", "1g"],
    defaultStrength: "625mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
    ],
    defaultFrequency: "Twice daily",
    defaultDuration: "5 days",
    instructions: "After meals. Complete the full course.",
  },
  {
    id: "azithromycin",
    name: "Azithromycin",
    category: "Antibiotic",
    strengths: ["250mg", "500mg"],
    defaultStrength: "500mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Once daily (OD)", value: "Once daily", timesPerDay: 1 },
    ],
    defaultFrequency: "Once daily",
    defaultDuration: "3 days",
    instructions: "1 hour before meals or 2 hours after meals.",
  },
  {
    id: "metronidazole",
    name: "Metronidazole (Flagyl)",
    category: "Antibiotic",
    strengths: ["200mg", "400mg"],
    defaultStrength: "400mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "5 days",
    instructions: "After meals. Avoid alcohol during course.",
  },
  {
    id: "doxycycline",
    name: "Doxycycline",
    category: "Antibiotic",
    strengths: ["100mg"],
    defaultStrength: "100mg",
    defaultDose: "1 capsule",
    frequencies: [
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
      { label: "Once daily (OD)", value: "Once daily", timesPerDay: 1 },
    ],
    defaultFrequency: "Twice daily",
    defaultDuration: "5 days",
    instructions: "After meals with plenty of water. Do not lie down for 30 minutes.",
  },
  {
    id: "clindamycin",
    name: "Clindamycin",
    category: "Antibiotic",
    strengths: ["150mg", "300mg"],
    defaultStrength: "300mg",
    defaultDose: "1 capsule",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
      { label: "Four times daily (QDS)", value: "Four times daily", timesPerDay: 4 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "7 days",
    instructions: "After meals with full glass of water.",
    contraindications: "Penicillin-allergic patients alternative",
  },

  // ── PAIN / ANTI-INFLAMMATORY ──
  {
    id: "ibuprofen",
    name: "Ibuprofen",
    category: "Painkiller / Anti-inflammatory",
    strengths: ["200mg", "400mg", "600mg"],
    defaultStrength: "400mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
      { label: "As needed (SOS)", value: "As needed", timesPerDay: 0 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "3 days",
    instructions: "After meals. Do not take on empty stomach.",
  },
  {
    id: "aceclofenac",
    name: "Aceclofenac",
    category: "Painkiller / Anti-inflammatory",
    strengths: ["100mg"],
    defaultStrength: "100mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
    ],
    defaultFrequency: "Twice daily",
    defaultDuration: "3 days",
    instructions: "After meals.",
  },
  {
    id: "diclofenac",
    name: "Diclofenac Sodium",
    category: "Painkiller / Anti-inflammatory",
    strengths: ["50mg"],
    defaultStrength: "50mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
    ],
    defaultFrequency: "Twice daily",
    defaultDuration: "3 days",
    instructions: "After meals.",
  },
  {
    id: "paracetamol",
    name: "Paracetamol",
    category: "Painkiller",
    strengths: ["500mg", "650mg"],
    defaultStrength: "650mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
      { label: "As needed (SOS)", value: "As needed", timesPerDay: 0 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "3 days",
    instructions: "After meals or as needed. Maximum 4 tablets/day.",
  },
  {
    id: "ketorolac",
    name: "Ketorolac",
    category: "Painkiller",
    strengths: ["10mg"],
    defaultStrength: "10mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
      { label: "As needed (SOS)", value: "As needed", timesPerDay: 0 },
    ],
    defaultFrequency: "As needed",
    defaultDuration: "2 days",
    instructions: "After meals. Short-term use only.",
  },
  {
    id: "tramadol",
    name: "Tramadol",
    category: "Painkiller (Strong)",
    strengths: ["50mg"],
    defaultStrength: "50mg",
    defaultDose: "1 capsule",
    frequencies: [
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
      { label: "As needed (SOS)", value: "As needed", timesPerDay: 0 },
    ],
    defaultFrequency: "As needed",
    defaultDuration: "3 days",
    instructions: "After meals. May cause drowsiness.",
  },

  // ── COMBINATION PAINKILLERS ──
  {
    id: "aceclofenac_paracetamol",
    name: "Aceclofenac + Paracetamol",
    category: "Painkiller Combination",
    strengths: ["100mg + 325mg", "100mg + 500mg"],
    defaultStrength: "100mg + 325mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
    ],
    defaultFrequency: "Twice daily",
    defaultDuration: "3 days",
    instructions: "After meals.",
  },
  {
    id: "ibuprofen_paracetamol",
    name: "Ibuprofen + Paracetamol",
    category: "Painkiller Combination",
    strengths: ["400mg + 325mg"],
    defaultStrength: "400mg + 325mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "3 days",
    instructions: "After meals.",
  },

  // ── ANTACID / GI PROTECTION ──
  {
    id: "pantoprazole",
    name: "Pantoprazole",
    category: "Antacid",
    strengths: ["40mg"],
    defaultStrength: "40mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Once daily (OD) before breakfast", value: "Once daily before breakfast", timesPerDay: 1 },
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
    ],
    defaultFrequency: "Once daily before breakfast",
    defaultDuration: "5 days",
    instructions: "30 minutes before meals on empty stomach.",
  },
  {
    id: "ranitidine",
    name: "Ranitidine",
    category: "Antacid",
    strengths: ["150mg"],
    defaultStrength: "150mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
    ],
    defaultFrequency: "Twice daily",
    defaultDuration: "5 days",
    instructions: "Before meals.",
  },

  // ── ANTI-ALLERGY ──
  {
    id: "cetirizine",
    name: "Cetirizine",
    category: "Anti-allergy",
    strengths: ["10mg"],
    defaultStrength: "10mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Once daily at bedtime", value: "Once daily at bedtime", timesPerDay: 1 },
    ],
    defaultFrequency: "Once daily at bedtime",
    defaultDuration: "5 days",
    instructions: "At bedtime. May cause drowsiness.",
  },

  // ── STEROIDS ──
  {
    id: "prednisolone",
    name: "Prednisolone",
    category: "Steroid",
    strengths: ["5mg", "10mg", "20mg"],
    defaultStrength: "10mg",
    defaultDose: "1 tablet",
    frequencies: [
      { label: "Once daily morning", value: "Once daily morning", timesPerDay: 1 },
    ],
    defaultFrequency: "Once daily morning",
    defaultDuration: "5 days (tapering)",
    instructions: "After breakfast. Do not stop abruptly — taper as directed.",
  },

  // ── TOPICAL / ORAL CARE ──
  {
    id: "chlorhexidine",
    name: "Chlorhexidine Mouthwash (0.2%)",
    category: "Mouthwash",
    strengths: ["0.2%"],
    defaultStrength: "0.2%",
    defaultDose: "15ml",
    frequencies: [
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
    ],
    defaultFrequency: "Twice daily",
    defaultDuration: "7 days",
    instructions: "Swish for 30 seconds and spit. Do not eat or drink for 30 minutes after.",
  },
  {
    id: "benzydamine",
    name: "Benzydamine Mouthwash (Tantum)",
    category: "Mouthwash",
    strengths: ["0.15%"],
    defaultStrength: "0.15%",
    defaultDose: "15ml",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "5 days",
    instructions: "Swish for 30 seconds, spit. Do not dilute.",
  },
  {
    id: "lignocaine_gel",
    name: "Lignocaine Gel 2% (Topical)",
    category: "Topical Anesthetic",
    strengths: ["2%"],
    defaultStrength: "2%",
    defaultDose: "Apply small amount",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
      { label: "As needed (SOS)", value: "As needed", timesPerDay: 0 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "3 days",
    instructions: "Apply on affected area with clean finger. Do not eat for 30 minutes.",
  },
  {
    id: "triamcinolone_paste",
    name: "Triamcinolone Acetonide Paste (Kenacort)",
    category: "Topical Steroid",
    strengths: ["0.1%"],
    defaultStrength: "0.1%",
    defaultDose: "Apply small amount",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "5 days",
    instructions: "Apply on ulcer/affected area after meals and at bedtime. Do not rub.",
  },
  {
    id: "candid_mouth_paint",
    name: "Clotrimazole Mouth Paint (Candid)",
    category: "Antifungal",
    strengths: ["1%"],
    defaultStrength: "1%",
    defaultDose: "Apply with cotton",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "7 days",
    instructions: "Apply on affected area with cotton swab after meals.",
  },
  {
    id: "desensitizing_paste",
    name: "Desensitizing Toothpaste (Sensodyne/similar)",
    category: "Oral Care",
    strengths: ["5% KNO3"],
    defaultStrength: "5% KNO3",
    defaultDose: "Pea-sized amount",
    frequencies: [
      { label: "Twice daily (BD)", value: "Twice daily", timesPerDay: 2 },
    ],
    defaultFrequency: "Twice daily",
    defaultDuration: "Ongoing",
    instructions: "Brush gently for 2 minutes. Can also apply directly on sensitive teeth.",
  },

  // ── HOME CARE ──
  {
    id: "warm_saline",
    name: "Warm Saline Gargle",
    category: "Home Remedy",
    strengths: ["1 tsp salt in warm water"],
    defaultStrength: "1 tsp salt in warm water",
    defaultDose: "1 glass",
    frequencies: [
      { label: "Three times daily (TDS)", value: "Three times daily", timesPerDay: 3 },
      { label: "Four times daily (QDS)", value: "Four times daily", timesPerDay: 4 },
    ],
    defaultFrequency: "Three times daily",
    defaultDuration: "5 days",
    instructions: "Use lukewarm water. Gargle for 30 seconds each time.",
  },
  {
    id: "ice_pack",
    name: "Ice Pack / Cold Compress",
    category: "Home Remedy",
    strengths: ["External application"],
    defaultStrength: "External application",
    defaultDose: "15-20 minutes",
    frequencies: [
      { label: "Every 2-3 hours", value: "Every 2-3 hours", timesPerDay: 4 },
    ],
    defaultFrequency: "Every 2-3 hours",
    defaultDuration: "First 24 hours",
    instructions: "Apply on cheek over affected area. Use towel between ice and skin.",
  },
];

// ─── MEDICINE CATEGORIES ─────────────────────────────
export const MEDICINE_CATEGORIES = [
  "All",
  "Antibiotic",
  "Painkiller / Anti-inflammatory",
  "Painkiller",
  "Painkiller (Strong)",
  "Painkiller Combination",
  "Antacid",
  "Anti-allergy",
  "Steroid",
  "Mouthwash",
  "Topical Anesthetic",
  "Topical Steroid",
  "Antifungal",
  "Oral Care",
  "Home Remedy",
];

// ─── DENTAL PROCEDURES ──────────────────────────────
export interface Procedure {
  id: string;
  name: string;
  category: string;
  costRange: { min: number; max: number };
  defaultCost: number;
  followupDays: number | null;
  commonMedicines: string[];  // medicine IDs
  commonAdvice: string[];
}

export const PROCEDURES: Procedure[] = [
  // ── DIAGNOSTIC ──
  { id: "consultation", name: "Consultation", category: "Diagnostic", costRange: { min: 200, max: 500 }, defaultCost: 300, followupDays: null, commonMedicines: [], commonAdvice: [] },
  { id: "xray_iopa", name: "X-Ray (IOPA)", category: "Diagnostic", costRange: { min: 150, max: 300 }, defaultCost: 200, followupDays: null, commonMedicines: [], commonAdvice: [] },
  { id: "xray_opg", name: "X-Ray (OPG)", category: "Diagnostic", costRange: { min: 400, max: 800 }, defaultCost: 500, followupDays: null, commonMedicines: [], commonAdvice: [] },

  // ── PREVENTIVE ──
  { id: "scaling", name: "Scaling & Polishing", category: "Preventive", costRange: { min: 500, max: 1500 }, defaultCost: 800, followupDays: 180, commonMedicines: ["chlorhexidine"], commonAdvice: ["Avoid eating for 1 hour after scaling", "Mild sensitivity is normal for 2-3 days", "Use soft bristle toothbrush"] },
  { id: "fluoride", name: "Fluoride Application", category: "Preventive", costRange: { min: 300, max: 600 }, defaultCost: 400, followupDays: 180, commonMedicines: [], commonAdvice: ["Do not eat or drink for 30 minutes", "Do not rinse mouth for 30 minutes"] },
  { id: "sealant", name: "Pit & Fissure Sealant", category: "Preventive", costRange: { min: 500, max: 1000 }, defaultCost: 700, followupDays: 180, commonMedicines: [], commonAdvice: ["Avoid sticky food for 24 hours"] },

  // ── RESTORATIVE ──
  { id: "filling_gic", name: "Filling — GIC", category: "Restorative", costRange: { min: 500, max: 1000 }, defaultCost: 600, followupDays: null, commonMedicines: ["desensitizing_paste"], commonAdvice: ["Avoid chewing on filled side for 2 hours", "Mild sensitivity is normal for a few days"] },
  { id: "filling_composite", name: "Filling — Composite", category: "Restorative", costRange: { min: 800, max: 2000 }, defaultCost: 1200, followupDays: null, commonMedicines: ["desensitizing_paste"], commonAdvice: ["Avoid eating for 2 hours", "Avoid very hot or cold food for 24 hours"] },
  { id: "filling_amalgam", name: "Filling — Amalgam", category: "Restorative", costRange: { min: 500, max: 800 }, defaultCost: 600, followupDays: null, commonMedicines: [], commonAdvice: ["Avoid chewing on filled side for 24 hours"] },

  // ── ENDODONTICS ──
  { id: "rct", name: "Root Canal Treatment (RCT)", category: "Endodontics", costRange: { min: 3000, max: 8000 }, defaultCost: 5000, followupDays: 7, commonMedicines: ["amoxicillin", "ibuprofen", "pantoprazole"], commonAdvice: ["Avoid chewing on treated side until crown is placed", "Mild discomfort for 2-3 days is normal", "Complete the antibiotic course", "Crown placement recommended within 2 weeks"] },
  { id: "pulpotomy", name: "Pulpotomy", category: "Endodontics", costRange: { min: 1000, max: 2500 }, defaultCost: 1500, followupDays: 7, commonMedicines: ["ibuprofen"], commonAdvice: ["Avoid hard food on treated side"] },
  { id: "retreatment", name: "RCT Re-treatment", category: "Endodontics", costRange: { min: 5000, max: 12000 }, defaultCost: 7000, followupDays: 7, commonMedicines: ["amoxicillin", "ibuprofen", "pantoprazole"], commonAdvice: ["Multiple visits may be required"] },

  // ── PROSTHODONTICS ──
  { id: "crown_peg", name: "Crown — PFM (Metal)", category: "Prosthodontics", costRange: { min: 3000, max: 6000 }, defaultCost: 4000, followupDays: 7, commonMedicines: [], commonAdvice: ["Temporary crown — avoid sticky food", "Final crown will be fitted in next visit"] },
  { id: "crown_ceramic", name: "Crown — All Ceramic / Zirconia", category: "Prosthodontics", costRange: { min: 6000, max: 15000 }, defaultCost: 10000, followupDays: 7, commonMedicines: [], commonAdvice: ["Temporary crown — avoid sticky food"] },
  { id: "bridge", name: "Bridge", category: "Prosthodontics", costRange: { min: 9000, max: 35000 }, defaultCost: 15000, followupDays: 7, commonMedicines: [], commonAdvice: ["Clean under the bridge with floss threader"] },
  { id: "denture_complete", name: "Complete Denture", category: "Prosthodontics", costRange: { min: 5000, max: 15000 }, defaultCost: 10000, followupDays: 3, commonMedicines: [], commonAdvice: ["Practice speaking with new dentures", "Start with soft food", "Remove at night and clean daily"] },
  { id: "denture_partial", name: "Partial Denture", category: "Prosthodontics", costRange: { min: 3000, max: 10000 }, defaultCost: 6000, followupDays: 3, commonMedicines: [], commonAdvice: ["Remove at night", "Clean with soft brush daily"] },

  // ── SURGERY ──
  { id: "extraction_simple", name: "Extraction — Simple", category: "Surgery", costRange: { min: 500, max: 1500 }, defaultCost: 800, followupDays: 7, commonMedicines: ["amoxicillin", "ibuprofen", "pantoprazole"], commonAdvice: ["Bite on gauze for 30 minutes", "Do not spit, suck, or use straw for 24 hours", "Cold compress for first 24 hours", "Warm saline rinse from next day", "Soft diet for 2 days"] },
  { id: "extraction_surgical", name: "Extraction — Surgical / Impaction", category: "Surgery", costRange: { min: 2000, max: 5000 }, defaultCost: 3000, followupDays: 7, commonMedicines: ["amoxclav", "ibuprofen", "pantoprazole", "metronidazole"], commonAdvice: ["Bite on gauze for 45 minutes", "Ice pack for first 24 hours", "Do not spit or use straw", "Soft diet for 3-4 days", "Swelling may increase for 2-3 days — this is normal"] },
  { id: "abscess_drainage", name: "Abscess Incision & Drainage", category: "Surgery", costRange: { min: 500, max: 1500 }, defaultCost: 800, followupDays: 3, commonMedicines: ["amoxclav", "metronidazole", "ibuprofen", "pantoprazole", "warm_saline"], commonAdvice: ["Continue warm saline rinses", "Complete the antibiotic course"] },
  { id: "biopsy", name: "Biopsy", category: "Surgery", costRange: { min: 1000, max: 3000 }, defaultCost: 2000, followupDays: 7, commonMedicines: ["amoxicillin", "ibuprofen"], commonAdvice: ["Avoid disturbing the surgical site"] },

  // ── IMPLANTOLOGY ──
  { id: "implant", name: "Dental Implant", category: "Implantology", costRange: { min: 25000, max: 50000 }, defaultCost: 35000, followupDays: 14, commonMedicines: ["amoxclav", "ibuprofen", "pantoprazole", "chlorhexidine"], commonAdvice: ["Do not chew on implant side for 2 weeks", "Soft diet for 1 week", "Complete antibiotic course", "Follow-up visits are critical for success"] },
  { id: "implant_crown", name: "Implant Crown", category: "Implantology", costRange: { min: 10000, max: 25000 }, defaultCost: 15000, followupDays: 7, commonMedicines: [], commonAdvice: ["Avoid very hard food initially"] },

  // ── ORTHODONTICS ──
  { id: "braces_metal", name: "Braces — Metal", category: "Orthodontics", costRange: { min: 25000, max: 50000 }, defaultCost: 35000, followupDays: 30, commonMedicines: ["lignocaine_gel"], commonAdvice: ["Mild discomfort for 3-5 days is normal", "Use orthodontic wax on brackets", "Avoid hard and sticky food", "Brush carefully around brackets"] },
  { id: "braces_ceramic", name: "Braces — Ceramic", category: "Orthodontics", costRange: { min: 35000, max: 70000 }, defaultCost: 50000, followupDays: 30, commonMedicines: ["lignocaine_gel"], commonAdvice: ["Avoid staining food (tea, coffee, turmeric)"] },
  { id: "retainer", name: "Retainer", category: "Orthodontics", costRange: { min: 2000, max: 5000 }, defaultCost: 3000, followupDays: 90, commonMedicines: [], commonAdvice: ["Wear as directed — full time initially", "Clean retainer daily"] },

  // ── PERIODONTICS ──
  { id: "deep_cleaning", name: "Deep Cleaning / Curettage", category: "Periodontics", costRange: { min: 1000, max: 3000 }, defaultCost: 1500, followupDays: 14, commonMedicines: ["chlorhexidine", "metronidazole"], commonAdvice: ["Sensitivity is normal for 1 week", "Use desensitizing toothpaste"] },
  { id: "flap_surgery", name: "Flap Surgery", category: "Periodontics", costRange: { min: 3000, max: 8000 }, defaultCost: 5000, followupDays: 7, commonMedicines: ["amoxclav", "metronidazole", "ibuprofen", "pantoprazole", "chlorhexidine"], commonAdvice: ["Do not brush surgical area for 1 week", "Soft diet for 3 days"] },
  { id: "splinting", name: "Splinting", category: "Periodontics", costRange: { min: 1000, max: 3000 }, defaultCost: 2000, followupDays: 14, commonMedicines: [], commonAdvice: ["Do not bite hard food on splinted teeth"] },

  // ── PEDIATRIC ──
  { id: "space_maintainer", name: "Space Maintainer", category: "Pediatric", costRange: { min: 1500, max: 3000 }, defaultCost: 2000, followupDays: 30, commonMedicines: [], commonAdvice: ["Do not play with the appliance", "Report if it becomes loose"] },
  { id: "pulp_therapy", name: "Pulp Therapy (Deciduous)", category: "Pediatric", costRange: { min: 1500, max: 3000 }, defaultCost: 2000, followupDays: 7, commonMedicines: ["ibuprofen"], commonAdvice: ["Crown needed for treated tooth"] },

  // ── COSMETIC ──
  { id: "teeth_whitening", name: "Teeth Whitening / Bleaching", category: "Cosmetic", costRange: { min: 5000, max: 15000 }, defaultCost: 8000, followupDays: null, commonMedicines: ["desensitizing_paste"], commonAdvice: ["Avoid colored food/drinks for 48 hours", "Sensitivity is normal for 1-2 days"] },
  { id: "veneer", name: "Veneer (per tooth)", category: "Cosmetic", costRange: { min: 5000, max: 15000 }, defaultCost: 8000, followupDays: 7, commonMedicines: [], commonAdvice: ["Avoid biting hard objects", "Do not use teeth as tools"] },
];

// ─── PROCEDURE CATEGORIES ────────────────────────────
export const PROCEDURE_CATEGORIES = [
  "All", "Diagnostic", "Preventive", "Restorative", "Endodontics",
  "Prosthodontics", "Surgery", "Implantology", "Orthodontics",
  "Periodontics", "Pediatric", "Cosmetic",
];

// ─── COMMON ADVICE TEMPLATES ─────────────────────────
export const ADVICE_TEMPLATES = [
  "Avoid eating for 1 hour after procedure",
  "Avoid very hot or cold food for 24 hours",
  "Soft diet recommended for 2-3 days",
  "Complete the full course of antibiotics",
  "Use warm saline gargle 3-4 times daily",
  "Brush gently with soft bristle toothbrush",
  "Floss daily — use floss threader if needed",
  "Do not smoke for at least 48 hours",
  "If pain persists beyond 3 days, return for review",
  "Mild sensitivity/discomfort is normal",
  "Apply ice pack on cheek for first 24 hours",
  "Do not spit, suck, or use straw for 24 hours",
  "Bite on gauze for 30-45 minutes after extraction",
  "Maintain good oral hygiene",
  "Visit every 6 months for regular check-up",
  "Use desensitizing toothpaste (Sensodyne/similar)",
  "Report immediately if bleeding, swelling, or fever occurs",
];

// ─── TOOTH NUMBERING (FDI) ──────────────────────────
export const TOOTH_NUMBERS = {
  upperRight: ["18","17","16","15","14","13","12","11"],
  upperLeft:  ["21","22","23","24","25","26","27","28"],
  lowerLeft:  ["31","32","33","34","35","36","37","38"],
  lowerRight: ["48","47","46","45","44","43","42","41"],
};
