'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & DATA — SHARED
// ─────────────────────────────────────────────────────────────────────────────

// ── ROLES ────────────────────────────────────────────────────────────────────
// NEW: Role selector shown before mode selection
const ROLES = [
  { id: "product",  label: "Product Designer",  sub: "UI/UX · Apps · Dashboards",      icon: "◈" },
  { id: "graphic",  label: "Graphic Designer",   sub: "Print · Social · Campaigns",     icon: "▣" },
  { id: "branding", label: "Branding Designer",  sub: "Identity · Strategy · Systems",  icon: "◎" },
  { id: "video",    label: "Video Editor",        sub: "Reels · Docs · Brand Films",     icon: "▶" },
];

// ── PRODUCT DESIGN (UNCHANGED) ───────────────────────────────────────────────
const PROJECT_TYPES = [
  { id: "landing",   label: "Landing Page",       sub: "Single-page, conversion-focused",   icon: "◈" },
  { id: "website",   label: "Multi-page Website",  sub: "5–15 pages, full structure",        icon: "▤" },
  { id: "app",       label: "Mobile App",           sub: "iOS or Android product",            icon: "▦" },
  { id: "dashboard", label: "Dashboard / Tool",     sub: "Data-dense, complex interface",     icon: "◫" },
  { id: "redesign",  label: "Redesign",             sub: "Existing product, new direction",   icon: "↺" },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner",     label: "Beginner",  sub: "0–2 years",  rate: 1150, rateMin: 800,  rateMax: 1500,  rangeLabel: "₹800–₹1,500/hr"  },
  { id: "intermediate", label: "Mid-level", sub: "2–5 years",  rate: 2750, rateMin: 1500, rateMax: 4000,  rangeLabel: "₹1,500–₹4,000/hr" },
  { id: "advanced",     label: "Senior",    sub: "5+ years",   rate: 7000, rateMin: 4000, rateMax: 10000, rangeLabel: "₹4,000–₹10,000/hr" },
];

const PLATFORM_OPTIONS = [
  { id: "single", label: "Single Platform",  sub: "Web only, or mobile only",         mult: 1.0 },
  { id: "multi",  label: "Web + Mobile",      sub: "Both platforms · +30% effort",     mult: 1.3 },
];

const FLOW_COMPLEXITY = [
  { id: "simple",   label: "Simple",   sub: "Linear flows, minimal branching",       mult: 1.0, tag: "×1.0" },
  { id: "moderate", label: "Moderate", sub: "Some conditional paths and states",      mult: 1.2, tag: "×1.2" },
  { id: "complex",  label: "Complex",  sub: "Multi-step flows, many edge cases",      mult: 1.5, tag: "×1.5" },
];

const DESIGN_SYSTEM = [
  { id: "none",  label: "No Design System",   sub: "Component library not in scope",    hrs: 0  },
  { id: "basic", label: "Basic System",        sub: "Core tokens + key components",      hrs: 6  },
  { id: "full",  label: "Full System",         sub: "Complete tokens + all components",  hrs: 15 },
];

const REVISION_OPTIONS = [
  { id: 1, label: "1 Cycle",  sub: "+10% to base effort" },
  { id: 2, label: "2 Cycles", sub: "+20% to base effort" },
  { id: 3, label: "3 Cycles", sub: "+30% to base effort" },
  { id: 4, label: "4 Cycles", sub: "+40% to base effort" },
];

const UX_GROUPS = [
  {
    id: "light", label: "Light UX",
    items: [
      { id: "wireframing", label: "Wireframing",        sub: "Included in screen effort",  hrs: 0 },
      { id: "a11y",        label: "Accessibility Audit", sub: "+3 hrs",                    hrs: 3 },
      { id: "other",       label: "Other",               sub: "+3 hrs",                    hrs: 3 },
    ],
  },
  {
    id: "medium", label: "Medium UX",
    items: [
      { id: "personas",    label: "Personas",              sub: "+4 hrs", hrs: 4 },
      { id: "competitor",  label: "Competitor Analysis",   sub: "+5 hrs", hrs: 5 },
      { id: "ia",          label: "Information Architecture", sub: "+6 hrs", hrs: 6 },
      { id: "journeys",    label: "User Journeys",         sub: "+5 hrs", hrs: 5 },
    ],
  },
  {
    id: "deep", label: "Deep UX / Research",
    items: [
      { id: "interviews",  label: "User Interviews",       sub: "+8 hrs",  hrs: 8  },
      { id: "ds_setup",    label: "Design System Setup",   sub: "+12 hrs", hrs: 12 },
      { id: "usability",   label: "Usability Testing",     sub: "+10 hrs", hrs: 10 },
    ],
  },
];

const ALL_UX_ITEMS = UX_GROUPS.flatMap(g => g.items);

const PM_OVERHEAD = [
  { id: "none",     label: "Not applicable",      sub: "Solo execution, no client coordination",      pct: 0    },
  { id: "light",    label: "Minimal coordination", sub: "Async updates, 1–2 check-ins (+10%)",        pct: 0.10 },
  { id: "standard", label: "Active management",   sub: "Scheduled reviews, feedback rounds (+15%)",  pct: 0.15 },
  { id: "heavy",    label: "Full oversight",       sub: "Daily alignment, stakeholder management (+20%)", pct: 0.20 },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — GRAPHIC DESIGN
// ─────────────────────────────────────────────────────────────────────────────

// "Screens" → "Deliverables" (primaryScreens = primary count, secondaryScreens = secondary count)
// primaryScreens  = complex deliverables (e.g. poster, brochure, banner set) → 3 hrs each
// secondaryScreens = simple deliverables (social cards, icons, resizes)       → 1 hr each

// REBALANCED v2 — complexity is the ONLY multiplier (×1.0–1.3 max)
// Brand alignment converted to flat hours (+2 hrs if no guidelines)
const GRAPHIC_COMPLEXITY = [
  { id: "simple",   label: "Simple",   sub: "Flat graphics, minimal elements",        mult: 1.0,  tag: "×1.0"  },
  { id: "moderate", label: "Moderate", sub: "Layered layouts, typography play",       mult: 1.15, tag: "×1.15" },
  { id: "complex",  label: "Complex",  sub: "Illustration, custom art, rich detail",  mult: 1.3,  tag: "×1.3"  },
];

// "Platform" → "Brand Alignment" — now flat hours, not a multiplier
const GRAPHIC_BRAND_ALIGNMENT = [
  { id: "single", label: "Brand Guidelines Provided", sub: "Styles defined · faster execution",       flatHrs: 0 },
  { id: "multi",  label: "Brand to be Developed",     sub: "No guidelines · +2 hrs creative setup",   flatHrs: 2 },
];

// "UX Activities" → "Add-ons" for graphic work — expanded with full industry options
const GRAPHIC_ADDON_GROUPS = [
  {
    id: "production", label: "Production & Delivery",
    items: [
      { id: "copywriting",    label: "Copywriting",              sub: "+2 hrs",   hrs: 2   },
      { id: "resizing",       label: "Multi-size Exports",       sub: "+1 hr",    hrs: 1   },
      { id: "print_setup",    label: "Print Setup / Bleed",      sub: "+1.5 hrs", hrs: 1.5 },
      { id: "file_handoff",   label: "Organised File Handoff",   sub: "+1 hr",    hrs: 1   },
      { id: "source_files",   label: "Source File Prep",         sub: "+1 hr",    hrs: 1   },
    ],
  },
  {
    id: "digital", label: "Digital & Social",
    items: [
      { id: "social_set",     label: "Social Media Template Set",sub: "+3 hrs",   hrs: 3   },
      { id: "email_template", label: "Email Banner / Template",  sub: "+2 hrs",   hrs: 2   },
      { id: "story_reels",    label: "Reels / Stories Format",   sub: "+1.5 hrs", hrs: 1.5 },
      { id: "animated_gif",   label: "Animated GIF / Loop",      sub: "+3 hrs",   hrs: 3   },
      { id: "web_banner",     label: "Web Banner Set",           sub: "+2 hrs",   hrs: 2   },
    ],
  },
  {
    id: "strategy", label: "Strategy & Concepts",
    items: [
      { id: "moodboard",      label: "Moodboard / Stylescape",   sub: "+2 hrs",   hrs: 2   },
      { id: "concepts",       label: "Multiple Concepts (×2)",   sub: "+3 hrs",   hrs: 3   },
      { id: "presentation",   label: "Client Presentation Deck", sub: "+2 hrs",   hrs: 2   },
      { id: "art_direction",  label: "Art Direction Notes",      sub: "+1.5 hrs", hrs: 1.5 },
      { id: "brand_audit",    label: "Visual Brand Audit",       sub: "+2 hrs",   hrs: 2   },
    ],
  },
  {
    id: "packaging", label: "Packaging & Print",
    items: [
      { id: "packaging",      label: "Packaging Design",         sub: "+4 hrs",   hrs: 4   },
      { id: "label_design",   label: "Label / Tag Design",       sub: "+2 hrs",   hrs: 2   },
      { id: "brochure",       label: "Brochure / Leaflet Layout",sub: "+3 hrs",   hrs: 3   },
      { id: "menu_design",    label: "Menu Design",              sub: "+2 hrs",   hrs: 2   },
    ],
  },
];

const ALL_GRAPHIC_ADDONS = GRAPHIC_ADDON_GROUPS.flatMap(g => g.items);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — BRANDING DESIGN
// ─────────────────────────────────────────────────────────────────────────────

// REBALANCED v2:
// primaryScreens  = core brand deliverables → 10 hrs each (logo suite ~10 hrs realistic)
// secondaryScreens = extended assets → 3 hrs each (templates, stationery)

// "Flow Complexity" → Strategy Depth — ONLY multiplier kept
const BRANDING_STRATEGY = [
  { id: "simple",   label: "Execution Only",    sub: "Brief is defined, jump straight to design",  mult: 1.0,  tag: "×1.0"  },
  { id: "moderate", label: "Strategy + Design", sub: "Brand positioning + discovery included",     mult: 1.25, tag: "×1.25" },
  { id: "complex",  label: "Full Strategy",     sub: "Research, positioning, naming, full system", mult: 1.5,  tag: "×1.5"  },
];

// "Platform" → Brand Scope — converted to flat hours (+5 hrs for print), not a multiplier
const BRANDING_SCOPE = [
  { id: "single", label: "Digital Only",     sub: "Online brand assets · screen-first",        flatHrs: 0 },
  { id: "multi",  label: "Digital + Print",  sub: "Full brand across media · +5 hrs print prep", flatHrs: 5 },
];

// "UX Activities" → Branding Add-ons — rebalanced to realistic flat hours
const BRANDING_ADDON_GROUPS = [
  {
    id: "core", label: "Core Deliverables",
    items: [
      { id: "brand_guide",  label: "Brand Guidelines Doc",    sub: "+6 hrs",  hrs: 6  },
      { id: "brand_story",  label: "Brand Story / Narrative", sub: "+3 hrs",  hrs: 3  },
      { id: "naming",       label: "Naming & Tagline",        sub: "+4 hrs",  hrs: 4  },
    ],
  },
  {
    id: "assets", label: "Brand Assets",
    items: [
      { id: "icon_set",    label: "Custom Icon Set",           sub: "+5 hrs",  hrs: 5  },
      { id: "photography", label: "Photography Art Direction", sub: "+3 hrs",  hrs: 3  },
      { id: "motion_logo", label: "Animated Logo",            sub: "+4 hrs",  hrs: 4  },
    ],
  },
  {
    id: "strategy_add", label: "Strategy Add-ons",
    items: [
      { id: "competitor_b", label: "Competitor Audit",                   sub: "+3 hrs", hrs: 3  },
      { id: "archetype",    label: "Brand Archetype Workshop",           sub: "+3 hrs", hrs: 3  },
      { id: "style_alts",   label: "Alternative Style Directions (×3)", sub: "+6 hrs", hrs: 6  },
    ],
  },
];

const ALL_BRANDING_ADDONS = BRANDING_ADDON_GROUPS.flatMap(g => g.items);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — VIDEO EDITING
// ─────────────────────────────────────────────────────────────────────────────

// "Primary Screens" → Output Duration (minutes)
// "Secondary Screens" → Raw Footage Hours

// "Platform" → Footage-to-Output Ratio Multiplier
const VIDEO_FOOTAGE_RATIO = [
  { id: "single", label: "Light Footage  (1–3× output)", sub: "Short brand clips, interviews with script", mult: 1.0 },
  { id: "multi",  label: "Heavy Footage  (4–10× output)", sub: "Events, documentaries, long-form · +30%",  mult: 1.3 },
];

// "Flow Complexity" → Editing Complexity
const VIDEO_COMPLEXITY = [
  { id: "simple",   label: "Basic Cut",       sub: "Linear edit, minimal graphics",         mult: 1.0, tag: "×1.0" },
  { id: "moderate", label: "Motion & Grade",  sub: "B-roll, titles, basic color grade",     mult: 1.3, tag: "×1.3" },
  { id: "complex",  label: "Full Production", sub: "Complex transitions, VFX, sound design", mult: 1.6, tag: "×1.6" },
];

// "UX Activities" → Video Add-ons
const VIDEO_ADDON_GROUPS = [
  {
    id: "post", label: "Post-Production Add-ons",
    items: [
      { id: "subtitles",    label: "Subtitles / Captions",   sub: "+2 hrs per 5 min output",  hrs: 2 },
      { id: "color_grade",  label: "Professional Color Grade", sub: "+3 hrs",                 hrs: 3 },
      { id: "sound_design", label: "Sound Design / Mix",      sub: "+4 hrs",                  hrs: 4 },
    ],
  },
  {
    id: "delivery", label: "Delivery Add-ons",
    items: [
      { id: "multi_format", label: "Multi-platform Exports",  sub: "16:9 + 9:16 + 1:1 · +2 hrs", hrs: 2 },
      { id: "thumbnail",    label: "Thumbnail Design",        sub: "+2 hrs",                  hrs: 2 },
      { id: "scriptwriting",label: "Scriptwriting",           sub: "+5 hrs",                  hrs: 5 },
    ],
  },
];

const ALL_VIDEO_ADDONS = VIDEO_ADDON_GROUPS.flatMap(g => g.items);

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const UTILIZATION_DEFAULT    = 0.75;
const FREELANCE_MULT_DEFAULT = 1.05;
const GST_RATE               = 0.18;

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT LEVEL — adjustment layer for non-product roles only
// ─────────────────────────────────────────────────────────────────────────────
//
//  Three levers, applied AFTER the role-specific hour engine runs:
//    baseHrsMult  → scales the raw deliverable base hours (before multipliers)
//    addonScale   → scales add-on flat hours (e.g. Basic treats addons as lighter)
//    bufferMult   → replaces the role's default ops buffer %
//
//  Rate anchor: Basic uses rateMin, Standard uses (rateMin+rate)/2, Premium uses rate
//  This means level controls BOTH hours AND rate — the two biggest pricing levers.
//
//  Premium = current rebalanced logic (all mults = 1.0, no change to calibrated values).
//  Product design is not affected by this constant at all.

const PROJECT_LEVELS = [
  {
    id:          "basic",
    label:       "Basic",
    sub:         "Quick turnaround, simple brief, price-sensitive client",
    icon:        "·",
    // Hours: lighter base, addons at 60%, minimal buffer
    baseHrsMult: 0.7,   // deliverable base × 0.7 (quicker execution assumed)
    addonScale:  0.6,   // add-on hrs × 0.6 (simpler versions of each add-on)
    bufferMult:  0.05,  // ops buffer = 5% (very lean)
    // Rate: use rateMin as the pricing anchor
    rateAnchor:  "min",
    // Revision cap: 1 cycle at 4%
    revCycles:   1,
    revPct:      0.04,
    tag:         "Budget-friendly",
  },
  {
    id:          "standard",
    label:       "Standard",
    sub:         "Typical freelance project, clear scope, professional output",
    icon:        "◆",
    // Hours: current calibrated base (no scaling), addons at 85%
    baseHrsMult: 1.0,
    addonScale:  0.85,
    bufferMult:  0.08,  // same as current graphic default
    // Rate: midpoint between rateMin and rate midpoint
    rateAnchor:  "mid-low",
    revCycles:   2,
    revPct:      0.05,
    tag:         "Most common",
  },
  {
    id:          "premium",
    label:       "Premium",
    sub:         "High-polish work, senior expectations, agency-grade output",
    icon:        "◈",
    // Hours: premium adds 20% to base (more iteration assumed), full addons
    baseHrsMult: 1.2,
    addonScale:  1.0,
    bufferMult:  0.10,  // current branding buffer — highest for premium
    // Rate: full rate midpoint (current behavior)
    rateAnchor:  "mid",
    revCycles:   2,
    revPct:      0.08,
    tag:         "Agency-grade",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE NOTE (inline, for developer clarity)
// ─────────────────────────────────────────────────────────────────────────────
//
//  calcEstimate(state)
//    └─ if role === "product"   → existing product logic (UNCHANGED)
//    └─ if role === "graphic"   → calcHoursGraphic(state)  → designHrs + scopeRows
//    └─ if role === "branding"  → calcHoursBranding(state) → designHrs + scopeRows
//    └─ if role === "video"     → calcHoursVideo(state)    → designHrs + scopeRows
//
//  All roles share the SAME cost / pricing layers after designHrs is set:
//    effRate = midRate / utilization
//    designCost = designHrs × effRate
//    pmCost = designCost × pmPct
//    total = (designCost + pmCost) × freeMult [+ GST]
//
//  UI field mappings per role:
//    "Primary Screens"    → Graphic: complex deliverables | Branding: core deliverables | Video: output minutes
//    "Secondary Screens"  → Graphic: simple deliverables  | Branding: extended assets   | Video: raw footage hrs
//    "Platform"           → Graphic: brand alignment      | Branding: brand scope        | Video: footage ratio
//    "Flow Complexity"    → Graphic: visual complexity    | Branding: strategy depth     | Video: edit complexity
//    "Design System"      → (not used for non-product; defaulted to "none")
//    "UX Activities"      → Graphic: graphic add-ons      | Branding: brand add-ons      | Video: video add-ons
//
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function roundClean(n) {
  if (n < 10000)  return Math.round(n / 500) * 500;
  if (n < 50000)  return Math.round(n / 1000) * 1000;
  if (n < 200000) return Math.round(n / 2500) * 2500;
  return Math.round(n / 5000) * 5000;
}

function inr(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

// ── GRAPHIC DESIGN HOURS ENGINE — REBALANCED v2 + PROJECT LEVEL ──────────────
//
//  projectLevel controls:
//    lv.baseHrsMult  → scales deliverable base hours before complexity mult
//    lv.addonScale   → scales add-on flat hours
//    lv.bufferMult   → overrides the ops buffer %
//    lv.revCycles    → caps revision cycles
//    lv.revPct       → revision % per cycle
//
//  FLOW:
//  1. complexBase = primaryScreens × 1.5 × lv.baseHrsMult
//  2. simpleBase  = secondaryScreens × 0.5 × lv.baseHrsMult
//  3. afterCX     = (complexBase + simpleBase) × cx  (complexity — ONLY multiplier)
//  4. brandFlat   stays flat hrs (not scaled — it's a setup cost, not deliverable effort)
//  5. addonHrs    = SUM(addons) × lv.addonScale
//  6. scopeBase   = afterCX + brandFlat + addonHrs
//  7. revHrs      = scopeBase × (lv.revCycles × lv.revPct)
//  8. bufHrs      = (scopeBase + revHrs) × lv.bufferMult
//  9. designHrs   = scopeBase + revHrs + bufHrs
//
function calcHoursGraphic(s) {
  const lv        = PROJECT_LEVELS.find(l => l.id === (s.projectLevel || "standard")) || PROJECT_LEVELS[1];
  const cx        = GRAPHIC_COMPLEXITY.find(f => f.id === s.flowComplexity)?.mult || 1.0;
  const brandFlat = GRAPHIC_BRAND_ALIGNMENT.find(p => p.id === s.platform)?.flatHrs ?? 0;
  const rawAddons = s.uxActivities.reduce(
    (sum, id) => sum + (ALL_GRAPHIC_ADDONS.find(u => u.id === id)?.hrs || 0), 0
  );
  const addonHrs  = rawAddons * lv.addonScale;

  const complexBase = (s.primaryScreens  || 0) * 1.5 * lv.baseHrsMult;
  const simpleBase  = (s.secondaryScreens || 0) * 0.5 * lv.baseHrsMult;
  const screenBase  = complexBase + simpleBase;
  const afterCX     = screenBase * cx;
  const cxAdj       = afterCX - screenBase;

  const scopeBase   = afterCX + brandFlat + addonHrs;
  const revHrs      = scopeBase * (lv.revCycles * lv.revPct);
  const bufHrs      = (scopeBase + revHrs) * lv.bufferMult;
  const designHrs   = scopeBase + revHrs + bufHrs;

  const lvLabel = `${lv.label} level`;
  const scopeRows: any[] = [
    { label: `Complex deliverables (${s.primaryScreens} × ${(1.5 * lv.baseHrsMult).toFixed(1)} hrs)`, note: `${complexBase.toFixed(1)} hrs`, hrs: complexBase },
    { label: `Simple deliverables (${s.secondaryScreens} × ${(0.5 * lv.baseHrsMult).toFixed(1)} hr)`,  note: `${simpleBase.toFixed(1)} hrs`,  hrs: simpleBase  },
  ];
  if (cx > 1)        scopeRows.push({ label: `Visual complexity (×${cx})`,             note: `+${(cxAdj).toFixed(1)} hrs`,    hrs: cxAdj    });
  if (brandFlat > 0) scopeRows.push({ label: `Brand setup (no guidelines)`,            note: `+${brandFlat} hrs`,             hrs: brandFlat });
  if (addonHrs > 0)  scopeRows.push({ label: `Add-ons · ${lvLabel} (×${lv.addonScale})`, note: `+${addonHrs.toFixed(1)} hrs`, hrs: addonHrs });
  scopeRows.push({ label: `Revisions (${lv.revCycles} × ${Math.round(lv.revPct * 100)}%)`, note: `+${revHrs.toFixed(1)} hrs`, hrs: revHrs });
  scopeRows.push({ label: `Ops buffer (${Math.round(lv.bufferMult * 100)}%)`,              note: `+${bufHrs.toFixed(1)} hrs`, hrs: bufHrs });

  const hrsDetail = {
    complexBase: +complexBase.toFixed(1),
    simpleBase:  +simpleBase.toFixed(1),
    addonHrs:    +addonHrs.toFixed(1),
    revHrs:      +revHrs.toFixed(1),
    bufHrs:      +bufHrs.toFixed(1),
  };

  return { designHrs, scopeRows, hrsDetail };
}

// ── BRANDING DESIGN HOURS ENGINE — REBALANCED v2 + PROJECT LEVEL ─────────────
//
//  projectLevel controls same levers as graphic:
//    lv.baseHrsMult  → scales core + extended deliverable base hrs
//    lv.addonScale   → scales add-on flat hours
//    lv.bufferMult   → overrides ops buffer %
//    lv.revCycles / lv.revPct → revision parameters
//
//  FLOW:
//  1. coreBase     = primaryScreens × 10 × lv.baseHrsMult
//  2. extendedBase = secondaryScreens × 3 × lv.baseHrsMult
//  3. afterStrategy = (coreBase + extendedBase) × st  (strategy depth — ONLY multiplier)
//  4. scopeFlat    stays flat hrs (print setup cost, not scaled)
//  5. addonHrs     = SUM(addons) × lv.addonScale
//  6. scopeBase    = afterStrategy + scopeFlat + addonHrs
//  7. revHrs       = scopeBase × (lv.revCycles × lv.revPct)
//  8. bufHrs       = (scopeBase + revHrs) × lv.bufferMult
//  9. designHrs    = scopeBase + revHrs + bufHrs
//
function calcHoursBranding(s) {
  const lv        = PROJECT_LEVELS.find(l => l.id === (s.projectLevel || "standard")) || PROJECT_LEVELS[1];
  const st        = BRANDING_STRATEGY.find(f => f.id === s.flowComplexity)?.mult || 1.0;
  const scopeFlat = BRANDING_SCOPE.find(p => p.id === s.platform)?.flatHrs ?? 0;
  const rawAddons = s.uxActivities.reduce(
    (sum, id) => sum + (ALL_BRANDING_ADDONS.find(u => u.id === id)?.hrs || 0), 0
  );
  const addonHrs  = rawAddons * lv.addonScale;

  const coreBase      = (s.primaryScreens  || 0) * 10 * lv.baseHrsMult;
  const extendedBase  = (s.secondaryScreens || 0) * 3  * lv.baseHrsMult;
  const delivBase     = coreBase + extendedBase;

  const afterStrategy = delivBase * st;
  const stAdj         = afterStrategy - delivBase;

  const scopeBase     = afterStrategy + scopeFlat + addonHrs;
  const revHrs        = scopeBase * (lv.revCycles * lv.revPct);
  const bufHrs        = (scopeBase + revHrs) * lv.bufferMult;
  const designHrs     = scopeBase + revHrs + bufHrs;

  const lvLabel = `${lv.label} level`;
  const scopeRows: any[] = [
    { label: `Core brand deliverables (${s.primaryScreens} × ${(10 * lv.baseHrsMult).toFixed(0)} hrs)`,  note: `${coreBase.toFixed(0)} hrs`,     hrs: coreBase     },
    { label: `Extended brand assets (${s.secondaryScreens} × ${(3 * lv.baseHrsMult).toFixed(1)} hrs)`,   note: `${extendedBase.toFixed(1)} hrs`, hrs: extendedBase },
  ];
  if (st > 1)        scopeRows.push({ label: `Strategy depth (×${st})`,                note: `+${stAdj.toFixed(0)} hrs`,      hrs: stAdj    });
  if (scopeFlat > 0) scopeRows.push({ label: `Print scope preparation`,                note: `+${scopeFlat} hrs`,             hrs: scopeFlat });
  if (addonHrs > 0)  scopeRows.push({ label: `Add-ons · ${lvLabel} (×${lv.addonScale})`, note: `+${addonHrs.toFixed(1)} hrs`, hrs: addonHrs });
  scopeRows.push({ label: `Revisions (${lv.revCycles} × ${Math.round(lv.revPct * 100)}%)`, note: `+${revHrs.toFixed(1)} hrs`, hrs: revHrs });
  scopeRows.push({ label: `Ops buffer (${Math.round(lv.bufferMult * 100)}%)`,              note: `+${bufHrs.toFixed(1)} hrs`, hrs: bufHrs });

  const hrsDetail = {
    coreBase:      +coreBase.toFixed(0),
    extendedBase:  +extendedBase.toFixed(1),
    addonHrs:      +addonHrs.toFixed(1),
    revHrs:        +revHrs.toFixed(1),
    bufHrs:        +bufHrs.toFixed(1),
  };

  return { designHrs, scopeRows, hrsDetail };
}

// ── VIDEO EDITING HOURS ENGINE ───────────────────────────────────────────────
//
//  PSEUDOCODE (calcHoursVideo):
//  ─────────────────────────────
//  INPUT: primaryScreens (output duration in minutes), secondaryScreens (raw footage hrs),
//         platform (footage ratio mult), flowComplexity (edit complexity mult),
//         uxActivities (video add-on IDs), revisions
//
//  1. BASE EFFORT: outputMins × 1.5 hrs/min (editing takes ~1.5 hrs per output minute)
//  2. footageAdj  = If heavy footage: secondaryScreens × 0.5 (each raw footage hr adds effort)
//  3. durationBase = outputMins × 1.5 + footageAdj
//  4. afterRatio   = durationBase × VIDEO_FOOTAGE_RATIO[platform].mult
//  5. afterCX      = afterRatio   × VIDEO_COMPLEXITY[flowComplexity].mult
//  6. addonHrs     = SUM(selected uxActivities hrs from ALL_VIDEO_ADDONS)
//  7. scopeBase    = afterCX + addonHrs
//  8. revHrs       = scopeBase × (revisions × 0.10)
//  9. bufHrs       = (scopeBase + revHrs) × 0.15
//  10. designHrs   = scopeBase + revHrs + bufHrs
//
function calcHoursVideo(s) {
  const fr   = VIDEO_FOOTAGE_RATIO.find(p => p.id === s.platform)?.mult || 1.0;
  const cx   = VIDEO_COMPLEXITY.find(f => f.id === s.flowComplexity)?.mult || 1.3;
  const addonHrs = s.uxActivities.reduce(
    (sum, id) => sum + (ALL_VIDEO_ADDONS.find(u => u.id === id)?.hrs || 0), 0
  );

  const outputMins    = s.primaryScreens  || 0;   // reused as "output duration (minutes)"
  const rawFootageHrs = s.secondaryScreens || 0;  // reused as "raw footage hours"

  const durationBase  = outputMins * 1.5;                // 1.5 hrs editing per output minute
  const footageAdj    = rawFootageHrs * 0.5;             // 0.5 hrs per raw footage hour
  const baseHrs       = durationBase + footageAdj;
  const afterRatio    = baseHrs * fr;
  const afterCX       = afterRatio * cx;
  const scopeBase     = afterCX + addonHrs;
  const revHrs        = scopeBase * (s.revisions * 0.10);
  const bufHrs        = (scopeBase + revHrs) * 0.15;
  const designHrs     = scopeBase + revHrs + bufHrs;

  const frAdj = afterRatio - baseHrs;
  const cxAdj = afterCX - afterRatio;

  const scopeRows = [
    { label: `Output duration (${outputMins} min × 1.5 hrs/min)`,     note: `${durationBase} hrs`,              hrs: durationBase },
  ];
  if (rawFootageHrs > 0) scopeRows.push({ label: `Raw footage overhead (${rawFootageHrs} hrs × 0.5)`, note: `+${footageAdj} hrs`, hrs: footageAdj });
  if (fr > 1)       scopeRows.push({ label: "Heavy footage ratio (+30%)",         note: `+${Math.round(frAdj)} hrs`, hrs: frAdj   });
  if (cx > 1)       scopeRows.push({ label: `Edit complexity (×${cx})`,          note: `+${Math.round(cxAdj)} hrs`, hrs: cxAdj   });
  if (addonHrs > 0) scopeRows.push({ label: `Video add-ons (+${addonHrs} hrs)`,  note: `+${addonHrs} hrs`,          hrs: addonHrs });
  scopeRows.push({ label: `Revisions (${s.revisions} × 10%)`, note: `+${Math.round(revHrs)} hrs`, hrs: revHrs });
  scopeRows.push({ label: "Operational buffer (15%)",          note: `+${Math.round(bufHrs)} hrs`, hrs: bufHrs });

  const hrsDetail = {
    durationBase,
    footageAdj,
    addonHrs,
    revHrs: Math.round(revHrs),
    bufHrs: Math.round(bufHrs),
  };

  return { designHrs, scopeRows, hrsDetail };
}

// ── UNIFIED CALCULATION ENGINE ────────────────────────────────────────────────
// This is the ONLY function that the app calls. It dispatches by role.
// Product design logic is completely unchanged — just wrapped in a role guard.

function calcEstimate(s) {
  const expLevel    = EXPERIENCE_LEVELS.find(e => e.id === s.experience);
  const role        = s.role || "product";
  const lv          = PROJECT_LEVELS.find(l => l.id === (s.projectLevel || "standard")) || PROJECT_LEVELS[1];

  // Product design: completely unchanged rate logic.
  // Non-product roles: rate anchor is driven by projectLevel.
  //   Basic    → rateMin  (lower bound — budget clients, quick jobs)
  //   Standard → (rateMin + rate) / 2  (realistic middle ground)
  //   Premium  → rate midpoint (full market midpoint — current behavior)
  // Max rate for range ceiling: one bracket above midRate in all non-product cases.
  let midRate: number;
  let maxRate: number;
  if (role === "product") {
    midRate = expLevel?.rate    || 2750;
    maxRate = expLevel?.rateMax || midRate * 1.45;
  } else {
    const rMin = expLevel?.rateMin || 800;
    const rMid = expLevel?.rate    || 2750;
    if (lv.rateAnchor === "min") {
      midRate = rMin;
      maxRate = rMid;                           // low: rateMin, high: midpoint
    } else if (lv.rateAnchor === "mid-low") {
      midRate = Math.round((rMin + rMid) / 2);
      maxRate = rMid;                           // low: halfway, high: midpoint
    } else {
      // "mid" = Premium: same as previous v2 behavior
      midRate = rMid;
      maxRate = expLevel?.rateMax || rMid * 1.45;
    }
  }

  const utilization = s.utilizationRate  ?? UTILIZATION_DEFAULT;
  const freeMult    = s.freelanceMult    ?? FREELANCE_MULT_DEFAULT;
  const pmPct       = PM_OVERHEAD.find(p => p.id === (s.pmOverhead || "standard"))?.pct ?? 0.15;

  // Custom rate override: if the freelancer has set their own ₹/hr,
  // derive a professional range around it: low = custom rate (after utilization),
  // high = custom rate × 1.2 (accounts for premium positioning / complexity variance).
  // This gives a meaningful range instead of a flat single value.
  if (s.customRate && Number(s.customRate) > 0) {
    const cr = Number(s.customRate);
    midRate  = cr;
    maxRate  = Math.round(cr * 1.20); // +20% spread for the upper estimate
  }

  const effRateMid = midRate / utilization;
  const effRateMax = maxRate / utilization;

  let designHrs, hrsDetail, scopeRows;

  // ── PRODUCT DESIGN (UNCHANGED) ─────────────────────────────────────────────
  if (!s.role || s.role === "product") {
    if (s.mode === "quick") {
      const base   = Number(s.hours) || 0;
      const revHrs = base * (s.revisions * 0.10);
      const bufHrs = (base + revHrs) * 0.15;
      designHrs    = base + revHrs + bufHrs;
      hrsDetail    = { base, revHrs: Math.round(revHrs), bufHrs: Math.round(bufHrs) };
      scopeRows    = [
        { label: "Your estimated hours",              note: `${base} hrs`,               hrs: base   },
        { label: `Revisions (${s.revisions} × 10%)`,  note: `+${Math.round(revHrs)} hrs`, hrs: revHrs },
        { label: "Operational buffer (15%)",           note: `+${Math.round(bufHrs)} hrs`, hrs: bufHrs },
      ];
    } else {
      const fc     = FLOW_COMPLEXITY.find(f => f.id === s.flowComplexity)?.mult || 1.2;
      const pl     = PLATFORM_OPTIONS.find(p => p.id === s.platform)?.mult || 1.0;
      const dsHrs  = DESIGN_SYSTEM.find(d => d.id === s.designSystem)?.hrs || 0;
      const uxHrs  = s.uxActivities.reduce((sum, id) => sum + (ALL_UX_ITEMS.find(u => u.id === id)?.hrs || 0), 0);

      const primaryHrs   = s.primaryScreens   * 4;
      const secondaryHrs = s.secondaryScreens * 1.5;
      const screenBase   = primaryHrs + secondaryHrs;
      const afterFC      = screenBase * fc;
      const afterPL      = afterFC * pl;
      const scopeBase    = afterPL + dsHrs + uxHrs;
      const revHrs       = scopeBase * (s.revisions * 0.10);
      const bufHrs       = (scopeBase + revHrs) * 0.15;
      designHrs          = scopeBase + revHrs + bufHrs;

      const fcAdj = afterFC - screenBase;
      const plAdj = afterPL - afterFC;

      hrsDetail = {
        primaryHrs,
        secondaryHrs: Math.round(secondaryHrs),
        uxHrs,
        dsHrs,
        revHrs: Math.round(revHrs),
        bufHrs: Math.round(bufHrs),
      };

      scopeRows = [
        { label: `Primary screens (${s.primaryScreens} × 4 hrs)`,     note: `${primaryHrs} hrs`,                 hrs: primaryHrs   },
        { label: `Secondary screens (${s.secondaryScreens} × 1.5 hrs)`,  note: `${Math.round(secondaryHrs)} hrs`,   hrs: secondaryHrs },
      ];
      if (fc > 1)    scopeRows.push({ label: `Flow complexity (×${fc})`,      note: `+${Math.round(fcAdj)} hrs`, hrs: fcAdj  });
      if (pl > 1)    scopeRows.push({ label: "Multi-platform (×1.3)",         note: `+${Math.round(plAdj)} hrs`, hrs: plAdj  });
      if (dsHrs > 0) scopeRows.push({ label: `Design system (+${dsHrs} hrs)`, note: `+${dsHrs} hrs`,             hrs: dsHrs  });
      if (uxHrs > 0) scopeRows.push({ label: `UX research (+${uxHrs} hrs)`,   note: `+${uxHrs} hrs`,             hrs: uxHrs  });
      scopeRows.push({ label: `Revisions (${s.revisions} × 10%)`,  note: `+${Math.round(revHrs)} hrs`, hrs: revHrs });
      scopeRows.push({ label: "Operational buffer (15%)",           note: `+${Math.round(bufHrs)} hrs`, hrs: bufHrs });
    }
  }
  // ── GRAPHIC DESIGN ─────────────────────────────────────────────────────────
  else if (s.role === "graphic") {
    if (s.mode === "quick") {
      const base   = Number(s.hours) || 0;
      const revHrs = base * (s.revisions * 0.10);
      const bufHrs = (base + revHrs) * 0.15;
      designHrs    = base + revHrs + bufHrs;
      hrsDetail    = { base, revHrs: Math.round(revHrs), bufHrs: Math.round(bufHrs) };
      scopeRows    = [
        { label: "Your estimated hours",              note: `${base} hrs`,               hrs: base   },
        { label: `Revisions (${s.revisions} × 10%)`,  note: `+${Math.round(revHrs)} hrs`, hrs: revHrs },
        { label: "Operational buffer (15%)",           note: `+${Math.round(bufHrs)} hrs`, hrs: bufHrs },
      ];
    } else {
      const result  = calcHoursGraphic(s);
      designHrs     = result.designHrs;
      scopeRows     = result.scopeRows;
      hrsDetail     = result.hrsDetail;
    }
  }
  // ── BRANDING DESIGN ────────────────────────────────────────────────────────
  else if (s.role === "branding") {
    if (s.mode === "quick") {
      const base   = Number(s.hours) || 0;
      const revHrs = base * (s.revisions * 0.10);
      const bufHrs = (base + revHrs) * 0.15;
      designHrs    = base + revHrs + bufHrs;
      hrsDetail    = { base, revHrs: Math.round(revHrs), bufHrs: Math.round(bufHrs) };
      scopeRows    = [
        { label: "Your estimated hours",              note: `${base} hrs`,               hrs: base   },
        { label: `Revisions (${s.revisions} × 10%)`,  note: `+${Math.round(revHrs)} hrs`, hrs: revHrs },
        { label: "Operational buffer (15%)",           note: `+${Math.round(bufHrs)} hrs`, hrs: bufHrs },
      ];
    } else {
      const result  = calcHoursBranding(s);
      designHrs     = result.designHrs;
      scopeRows     = result.scopeRows;
      hrsDetail     = result.hrsDetail;
    }
  }
  // ── VIDEO EDITING ──────────────────────────────────────────────────────────
  else if (s.role === "video") {
    if (s.mode === "quick") {
      const base   = Number(s.hours) || 0;
      const revHrs = base * (s.revisions * 0.10);
      const bufHrs = (base + revHrs) * 0.15;
      designHrs    = base + revHrs + bufHrs;
      hrsDetail    = { base, revHrs: Math.round(revHrs), bufHrs: Math.round(bufHrs) };
      scopeRows    = [
        { label: "Your estimated hours",              note: `${base} hrs`,               hrs: base   },
        { label: `Revisions (${s.revisions} × 10%)`,  note: `+${Math.round(revHrs)} hrs`, hrs: revHrs },
        { label: "Operational buffer (15%)",           note: `+${Math.round(bufHrs)} hrs`, hrs: bufHrs },
      ];
    } else {
      const result  = calcHoursVideo(s);
      designHrs     = result.designHrs;
      scopeRows     = result.scopeRows;
      hrsDetail     = result.hrsDetail;
    }
  }

  // ── SHARED COST LAYERS (identical for all roles) ──────────────────────────
  const designCostMid = designHrs * effRateMid;
  const designCostMax = designHrs * effRateMax;
  const pmCostMid     = designCostMid * pmPct;
  const pmCostMax     = designCostMax * pmPct;
  const projectCostMid = (designCostMid + pmCostMid) * freeMult;
  const projectCostMax = (designCostMax + pmCostMax) * freeMult;
  const gstMid    = s.includeGST ? projectCostMid * GST_RATE : 0;
  const gstMax    = s.includeGST ? projectCostMax * GST_RATE : 0;
  const totalMid  = projectCostMid + gstMid;
  const totalMax  = projectCostMax + gstMax;
  const breakdown = scopeRows.map(r => ({ ...r, amount: r.hrs * effRateMid }));

  return {
    totalHrs:    Math.round(designHrs),
    effRateMid:  Math.round(effRateMid),
    midRate,
    utilization,
    freeMult,
    pmPct,
    designCostMid,
    pmCostMid,
    premiumCostMid: (designCostMid + pmCostMid) * (freeMult - 1),
    gstMid,
    totalMid,
    low:  roundClean(totalMid),
    high: roundClean(totalMax),
    breakdown,
    hrsDetail,
    expLevel,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// JUSTIFICATION — role-aware but same structure
// ─────────────────────────────────────────────────────────────────────────────

function buildJustification(s, est) {
  const role     = s.role || "product";
  const expLevel = est.expLevel || EXPERIENCE_LEVELS.find(e => e.id === s.experience);
  const expLbl   = expLevel?.label || "professional";
  const pmLabel  = PM_OVERHEAD.find(p => p.id === (s.pmOverhead || "standard"))?.label?.toLowerCase() || "standard";

  let projectDesc = "";
  let addonLine   = "";

  if (role === "product") {
    const pt = PROJECT_TYPES.find(p => p.id === s.projectType)?.label || "design project";
    const uxNames = s.uxActivities.map(id => ALL_UX_ITEMS.find(u => u.id === id)?.label).filter(Boolean);
    projectDesc = `${pt.toLowerCase()} product design project`;
    addonLine   = uxNames.length ? `\n\nThe engagement includes structured UX research — ${uxNames.slice(0, 4).join(", ")}${uxNames.length > 4 ? ", and more" : ""}.` : "";
  } else if (role === "graphic") {
    const totalDel = (s.primaryScreens || 0) + (s.secondaryScreens || 0);
    const addonNames = s.uxActivities.map(id => ALL_GRAPHIC_ADDONS.find(u => u.id === id)?.label).filter(Boolean);
    projectDesc = `graphic design project covering ${totalDel} deliverable${totalDel !== 1 ? "s" : ""}`;
    addonLine   = addonNames.length ? `\n\nAdditional services included: ${addonNames.join(", ")}.` : "";
  } else if (role === "branding") {
    const coreCount = s.primaryScreens || 0;
    const extCount  = s.secondaryScreens || 0;
    const addonNames = s.uxActivities.map(id => ALL_BRANDING_ADDONS.find(u => u.id === id)?.label).filter(Boolean);
    projectDesc = `branding project with ${coreCount} core deliverable${coreCount !== 1 ? "s" : ""}${extCount > 0 ? ` + ${extCount} extended asset${extCount !== 1 ? "s" : ""}` : ""}`;
    addonLine   = addonNames.length ? `\n\nScope also includes: ${addonNames.join(", ")}.` : "";
  } else if (role === "video") {
    const mins    = s.primaryScreens || 0;
    const rawHrs  = s.secondaryScreens || 0;
    const addonNames = s.uxActivities.map(id => ALL_VIDEO_ADDONS.find(u => u.id === id)?.label).filter(Boolean);
    projectDesc = `video editing project with ${mins} minute${mins !== 1 ? "s" : ""} of output${rawHrs > 0 ? ` and ${rawHrs} hours of raw footage` : ""}`;
    addonLine   = addonNames.length ? `\n\nPost-production services included: ${addonNames.join(", ")}.` : "";
  }

  const gstLine = s.includeGST ? ` GST (18%) of ${inr(est.gstMid)} is included.` : "";

  return `This is a ${projectDesc} requiring approximately ${est.totalHrs} hours.${addonLine}

Pricing reflects ${expLbl.toLowerCase()} market rates (${expLevel?.rangeLabel || ""}). A utilization adjustment accounts for ${Math.round((1 - est.utilization) * 100)}% non-billable time — admin, client communication, and business development — raising the effective rate to ${inr(est.effRateMid)}/hr.

A ${est.freeMult}× freelance sustainability premium is applied to cover costs salaried professionals do not carry: software subscriptions, hardware, health insurance, and business risk. ${pmLabel !== "none" ? `${pmLabel.charAt(0).toUpperCase() + pmLabel.slice(1)} project management overhead (${Math.round(est.pmPct * 100)}%) is included for coordination and reviews.` : ""}${gstLine}

The suggested professional range is ${inr(est.low)} – ${inr(est.high)}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE-AWARE UI LABEL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getPrimaryLabel(role) {
  if (role === "graphic")  return { label: "Complex Deliverables", unit: "items", hint: "Posters, brochures, banner sets (3 hrs each)", ph: "4" };
  if (role === "branding") return { label: "Core Brand Deliverables", unit: "items", hint: "Logo suite, brand identity, guidelines (12 hrs each)", ph: "2" };
  if (role === "video")    return { label: "Output Duration", unit: "minutes", hint: "Final video length in minutes (1.5 hrs per minute)", ph: "5" };
  return { label: "Primary screens", unit: "screens", hint: "Distinct full-page views (4 hrs each)", ph: "8" };
}

function getSecondaryLabel(role) {
  if (role === "graphic")  return { label: "Simple Deliverables", unit: "items", hint: "Social cards, icons, resizes (1 hr each)", ph: "6" };
  if (role === "branding") return { label: "Extended Brand Assets", unit: "items", hint: "Social templates, stationery, signage (4 hrs each)", ph: "3" };
  if (role === "video")    return { label: "Raw Footage", unit: "hours", hint: "Total hours of footage to review (optional)", ph: "0" };
  return { label: "Secondary screens", unit: "screens", hint: "Modals, overlays, empty states (1.5 hrs each)", ph: "0" };
}

function getComplexityOptions(role) {
  if (role === "graphic")  return GRAPHIC_COMPLEXITY;
  if (role === "branding") return BRANDING_STRATEGY;
  if (role === "video")    return VIDEO_COMPLEXITY;
  return FLOW_COMPLEXITY;
}

function getPlatformOptions(role) {
  if (role === "graphic")  return GRAPHIC_BRAND_ALIGNMENT;
  if (role === "branding") return BRANDING_SCOPE;
  if (role === "video")    return VIDEO_FOOTAGE_RATIO;
  return PLATFORM_OPTIONS;
}

function getAddonGroups(role) {
  if (role === "graphic")  return GRAPHIC_ADDON_GROUPS;
  if (role === "branding") return BRANDING_ADDON_GROUPS;
  if (role === "video")    return VIDEO_ADDON_GROUPS;
  return UX_GROUPS;
}

function getAllAddons(role) {
  if (role === "graphic")  return ALL_GRAPHIC_ADDONS;
  if (role === "branding") return ALL_BRANDING_ADDONS;
  if (role === "video")    return ALL_VIDEO_ADDONS;
  return ALL_UX_ITEMS;
}

function getAddonStepTitle(role) {
  if (role === "graphic")  return { titleEl: <>Which graphic <em>add-ons</em> are included?</>,  title: "Which graphic add-ons are included?",  sub: "Select additional production or strategy services." };
  if (role === "branding") return { titleEl: <>Which brand <em>add-ons</em> are included?</>,    title: "Which brand add-ons are included?",    sub: "Select additional brand strategy or asset deliverables." };
  if (role === "video")    return { titleEl: <>Which <em>post-production</em> add-ons are included?</>, title: "Which post-production add-ons are included?", sub: "Select additional video services in scope." };
  return { titleEl: <>Which <em>UX activities</em> are included?</>, title: "Which UX activities are included?", sub: "Select all activities in scope." };
}

function getComplexityStepTitle(role) {
  if (role === "graphic")  return { titleEl: <>What's the <em>visual complexity?</em></>,          title: "Visual complexity?",                    sub: "Affects effort per deliverable." };
  if (role === "branding") return { titleEl: <>How deep is the <em>brand strategy?</em></>,        title: "How deep is the brand strategy?",        sub: "Strategy depth multiplies overall engagement effort." };
  if (role === "video")    return { titleEl: <>What's the <em>editing complexity?</em></>,          title: "What's the editing complexity?",         sub: "More complex edits multiply hours per output minute." };
  return { titleEl: <>How complex are the <em>user flows?</em></>, title: "How complex are the user flows?", sub: "Flow complexity multiplies screen effort to account for design decisions at each branch point." };
}

function getPlatformStepTitle(role) {
  if (role === "graphic")  return { titleEl: <>Are <em>brand guidelines</em> provided?</>,          title: "Are brand guidelines provided?",          sub: "Developing new brand styles adds ~30% effort." };
  if (role === "branding") return { titleEl: <>What is the <em>brand scope?</em></>,                title: "What is the brand scope?",                sub: "Adding print to digital scope increases total effort by 30%." };
  if (role === "video")    return { titleEl: <>What is the <em>footage-to-output ratio?</em></>,    title: "What is the footage-to-output ratio?",    sub: "Heavy raw footage means more review and culling time." };
  return { titleEl: <>Which <em>platforms</em> are in scope?</>, title: "Which platforms are in scope?", sub: "Designing for multiple platforms multiplies screen effort by 1.3×." };
}

function getScopeStepTitle(role) {
  if (role === "graphic")  return { titleEl: <>How many <em>deliverables</em> does this project have?</>, title: "How many deliverables does this project have?", sub: "Complex = posters, brochures, full layouts (3 hrs each). Simple = social cards, resizes, icons (1 hr each)." };
  if (role === "branding") return { titleEl: <>What does this <em>branding project</em> cover?</>,        title: "What does this branding project cover?",        sub: "Core = logo, identity, guidelines (12 hrs each). Extended = templates, stationery, signage (4 hrs each)." };
  if (role === "video")    return { titleEl: <>What are the <em>video specs?</em></>,                     title: "What are the video specs?",                     sub: "Output duration drives base hours. Raw footage adds review time." };
  return { titleEl: <>How many <em>screens</em> does this project have?</>, title: "How many screens does this project have?", sub: "Primary screens = distinct full-page views (4 hrs each).\nSecondary = modals, overlays, empty states (1.5 hrs each)." };
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS — unchanged from original + role selector additions
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Instrument+Sans:wght@300;400;500&family=DM+Mono:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:           #FAF8F5;
  --surface:      #FFFFFF;
  --panel:        #F4F0EB;
  --ink:          #2C2820;
  --ink2:         #5C5650;
  --ink3:         #9A948E;
  --gold:         #C97D0A;
  --gold-l:       #FDF3E0;
  --gold-d:       #8B5A07;
  --gold-bd:      #EDD49A;
  --border:       #EAE5DE;
  --border2:      #D4CDC5;
  --btn-bg:       #5C4A2E;
  --btn-text:     #FFFDF9;
  --btn-hover:    #4A3A22;
  --success:      #2A6B40;
  --sbg:          #EEF6F2;
  --success-bd:   #C0DDC8;
  --warn-bg:      #FDFAF0;
  --warn-bd:      #EAD9A0;
  --warn-tx:      #7A6020;
  --danger:       #C0392B;
  --danger-l:     #FDF0EE;
  --danger-bd:    #F0C0B8;
  --hover-surface: #FEFCF8;
  --mob-bg:       #4A3A22;
  --mob-text:     #FDF8F0;
  --mob-muted:    rgba(253,248,240,0.60);
  --mob-hint:     rgba(253,248,240,0.40);
  --purple-bg:    #F2EEF9;
  --purple-text:  #5B3FA6;
  --purple-bd:    #D5CAF0;
  --blue-bg:      #EEF4FF;
  --blue-text:    #3B57C4;
  --blue-bd:      #C8D5F5;
  --blue-hover:   #E0EAFF;
  --featured-bd:  #E0C87E;
  --save-hover:   #F0DFA0;
  --header-bg:    rgba(250, 248, 245, 0.94);
  --serif:   'Cormorant Garamond', Georgia, serif;
  --sans:    'Instrument Sans', system-ui, sans-serif;
  --mono:    'DM Mono', 'Fira Mono', monospace;
  --r:       11px;
  --r2:      15px;
  --t:       0.2s cubic-bezier(.4,0,.2,1);
}

html, body {
  min-height: 100%;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  -webkit-font-smoothing: antialiased;
}

.layout {
  display: flex;
  min-height: 100vh;
  max-width: 1120px;
  margin: 0 auto;
}

.main-col {
  flex: 1;
  min-width: 0;
  padding: 0 0 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.main-inner {
  width: 100%;
  max-width: 760px;
  padding: 36px 40px 0;
}

@media (max-width: 900px) {
  .main-inner { padding: 28px 24px 0; }
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 36px 24px;
  background: var(--panel);
}

@media (max-width: 768px) {
  .sidebar { display: none; }
}

.header-sticky {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--header-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  transition: background var(--t), border-color var(--t);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 40px;
  max-width: 760px;
  width: 100%;
  gap: 8px;
  min-width: 0;
}

@media (max-width: 900px) {
  .app-header { padding: 12px 24px; }
}

/* Shared inner-width constraint — all header children use this */
.header-row {
  max-width: 760px;
  width: 100%;
  padding-left: 40px;
  padding-right: 40px;
}
@media (max-width: 900px) {
  .header-row { padding-left: 24px; padding-right: 24px; }
}

.logo { font-family: var(--serif); font-size: 15px; font-weight: 500; letter-spacing: 0.06em; color: var(--ink); flex-shrink: 0; }
.logo span { color: var(--gold); }

/* Header right cluster — never overflows its side */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
}

/* Persistent "New estimate" button in header */
.header-new-btn {
  font-size: 11.5px; font-weight: 400; font-family: var(--sans);
  color: var(--ink3); background: none;
  border: 1px solid var(--border2); border-radius: 20px;
  padding: 4px 11px; cursor: pointer;
  transition: color var(--t), border-color var(--t);
  white-space: nowrap; flex-shrink: 0;
}
.header-new-btn:hover { color: var(--ink); border-color: var(--ink3); }

/* Role badge — hidden on small mobile, shown on tablet+ */
.role-badge {
  font-size: 10.5px; font-weight: 500; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--gold-d);
  background: var(--gold-l); border: 1px solid var(--gold-bd);
  border-radius: 20px; padding: 3px 10px;
  white-space: nowrap; flex-shrink: 0;
}
@media (max-width: 560px) {
  /* Hide role badge on small screens — stepper already shows this context */
  .role-badge { display: none; }
  /* Shrink +New label */
  .header-new-btn { padding: 4px 9px; font-size: 11px; }
}

/* Desktop: verbose "Step 3 of 9" */
.step-counter {
  font-size: 11px; font-weight: 300; color: var(--ink3); letter-spacing: 0.08em;
  white-space: nowrap; flex-shrink: 0;
}

/* Mobile: compact "3 / 9" badge — visually distinct from the named stepper pills */
@media (max-width: 768px) {
  .step-counter {
    font-size: 11px; font-weight: 500; letter-spacing: 0.04em;
    color: var(--ink3); background: var(--surface);
    border: 1px solid var(--border2); border-radius: 20px;
    padding: 2px 9px; font-family: var(--sans);
  }
  .step-counter::before { content: attr(data-short); }
  .step-counter-full { display: none; }
}

.progress-wrap { padding-bottom: 12px; }
.progress-track { height: 1.5px; background: var(--border); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--gold); border-radius: 2px; transition: width 0.5s cubic-bezier(.4,0,.2,1); }

.stepper-wrap { overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding-bottom: 12px; }
.stepper-wrap::-webkit-scrollbar { display: none; }
.stepper { display: flex; align-items: center; gap: 0; white-space: nowrap; min-width: max-content; }
.stepper-line { flex: 0 0 10px; height: 1.5px; background: var(--border2); flex-shrink: 0; }
.stepper-line.done-line { background: var(--gold-d); }
.stepper-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; border: 1.5px solid transparent; font-family: var(--sans); font-size: 11.5px; font-weight: 400; white-space: nowrap; flex-shrink: 0; transition: background var(--t), border-color var(--t), color var(--t); cursor: default; user-select: none; }
.stepper-pill.done { background: rgba(212,137,10,0.12); border-color: rgba(212,137,10,0.30); color: var(--gold-d); }
.stepper-pill.current { background: var(--gold); border-color: var(--gold); color: #fff; font-weight: 600; font-size: 12px; box-shadow: 0 1px 6px rgba(212,137,10,0.35); }
.stepper-pill.upcoming { background: transparent; border-color: var(--border); color: var(--ink3); font-weight: 300; }
.stepper-icon { font-size: 9px; font-weight: 700; line-height: 1; flex-shrink: 0; }
.stepper-num { font-size: 9px; font-weight: 500; opacity: 0.6; flex-shrink: 0; }

.screen { animation: screenIn 0.3s cubic-bezier(.4,0,.2,1) both; }
@keyframes screenIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }

.eyebrow { font-size: 11.5px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink3); margin-bottom: 10px; }
.screen-title { font-family: var(--serif); font-size: clamp(28px, 5vw, 44px); font-weight: 500; line-height: 1.12; color: var(--ink); margin-bottom: 10px; }
.screen-title em { font-style: italic; color: var(--gold); }
.screen-sub { font-size: 14.5px; font-weight: 300; color: var(--ink2); line-height: 1.7; margin-bottom: 32px; }

.opt-grid { display: flex; flex-direction: column; gap: 9px; margin-bottom: 24px; }
.opt-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 24px; }
.opt-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-bottom: 24px; }
@media (max-width: 480px) { .opt-grid-2, .opt-grid-3 { grid-template-columns: 1fr; } }

.opt-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 15px 18px; cursor: pointer; transition: border-color var(--t), background var(--t), transform 0.1s; text-align: left; width: 100%; font-family: var(--sans); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.opt-card:hover { border-color: var(--gold-d); background: var(--hover-surface); }
.opt-card:active { transform: scale(0.995); }
.opt-card.selected { border-color: var(--gold); background: var(--gold-l); }
.opt-card-content { flex: 1; }
.opt-card-label { font-size: 15px; font-weight: 500; color: var(--ink); display: block; margin-bottom: 2px; }
.opt-card-sub   { font-size: 13px; font-weight: 300; color: var(--ink3); }
.opt-card-tag   { font-size: 11px; font-weight: 500; color: var(--gold-d); background: var(--gold-l); padding: 3px 9px; border-radius: 20px; flex-shrink: 0; }
.opt-card.selected .opt-card-tag { background: rgba(212,137,10,0.25); }
.opt-radio { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--border2); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all var(--t); }
.opt-card.selected .opt-radio { background: var(--gold); border-color: var(--gold); }
.opt-dot { width: 7px; height: 7px; border-radius: 50%; background: white; opacity: 0; transition: opacity var(--t); }
.opt-card.selected .opt-dot { opacity: 1; }
.opt-card-icon { font-size: 18px; margin-bottom: 8px; display: block; }

.check-section { margin-bottom: 22px; }
.check-section-label { font-size: 10.5px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink3); margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.check-list { display: flex; flex-direction: column; gap: 8px; }
.check-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r); padding: 12px 16px; cursor: pointer; transition: border-color var(--t), background var(--t); text-align: left; width: 100%; font-family: var(--sans); display: flex; align-items: center; gap: 12px; }
.check-card:hover { border-color: var(--gold-d); background: var(--hover-surface); }
.check-card.checked { border-color: var(--gold); background: var(--gold-l); }
.check-box { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--border2); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all var(--t); background: var(--surface); }
.check-card.checked .check-box { background: var(--gold); border-color: var(--gold); }
.check-mark { width: 10px; height: 6px; border-left: 2px solid white; border-bottom: 2px solid white; transform: rotate(-45deg) translateY(-1px); opacity: 0; transition: opacity var(--t); }
.check-card.checked .check-mark { opacity: 1; }
.check-card-label { font-size: 14.5px; font-weight: 400; color: var(--ink); }
.check-card-sub   { font-size: 13px; font-weight: 300; color: var(--ink3); margin-top: 1px; }

.num-field { margin-bottom: 10px; }
.num-label { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; color: var(--ink2); margin-bottom: 6px; }
.num-wrap { position: relative; }
.num-in {
  width: 100%; padding: 14px 52px 14px 18px;
  font-size: 26px; font-family: var(--sans); font-weight: 500;
  font-variant-numeric: tabular-nums; letter-spacing: -0.01em;
  color: var(--ink); background: var(--surface);
  border: 1.5px solid var(--border2); border-radius: var(--r);
  outline: none; transition: border-color var(--t);
  -moz-appearance: textfield; appearance: textfield;
}
.num-in::-webkit-inner-spin-button, .num-in::-webkit-outer-spin-button { -webkit-appearance: none; }
.num-in::placeholder { color: var(--border2); font-weight: 300; opacity: 1; font-family: var(--sans); }
.num-in:focus { border-color: var(--gold); }
.num-unit { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: 300; color: var(--ink3); font-family: var(--sans); }

.screens-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
@media (max-width: 480px) { .screens-pair { grid-template-columns: 1fr; } }

.warn-box { background: var(--warn-bg); border: 1.5px solid var(--warn-bd); border-radius: var(--r); padding: 11px 14px; font-size: 13px; font-weight: 300; color: var(--warn-tx); margin-bottom: 14px; line-height: 1.5; }
.info-note { font-size: 12.5px; font-weight: 300; color: var(--ink3); margin-bottom: 22px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); line-height: 1.5; }

/* Custom rate preview card */
.custom-rate-preview {
  background: var(--gold-l); border: 1.5px solid var(--gold-bd);
  border-radius: var(--r2); padding: 16px 18px; margin-bottom: 20px;
}
.crp-label { font-size: 10.5px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold-d); margin-bottom: 4px; }
.crp-val   { font-family: var(--serif); font-size: 30px; font-weight: 400; color: var(--gold-d); margin-bottom: 8px; font-variant-numeric: tabular-nums; }
.crp-note  { font-size: 12px; font-weight: 300; color: var(--ink2); line-height: 1.6; margin-bottom: 8px; }
.crp-compare { font-size: 12px; font-weight: 300; color: var(--ink3); }
.crp-compare strong { font-weight: 500; color: var(--ink2); }

.btn-primary { display: block; width: 100%; padding: 15px 20px; background: var(--btn-bg); color: var(--btn-text); border: none; border-radius: var(--r); font-family: var(--sans); font-size: 14px; font-weight: 500; cursor: pointer; transition: background var(--t); text-align: center; }
.btn-primary:hover:not(:disabled) { background: var(--btn-hover); }
.btn-primary:disabled { opacity: 0.38; cursor: not-allowed; }

.btn-gold { display: block; width: 100%; padding: 15px 20px; background: var(--gold); color: white; border: none; border-radius: var(--r); font-family: var(--sans); font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity var(--t); text-align: center; }
.btn-gold:hover:not(:disabled) { opacity: 0.88; }
.btn-gold:disabled { opacity: 0.38; cursor: not-allowed; }

.back-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 300; color: var(--ink3); background: none; border: none; cursor: pointer; margin-bottom: 24px; padding: 0; font-family: var(--sans); transition: color var(--t); }
.back-btn:hover { color: var(--ink2); }

.skip-link { display: block; text-align: center; margin-top: 12px; font-size: 12.5px; font-weight: 300; color: var(--ink3); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; background: none; border: none; font-family: var(--sans); }
.skip-link:hover { color: var(--ink2); }

.rev-box { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2); overflow: hidden; margin-bottom: 24px; }
.rev-row { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 17px; border-bottom: 1px solid var(--border); font-size: 13px; }
.rev-row:last-child { border-bottom: none; }
.rev-k { font-weight: 300; color: var(--ink3); }
.rev-v { font-weight: 500; color: var(--ink); text-align: right; max-width: 260px; }
.rev-ed { font-size: 11.5px; color: var(--gold); cursor: pointer; margin-left: 9px; font-weight: 400; text-decoration: underline; text-underline-offset: 2px; }
.rev-ed:hover { color: var(--gold-d); }

.entry-grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.entry-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 22px 24px 20px; cursor: pointer; transition: border-color var(--t), background var(--t), transform 0.12s; text-align: left; width: 100%; font-family: var(--sans); display: block; position: relative; }
.entry-card:hover { border-color: var(--gold-d); background: var(--hover-surface); transform: translateY(-1px); }
.entry-card:active { transform: scale(0.99); }
.entry-card.featured { border-color: var(--featured-bd); }
.ec-num { font-family: var(--serif); font-size: 38px; font-weight: 400; color: var(--border2); line-height: 1; margin-bottom: 7px; }
.ec-title { font-size: 16px; font-weight: 500; color: var(--ink); margin-bottom: 5px; }
.ec-desc  { font-size: 13px; font-weight: 300; color: var(--ink2); line-height: 1.55; }
.ec-arrow { position: absolute; right: 22px; top: 50%; transform: translateY(-50%); font-size: 20px; color: var(--border2); transition: color var(--t), transform var(--t); }
.entry-card:hover .ec-arrow { color: var(--gold); transform: translateY(-50%) translateX(3px); }

/* ── ROLE SELECTOR ── */
.role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 24px; }
@media (max-width: 480px) { .role-grid { grid-template-columns: 1fr; } }
.role-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 16px 18px 14px; cursor: pointer; transition: border-color var(--t), background var(--t), transform 0.1s; text-align: left; width: 100%; font-family: var(--sans); }
.role-card:hover { border-color: var(--gold-d); background: var(--hover-surface); transform: translateY(-1px); }
.role-card:active { transform: scale(0.99); }
.role-card.selected { border-color: var(--gold); background: var(--gold-l); }
.role-icon { font-size: 20px; margin-bottom: 9px; display: block; }
.role-label { font-size: 14px; font-weight: 500; color: var(--ink); display: block; margin-bottom: 3px; }
.role-sub   { font-size: 12px; font-weight: 300; color: var(--ink3); }

/* ── RESULTS ── */
.result-wrap { animation: screenIn 0.4s cubic-bezier(.4,0,.2,1) both; }
.range-hero { background: var(--sbg); border: 1.5px solid var(--success-bd); border-radius: var(--r2); padding: 30px 28px; margin-bottom: 14px; }
.rh-eyebrow { font-size: 11px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: var(--success); opacity: 0.65; margin-bottom: 9px; }
.rh-range   { font-family: var(--serif); font-size: clamp(32px, 5.5vw, 50px); font-weight: 500; color: var(--success); line-height: 1.05; margin-bottom: 7px; }
.rh-hrs     { font-size: 14px; font-weight: 300; color: var(--success); opacity: 0.75; }
.rh-note    { font-size: 12.5px; font-weight: 300; color: var(--success); opacity: 0.55; margin-top: 5px; line-height: 1.5; }

.result-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 22px 22px 18px; margin-bottom: 13px; }
.rc-title { font-size: 10px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink3); margin-bottom: 16px; }

.bk-row { display: flex; justify-content: space-between; align-items: baseline; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 13.5px; }
.bk-row:last-child { border-bottom: none; }
.bk-l    { font-weight: 300; color: var(--ink2); }
.bk-note { font-size: 11.5px; color: var(--ink3); margin-top: 2px; }
.bk-a    { font-family: var(--serif); font-size: 16px; color: var(--ink); font-weight: 500; white-space: nowrap; margin-left: 12px; font-variant-numeric: tabular-nums; }
.bk-subtotal-row { display: flex; justify-content: space-between; align-items: baseline; border-top: 1.5px solid var(--border); margin-top: 6px; padding-top: 10px; font-size: 13px; }
.bk-subtotal-l { font-weight: 500; color: var(--ink2); }
.bk-subtotal-a { font-family: var(--serif); font-size: 16px; color: var(--ink2); font-weight: 500; font-variant-numeric: tabular-nums; }
.bk-total { display: flex; justify-content: space-between; align-items: baseline; padding-top: 12px; margin-top: 4px; border-top: 1.5px solid var(--border); font-size: 13.5px; font-weight: 500; }
.bk-total-a { font-family: var(--serif); font-size: 22px; color: var(--gold); font-variant-numeric: tabular-nums; }

.hrs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.hrs-cell { background: var(--bg); border-radius: 9px; padding: 13px 14px; }
.hrs-n    { font-family: var(--serif); font-size: 24px; color: var(--gold-d); font-weight: 500; font-variant-numeric: tabular-nums; }
.hrs-l    { font-size: 12px; font-weight: 300; color: var(--ink2); margin-top: 3px; }

.jtext { font-size: 13.5px; font-weight: 300; color: var(--ink); line-height: 1.9; white-space: pre-wrap; }

.res-acts { display: flex; gap: 9px; margin-top: 14px; flex-wrap: wrap; }
.act { flex: 1; min-width: 130px; padding: 11px 16px; font-family: var(--sans); font-size: 13px; font-weight: 400; border-radius: 9px; cursor: pointer; transition: all var(--t); text-align: center; }
.act-p { background: var(--btn-bg); color: var(--btn-text); border: none; }
.act-p:hover { background: var(--btn-hover); }
.act-g { background: var(--surface); color: var(--ink); border: 1.5px solid var(--border); }
.act-g:hover { border-color: var(--ink); }
.act-g.copied { border-color: var(--success); color: var(--success); }

.restart { display: block; text-align: center; margin-top: 16px; font-size: 12.5px; font-weight: 300; color: var(--ink3); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; background: none; border: none; font-family: var(--sans); }
.restart:hover { color: var(--ink2); }

.sb-wordmark { font-family: var(--serif); font-size: 14px; font-weight: 500; letter-spacing: 0.06em; color: var(--ink); margin-bottom: 28px; }
.sb-wordmark span { color: var(--gold); }
.sb-stat { margin-bottom: 18px; }
.sb-stat-label { font-size: 11px; font-weight: 300; color: var(--ink3); margin-bottom: 3px; }
.sb-stat-val   { font-family: var(--serif); font-size: 26px; font-weight: 500; color: var(--ink); line-height: 1; }
.sb-stat-val.gold { color: var(--gold); }
.sb-div  { height: 1px; background: var(--border); margin: 16px 0; }
.sb-item { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; padding: 3px 0; }
.sb-item-l { font-weight: 300; color: var(--ink3); }
.sb-item-v { font-weight: 400; color: var(--ink2); }
.sb-note { margin-top: 16px; font-size: 12px; font-weight: 300; color: var(--ink3); line-height: 1.6; padding: 10px 12px; background: var(--surface); border-radius: 8px; }

.mob-bar { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: var(--mob-bg); padding: 13px 22px 16px; z-index: 100; cursor: pointer; border-top: 1px solid var(--border); }
.mob-bar-inner { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.mob-bar-left { flex: 1; min-width: 0; }
.mob-bar-left-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mob-muted); margin-bottom: 2px; }
.mob-bar-price { font-family: var(--serif); font-size: 20px; font-weight: 500; color: var(--mob-text); line-height: 1.15; }
.mob-bar-context { font-size: 13px; font-weight: 400; color: var(--mob-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; }
.mob-bar-hint  { font-size: 11px; color: var(--mob-hint); flex-shrink: 0; }
@media (max-width: 768px) { .mob-bar { display: block; } }

.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; animation: overlayIn 0.22s ease both; }
@keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
.sheet { background: var(--panel); border-radius: 18px 18px 0 0; padding: 20px 22px 36px; width: 100%; max-height: 78vh; overflow-y: auto; animation: sheetUp 0.28s cubic-bezier(.4,0,.2,1) both; }
@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.sheet-handle { width: 38px; height: 4px; background: var(--border2); border-radius: 2px; margin: 0 auto 20px; }

.sus-block { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 18px 20px; margin-bottom: 14px; }
.sus-row-hd { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.sus-lbl { font-size: 13px; font-weight: 500; color: var(--ink2); }
.sus-val { font-family: var(--serif); font-size: 22px; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--gold-d); }
.sus-slider { width: 100%; accent-color: var(--gold); margin-bottom: 6px; height: 3px; cursor: pointer; }
.sus-range-labels { display: flex; justify-content: space-between; font-size: 11px; font-weight: 300; color: var(--ink3); margin-bottom: 10px; }
.sus-context-box { background: var(--bg); border-radius: 8px; padding: 11px 13px; margin-bottom: 10px; }
.sus-ctx-q { font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink3); margin-bottom: 5px; }
.sus-ctx-a { font-size: 12.5px; font-weight: 300; color: var(--ink2); line-height: 1.65; }
.sus-preview { font-size: 13px; font-weight: 300; color: var(--ink2); background: var(--gold-l); border: 1px solid var(--gold-bd); border-radius: 8px; padding: 9px 13px; margin-bottom: 8px; line-height: 1.5; }
.sus-preview strong { font-weight: 500; color: var(--gold-d); }
.sus-note { font-size: 12px; font-weight: 300; color: var(--ink3); line-height: 1.55; }

.gst-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 15px 18px; margin-bottom: 22px; cursor: pointer; transition: border-color var(--t), background var(--t); }
.gst-row:hover  { border-color: var(--gold-d); }
.gst-row.gst-on { border-color: var(--gold); background: var(--gold-l); }
.gst-label { font-size: 14px; font-weight: 500; color: var(--ink); margin-bottom: 2px; }
.gst-sub   { font-size: 12px; font-weight: 300; color: var(--ink3); }
.tog-track { width: 40px; height: 22px; border-radius: 11px; background: var(--border2); flex-shrink: 0; position: relative; transition: background var(--t); }
.gst-row.gst-on .tog-track { background: var(--gold); }
.tog-thumb { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,.18); transition: transform var(--t); }
.tog-thumb.tog-on { transform: translateX(18px); }

.rate-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.rate-cell { background: var(--bg); border-radius: 9px; padding: 13px 14px; }
.rate-val  { font-family: var(--serif); font-size: 18px; color: var(--gold-d); font-weight: 500; line-height: 1.2; margin-bottom: 3px; }
.rate-lbl  { font-size: 12px; font-weight: 300; color: var(--ink2); }

/* Input mapping info box */
.mapping-note {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  padding: 10px 14px; margin-bottom: 18px;
  font-size: 12px; font-weight: 300; color: var(--ink3); line-height: 1.5;
}
.mapping-note strong { color: var(--gold-d); font-weight: 500; }

/* ── MAKER FOOTER ── */
.maker-footer {
  width: 100%;
  max-width: 760px;
  padding: 56px 40px 48px;
  text-align: center;
  border-top: 1px solid var(--border);
  margin-top: 40px;
}
@media (max-width: 900px) {
  .maker-footer { padding: 48px 24px 80px; }
}
.mf-eyebrow {
  font-size: 10.5px; font-weight: 500; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--ink3); margin-bottom: 14px;
}
.mf-name {
  font-family: var(--serif); font-size: clamp(32px, 5vw, 44px);
  font-weight: 600; color: var(--ink); line-height: 1; margin-bottom: 6px;
}
.mf-role {
  font-size: 11px; font-weight: 500; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--ink3); margin-bottom: 22px;
}
.mf-quote {
  font-family: var(--serif); font-style: italic;
  font-size: clamp(15px, 2.2vw, 17px); font-weight: 400;
  color: var(--ink2); line-height: 1.75; max-width: 420px;
  margin: 0 auto 28px;
}
.mf-btn {
  display: inline-flex; align-items: center; gap: 7px;
  background: var(--ink); color: var(--btn-text);
  font-family: var(--sans); font-size: 13.5px; font-weight: 500;
  padding: 12px 22px; border-radius: 100px; border: none;
  cursor: pointer; text-decoration: none;
  transition: background var(--t), transform 0.15s;
}
.mf-btn:hover { background: var(--btn-hover); transform: translateY(-1px); }
.mf-btn-arrow { font-size: 14px; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// MAKER FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function MakerFooter() {
  return (
    <div className="maker-footer">
      <div className="mf-eyebrow">Made by</div>
      <div className="mf-name">Rashi</div>
      <div className="mf-role">Designer</div>
      <p className="mf-quote">
        "I love designing products, and breaking them<br />
        to figure out exactly how to make them better."
      </p>
      <a
        className="mf-btn"
        href="https://your-portfolio-link.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        View Portfolio <span className="mf-btn-arrow">↗</span>
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE COMPONENTS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function PrimaryBtn({ onClick, disabled = false, children }: any) {
  return <button className="btn-primary" onClick={onClick} disabled={disabled}>{children}</button>;
}
function GoldBtn({ onClick, disabled = false, children }: any) {
  return <button className="btn-gold" onClick={onClick} disabled={disabled}>{children}</button>;
}
function Back({ onClick }: any) {
  return <button className="back-btn" onClick={onClick}>← Back</button>;
}

function RadioCards({ options, selected, onSelect, layout = "list" }: any) {
  const cls = layout === "2" ? "opt-grid-2" : layout === "3" ? "opt-grid-3" : "opt-grid";
  return (
    <div className={cls}>
      {options.map(o => (
        <button
          key={o.id}
          className={`opt-card${selected === o.id ? " selected" : ""}`}
          onClick={() => onSelect(o.id)}
        >
          <span className="opt-card-content">
            {o.icon && <span className="opt-card-icon">{o.icon}</span>}
            <span className="opt-card-label">{o.label}</span>
            {o.sub && <span className="opt-card-sub">{o.sub}</span>}
          </span>
          {o.tag
            ? <span className="opt-card-tag">{o.tag}</span>
            : <span className="opt-radio"><span className="opt-dot" /></span>
          }
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR / MOBILE PANEL
// ─────────────────────────────────────────────────────────────────────────────

function LivePanel({ state }: any) {
  const role    = state.role || "product";
  const hasExp  = !!state.experience;
  const hasScope = state.mode === "quick"
    ? !!state.hours
    : (role === "video" ? state.primaryScreens > 0 : state.primaryScreens > 0);
  const est = hasExp && hasScope ? calcEstimate(state) : null;

  const items: any[] = [];
  if (state.role) {
    const r = ROLES.find(x => x.id === state.role);
    items.push({ l: "Role", v: r?.label });
  }
  if (state.projectLevel && state.role && state.role !== "product") {
    const lv = PROJECT_LEVELS.find(l => l.id === state.projectLevel);
    if (lv) items.push({ l: "Project level", v: lv.label });
  }
  if (state.mode !== "quick") {
    const pl = getPrimaryLabel(role);
    const sl = getSecondaryLabel(role);
    if (state.primaryScreens > 0)  items.push({ l: pl.label,  v: `${state.primaryScreens} ${pl.unit}`  });
    if (state.secondaryScreens > 0) items.push({ l: sl.label, v: `${state.secondaryScreens} ${sl.unit}` });
  }
  if (state.experience) {
    const exp = EXPERIENCE_LEVELS.find(e => e.id === state.experience);
    if (state.customRate && Number(state.customRate) > 0) {
      items.push({ l: "Your rate", v: `₹${Number(state.customRate).toLocaleString("en-IN")}/hr` });
    } else {
      items.push({ l: "Rate range", v: exp?.rangeLabel });
    }
    if (est) items.push({ l: "Effective rate", v: inr(est.effRateMid) + "/hr" });
  }
  if (state.uxActivities.length > 0) items.push({ l: "Add-ons", v: state.uxActivities.length + " selected" });
  if (state.revisions) items.push({ l: "Revisions", v: state.revisions + " cycles" });
  if (state.includeGST) items.push({ l: "GST", v: "18% included" });

  return (
    <div>
      <div className="sb-stat">
        <div className="sb-stat-label">Estimated Hours</div>
        <div className="sb-stat-val">{est ? est.totalHrs + " hrs" : "—"}</div>
      </div>
      <div className="sb-stat">
        <div className="sb-stat-label">Suggested Range</div>
        <div className="sb-stat-val gold">{est ? inr(est.low) + " – " + inr(est.high) : "—"}</div>
      </div>
      {items.length > 0 && (
        <>
          <div className="sb-div" />
          {items.map((item, i) => (
            <div className="sb-item" key={i}>
              <span className="sb-item-l">{item.l}</span>
              <span className="sb-item-v">{item.v}</span>
            </div>
          ))}
        </>
      )}
      <div className="sb-note">
        {est
          ? "Range shows ±15% variance. Final figure based on confirmed scope."
          : "Complete the steps to see your live estimate here."}
      </div>
    </div>
  );
}

function buildMobileContext(state): string {
  const parts: string[] = [];
  if (state.role) {
    const r = ROLES.find(x => x.id === state.role);
    if (r) parts.push(r.label.replace(" Designer","").replace(" Editor",""));
  }
  if (state.projectLevel && state.role && state.role !== "product") {
    const lv = PROJECT_LEVELS.find(l => l.id === state.projectLevel);
    if (lv) parts.push(lv.label);
  }
  if (state.mode === "scope") {
    const total = (state.primaryScreens || 0) + (state.secondaryScreens || 0);
    if (total > 0) {
      const role = state.role;
      if (role === "video") parts.push(`${state.primaryScreens} min`);
      else if (total === 1) parts.push("1 deliverable");
      else parts.push(`${total} deliverables`);
    }
    if (state.flowComplexity) {
      const opts = getComplexityOptions(state.role || "product");
      const cx = opts.find(f => f.id === state.flowComplexity);
      if (cx) parts.push(cx.label);
    }
  }
  if (state.experience) {
    const exp = EXPERIENCE_LEVELS.find(e => e.id === state.experience);
    if (exp) parts.push(exp.label);
  }
  return parts.length ? parts.join(" · ") : "";
}

function MobileBar({ state, screen, flowStep, totalSteps, onTap }: any) {
  const hasExp   = !!state.experience;
  const hasScope = state.mode === "quick" ? !!state.hours : state.primaryScreens > 0;
  const est      = hasExp && hasScope ? calcEstimate(state) : null;
  const hasEst   = !!est;

  const context  = buildMobileContext(state);
  const stepsLeft = totalSteps - flowStep;

  return (
    <div className="mob-bar" onClick={onTap}>
      <div className="mob-bar-inner">
        <div className="mob-bar-left">
          {hasEst ? (
            <>
              <div className="mob-bar-left-label">Live Estimate</div>
              <div className="mob-bar-price">{inr(est.low)} – {inr(est.high)}</div>
            </>
          ) : (
            <>
              <div className="mob-bar-left-label">
                {screen === "flow" ? `${stepsLeft} step${stepsLeft !== 1 ? "s" : ""} left` : "Your estimate"}
              </div>
              <div className="mob-bar-context">
                {context || "Fill in details to see your estimate"}
              </div>
            </>
          )}
        </div>
        <div className="mob-bar-hint">
          {hasEst ? "Tap to expand ↑" : "↑"}
        </div>
      </div>
    </div>
  );
}

function BottomSheet({ state, onClose }: any) {
  const hasExp  = !!state.experience;
  const hasScope = state.mode === "quick" ? !!state.hours : state.primaryScreens > 0;
  const est = hasExp && hasScope ? calcEstimate(state) : null;
  return (
    <div className="sheet-overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains("sheet-overlay")) onClose(); }}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sb-stat" style={{ marginBottom: 14 }}>
          <div className="sb-stat-label">Suggested Range</div>
          <div className="sb-stat-val gold">{est ? inr(est.low) + " – " + inr(est.high) : "—"}</div>
        </div>
        <div className="sb-stat" style={{ marginBottom: 18 }}>
          <div className="sb-stat-label">Estimated Hours</div>
          <div className="sb-stat-val">{est ? est.totalHrs + " hrs" : "—"}</div>
        </div>
        <LivePanel state={state} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY SCREEN — Role selector → Mode selector
// ─────────────────────────────────────────────────────────────────────────────

function EntryScreen({ onSelect }: any) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const modeRef = useRef<HTMLDivElement>(null);

  function pickRole(id: string) {
    setSelectedRole(id);
    // Scroll to mode section after a brief paint delay
    setTimeout(() => {
      modeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  return (
    <div className="screen">
      <div className="eyebrow">FairScope · Pricing Assistant</div>
      <h1 className="screen-title">What type of<br /><em>creative work</em> is this?</h1>
      <p className="screen-sub">Choose your role to get a calculation engine built for your work type.</p>

      <div className="role-grid">
        {ROLES.map(r => (
          <button
            key={r.id}
            className={`role-card${selectedRole === r.id ? " selected" : ""}`}
            onClick={() => pickRole(r.id)}
          >
            <span className="role-icon">{r.icon}</span>
            <span className="role-label">{r.label}</span>
            <span className="role-sub">{r.sub}</span>
          </button>
        ))}
      </div>

      {/* Mode section scrolls into view after role pick */}
      <div ref={modeRef} style={{ scrollMarginTop: "80px" }}>
        {selectedRole && (
          <>
            <div style={{ height: "1px", background: "var(--border)", margin: "8px 0 28px" }} />
            <h2 className="screen-title" style={{ fontSize: "clamp(20px,3vw,28px)" }}>How would you like to<br /><em>estimate this project?</em></h2>
            <p className="screen-sub">Choose the method that fits how well you know the scope.</p>
            <div className="entry-grid">
              <button className="entry-card" onClick={() => onSelect("quick", selectedRole)}>
                <span className="ec-arrow">→</span>
                <div className="ec-num">01</div>
                <div className="ec-title">Quick Estimate</div>
                <div className="ec-desc">You already have a rough hour figure. Fast, direct, takes about 2 minutes.</div>
              </button>
              <button className="entry-card" onClick={() => onSelect("scope", selectedRole)}>
                <span className="ec-arrow">→</span>
                <div className="ec-num">02</div>
                <div className="ec-title">Scope Builder</div>
                <div className="ec-desc">Derive hours from your deliverables, complexity, and add-ons. Role-specific inputs.</div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STEPS
// ─────────────────────────────────────────────────────────────────────────────

function StepProjectType({ state, onUpdate, onNext, onBack }: any) {
  // Only product design uses this step; other roles skip to screens/scope
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">What type of <em>project</em><br />are you designing?</h2>
      <p className="screen-sub">Sets the base complexity for your estimate.</p>
      <RadioCards
        options={PROJECT_TYPES}
        selected={state.projectType}
        onSelect={v => onUpdate({ projectType: v })}
        layout="2"
      />
      <PrimaryBtn onClick={onNext} disabled={!state.projectType}>Continue →</PrimaryBtn>
    </div>
  );
}

function StepExperience({ state, onUpdate, onNext, onBack, isFinal }: any) {
  const Btn = isFinal ? GoldBtn : PrimaryBtn;
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Your <em>experience</em><br />level?</h2>
      <p className="screen-sub">This sets your professional hourly rate for the estimate.</p>
      <RadioCards
        options={EXPERIENCE_LEVELS.map(e => ({ ...e, sub: `${e.sub} · ${e.rangeLabel}` }))}
        selected={state.experience}
        onSelect={v => onUpdate({ experience: v })}
        layout="3"
      />
      <Btn onClick={onNext} disabled={!state.experience}>
        {isFinal ? "Generate Estimate →" : "Continue →"}
      </Btn>
    </div>
  );
}

// ── CUSTOM RATE STEP ──────────────────────────────────────────────────────────
// Optional. If filled, overrides the market range with the freelancer's own rate.
// If skipped, the market range from the Experience step applies as normal.

function StepCustomRate({ state, onUpdate, onNext, onBack }: any) {
  const expLevel = EXPERIENCE_LEVELS.find(e => e.id === state.experience);
  const suggested = expLevel?.rangeLabel || "market range";
  const cr = state.customRate ? Number(state.customRate) : null;

  // Live preview: what the estimate will look like at their custom rate
  const previewRate = cr && cr > 0 ? cr : null;

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">What do you<br /><em>charge per hour?</em></h2>
      <p className="screen-sub">
        Optional. Enter your actual rate and the estimate will use it directly.
        Skip to use the suggested {suggested} based on your experience level.
      </p>

      <div className="num-field">
        <div className="num-label">Your hourly rate</div>
        <div className="num-wrap">
          <input
            className="num-in"
            type="number"
            min="100"
            max="100000"
            placeholder="e.g. 1500"
            value={state.customRate || ""}
            onChange={e => onUpdate({ customRate: e.target.value || null })}
            autoFocus
          />
          <span className="num-unit">₹ / hr</span>
        </div>
      </div>

      {previewRate && (
        <div className="custom-rate-preview">
          <div className="crp-label">Using your rate</div>
          <div className="crp-val">₹{previewRate.toLocaleString("en-IN")}/hr</div>
          <div className="crp-note">
            The final price range will be calculated entirely from this number.
            The market range is shown as reference only.
          </div>
          {expLevel && (
            <div className="crp-compare">
              Market range for your level: <strong>{expLevel.rangeLabel}</strong>
            </div>
          )}
        </div>
      )}

      {!previewRate && expLevel && (
        <div className="info-note" style={{ marginTop: 4 }}>
          If you skip this, the estimate uses {suggested} as the rate range.
        </div>
      )}

      <PrimaryBtn onClick={onNext}>
        {previewRate ? "Use this rate →" : "Skip — use suggested range →"}
      </PrimaryBtn>
    </div>
  );
}

function StepRevisions({ state, onUpdate, onNext, onBack }: any) {
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">How many <em>revision</em><br />cycles are included?</h2>
      <p className="screen-sub">Each cycle adds 10% to your total effort. Define this upfront to prevent scope creep.</p>
      <RadioCards
        options={REVISION_OPTIONS.map(r => ({ ...r, id: r.id }))}
        selected={state.revisions}
        onSelect={v => onUpdate({ revisions: v })}
        layout="2"
      />
      <PrimaryBtn onClick={onNext} disabled={!state.revisions}>Continue →</PrimaryBtn>
    </div>
  );
}

function StepPMOverhead({ state, onUpdate, onNext, onBack }: any) {
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Project management<br /><em>overhead?</em></h2>
      <p className="screen-sub">How much coordination, meetings, and client management does this project involve?</p>
      <RadioCards
        options={PM_OVERHEAD}
        selected={state.pmOverhead}
        onSelect={v => onUpdate({ pmOverhead: v })}
        layout="list"
      />
      <PrimaryBtn onClick={onNext} disabled={!state.pmOverhead}>Continue →</PrimaryBtn>
    </div>
  );
}

function StepSustainability({ state, onUpdate, onNext, onBack }: any) {
  const util    = state.utilizationRate ?? UTILIZATION_DEFAULT;
  const mult    = state.freelanceMult   ?? FREELANCE_MULT_DEFAULT;
  const expLevel = EXPERIENCE_LEVELS.find(e => e.id === state.experience);
  const baseRate = expLevel?.rate || 2750;
  const effRate  = Math.round(baseRate / util);

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Two adjustments that<br /><em>protect your income.</em></h2>
      <p className="screen-sub">
        These reflect costs that salaried employees never see — but freelancers carry every month. The defaults are calibrated for the Indian market. Adjust only if your situation is different.
      </p>

      {/* ── Utilization ── */}
      <div className="sus-block">
        <div className="sus-row-hd">
          <div className="sus-lbl">Billable utilization</div>
          <div className="sus-val">{Math.round(util * 100)}%</div>
        </div>
        <input type="range" min="30" max="100" step="5" value={Math.round(util * 100)}
          onChange={e => onUpdate({ utilizationRate: Number(e.target.value) / 100 })}
          className="sus-slider" />
        <div className="sus-range-labels"><span>30% — admin-heavy</span><span>100% — fully booked</span></div>
        <div className="sus-context-box">
          <div className="sus-ctx-q">What is this?</div>
          <div className="sus-ctx-a">
            Not every working hour is a billable hour. Time spent on proposals, follow-ups, invoicing, and finding new clients doesn't get charged to anyone. At 75%, you're billing for 6 out of every 8 hours you work.
          </div>
        </div>
        {effRate && (
          <div className="sus-preview">
            ₹{baseRate.toLocaleString('en-IN')}/hr market rate ÷ {Math.round(util * 100)}% utilization
            = <strong>₹{effRate.toLocaleString('en-IN')}/hr effective rate</strong>
          </div>
        )}
      </div>

      {/* ── Freelance premium ── */}
      <div className="sus-block">
        <div className="sus-row-hd">
          <div className="sus-lbl">Business overhead multiplier</div>
          <div className="sus-val">{mult.toFixed(2)}×</div>
        </div>
        <input type="range" min="100" max="175" step="5" value={Math.round(mult * 100)}
          onChange={e => onUpdate({ freelanceMult: Number(e.target.value) / 100 })}
          className="sus-slider" />
        <div className="sus-range-labels"><span>1.00× — no premium</span><span>1.75× — high overhead</span></div>
        <div className="sus-context-box">
          <div className="sus-ctx-q">What is this?</div>
          <div className="sus-ctx-a">
            A salaried designer pays nothing for their laptop, software, insurance, or workspace — the employer does. As a freelancer, those costs come out of your earnings. This multiplier adds a small premium to cover those real expenses. At 1.05×, you're adding about 5% — roughly ₹500–₹2,000/month depending on your setup.
          </div>
        </div>
      </div>

      {/* ── GST ── */}
      <div className={"gst-row" + (state.includeGST ? " gst-on" : "")} onClick={() => onUpdate({ includeGST: !state.includeGST })}>
        <div>
          <div className="gst-label">Include GST (18%)</div>
          <div className="gst-sub">Enable only if you are registered under GST. Shown as a separate line in results.</div>
        </div>
        <div className="tog-track">
          <div className={"tog-thumb" + (state.includeGST ? " tog-on" : "")} />
        </div>
      </div>

      <GoldBtn onClick={onNext}>Generate Estimate →</GoldBtn>
    </div>
  );
}

function StepHours({ state, onUpdate, onNext, onBack }: any) {
  const hrs = Number(state.hours) || 0;
  const warn = hrs > 0 && hrs < 10
    ? "Very low estimate. Consider if revisions and handoff are accounted for."
    : hrs > 200
    ? "Large scope. Confirm this is a single engagement."
    : null;

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">How many hours do you<br /><em>estimate</em> for this project?</h2>
      <p className="screen-sub">Include all work — creation, revisions, and handoff.</p>
      <div className="num-field">
        <div className="num-label">Total estimated hours</div>
        <div className="num-wrap">
          <input className="num-in" type="number" min="1" max="5000" placeholder="60" value={state.hours || ""} onChange={e => onUpdate({ hours: e.target.value })} autoFocus />
          <span className="num-unit">hrs</span>
        </div>
      </div>
      {warn && <div className="warn-box">{warn}</div>}
      <div className="info-note">Buffer (15%) and revision adjustments will be added automatically.</div>
      <PrimaryBtn onClick={onNext} disabled={!state.hours || hrs <= 0}>Continue →</PrimaryBtn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT DESIGN STEPS (UNCHANGED)
// ─────────────────────────────────────────────────────────────────────────────

function StepScreens({ state, onUpdate, onNext, onBack }: any) {
  const total = state.primaryScreens + state.secondaryScreens;
  const warn  = total > 50 ? "Very large screen count. Ensure this is a single engagement scope." : null;
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">How many <em>screens</em><br />does this project have?</h2>
      <p className="screen-sub">Primary screens = distinct full-page views (4 hrs each).<br />Secondary = modals, overlays, empty states (1.5 hrs each).</p>
      <div className="screens-pair">
        <div className="num-field">
          <div className="num-label">Primary screens</div>
          <div className="num-wrap">
            <input className="num-in" type="number" min="0" max="999" placeholder="8" value={state.primaryScreens || ""} onChange={e => onUpdate({ primaryScreens: Math.max(0, parseInt(e.target.value) || 0) })} autoFocus />
            <span className="num-unit">screens</span>
          </div>
        </div>
        <div className="num-field">
          <div className="num-label">Secondary screens <span style={{ color: "var(--ink3)", fontWeight: 300 }}>(optional)</span></div>
          <div className="num-wrap">
            <input className="num-in" type="number" min="0" max="999" placeholder="0" value={state.secondaryScreens || ""} onChange={e => onUpdate({ secondaryScreens: Math.max(0, parseInt(e.target.value) || 0) })} />
            <span className="num-unit">screens</span>
          </div>
        </div>
      </div>
      {warn && <div className="warn-box">{warn}</div>}
      <PrimaryBtn onClick={onNext} disabled={state.primaryScreens < 1}>Continue →</PrimaryBtn>
    </div>
  );
}

function StepPlatform({ state, onUpdate, onNext, onBack }: any) {
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Which <em>platforms</em><br />are in scope?</h2>
      <p className="screen-sub">Designing for multiple platforms multiplies screen effort by 1.3×.</p>
      <RadioCards options={PLATFORM_OPTIONS} selected={state.platform} onSelect={v => onUpdate({ platform: v })} layout="2" />
      <PrimaryBtn onClick={onNext} disabled={!state.platform}>Continue →</PrimaryBtn>
    </div>
  );
}

function StepFlowComplexity({ state, onUpdate, onNext, onBack }: any) {
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">How complex are the<br /><em>user flows?</em></h2>
      <p className="screen-sub">Flow complexity multiplies screen effort to account for design decisions at each branch point.</p>
      <RadioCards options={FLOW_COMPLEXITY} selected={state.flowComplexity} onSelect={v => onUpdate({ flowComplexity: v })} layout="list" />
      <PrimaryBtn onClick={onNext} disabled={!state.flowComplexity}>Continue →</PrimaryBtn>
    </div>
  );
}

function StepDesignSystem({ state, onUpdate, onNext, onBack }: any) {
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Is a <em>design system</em><br />in scope?</h2>
      <p className="screen-sub">Design systems add fixed hours for token setup, documentation, and component coverage.</p>
      <RadioCards options={DESIGN_SYSTEM} selected={state.designSystem} onSelect={v => onUpdate({ designSystem: v })} layout="list" />
      <PrimaryBtn onClick={onNext} disabled={!state.designSystem}>Continue →</PrimaryBtn>
    </div>
  );
}

function StepUXActivities({ state, onUpdate, onNext, onBack }: any) {
  const selected = state.uxActivities;
  const toggle = id => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    onUpdate({ uxActivities: next });
  };
  const totalHrs = selected.reduce((sum, id) => sum + (ALL_UX_ITEMS.find(u => u.id === id)?.hrs || 0), 0);
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Which <em>UX activities</em><br />are included?</h2>
      <p className="screen-sub">Select all activities in scope.{" "}{selected.length > 0 && <span style={{ color: "var(--gold)", fontWeight: 500 }}>{selected.length} selected · +{totalHrs} hrs</span>}</p>
      {UX_GROUPS.map(group => (
        <div className="check-section" key={group.id}>
          <div className="check-section-label">{group.label}</div>
          <div className="check-list">
            {group.items.map(item => (
              <button key={item.id} className={`check-card${selected.includes(item.id) ? " checked" : ""}`} onClick={() => toggle(item.id)}>
                <div className="check-box"><div className="check-mark" /></div>
                <div>
                  <div className="check-card-label">{item.label}</div>
                  <div className="check-card-sub">{item.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <PrimaryBtn onClick={onNext}>Continue →</PrimaryBtn>
      <button className="skip-link" onClick={onNext}>Skip — no UX research included</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT LEVEL STEP — inserted as step 1 in non-product scope builder
// ─────────────────────────────────────────────────────────────────────────────

function StepProjectLevel({ state, onUpdate, onNext, onBack }: any) {
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">What's the <em>project level</em><br />for this engagement?</h2>
      <p className="screen-sub">
        This adjusts base hours, add-on weight, and buffer — keeping your estimate realistic for the type of client and output expected.
      </p>
      <div className="opt-grid">
        {PROJECT_LEVELS.map(lv => (
          <button
            key={lv.id}
            className={`opt-card${state.projectLevel === lv.id ? " selected" : ""}`}
            onClick={() => onUpdate({ projectLevel: lv.id })}
          >
            <span className="opt-card-content">
              <span className="opt-card-label">{lv.label}</span>
              <span className="opt-card-sub">{lv.sub}</span>
            </span>
            <span className="opt-card-tag">{lv.tag}</span>
          </button>
        ))}
      </div>
      <PrimaryBtn onClick={onNext} disabled={!state.projectLevel}>Continue →</PrimaryBtn>
    </div>
  );
}

// Reusable "scope/deliverables" step for non-product roles
function StepRoleScope({ state, onUpdate, onNext, onBack }: any) {
  const role   = state.role;
  const pl     = getPrimaryLabel(role);
  const sl     = getSecondaryLabel(role);
  const titles = getScopeStepTitle(role);
  const total  = state.primaryScreens + state.secondaryScreens;

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">{titles.titleEl}</h2>
      <p className="screen-sub">{titles.sub}</p>
      <div className="screens-pair">
        <div className="num-field">
          <div className="num-label">{pl.label}</div>
          <div className="num-wrap">
            <input
              className="num-in"
              type="number"
              min="0"
              max="999"
              placeholder={pl.ph}
              value={state.primaryScreens || ""}
              onChange={e => onUpdate({ primaryScreens: Math.max(0, parseInt(e.target.value) || 0) })}
              autoFocus
            />
            <span className="num-unit">{pl.unit}</span>
          </div>
          <div className="mapping-note">{pl.hint}</div>
        </div>
        <div className="num-field">
          <div className="num-label">{sl.label} <span style={{ color: "var(--ink3)", fontWeight: 300 }}>(optional)</span></div>
          <div className="num-wrap">
            <input
              className="num-in"
              type="number"
              min="0"
              max="999"
              placeholder={sl.ph}
              value={state.secondaryScreens || ""}
              onChange={e => onUpdate({ secondaryScreens: Math.max(0, parseInt(e.target.value) || 0) })}
            />
            <span className="num-unit">{sl.unit}</span>
          </div>
          <div className="mapping-note">{sl.hint}</div>
        </div>
      </div>
      <PrimaryBtn onClick={onNext} disabled={state.primaryScreens < 1}>Continue →</PrimaryBtn>
    </div>
  );
}

// Reusable "platform" step for non-product roles
function StepRolePlatform({ state, onUpdate, onNext, onBack }: any) {
  const role   = state.role;
  const opts   = getPlatformOptions(role);
  const titles = getPlatformStepTitle(role);
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">{titles.titleEl}</h2>
      <p className="screen-sub">{titles.sub}</p>
      <RadioCards options={opts} selected={state.platform} onSelect={v => onUpdate({ platform: v })} layout="2" />
      <PrimaryBtn onClick={onNext} disabled={!state.platform}>Continue →</PrimaryBtn>
    </div>
  );
}

// Reusable "complexity" step for non-product roles
function StepRoleComplexity({ state, onUpdate, onNext, onBack }: any) {
  const role   = state.role;
  const opts   = getComplexityOptions(role);
  const titles = getComplexityStepTitle(role);
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">{titles.titleEl}</h2>
      <p className="screen-sub">{titles.sub}</p>
      <RadioCards options={opts} selected={state.flowComplexity} onSelect={v => onUpdate({ flowComplexity: v })} layout="list" />
      <PrimaryBtn onClick={onNext} disabled={!state.flowComplexity}>Continue →</PrimaryBtn>
    </div>
  );
}

// Reusable "add-ons" step for non-product roles (maps to uxActivities field)
function StepRoleAddons({ state, onUpdate, onNext, onBack }: any) {
  const role     = state.role;
  const groups   = getAddonGroups(role);
  const allItems = getAllAddons(role);
  const titles   = getAddonStepTitle(role);
  const selected = state.uxActivities;

  const toggle = id => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    onUpdate({ uxActivities: next });
  };
  const totalHrs = selected.reduce((sum, id) => sum + (allItems.find(u => u.id === id)?.hrs || 0), 0);

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">{titles.titleEl}</h2>
      <p className="screen-sub">
        {titles.sub}{" "}
        {selected.length > 0 && <span style={{ color: "var(--gold)", fontWeight: 500 }}>{selected.length} selected · +{totalHrs} hrs</span>}
      </p>
      {groups.map(group => (
        <div className="check-section" key={group.id}>
          <div className="check-section-label">{group.label}</div>
          <div className="check-list">
            {group.items.map(item => (
              <button key={item.id} className={`check-card${selected.includes(item.id) ? " checked" : ""}`} onClick={() => toggle(item.id)}>
                <div className="check-box"><div className="check-mark" /></div>
                <div>
                  <div className="check-card-label">{item.label}</div>
                  <div className="check-card-sub">{item.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <PrimaryBtn onClick={onNext}>Continue →</PrimaryBtn>
      <button className="skip-link" onClick={onNext}>Skip — no add-ons</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW STEP — non-product scope flow
// ─────────────────────────────────────────────────────────────────────────────

function StepRoleReview({ state, onNext, onBack, jumpTo }: any) {
  const role   = state.role;
  const lv     = PROJECT_LEVELS.find(l => l.id === state.projectLevel);
  const pl     = getPrimaryLabel(role);
  const sl     = getSecondaryLabel(role);
  const exp    = EXPERIENCE_LEVELS.find(e => e.id === state.experience);
  const cxOpts = getComplexityOptions(role);
  const ptOpts = getPlatformOptions(role);
  const cx     = cxOpts.find(f => f.id === state.flowComplexity);
  const pt     = ptOpts.find(p => p.id === state.platform);
  const pm     = PM_OVERHEAD.find(p => p.id === state.pmOverhead);
  const allAdds = getAllAddons(role);
  const addonNames = state.uxActivities
    .map(id => allAdds.find(u => u.id === id)?.label)
    .filter(Boolean).join(", ") || "None";

  const scopeVal = role === "video"
    ? `${state.primaryScreens} min output${state.secondaryScreens > 0 ? ` · ${state.secondaryScreens} hrs footage` : ""}`
    : `${state.primaryScreens} ${pl.unit}${state.secondaryScreens > 0 ? ` + ${state.secondaryScreens} ${sl.unit}` : ""}`;

  const cxTitle = getComplexityStepTitle(role).title.replace("?","").trim();
  const ptTitle = getPlatformStepTitle(role).title.replace("?","").trim();

  const rows = [
    { k: "Project level",  v: `${lv?.label} — ${lv?.tag}`,                       step: 1 },
    { k: pl.label,         v: scopeVal,                                            step: 2 },
    { k: ptTitle,          v: pt?.label || "—",                                   step: 3 },
    { k: cxTitle,          v: cx ? `${cx.label} (${cx.tag})` : "—",              step: 4 },
    { k: "Add-ons",        v: addonNames,                                          step: 5 },
    { k: "Revisions",      v: `${state.revisions} cycle${state.revisions > 1 ? "s" : ""}`, step: 6 },
    { k: "Experience",     v: exp ? `${exp.label} · ${exp.rangeLabel}` : "—",    step: 7 },
    { k: "Coordination",   v: pm?.label || "—",                                   step: 8 },
  ];

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Review your<br /><em>scope details.</em></h2>
      <p className="screen-sub">Confirm everything looks right before generating your estimate.</p>
      <div className="rev-box">
        {rows.map(r => (
          <div className="rev-row" key={r.k}>
            <span className="rev-k">{r.k}</span>
            <span>
              <span className="rev-v">{r.v}</span>
              <span className="rev-ed" onClick={() => jumpTo(r.step)}>Edit</span>
            </span>
          </div>
        ))}
      </div>
      <GoldBtn onClick={onNext}>Looks good — generate →</GoldBtn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function ResultsScreen({ state, onRestart, onEdit }: any) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const est    = calcEstimate(state);
  const just   = buildJustification(state, est);
  const pmLbl  = PM_OVERHEAD.find(p => p.id === (state.pmOverhead || "standard"))?.label || "Active management";
  const role   = ROLES.find(r => r.id === (state.role || "product"));
  const hrsDetail = est.hrsDetail;

  function copy() {
    navigator.clipboard.writeText(just);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function download() {
    const roleLabel = role?.label || "Design";
    const bk = est.breakdown.map(r => `  ${r.label}: ${inr(r.amount)} (${r.note})`).join("\n");
    const lines = [
      "FAIRSCOPE — PROJECT ESTIMATE",
      "═".repeat(42),
      "",
      `Role: ${roleLabel}`,
      `Mode: ${state.mode === "quick" ? "Quick Estimate" : "Scope Builder"}`,
      `Total Hours: ${est.totalHrs} hrs`,
      `Market Rate: ${est.expLevel?.rangeLabel || ""}  (midpoint ${inr(est.midRate)}/hr)`,
      `Utilization: ${Math.round(est.utilization * 100)}%  →  Effective rate: ${inr(est.effRateMid)}/hr`,
      `Freelance Multiplier: ${est.freeMult}×`,
      `PM Overhead: ${pmLbl} (${Math.round(est.pmPct * 100)}%)`,
      state.includeGST ? `GST (18%): ${inr(est.gstMid)}` : null,
      `Suggested Range: ${inr(est.low)} – ${inr(est.high)}`,
      "",
      "SCOPE BREAKDOWN",
      "─".repeat(30),
      bk,
      "",
      "PRICING LAYERS",
      "─".repeat(30),
      `  Design cost:              ${inr(est.designCostMid)}`,
      `  PM overhead (+${Math.round(est.pmPct*100)}%):       +${inr(est.pmCostMid)}`,
      `  Freelance premium (${est.freeMult}×):   +${inr(est.premiumCostMid)}`,
      state.includeGST ? `  GST (18%):                +${inr(est.gstMid)}` : null,
      `  Total (midpoint):         ${inr(est.totalMid)}`,
      "",
      "CLIENT JUSTIFICATION",
      "─".repeat(30),
      just,
      "",
      "Generated by FairScope",
    ].filter(l => l !== null).join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = "fairscope-estimate.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Release object URL after short delay — does NOT navigate away
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  }

  // Effort grid: role-aware labels
  const r = state.role || "product";
  const pl = getPrimaryLabel(r);
  const sl = getSecondaryLabel(r);

  return (
    <div className="result-wrap">
      <div className="range-hero">
        <div className="rh-eyebrow">
          Suggested Professional Range · {role?.label}
          {state.projectLevel && state.role !== "product" && (
            <> · {PROJECT_LEVELS.find(l => l.id === state.projectLevel)?.label}</>
          )}
        </div>
        <div className="rh-range">{inr(est.low)} – {inr(est.high)}</div>
        <div className="rh-hrs">
          {est.totalHrs} hrs ·{" "}
          {state.customRate && Number(state.customRate) > 0
            ? `₹${Number(state.customRate).toLocaleString("en-IN")}–₹${Math.round(Number(state.customRate)*1.2).toLocaleString("en-IN")}/hr (your rate range)`
            : est.expLevel?.rangeLabel}
        </div>
        <div className="rh-note">
          Effective {inr(est.effRateMid)}/hr after {Math.round((1 - est.utilization) * 100)}% utilization adjustment
          {state.includeGST ? ` · GST ${inr(est.gstMid)} included` : ""}
        </div>
      </div>

      <div className="result-card">
        <div className="rc-title">Scope Breakdown</div>
        {est.breakdown.map((row, i) => (
          <div className="bk-row" key={i}>
            <span>
              <div className="bk-l">{row.label}</div>
              <div className="bk-note">{row.note}</div>
            </span>
            <span className="bk-a">{inr(row.amount)}</span>
          </div>
        ))}
        <div className="bk-subtotal-row">
          <span className="bk-subtotal-l">Base cost</span>
          <span className="bk-subtotal-a">{inr(est.designCostMid)}</span>
        </div>
      </div>

      <div className="result-card">
        <div className="rc-title">Pricing Layers</div>
        <div className="bk-row">
          <span>
            <div className="bk-l">Base cost</div>
            <div className="bk-note">{est.totalHrs} hrs × {inr(est.effRateMid)}/hr effective rate</div>
          </span>
          <span className="bk-a">{inr(est.designCostMid)}</span>
        </div>
        {est.pmCostMid > 0 && (
          <div className="bk-row">
            <span>
              <div className="bk-l">Project management — {pmLbl}</div>
              <div className="bk-note">+{Math.round(est.pmPct * 100)}% of base cost</div>
            </span>
            <span className="bk-a">+{inr(est.pmCostMid)}</span>
          </div>
        )}
        <div className="bk-row">
          <span>
            <div className="bk-l">Freelance sustainability premium</div>
            <div className="bk-note">{est.freeMult}× — software, hardware, insurance, business risk</div>
          </span>
          <span className="bk-a">+{inr(est.premiumCostMid)}</span>
        </div>
        {state.includeGST && (
          <div className="bk-row">
            <span>
              <div className="bk-l">GST (18%)</div>
              <div className="bk-note">Applicable if GST-registered</div>
            </span>
            <span className="bk-a">+{inr(est.gstMid)}</span>
          </div>
        )}
        <div className="bk-total">
          <span>Final Client Price</span>
          <span className="bk-total-a">{inr(est.low)}</span>
        </div>
      </div>

      {state.mode !== "quick" && hrsDetail && (
        <div className="result-card">
          <div className="rc-title">Effort Breakdown</div>
          <div className="hrs-grid">
            {/* Product design */}
            {hrsDetail.primaryHrs !== undefined && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.primaryHrs}</div>
                <div className="hrs-l">Primary screens ({state.primaryScreens})</div>
              </div>
            )}
            {hrsDetail.secondaryHrs !== undefined && state.secondaryScreens > 0 && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.secondaryHrs}</div>
                <div className="hrs-l">Secondary screens ({state.secondaryScreens})</div>
              </div>
            )}
            {/* Graphic */}
            {hrsDetail.complexBase !== undefined && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.complexBase}</div>
                <div className="hrs-l">Complex deliverables ({state.primaryScreens})</div>
              </div>
            )}
            {hrsDetail.simpleBase !== undefined && hrsDetail.simpleBase > 0 && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.simpleBase}</div>
                <div className="hrs-l">Simple deliverables ({state.secondaryScreens})</div>
              </div>
            )}
            {/* Branding */}
            {hrsDetail.coreBase !== undefined && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.coreBase}</div>
                <div className="hrs-l">Core deliverables ({state.primaryScreens})</div>
              </div>
            )}
            {hrsDetail.extendedBase !== undefined && hrsDetail.extendedBase > 0 && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.extendedBase}</div>
                <div className="hrs-l">Extended assets ({state.secondaryScreens})</div>
              </div>
            )}
            {/* Video */}
            {hrsDetail.durationBase !== undefined && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.durationBase}</div>
                <div className="hrs-l">Editing ({state.primaryScreens} min output)</div>
              </div>
            )}
            {hrsDetail.footageAdj !== undefined && hrsDetail.footageAdj > 0 && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.footageAdj}</div>
                <div className="hrs-l">Footage overhead</div>
              </div>
            )}
            {/* Shared */}
            {(hrsDetail.uxHrs > 0 || hrsDetail.addonHrs > 0) && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.uxHrs ?? hrsDetail.addonHrs}</div>
                <div className="hrs-l">Add-ons ({state.uxActivities.length} items)</div>
              </div>
            )}
            {hrsDetail.dsHrs > 0 && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.dsHrs}</div>
                <div className="hrs-l">Design system setup</div>
              </div>
            )}
            <div className="hrs-cell">
              <div className="hrs-n">{(hrsDetail.revHrs || 0) + (hrsDetail.bufHrs || 0)}</div>
              <div className="hrs-l">Revisions + buffer</div>
            </div>
            <div className="hrs-cell" style={{ background: "var(--gold-l)" }}>
              <div className="hrs-n" style={{ color: "var(--gold-d)" }}>{est.totalHrs}</div>
              <div className="hrs-l">Total hours</div>
            </div>
          </div>
        </div>
      )}

      <div className="result-card">
        <div className="rc-title">Rate Transparency</div>
        <div className="rate-grid">
          {state.customRate && Number(state.customRate) > 0 ? (
            <div className="rate-cell" style={{ background: "var(--gold-l)", border: "1px solid var(--gold-bd)" }}>
              <div className="rate-val" style={{ color: "var(--gold-d)" }}>
                ₹{Number(state.customRate).toLocaleString("en-IN")}/hr
              </div>
              <div className="rate-lbl">Your custom rate</div>
            </div>
          ) : (
            <div className="rate-cell">
              <div className="rate-val">{est.expLevel?.rangeLabel || "—"}</div>
              <div className="rate-lbl">Market rate range</div>
            </div>
          )}
          <div className="rate-cell">
            <div className="rate-val">{inr(est.effRateMid)}/hr</div>
            <div className="rate-lbl">Effective billable rate</div>
          </div>
          <div className="rate-cell">
            <div className="rate-val">{Math.round(est.utilization * 100)}%</div>
            <div className="rate-lbl">Utilization rate</div>
          </div>
          <div className="rate-cell">
            <div className="rate-val">{est.freeMult}×</div>
            <div className="rate-lbl">Freelance premium</div>
          </div>
        </div>
      </div>

      <div className="result-card">
        <div className="rc-title">Client-Ready Justification</div>
        <p className="jtext">{just}</p>
      </div>

      <div className="res-acts">
        <button className="act act-p" onClick={download}>
          {downloaded ? "Downloaded ✓" : "Download breakdown"}
        </button>
        <button className={`act act-g${copied ? " copied" : ""}`} onClick={copy}>
          {copied ? "Copied ✓" : "Copy justification"}
        </button>
      </div>
      <div className="res-acts" style={{ marginTop: 8 }}>
        <button className="act act-g" onClick={onEdit} style={{ flex: 1 }}>
          ← Edit estimate
        </button>
        <button className="act act-g" onClick={onRestart} style={{ flex: 1 }}>
          New estimate
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOW ROADMAP
// ─────────────────────────────────────────────────────────────────────────────

const STEPPER_LABELS = {
  quick:          ["Project", "Hours", "Revisions", "Experience", "Your Rate", "Overhead", "Summary"],
  scope:          ["Project", "Screens", "Platform", "Complexity", "System", "UX", "Revisions", "Experience", "Your Rate", "Overhead", "Summary"],
  quick_graphic:  ["Hours", "Revisions", "Experience", "Your Rate", "Overhead", "Summary"],
  quick_branding: ["Hours", "Revisions", "Experience", "Your Rate", "Overhead", "Summary"],
  quick_video:    ["Hours", "Revisions", "Experience", "Your Rate", "Overhead", "Summary"],
  scope_graphic:  ["Level", "Deliverables", "Brand Align.", "Complexity", "Add-ons", "Revisions", "Experience", "Your Rate", "Overhead", "Review", "Summary"],
  scope_branding: ["Level", "Deliverables", "Scope", "Strategy", "Add-ons", "Revisions", "Experience", "Your Rate", "Overhead", "Review", "Summary"],
  scope_video:    ["Level", "Duration", "Footage", "Complexity", "Add-ons", "Revisions", "Experience", "Your Rate", "Overhead", "Review", "Summary"],
};

function FlowRoadmap({ mode, role, flowStep }: any) {
  const key    = role === "product" || !role ? mode : `${mode}_${role}`;
  const labels = STEPPER_LABELS[key] || STEPPER_LABELS[mode];
  const wrapRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current as HTMLElement | null;
    if (!wrap) return;
    const current = wrap.querySelector(".stepper-pill.current") as HTMLElement | null;
    if (!current) return;
    const wrapRect   = wrap.getBoundingClientRect();
    const pillRect   = current.getBoundingClientRect();
    const pillCenter = pillRect.left + pillRect.width / 2 - wrapRect.left;
    wrap.scrollTo({ left: wrap.scrollLeft + pillCenter - wrapRect.width / 2, behavior: "smooth" });
  }, [flowStep]);

  if (!labels) return null;

  return (
    <div className="stepper" ref={wrapRef} style={{ overflowX: "auto", scrollbarWidth: "none" }}>
      {labels.map((label, i) => {
        const step    = i + 1;
        const done    = flowStep > step;
        const current = flowStep === step;
        const state   = done ? "done" : current ? "current" : "upcoming";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && <div className={`stepper-line${done || current ? " done-line" : ""}`} />}
            <div className={`stepper-pill ${state}`}>
              {done
                ? <span className="stepper-icon">✓</span>
                : !current && <span className="stepper-num">{step}</span>
              }
              <span>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT STATE
// ─────────────────────────────────────────────────────────────────────────────

const INIT_STATE = {
  role:             null,
  mode:             null,
  projectLevel:     "standard",
  projectType:      null,
  hours:            "",
  primaryScreens:   0,
  secondaryScreens: 0,
  platform:         "single",
  flowComplexity:   "moderate",
  designSystem:     "none",
  revisions:        2,
  experience:       null,
  customRate:       null,   // ₹/hr — overrides market range when set
  uxActivities:     [],
  pmOverhead:       "light",
  utilizationRate:  UTILIZATION_DEFAULT,
  freelanceMult:    FREELANCE_MULT_DEFAULT,
  includeGST:       false,
};

// ─────────────────────────────────────────────────────────────────────────────
// APP — FLOW ORCHESTRATION
// ─────────────────────────────────────────────────────────────────────────────

function FairScopeEstimator() {
  const [state,     setState]    = useState(INIT_STATE);
  const [screen,    setScreen]   = useState("entry");
  const [flowStep,  setFlowStep] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const topRef = useRef(null);

  const upd = useCallback(patch => setState(s => ({ ...s, ...patch })), []);
  const top  = useCallback(() => { setTimeout(() => (topRef.current as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); }, []);

  // ── STEP COUNTS ──────────────────────────────────────────────────────────
  function getTotalSteps() {
    const r = state.role || "product";
    // +1 everywhere for StepCustomRate (after Experience)
    if (state.mode === "quick") return r === "product" ? 7 : 6;
    return r === "product" ? 11 : 11;
  }
  const totalSteps = getTotalSteps();
  const pct = screen === "results" ? 100 : screen === "entry" ? 0 : ((flowStep - 1) / totalSteps) * 100;
  const stepMeta = screen === "flow" ? `Step ${flowStep} of ${totalSteps}` : screen === "results" ? "Complete" : "";

  function goStep(n) { setFlowStep(n); top(); }
  function next() {
    if (flowStep >= totalSteps) { setScreen("results"); top(); }
    else goStep(flowStep + 1);
  }
  function back() {
    if (flowStep <= 1) { setScreen("entry"); setState(INIT_STATE); top(); }
    else goStep(flowStep - 1);
  }

  function startMode(m, role) {
    upd({ mode: m, role, flowComplexity: "moderate", platform: "single" });
    setFlowStep(1);
    setScreen("flow");
    top();
  }

  function restart() {
    setState(INIT_STATE);
    setScreen("entry");
    setFlowStep(1);
    top();
  }

  // Resume flow at last step (sustainability) so user can tweak without losing inputs
  function goEdit() {
    setScreen("flow");
    setFlowStep(totalSteps);
    top();
  }

  function showResults() { setScreen("results"); top(); }

  // ── STEP ARRAYS ──────────────────────────────────────────────────────────
  const role = state.role || "product";

  // PRODUCT DESIGN — unchanged flow
  const PRODUCT_QUICK_STEPS = [
    () => <StepProjectType    state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepHours          state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRevisions      state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepExperience     state={state} onUpdate={upd} onNext={next} onBack={back} isFinal={false} />,
    () => <StepCustomRate     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepPMOverhead     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepSustainability state={state} onUpdate={upd} onNext={showResults} onBack={back} />,
  ];
  const PRODUCT_SCOPE_STEPS = [
    () => <StepProjectType    state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepScreens        state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepPlatform       state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepFlowComplexity state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepDesignSystem   state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepUXActivities   state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRevisions      state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepExperience     state={state} onUpdate={upd} onNext={next} onBack={back} isFinal={false} />,
    () => <StepCustomRate     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepPMOverhead     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepSustainability state={state} onUpdate={upd} onNext={showResults} onBack={back} />,
  ];

  const ROLE_QUICK_STEPS = [
    () => <StepHours          state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRevisions      state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepExperience     state={state} onUpdate={upd} onNext={next} onBack={back} isFinal={false} />,
    () => <StepCustomRate     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepPMOverhead     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepSustainability state={state} onUpdate={upd} onNext={showResults} onBack={back} />,
  ];

  const ROLE_SCOPE_STEPS = [
    () => <StepProjectLevel   state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRoleScope      state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRolePlatform   state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRoleComplexity state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRoleAddons     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRevisions      state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepExperience     state={state} onUpdate={upd} onNext={next} onBack={back} isFinal={false} />,
    () => <StepCustomRate     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepPMOverhead     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRoleReview     state={state} onNext={next} onBack={back} jumpTo={goStep} />,
    () => <StepSustainability state={state} onUpdate={upd} onNext={showResults} onBack={back} />,
  ];

  // ── DISPATCH ─────────────────────────────────────────────────────────────
  let STEPS: any[];
  if (role === "product") {
    STEPS = state.mode === "quick" ? PRODUCT_QUICK_STEPS : PRODUCT_SCOPE_STEPS;
  } else {
    STEPS = state.mode === "quick" ? ROLE_QUICK_STEPS : ROLE_SCOPE_STEPS;
  }

  const currentStepFn = STEPS[flowStep - 1];
  const roleObj = ROLES.find(r => r.id === role);

  return (
    <>
      <style>{CSS}</style>
      <div className="layout" ref={topRef}>
        <div className="main-col">
          <div className="header-sticky">
            <header className="app-header">
              <div className="logo">Fair<span>Scope</span></div>
              <div className="header-right">
                {screen !== "entry" && (
                  <button
                    className="header-new-btn"
                    onClick={restart}
                    title="Start a new estimate"
                  >
                    + New
                  </button>
                )}
                {screen === "flow" && state.role && (
                  <span className="role-badge">{roleObj?.label}</span>
                )}
                {stepMeta && (
                  <div
                    className="step-counter"
                    data-short={screen === "flow" ? `${flowStep} / ${totalSteps}` : "✓"}
                  >
                    <span className="step-counter-full">{stepMeta}</span>
                  </div>
                )}
              </div>
            </header>
            <div className="progress-wrap header-row">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {screen === "flow" && state.mode && (
              <div className="stepper-wrap header-row">
                <FlowRoadmap mode={state.mode} role={state.role} flowStep={flowStep} />
              </div>
            )}
          </div>

          <div className="main-inner">
            {screen === "entry"   && <EntryScreen onSelect={startMode} />}
            {screen === "flow"    && currentStepFn && currentStepFn()}
            {screen === "results" && <ResultsScreen state={state} onRestart={restart} onEdit={goEdit} />}
          </div>
          <MakerFooter />
        </div>

        <aside className="sidebar">
          <div className="sb-wordmark">Fair<span>Scope</span></div>
          <LivePanel state={state} />
        </aside>
      </div>

      {screen !== "entry" && (
        <MobileBar
          state={state}
          screen={screen}
          flowStep={flowStep}
          totalSteps={totalSteps}
          onTap={() => setSheetOpen(true)}
        />
      )}
      {sheetOpen && (
        <BottomSheet state={state} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────

export default function FairScope() {
  return <FairScopeEstimator />;
}
