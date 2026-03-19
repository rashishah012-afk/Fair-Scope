'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & DATA
// ─────────────────────────────────────────────────────────────────────────────

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
  { id: "none",     label: "None",     sub: "No overhead",                    pct: 0    },
  { id: "light",    label: "Light",    sub: "Occasional check-ins  (+10%)",   pct: 0.10 },
  { id: "standard", label: "Standard", sub: "Regular meetings & reviews (+15%)", pct: 0.15 },
  { id: "heavy",    label: "Heavy",    sub: "Intensive coordination  (+20%)", pct: 0.20 },
];

const UTILIZATION_DEFAULT   = 0.75;   // 75% of hours are billable
const FREELANCE_MULT_DEFAULT = 1.05;  // 5% premium over salaried equivalent
const GST_RATE               = 0.18;  // 18% Indian GST

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

function calcEstimate(s) {
  // ── RATES & SUSTAINABILITY PARAMS ────────────────────────────────────────
  const expLevel    = EXPERIENCE_LEVELS.find(e => e.id === s.experience);
  const midRate     = expLevel?.rate     || 2750;            // midpoint of market range
  const maxRate     = expLevel?.rateMax  || midRate * 1.45;  // top of range (for high estimate)
  const utilization = s.utilizationRate  ?? UTILIZATION_DEFAULT;
  const freeMult    = s.freelanceMult    ?? FREELANCE_MULT_DEFAULT;
  const pmPct       = PM_OVERHEAD.find(p => p.id === (s.pmOverhead || "standard"))?.pct ?? 0.15;

  // Effective rate = base ÷ utilization (covers non-billable time)
  const effRateMid = midRate / utilization;
  const effRateMax = maxRate / utilization;

  // ── COMPUTE DESIGN HOURS (shared by both modes) ───────────────────────
  let designHrs, hrsDetail, scopeRows;

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
    // Scope / AI mode — updated effort model: 5 hrs primary, 2 hrs secondary
    const fc     = FLOW_COMPLEXITY.find(f => f.id === s.flowComplexity)?.mult || 1.2;
    const pl     = PLATFORM_OPTIONS.find(p => p.id === s.platform)?.mult || 1.0;
    const dsHrs  = DESIGN_SYSTEM.find(d => d.id === s.designSystem)?.hrs || 0;
    const uxHrs  = s.uxActivities.reduce((sum, id) => sum + (ALL_UX_ITEMS.find(u => u.id === id)?.hrs || 0), 0);

    const primaryHrs   = s.primaryScreens   * 4;   // 4 hrs per primary screen
    const secondaryHrs = s.secondaryScreens * 1.5; // 1.5 hrs per secondary screen
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

  // ── COST LAYERS ──────────────────────────────────────────────────────────
  // 1. Base design cost (hours × effective rate)
  const designCostMid = designHrs * effRateMid;
  const designCostMax = designHrs * effRateMax;

  // 2. Project management overhead (% of design cost)
  const pmCostMid = designCostMid * pmPct;
  const pmCostMax = designCostMax * pmPct;

  // 3. Freelance sustainability multiplier
  const projectCostMid = (designCostMid + pmCostMid) * freeMult;
  const projectCostMax = (designCostMax + pmCostMax) * freeMult;

  // 4. GST (optional)
  const gstMid   = s.includeGST ? projectCostMid * GST_RATE : 0;
  const gstMax   = s.includeGST ? projectCostMax * GST_RATE : 0;
  const totalMid = projectCostMid + gstMid;
  const totalMax = projectCostMax + gstMax;

  // Breakdown rows (cost at midpoint rate for display)
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

function buildJustification(s, est) {
  const pt       = PROJECT_TYPES.find(p => p.id === s.projectType)?.label || "design project";
  const expLevel = est.expLevel || EXPERIENCE_LEVELS.find(e => e.id === s.experience);
  const expLbl   = expLevel?.label || "professional";
  const uxNames  = s.uxActivities.map(id => ALL_UX_ITEMS.find(u => u.id === id)?.label).filter(Boolean);
  const pmLabel  = PM_OVERHEAD.find(p => p.id === (s.pmOverhead || "standard"))?.label?.toLowerCase() || "standard";

  const uxLine   = uxNames.length
    ? `\n\nThe engagement includes structured UX research — ${uxNames.slice(0, 4).join(", ")}${uxNames.length > 4 ? ", and more" : ""}.`
    : "";
  const aiLine   = s.mode === "ai" && s.aiAnalysis
    ? `\n\nScope was derived from a detailed analysis of your project brief, confirming ${s.primaryScreens} primary screens and ${s.secondaryScreens} secondary screens.`
    : "";
  const gstLine  = s.includeGST ? ` GST (18%) of ${inr(est.gstMid)} is included.` : "";

  return `This is a ${pt.toLowerCase()} project requiring approximately ${est.totalHrs} design hours.${uxLine}${aiLine}

Pricing reflects ${expLbl.toLowerCase()} market rates (${expLevel?.rangeLabel || ""}). A utilization adjustment accounts for ${Math.round((1 - est.utilization) * 100)}% non-billable time — admin, client communication, and business development — raising the effective rate to ${inr(est.effRateMid)}/hr.

A ${est.freeMult}× freelance sustainability premium is applied to cover costs salaried designers do not carry: software subscriptions, hardware, health insurance, and business risk. ${pmLabel !== "none" ? `${pmLabel.charAt(0).toUpperCase() + pmLabel.slice(1)} project management overhead (${Math.round(est.pmPct * 100)}%) is included for coordination and reviews.` : ""}${gstLine}

The suggested professional range is ${inr(est.low)} – ${inr(est.high)}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Instrument+Sans:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  /* ── Page layers — 3-level hierarchy ── */
  --bg:           #F7F3EE;   /* page canvas          */
  --surface:      #FFFEFB;   /* cards / inputs        */
  --panel:        #F0EBE3;   /* sidebar / bottom sheet */

  /* ── Text ── */
  --ink:          #111010;   /* primary               */
  --ink2:         #3D3A35;   /* secondary             */
  --ink3:         #7A7670;   /* muted / labels        */

  /* ── Gold accent ── */
  --gold:         #D4890A;
  --gold-l:       #F5E6C4;   /* selected card bg      */
  --gold-d:       #9B6207;   /* display labels        */
  --gold-bd:      #E8D0A0;   /* gold borders          */

  /* ── Borders ── */
  --border:       #E2DDD6;   /* default dividers      */
  --border2:      #C8C3BB;   /* inputs / strong edges */

  /* ── Primary button (inverts in dark) ── */
  --btn-bg:       #111010;
  --btn-text:     #FFFFFF;
  --btn-hover:    #2A2522;

  /* ── Semantic ── */
  --success:      #1A5C30;
  --sbg:          #EAF4ED;
  --success-bd:   #B8D9C0;
  --warn-bg:      #FBF5EA;
  --warn-bd:      #E6D09A;
  --warn-tx:      #7A5C1E;
  --danger:       #C0392B;
  --danger-l:     #FDF0EE;
  --danger-bd:    #F0C0B8;

  /* ── Interaction ── */
  --hover-surface: #FDFAF4;

  /* ── Mobile bar ── */
  --mob-bg:       #111010;
  --mob-text:     #FFFFFF;
  --mob-muted:    rgba(255,255,255,0.50);
  --mob-hint:     rgba(255,255,255,0.38);

  /* ── Purple badge (AI secondary) ── */
  --purple-bg:    #EEE8F8;
  --purple-text:  #5B3FA6;
  --purple-bd:    #D5CAF0;

  /* ── Blue badge (share) ── */
  --blue-bg:      #EEF3FF;
  --blue-text:    #3B57C4;
  --blue-bd:      #C8D5F5;
  --blue-hover:   #DDE6FF;

  /* ── Featured card border ── */
  --featured-bd:  #E0C87E;

  /* ── Save button hover ── */
  --save-hover:   #EDD89A;

  /* ── Sticky header ── */
  --header-bg:    rgba(247, 243, 238, 0.92);

  /* ── Type ── */
  --serif:   'Cormorant Garamond', Georgia, serif;
  --sans:    'Instrument Sans', system-ui, sans-serif;
  --r:       11px;
  --r2:      15px;
  --t:       0.2s cubic-bezier(.4,0,.2,1);
}

/* ─────────────────────────────────────────────────────────────────────────────
   DARK MODE
   Hierarchy:  --bg #1A1814  <  --surface #242018  <  --panel #2D2921
   Target contrast ratios:
     --ink   on --surface  ≈ 11:1   (primary text, always clear)
     --ink2  on --surface  ≈  6:1   (secondary text, readable)
     --ink3  on --surface  ≈  3.5:1 (muted labels, intentionally quiet)
     --gold  on --surface  ≈  4.5:1 (accent, AA large text)
───────────────────────────────────────────────────────────────────────────── */
@media (prefers-color-scheme: dark) {
  :root {
    /* ── Page layers ── */
    --bg:           #1A1814;   /* warm near-black canvas  */
    --surface:      #242018;   /* cards — clearly above bg */
    --panel:        #2D2921;   /* sidebar / sheet — above surface */

    /* ── Text ── */
    --ink:          #E8E2D8;   /* soft warm white — not pure #fff  */
    --ink2:         #A89F94;   /* secondary — readable, not harsh  */
    --ink3:         #6A6258;   /* muted labels                     */

    /* ── Gold — desaturated, comfortable ── */
    --gold:         #C8800C;   /* accent — reduced saturation      */
    --gold-l:       #2C2110;   /* selected bg — dark warm tint     */
    --gold-d:       #D9962A;   /* display labels — warm amber      */
    --gold-bd:      #463418;   /* gold borders                     */

    /* ── Borders ── */
    --border:       #332E28;   /* default — subtle separation      */
    --border2:      #463F37;   /* inputs / strong — still quiet    */

    /* ── Primary button — dark surface, warm text ── */
    --btn-bg:       #383128;   /* warm dark surface — above --panel  */
    --btn-text:     #E8E2D8;   /* soft warm white text               */
    --btn-hover:    #443C30;   /* slightly lighter on hover          */

    /* ── Semantic ── */
    --success:      #52B876;   /* lighter green — visible on dark  */
    --sbg:          #0D2016;   /* success panel bg                 */
    --success-bd:   #1A3D26;   /* success border                   */
    --warn-bg:      #221908;   /* warn panel                       */
    --warn-bd:      #453510;   /* warn border                      */
    --warn-tx:      #C09A50;   /* warn text — warm amber           */
    --danger:       #D85A4A;   /* danger — slightly muted red      */
    --danger-l:     #261210;   /* danger panel bg                  */
    --danger-bd:    #4D2420;   /* danger border                    */

    /* ── Interaction ── */
    --hover-surface: #2E2820;  /* card hover — warmer than surface */

    /* ── Mobile bar — distinct from bg ── */
    --mob-bg:       #2D2921;   /* panel colour — clearly above bg  */
    --mob-text:     #E8E2D8;   /* primary text                     */
    --mob-muted:    rgba(232,226,216,0.55);
    --mob-hint:     rgba(232,226,216,0.38);

    /* ── Purple badge ── */
    --purple-bg:    #1C1730;
    --purple-text:  #B09AE8;
    --purple-bd:    #362960;

    /* ── Blue badge ── */
    --blue-bg:      #141828;
    --blue-text:    #7898E0;
    --blue-bd:      #243060;
    --blue-hover:   #1C2440;

    /* ── Featured card ── */
    --featured-bd:  #463418;

    /* ── Save button hover ── */
    --save-hover:   #38280C;

    /* ── Sticky header ── */
    --header-bg:    rgba(26, 24, 20, 0.92);
  }
}

html, body {
  min-height: 100%;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}

/* ── LAYOUT ── */
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

/* ── HEADER STICKY WRAPPER ── */
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

/* ── HEADER ── */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 40px;
  max-width: 760px;
  width: 100%;
}

@media (max-width: 900px) {
  .app-header { padding: 14px 24px; }
}

.logo {
  font-family: var(--serif);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--ink);
}

.logo span { color: var(--gold); }

.step-counter {
  font-size: 11px;
  font-weight: 300;
  color: var(--ink3);
  letter-spacing: 0.08em;
}

/* ── PROGRESS ── */
.progress-wrap {
  padding: 0 40px 12px;
  max-width: 760px;
  width: 100%;
}

@media (max-width: 900px) {
  .progress-wrap { padding: 0 24px 10px; }
}

.progress-track {
  height: 1.5px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gold);
  border-radius: 2px;
  transition: width 0.5s cubic-bezier(.4,0,.2,1);
}

/* ── FLOW STEPPER ── */
.stepper-wrap {
  width: 100%;
  max-width: 760px;
  padding: 0 40px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.stepper-wrap::-webkit-scrollbar { display: none; }

@media (max-width: 900px) {
  .stepper-wrap { padding: 0 20px 10px; }
}

.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  white-space: nowrap;
  min-width: max-content;
}

/* Connecting line between pills */
.stepper-line {
  flex: 0 0 10px;
  height: 1.5px;
  background: var(--border2);
  flex-shrink: 0;
}
.stepper-line.done-line {
  background: var(--gold-d);
}

/* Individual pill */
.stepper-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1.5px solid transparent;
  font-family: var(--sans);
  font-size: 11.5px;
  font-weight: 400;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background var(--t), border-color var(--t), color var(--t);
  cursor: default;
  user-select: none;
}

/* Done pill */
.stepper-pill.done {
  background: var(--stepper-done-bg);
  border-color: var(--stepper-done-bd);
  color: var(--stepper-done-text);
  font-weight: 400;
}

/* Current pill — gold filled */
.stepper-pill.current {
  background: var(--gold);
  border-color: var(--gold);
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  box-shadow: 0 1px 6px rgba(212, 137, 10, 0.35);
}

/* Upcoming pill — ghost */
.stepper-pill.upcoming {
  background: transparent;
  border-color: var(--border);
  color: var(--ink3);
  font-weight: 300;
}

/* Check icon inside done pill */
.stepper-icon {
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
}

/* Step number badge on upcoming */
.stepper-num {
  font-size: 9px;
  font-weight: 500;
  opacity: 0.6;
  flex-shrink: 0;
}

/* Stepper-specific tokens */
:root {
  --stepper-done-bg:   rgba(212, 137, 10, 0.12);
  --stepper-done-bd:   rgba(212, 137, 10, 0.30);
  --stepper-done-text: var(--gold-d);
}
@media (prefers-color-scheme: dark) {
  :root {
    --stepper-done-bg:   rgba(200, 128, 12, 0.18);
    --stepper-done-bd:   rgba(200, 128, 12, 0.35);
    --stepper-done-text: var(--gold-d);
  }
}

/* ── SCREEN TRANSITIONS ── */
.screen {
  animation: screenIn 0.3s cubic-bezier(.4,0,.2,1) both;
}

@keyframes screenIn {
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* ── TYPOGRAPHY ── */
.eyebrow {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink3);
  margin-bottom: 10px;
}

.screen-title {
  font-family: var(--serif);
  font-size: clamp(26px, 4.5vw, 40px);
  font-weight: 500;
  line-height: 1.12;
  color: var(--ink);
  margin-bottom: 8px;
}

.screen-title em {
  font-style: italic;
  color: var(--gold);
}

.screen-sub {
  font-size: 13.5px;
  font-weight: 300;
  color: var(--ink2);
  line-height: 1.65;
  margin-bottom: 30px;
}

/* ── OPTION CARDS ── */
.opt-grid { display: flex; flex-direction: column; gap: 9px; margin-bottom: 24px; }
.opt-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 24px; }
.opt-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-bottom: 24px; }

@media (max-width: 480px) {
  .opt-grid-2, .opt-grid-3 { grid-template-columns: 1fr; }
}

.opt-card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r2);
  padding: 15px 18px;
  cursor: pointer;
  transition: border-color var(--t), background var(--t), transform 0.1s;
  text-align: left;
  width: 100%;
  font-family: var(--sans);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.opt-card:hover { border-color: var(--gold-d); background: var(--hover-surface); }
.opt-card:active { transform: scale(0.995); }
.opt-card.selected { border-color: var(--gold); background: var(--gold-l); }

.opt-card-content { flex: 1; }
.opt-card-label { font-size: 14px; font-weight: 500; color: var(--ink); display: block; margin-bottom: 2px; }
.opt-card-sub   { font-size: 12px; font-weight: 300; color: var(--ink3); }
.opt-card-tag   { font-size: 11px; font-weight: 500; color: var(--gold-d); background: var(--gold-l); padding: 3px 9px; border-radius: 20px; flex-shrink: 0; }
.opt-card.selected .opt-card-tag { background: rgba(212,137,10,0.25); }

.opt-radio {
  width: 18px; height: 18px; border-radius: 50%;
  border: 1.5px solid var(--border2);
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--t);
}
.opt-card.selected .opt-radio { background: var(--gold); border-color: var(--gold); }
.opt-dot { width: 7px; height: 7px; border-radius: 50%; background: white; opacity: 0; transition: opacity var(--t); }
.opt-card.selected .opt-dot { opacity: 1; }

/* icon variant */
.opt-card-icon { font-size: 18px; margin-bottom: 8px; display: block; }

/* ── CHECK CARDS (multi-select) ── */
.check-section { margin-bottom: 22px; }
.check-section-label {
  font-size: 10.5px; font-weight: 500; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink3);
  margin-bottom: 10px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.check-list { display: flex; flex-direction: column; gap: 8px; }

.check-card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r);
  padding: 12px 16px;
  cursor: pointer;
  transition: border-color var(--t), background var(--t);
  text-align: left;
  width: 100%;
  font-family: var(--sans);
  display: flex;
  align-items: center;
  gap: 12px;
}

.check-card:hover { border-color: var(--gold-d); background: var(--hover-surface); }
.check-card.checked { border-color: var(--gold); background: var(--gold-l); }

.check-box {
  width: 18px; height: 18px; border-radius: 5px;
  border: 1.5px solid var(--border2);
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--t);
  background: var(--surface);
}
.check-card.checked .check-box { background: var(--gold); border-color: var(--gold); }

.check-mark {
  width: 10px; height: 6px;
  border-left: 2px solid white;
  border-bottom: 2px solid white;
  transform: rotate(-45deg) translateY(-1px);
  opacity: 0; transition: opacity var(--t);
}
.check-card.checked .check-mark { opacity: 1; }

.check-card-label { font-size: 13.5px; font-weight: 400; color: var(--ink); }
.check-card-sub   { font-size: 12px; font-weight: 300; color: var(--ink3); margin-top: 1px; }

/* ── NUMBER INPUT ── */
.num-field { margin-bottom: 10px; }
.num-label { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; color: var(--ink2); margin-bottom: 6px; }

.num-wrap { position: relative; }
.num-in {
  width: 100%; padding: 14px 52px 14px 18px;
  font-size: 24px; font-family: var(--serif); font-weight: 500;
  color: var(--ink); background: var(--surface);
  border: 1.5px solid var(--border2); border-radius: var(--r);
  outline: none; transition: border-color var(--t);
  -moz-appearance: textfield; appearance: textfield;
}
.num-in::-webkit-inner-spin-button, .num-in::-webkit-outer-spin-button { -webkit-appearance: none; }
.num-in:focus { border-color: var(--gold); }
.num-unit {
  position: absolute; right: 15px; top: 50%;
  transform: translateY(-50%);
  font-size: 12px; font-weight: 300; color: var(--ink3);
}

/* ── SCREENS PAIR ── */
.screens-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px; }
@media (max-width: 420px) { .screens-pair { grid-template-columns: 1fr; } }

/* ── TEXTAREA ── */
.txt-area {
  width: 100%; min-height: 120px;
  padding: 15px 17px;
  font-size: 14px; font-family: var(--sans); font-weight: 300;
  color: var(--ink); background: var(--surface);
  border: 1.5px solid var(--border2); border-radius: var(--r);
  outline: none; resize: vertical; line-height: 1.7;
  transition: border-color var(--t);
  margin-bottom: 10px;
}
.txt-area::placeholder { color: var(--ink3); }
.txt-area:focus { border-color: var(--gold); }

/* ── DESCRIPTION PREVIEW ── */
.desc-preview {
  background: rgba(212,137,10,0.08);
  border: 1.5px solid var(--gold-l);
  border-radius: var(--r);
  padding: 14px 17px;
  margin-bottom: 20px;
}
.desc-preview-label {
  font-size: 10px; font-weight: 500; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--gold-d); margin-bottom: 7px;
}
.desc-preview-text {
  font-size: 13px; font-weight: 300; color: var(--ink2);
  line-height: 1.6; font-style: italic;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  transition: -webkit-line-clamp 0.2s;
}
.desc-preview-text.clamped { -webkit-line-clamp: 3; }
.desc-preview-text.expanded { -webkit-line-clamp: unset; }
.read-more-btn {
  background: none; border: none; padding: 0; margin-top: 7px;
  font-family: var(--sans); font-size: 12px; font-weight: 500;
  color: var(--gold-d); cursor: pointer; letter-spacing: 0.01em; display: block;
}
.read-more-btn:hover { color: var(--gold); }

/* ── BUTTONS ── */
.btn {
  width: 100%; padding: 14px 20px;
  font-family: var(--sans); font-size: 14px; font-weight: 500;
  letter-spacing: 0.03em; border: none; border-radius: var(--r);
  cursor: pointer; transition: background var(--t), transform 0.1s;
  margin-bottom: 10px; display: block;
}
.btn:active { transform: scale(0.99); }

.btn-primary { background: var(--btn-bg); color: var(--btn-text); }
.btn-primary:hover { background: var(--btn-hover); }
.btn-primary:disabled { background: var(--border2); color: var(--ink2); opacity: 0.55; cursor: not-allowed; transform: none; }

.btn-gold { background: var(--gold); color: var(--btn-text); }
.btn-gold:hover { background: var(--gold-d); }

.btn-outline {
  background: transparent; color: var(--ink2);
  border: 1.5px solid var(--border2);
  font-family: var(--sans); font-size: 13.5px; font-weight: 400;
  cursor: pointer; transition: all var(--t);
}
.btn-outline:hover { border-color: var(--ink); color: var(--ink); }

.back-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 13px; font-weight: 300; color: var(--ink3);
  background: none; border: none; cursor: pointer;
  padding: 0; margin-bottom: 24px; transition: color var(--t);
  font-family: var(--sans);
}
.back-btn:hover { color: var(--ink2); }

.skip-link {
  display: block; text-align: center;
  font-size: 12.5px; font-weight: 300; color: var(--ink3);
  cursor: pointer; text-decoration: underline; text-underline-offset: 3px;
  background: none; border: none; font-family: var(--sans);
}
.skip-link:hover { color: var(--ink2); }

/* ── WARN BOX ── */
.warn-box {
  background: var(--warn-bg); border: 1px solid var(--warn-bd);
  border-radius: 9px; padding: 11px 15px;
  font-size: 12.5px; font-weight: 300; color: var(--warn-tx);
  line-height: 1.55; margin-bottom: 14px;
}

.info-note {
  font-size: 12px; font-weight: 300; color: var(--ink3);
  line-height: 1.55; margin-bottom: 22px;
}

/* ── AI LOADING ── */
.ai-loading {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 56px 20px; gap: 16px; text-align: center;
}
.spinner {
  width: 34px; height: 34px;
  border: 2px solid var(--border);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.ai-loading-text { font-size: 14px; font-weight: 300; color: var(--ink2); }
.ai-loading-sub  { font-size: 12.5px; color: var(--ink3); }

/* ── AI CONFIRM ── */
.sc-section { margin-bottom: 22px; }
.sc-section-hd {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.sc-section-title {
  font-size: 10.5px; font-weight: 500; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink3);
}
.sc-badge {
  font-size: 11px; color: var(--ink3);
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 20px; padding: 2px 10px;
}
.sc-list { display: flex; flex-direction: column; gap: 7px; }
.sc-item {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 10px; background: var(--surface);
  border: 1.5px solid var(--border); border-radius: 10px;
  padding: 11px 14px; transition: all var(--t);
}
.sc-item.removed { opacity: 0.38; border-style: dashed; }
.sc-item-left { flex: 1; }
.sc-item-name  { font-size: 13.5px; font-weight: 500; color: var(--ink); display: block; margin-bottom: 3px; }
.sc-item-why   { font-size: 12px; font-weight: 300; color: var(--ink3); line-height: 1.45; }
.sc-badge-p    { font-size: 10px; padding: 2px 8px; border-radius: 20px; background: var(--gold-l); color: var(--gold-d); border: 1px solid var(--gold-bd); flex-shrink: 0; margin-top: 2px; }
.sc-badge-s    { font-size: 10px; padding: 2px 8px; border-radius: 20px; background: var(--purple-bg); color: var(--purple-text); border: 1px solid var(--purple-bd); flex-shrink: 0; margin-top: 2px; }
.sc-remove  { background: none; border: none; cursor: pointer; color: var(--ink3); font-size: 17px; padding: 0 2px; line-height: 1; transition: color var(--t); flex-shrink: 0; }
.sc-remove:hover { color: var(--danger); }
.sc-restore { background: none; border: none; cursor: pointer; font-size: 12px; color: var(--gold); text-decoration: underline; flex-shrink: 0; font-family: var(--sans); padding: 0; }

.confirm-summary {
  display: grid; grid-template-columns: 1fr 1fr; gap: 9px;
  margin-bottom: 24px;
}
.conf-cell { background: var(--surface); border: 1.5px solid var(--border); border-radius: 11px; padding: 13px 15px; }
.conf-cell.accent { background: var(--gold-l); border-color: var(--gold-bd); grid-column: span 2; }
.conf-num  { font-family: var(--serif); font-size: 26px; font-weight: 500; color: var(--gold-d); }
.conf-lbl  { font-size: 12px; font-weight: 300; color: var(--ink2); margin-top: 2px; }

.flows-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 22px; }
@media (max-width: 480px) { .flows-grid { grid-template-columns: 1fr; } }
.ff-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r); padding: 16px 17px; }
.ff-title { font-size: 10.5px; font-weight: 500; letter-spacing: 0.13em; text-transform: uppercase; color: var(--ink3); margin-bottom: 11px; }
.ff-list { list-style: none; display: flex; flex-direction: column; gap: 7px; }
.ff-list li { font-size: 13px; font-weight: 300; color: var(--ink); display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
.ff-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--gold); flex-shrink: 0; margin-top: 5px; }

/* ── REVIEW BOX ── */
.rev-box {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: var(--r2); overflow: hidden; margin-bottom: 24px;
}
.rev-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 12px 17px; border-bottom: 1px solid var(--border); font-size: 13px;
}
.rev-row:last-child { border-bottom: none; }
.rev-k { font-weight: 300; color: var(--ink3); }
.rev-v { font-weight: 500; color: var(--ink); text-align: right; max-width: 260px; }
.rev-ed {
  font-size: 11.5px; color: var(--gold); cursor: pointer;
  margin-left: 9px; font-weight: 400;
  text-decoration: underline; text-underline-offset: 2px;
}
.rev-ed:hover { color: var(--gold-d); }

/* ── ENTRY MODE CARDS ── */
.entry-grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }

.entry-card {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: var(--r2); padding: 22px 24px 20px;
  cursor: pointer; transition: border-color var(--t), background var(--t), transform 0.12s;
  text-align: left; width: 100%; font-family: var(--sans);
  display: block; position: relative;
}
.entry-card:hover { border-color: var(--gold-d); background: var(--hover-surface); transform: translateY(-1px); }
.entry-card:active { transform: scale(0.99); }
.entry-card.featured { border-color: var(--featured-bd); }

.ec-badge {
  display: inline-block; font-size: 10px; font-weight: 500;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 20px;
  margin-bottom: 10px;
  background: var(--gold-l); color: var(--gold-d);
}
.ec-num {
  font-family: var(--serif); font-size: 38px; font-weight: 400;
  color: var(--border2); line-height: 1; margin-bottom: 7px;
}
.ec-title { font-size: 16px; font-weight: 500; color: var(--ink); margin-bottom: 5px; }
.ec-desc  { font-size: 13px; font-weight: 300; color: var(--ink2); line-height: 1.55; }
.ec-arrow {
  position: absolute; right: 22px; top: 50%; transform: translateY(-50%);
  font-size: 20px; color: var(--border2); transition: color var(--t), transform var(--t);
}
.entry-card:hover .ec-arrow { color: var(--gold); transform: translateY(-50%) translateX(3px); }

/* ── RESULTS ── */
.result-wrap { animation: screenIn 0.4s cubic-bezier(.4,0,.2,1) both; }

.range-hero {
  background: var(--sbg); border: 1.5px solid var(--success-bd);
  border-radius: var(--r2); padding: 30px 28px; margin-bottom: 14px;
}
.rh-eyebrow { font-size: 10px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: var(--success); opacity: 0.65; margin-bottom: 9px; }
.rh-range   { font-family: var(--serif); font-size: clamp(30px, 5.5vw, 48px); font-weight: 500; color: var(--success); line-height: 1.05; margin-bottom: 7px; }
.rh-hrs     { font-size: 13.5px; font-weight: 300; color: var(--success); opacity: 0.75; }
.rh-note    { font-size: 12px; font-weight: 300; color: var(--success); opacity: 0.55; margin-top: 5px; line-height: 1.5; }

.result-card {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: var(--r2); padding: 22px 22px 18px; margin-bottom: 13px;
}
.rc-title {
  font-size: 10px; font-weight: 500; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--ink3); margin-bottom: 16px;
}

.bk-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px;
}
.bk-row:last-child { border-bottom: none; }
.bk-l    { font-weight: 300; color: var(--ink2); }
.bk-note { font-size: 11px; color: var(--ink3); margin-top: 2px; }
.bk-a    { font-family: var(--serif); font-size: 15px; color: var(--ink); font-weight: 500; white-space: nowrap; margin-left: 12px; }

.bk-total {
  display: flex; justify-content: space-between; align-items: baseline;
  padding-top: 12px; margin-top: 4px; border-top: 1.5px solid var(--border);
  font-size: 13.5px; font-weight: 500;
}
.bk-total-a { font-family: var(--serif); font-size: 22px; color: var(--gold); }

.hrs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.hrs-cell { background: var(--bg); border-radius: 9px; padding: 13px 14px; }
.hrs-n    { font-family: var(--serif); font-size: 24px; color: var(--gold-d); font-weight: 500; }
.hrs-l    { font-size: 12px; font-weight: 300; color: var(--ink2); margin-top: 3px; }

.ai-screens-cloud { display: flex; flex-wrap: wrap; gap: 7px; }
.ai-tag-p { padding: 4px 11px; background: var(--gold-l); border: 1px solid var(--gold-bd); border-radius: 6px; font-size: 12px; color: var(--gold-d); }
.ai-tag-s { padding: 4px 11px; background: var(--purple-bg); border: 1px solid var(--purple-bd); border-radius: 6px; font-size: 12px; color: var(--purple-text); }

.jtext {
  font-size: 13.5px; font-weight: 300; color: var(--ink);
  line-height: 1.9; white-space: pre-wrap;
}

.res-acts { display: flex; gap: 9px; margin-top: 14px; flex-wrap: wrap; }
.act {
  flex: 1; min-width: 130px; padding: 11px 16px;
  font-family: var(--sans); font-size: 13px; font-weight: 400;
  border-radius: 9px; cursor: pointer; transition: all var(--t); text-align: center;
}
.act-p { background: var(--btn-bg); color: var(--btn-text); border: none; }
.act-p:hover { background: var(--btn-hover); }
.act-g { background: var(--surface); color: var(--ink); border: 1.5px solid var(--border); }
.act-g:hover { border-color: var(--ink); }
.act-g.copied { border-color: var(--success); color: var(--success); }
.act-save { background: var(--gold-l); color: var(--gold-d); border: 1.5px solid var(--gold-bd); }
.act-save:hover { background: var(--save-hover); border-color: var(--gold-d); }

.restart {
  display: block; text-align: center; margin-top: 16px;
  font-size: 12.5px; font-weight: 300; color: var(--ink3);
  cursor: pointer; text-decoration: underline; text-underline-offset: 3px;
  background: none; border: none; font-family: var(--sans);
}
.restart:hover { color: var(--ink2); }

/* ── SIDEBAR ── */
.sb-wordmark {
  font-family: var(--serif); font-size: 14px; font-weight: 500;
  letter-spacing: 0.06em; color: var(--ink); margin-bottom: 28px;
}
.sb-wordmark span { color: var(--gold); }

.sb-stat { margin-bottom: 18px; }
.sb-stat-label { font-size: 11px; font-weight: 300; color: var(--ink3); margin-bottom: 3px; }
.sb-stat-val   { font-family: var(--serif); font-size: 26px; font-weight: 500; color: var(--ink); line-height: 1; }
.sb-stat-val.gold { color: var(--gold); }

.sb-div  { height: 1px; background: var(--border); margin: 16px 0; }
.sb-item { display: flex; justify-content: space-between; align-items: baseline; font-size: 12.5px; padding: 3px 0; }
.sb-item-l { font-weight: 300; color: var(--ink3); }
.sb-item-v { font-weight: 400; color: var(--ink2); }

.sb-note {
  margin-top: 16px; font-size: 11.5px; font-weight: 300; color: var(--ink3);
  line-height: 1.6; padding: 10px 12px; background: var(--surface); border-radius: 8px;
}

/* ── MOBILE BAR ── */
.mob-bar {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--mob-bg); padding: 15px 22px;
  z-index: 100; cursor: pointer; border-top: 1px solid var(--border);
}
.mob-bar-inner { display: flex; justify-content: space-between; align-items: center; }
.mob-bar-left-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mob-muted); margin-bottom: 2px; }
.mob-bar-price { font-family: var(--serif); font-size: 20px; font-weight: 500; color: var(--mob-text); }
.mob-bar-hint  { font-size: 11px; color: var(--mob-hint); }

@media (max-width: 768px) {
  .mob-bar { display: block; }
}

/* ── BOTTOM SHEET ── */
.sheet-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 200; display: flex; align-items: flex-end;
  animation: overlayIn 0.22s ease both;
}
@keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }

.sheet {
  background: var(--panel); border-radius: 18px 18px 0 0;
  padding: 20px 22px 36px; width: 100%;
  max-height: 78vh; overflow-y: auto;
  animation: sheetUp 0.28s cubic-bezier(.4,0,.2,1) both;
}
@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.sheet-handle {
  width: 38px; height: 4px; background: var(--border2);
  border-radius: 2px; margin: 0 auto 20px;
}

/* ── SUSTAINABILITY STEP ── */
.sus-block {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: var(--r2); padding: 18px 20px; margin-bottom: 14px;
}
.sus-row-hd { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.sus-lbl { font-size: 13px; font-weight: 500; color: var(--ink2); }
.sus-val { font-family: var(--serif); font-size: 22px; font-weight: 500; color: var(--gold-d); }
.sus-slider {
  width: 100%; accent-color: var(--gold); margin-bottom: 6px;
  height: 3px; cursor: pointer;
}
.sus-range-labels {
  display: flex; justify-content: space-between;
  font-size: 11px; font-weight: 300; color: var(--ink3); margin-bottom: 10px;
}
.sus-preview {
  font-size: 13px; font-weight: 300; color: var(--ink2);
  background: var(--gold-l); border: 1px solid var(--gold-bd); border-radius: 8px;
  padding: 9px 13px; margin-bottom: 8px; line-height: 1.5;
}
.sus-preview strong { font-weight: 500; color: var(--gold-d); }
.sus-note { font-size: 12px; font-weight: 300; color: var(--ink3); line-height: 1.55; }

/* GST toggle */
.gst-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; background: var(--surface);
  border: 1.5px solid var(--border); border-radius: var(--r2);
  padding: 15px 18px; margin-bottom: 22px; cursor: pointer;
  transition: border-color var(--t), background var(--t);
}
.gst-row:hover  { border-color: var(--gold-d); }
.gst-row.gst-on { border-color: var(--gold); background: var(--gold-l); }
.gst-label { font-size: 14px; font-weight: 500; color: var(--ink); margin-bottom: 2px; }
.gst-sub   { font-size: 12px; font-weight: 300; color: var(--ink3); }
.tog-track {
  width: 40px; height: 22px; border-radius: 11px; background: var(--border2);
  flex-shrink: 0; position: relative; transition: background var(--t);
}
.gst-row.gst-on .tog-track { background: var(--gold); }
.tog-thumb {
  position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
  border-radius: 50%; background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,.18);
  transition: transform var(--t);
}
.tog-thumb.tog-on { transform: translateX(18px); }

/* ── RATE TRANSPARENCY GRID ── */
.rate-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.rate-cell { background: var(--bg); border-radius: 9px; padding: 13px 14px; }
.rate-val  { font-family: var(--serif); font-size: 17px; color: var(--gold-d); font-weight: 500; line-height: 1.2; margin-bottom: 3px; }
.rate-lbl  { font-size: 12px; font-weight: 300; color: var(--ink2); }

/* ── RESULTS subtotal separator ── */
.bk-subtotal-row {
  display: flex; justify-content: space-between; align-items: baseline;
  border-top: 1.5px solid var(--border); margin-top: 6px; padding-top: 10px;
  font-size: 13px;
}
.bk-subtotal-l { font-weight: 500; color: var(--ink2); }
.bk-subtotal-a { font-family: var(--serif); font-size: 16px; color: var(--ink2); font-weight: 500; }

/* ── NAV PILLS (inside estimator header) ── */
.nav-pill {
  padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 400;
  background: var(--bg); border: 1.5px solid var(--border); color: var(--ink3);
  cursor: pointer; font-family: var(--sans); transition: all var(--t);
}
.nav-pill:hover { border-color: var(--border2); color: var(--ink); }

/* Share button */
.act-share {
  background: var(--blue-bg); color: var(--blue-text); border: 1.5px solid var(--blue-bd);
  flex: 1; min-width: 130px; padding: 11px 16px; font-family: var(--sans);
  font-size: 13px; font-weight: 400; border-radius: 9px; cursor: pointer;
  transition: all var(--t); text-align: center;
}
.act-share:hover { background: var(--blue-hover); border-color: var(--blue-text); }

/* Shared quote page */
.quote-page {
  max-width: 720px; margin: 0 auto; padding: 48px 40px 80px;
  animation: screenIn 0.35s cubic-bezier(.4,0,.2,1) both;
}
@media (max-width: 600px) { .quote-page { padding: 28px 20px 60px; } }
.quote-badge {
  display: inline-flex; align-items: center; gap: 7px;
  background: var(--sbg); border: 1px solid var(--success-bd); border-radius: 20px;
  padding: 5px 13px; font-size: 11.5px; font-weight: 500; color: var(--success);
  letter-spacing: 0.05em; margin-bottom: 22px;
}
.quote-title {
  font-family: var(--serif); font-size: clamp(28px, 5vw, 44px); font-weight: 500;
  line-height: 1.1; margin-bottom: 10px; color: var(--ink);
}
.quote-title em { color: var(--gold); font-style: italic; }
.quote-sub { font-size: 13.5px; font-weight: 300; color: var(--ink3); margin-bottom: 32px; line-height: 1.6; }
.quote-stats {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px;
}
@media (max-width: 480px) { .quote-stats { grid-template-columns: 1fr 1fr; } }
.qs-cell { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 16px 17px; }
.qs-val  { font-family: var(--serif); font-size: 22px; font-weight: 500; color: var(--gold-d); margin-bottom: 3px; }
.qs-lbl  { font-size: 12px; font-weight: 300; color: var(--ink3); }
.quote-range {
  background: var(--sbg); border: 1.5px solid var(--success-bd);
  border-radius: var(--r2); padding: 26px 26px; margin-bottom: 22px;
}
.qr-label { font-size: 10px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: var(--success); opacity: 0.7; margin-bottom: 8px; }
.qr-range { font-family: var(--serif); font-size: clamp(28px, 5vw, 44px); font-weight: 500; color: var(--success); margin-bottom: 5px; }
.qr-note  { font-size: 12px; font-weight: 300; color: var(--success); opacity: 0.6; }
.quote-just {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: var(--r2); padding: 22px 22px; margin-bottom: 22px;
}
.qj-title { font-size: 10px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink3); margin-bottom: 14px; }
.qj-text  { font-size: 13.5px; font-weight: 300; color: var(--ink); line-height: 1.9; white-space: pre-wrap; }
.quote-footer {
  text-align: center; padding-top: 24px; border-top: 1px solid var(--border);
  font-size: 12px; font-weight: 300; color: var(--ink3);
}
.quote-footer span { font-family: var(--serif); font-weight: 500; color: var(--gold-d); }

/* SaaS screens (history, account, auth) */
.saas-page { max-width: 760px; margin: 0 auto; padding: 40px 40px 100px; animation: screenIn 0.3s ease both; }
@media (max-width: 600px) { .saas-page { padding: 24px 20px 80px; } }
.sp-title { font-family: var(--serif); font-size: clamp(24px,4vw,36px); font-weight: 500; margin-bottom: 6px; }
.sp-title em { font-style: italic; color: var(--gold); }
.sp-sub { font-size: 13.5px; font-weight: 300; color: var(--ink3); margin-bottom: 28px; line-height: 1.6; }

/* Auth card */
.auth-center { min-height: calc(100vh - 52px); display: flex; align-items: center; justify-content: center; padding: 24px; }
.auth-card {
  background: var(--surface); border: 1.5px solid var(--border); border-radius: 20px;
  padding: 38px 34px; width: 100%; max-width: 400px;
  box-shadow: 0 8px 40px rgba(0,0,0,.07);
}
.auth-logo { font-family: var(--serif); font-size: 20px; font-weight: 500; margin-bottom: 4px; }
.auth-logo span { color: var(--gold); }
.auth-tagline { font-size: 12.5px; font-weight: 300; color: var(--ink3); margin-bottom: 26px; line-height: 1.55; }
.auth-heading { font-family: var(--serif); font-size: 22px; font-weight: 500; margin-bottom: 18px; }
.auth-field { margin-bottom: 13px; }
.auth-field-label { font-size: 11.5px; font-weight: 500; color: var(--ink2); margin-bottom: 5px; letter-spacing: 0.03em; }
.auth-input {
  width: 100%; padding: 11px 13px; font-size: 14px; font-family: var(--sans); font-weight: 300;
  color: var(--ink); background: var(--bg); border: 1.5px solid var(--border2);
  border-radius: var(--r); outline: none; transition: border-color var(--t);
}
.auth-input:focus { border-color: var(--gold); background: var(--surface); }
.auth-submit {
  width: 100%; padding: 12px; margin-top: 6px; font-size: 14px; font-weight: 500;
  font-family: var(--sans); border: none; border-radius: var(--r);
  background: var(--gold); color: white; cursor: pointer; transition: background var(--t);
}
.auth-submit:hover    { background: var(--gold-d); }
.auth-submit:disabled { background: var(--border2); cursor: not-allowed; }
.auth-switch { margin-top: 16px; text-align: center; font-size: 13px; font-weight: 300; color: var(--ink3); }
.auth-switch button { background: none; border: none; color: var(--gold); font-weight: 500; cursor: pointer; font-family: var(--sans); font-size: 13px; }
.auth-error { background: var(--danger-l); border: 1px solid var(--danger-bd); border-radius: 9px; padding: 10px 13px; font-size: 13px; font-weight: 300; color: var(--danger); margin-bottom: 13px; }
.auth-anon { display: block; text-align: center; margin-top: 14px; font-size: 12.5px; font-weight: 300; color: var(--ink3); cursor: pointer; background: none; border: none; font-family: var(--sans); text-decoration: underline; text-underline-offset: 3px; }
.auth-anon:hover { color: var(--ink2); }

/* Global nav bar */
.g-nav {
  position: sticky; top: 0; z-index: 400; height: 52px;
  background: var(--panel); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; padding: 0 28px;
}
.g-nav-logo { font-family: var(--serif); font-size: 16px; font-weight: 500; cursor: pointer; letter-spacing: 0.05em; }
.g-nav-logo span { color: var(--gold); }
.g-nav-links { display: flex; align-items: center; gap: 2px; }
.g-nav-btn {
  padding: 5px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 400;
  color: var(--ink3); cursor: pointer; border: none; background: none;
  font-family: var(--sans); transition: background var(--t), color var(--t);
}
.g-nav-btn:hover { background: var(--bg); color: var(--ink); }
.g-nav-btn.active { background: var(--gold-l); color: var(--gold-d); font-weight: 500; }
.g-nav-btn.danger:hover { background: var(--danger-l); color: var(--danger); }
@media (max-width: 500px) { .g-nav { padding: 0 16px; } .g-nav-btn { padding: 5px 9px; font-size: 12px; } }

/* History list */
.hist-list { display: flex; flex-direction: column; gap: 10px; }
.hist-card {
  background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2);
  padding: 16px 18px; display: flex; align-items: center; gap: 14px;
  transition: border-color var(--t);
}
.hist-card:hover { border-color: var(--border2); }
.hist-info { flex: 1; min-width: 0; }
.hist-type { font-size: 14px; font-weight: 500; color: var(--ink); margin-bottom: 3px; }
.hist-meta { font-size: 12px; font-weight: 300; color: var(--ink3); }
.hist-range { font-family: var(--serif); font-size: 17px; font-weight: 500; color: var(--success); white-space: nowrap; flex-shrink: 0; }
.hist-btns { display: flex; gap: 5px; flex-shrink: 0; }
.hbtn {
  padding: 5px 11px; border-radius: 7px; font-size: 12px; font-weight: 400;
  cursor: pointer; font-family: var(--sans); border: 1.5px solid var(--border);
  background: var(--surface); color: var(--ink2); transition: all var(--t);
}
.hbtn:hover { border-color: var(--border2); color: var(--ink); }
.hbtn.primary { background: var(--btn-bg); color: var(--btn-text); border-color: var(--btn-bg); }
.hbtn.primary:hover { background: var(--btn-hover); }
.hbtn.del:hover { border-color: var(--danger); color: var(--danger); background: var(--danger-l); }
.hist-empty {
  text-align: center; padding: 56px 20px; border: 1.5px dashed var(--border2);
  border-radius: var(--r2);
}
.hist-empty-icon { font-size: 28px; margin-bottom: 12px; }
.hist-empty-txt  { font-size: 14px; font-weight: 300; color: var(--ink3); line-height: 1.7; }

/* Account page */
.acct-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-bottom: 24px; }
@media(max-width:480px) { .acct-grid { grid-template-columns: 1fr; } }
.acct-cell { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 16px 18px; }
.acct-val  { font-family: var(--serif); font-size: 22px; font-weight: 500; color: var(--gold-d); margin-bottom: 3px; }
.acct-lbl  { font-size: 12px; font-weight: 300; color: var(--ink3); }
.acct-info { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r2); overflow: hidden; margin-bottom: 24px; }
.acct-row  { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 17px; border-bottom: 1px solid var(--border); font-size: 13.5px; }
.acct-row:last-child { border-bottom: none; }
.acct-k { font-weight: 300; color: var(--ink3); }
.acct-v { font-weight: 500; color: var(--ink); }
.danger-btn {
  padding: 10px 18px; background: none; border: 1.5px solid var(--border2);
  border-radius: var(--r); font-size: 13px; font-weight: 400; color: var(--ink2);
  font-family: var(--sans); cursor: pointer; transition: all var(--t);
}
.danger-btn:hover { border-color: var(--danger); color: var(--danger); background: var(--danger-l); }

/* Toast */
.toast {
  position: fixed; bottom: 76px; left: 50%; transform: translateX(-50%);
  padding: 9px 20px; border-radius: 25px; font-size: 13px; font-weight: 400;
  pointer-events: none; z-index: 999; white-space: nowrap;
  animation: toastIn 0.22s ease both;
}
.toast-ok  { background: var(--success); color: white; }
.toast-err { background: var(--danger); color: white; }
.toast-def { background: var(--btn-bg); color: var(--btn-text); }
@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

/* Spinner */
.spin { width:30px;height:30px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin360 .75s linear infinite; }
@keyframes spin360 { to { transform:rotate(360deg); } }
.loading-screen { min-height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px; }
.loading-txt { font-size:13px;font-weight:300;color:var(--ink3); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function Back({ onClick, label = "Back" }: any) {
  return (
    <button className="back-btn" onClick={onClick}>← {label}</button>
  );
}

function PrimaryBtn({ children, onClick, disabled }: any) {
  return <button className="btn btn-primary" onClick={onClick} disabled={disabled}>{children}</button>;
}
function GoldBtn({ children, onClick, disabled }: any) {
  return <button className="btn btn-gold" onClick={onClick} disabled={disabled}>{children}</button>;
}
function OutlineBtn({ children, onClick }: any) {
  return <button className="btn btn-outline" onClick={onClick}>{children}</button>;
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
          {o.icon && <span className="opt-card-icon">{o.icon}</span>}
          <span className="opt-card-content">
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

function DescriptionPreview({ description }: any) {
  const [expanded, setExpanded] = useState(false);
  if (!description) return null;
  return (
    <div className="desc-preview">
      <div className="desc-preview-label">From your description</div>
      <div className={`desc-preview-text ${expanded ? "expanded" : "clamped"}`}>
        "{description}"
      </div>
      <button className="read-more-btn" onClick={() => setExpanded(e => !e)}>
        {expanded ? "Show less ↑" : "Read more ↓"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR / MOBILE PANEL
// ─────────────────────────────────────────────────────────────────────────────

function LivePanel({ state }: any) {
  const hasExp = !!state.experience;
  const hasScope = state.mode === "quick" ? !!state.hours : state.primaryScreens > 0;
  const est = hasExp && hasScope ? calcEstimate(state) : null;

  const items = [];
  if (state.projectType) {
    const pt = PROJECT_TYPES.find(p => p.id === state.projectType);
    items.push({ l: "Project", v: pt?.label });
  }
  if (state.mode !== "quick") {
    if (state.primaryScreens > 0) items.push({ l: "Primary screens", v: state.primaryScreens });
    if (state.secondaryScreens > 0) items.push({ l: "Secondary screens", v: state.secondaryScreens });
  }
  if (state.experience) {
    const exp = EXPERIENCE_LEVELS.find(e => e.id === state.experience);
    items.push({ l: "Rate range", v: exp.rangeLabel });
    if (est) items.push({ l: "Effective rate", v: inr(est.effRateMid) + "/hr" });
  }
  if (state.uxActivities.length > 0) items.push({ l: "UX activities", v: state.uxActivities.length + " selected" });
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

function MobileBar({ state, onTap }: any) {
  const hasExp = !!state.experience;
  const hasScope = state.mode === "quick" ? !!state.hours : state.primaryScreens > 0;
  const est = hasExp && hasScope ? calcEstimate(state) : null;
  const priceText = est ? inr(est.low) + " – " + inr(est.high) : "—";

  return (
    <div className="mob-bar" onClick={onTap}>
      <div className="mob-bar-inner">
        <div>
          <div className="mob-bar-left-label">Live Estimate</div>
          <div className="mob-bar-price">{priceText}</div>
        </div>
        <div className="mob-bar-hint">Tap to expand ↑</div>
      </div>
    </div>
  );
}

function BottomSheet({ state, onClose }: any) {
  const hasExp = !!state.experience;
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
// ENTRY SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function EntryScreen({ onSelect }: any) {
  return (
    <div className="screen">
      <div className="eyebrow">FairScope · Pricing Assistant</div>
      <h1 className="screen-title">How would you like to<br /><em>estimate this project?</em></h1>
      <p className="screen-sub">Choose the method that best reflects your current understanding of the scope.</p>

      <div className="entry-grid">
        <button className="entry-card" onClick={() => onSelect("quick")}>
          <span className="ec-arrow">→</span>
          <div className="ec-num">01</div>
          <div className="ec-title">Quick Estimate</div>
          <div className="ec-desc">You already have a rough hour figure. Fast, direct, and takes about 2 minutes.</div>
        </button>
        <button className="entry-card" onClick={() => onSelect("scope")}>
          <span className="ec-arrow">→</span>
          <div className="ec-num">02</div>
          <div className="ec-title">Scope Builder</div>
          <div className="ec-desc">You know screens and deliverables. Build a detailed, defensible estimate from the ground up.</div>
        </button>
        <button className="entry-card featured" onClick={() => onSelect("ai")}>
          <span className="ec-arrow">→</span>
          <div className="ec-badge">AI-assisted</div>
          <div className="ec-num">03</div>
          <div className="ec-title">Describe Your Project</div>
          <div className="ec-desc">Paste a project brief. AI extracts screens and flows — you confirm, then continue building your estimate.</div>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STEPS
// ─────────────────────────────────────────────────────────────────────────────

function StepProjectType({ state, onUpdate, onNext, onBack, stepLabel }: any) {
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

function StepExperience({ state, onUpdate, onNext, onBack, stepLabel, isFinal }: any) {
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

function StepRevisions({ state, onUpdate, onNext, onBack, stepLabel }: any) {
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

function StepPlatform({ state, onUpdate, onNext, onBack, stepLabel }: any) {
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Which <em>platforms</em><br />are in scope?</h2>
      <p className="screen-sub">Designing for multiple platforms multiplies screen effort by 1.3×.</p>
      <RadioCards
        options={PLATFORM_OPTIONS}
        selected={state.platform}
        onSelect={v => onUpdate({ platform: v })}
        layout="2"
      />
      <PrimaryBtn onClick={onNext} disabled={!state.platform}>Continue →</PrimaryBtn>
    </div>
  );
}

function StepFlowComplexity({ state, onUpdate, onNext, onBack, stepLabel }: any) {
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">How complex are the<br /><em>user flows?</em></h2>
      <p className="screen-sub">Flow complexity multiplies screen effort to account for design decisions at each branch point.</p>
      <RadioCards
        options={FLOW_COMPLEXITY}
        selected={state.flowComplexity}
        onSelect={v => onUpdate({ flowComplexity: v })}
        layout="list"
      />
      <PrimaryBtn onClick={onNext} disabled={!state.flowComplexity}>Continue →</PrimaryBtn>
    </div>
  );
}

function StepDesignSystem({ state, onUpdate, onNext, onBack, stepLabel }: any) {
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Is a <em>design system</em><br />in scope?</h2>
      <p className="screen-sub">Design systems add fixed hours for token setup, documentation, and component coverage.</p>
      <RadioCards
        options={DESIGN_SYSTEM}
        selected={state.designSystem}
        onSelect={v => onUpdate({ designSystem: v })}
        layout="list"
      />
      <PrimaryBtn onClick={onNext} disabled={!state.designSystem}>Continue →</PrimaryBtn>
    </div>
  );
}

function StepUXActivities({ state, onUpdate, onNext, onBack, stepLabel }: any) {
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
      <p className="screen-sub">
        Select all activities in scope.{" "}
        {selected.length > 0 && (
          <span style={{ color: "var(--gold)", fontWeight: 500 }}>
            {selected.length} selected · +{totalHrs} hrs
          </span>
        )}
      </p>

      {UX_GROUPS.map(group => (
        <div className="check-section" key={group.id}>
          <div className="check-section-label">{group.label}</div>
          <div className="check-list">
            {group.items.map(item => (
              <button
                key={item.id}
                className={`check-card${selected.includes(item.id) ? " checked" : ""}`}
                onClick={() => toggle(item.id)}
              >
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
// QUICK FLOW
// ─────────────────────────────────────────────────────────────────────────────

function StepHours({ state, onUpdate, onNext, onBack, stepLabel }: any) {
  const hrs = Number(state.hours) || 0;
  const warn = hrs > 0 && hrs < 10
    ? "Very low estimate. Consider if research, revisions, and handoff are accounted for."
    : hrs > 200
    ? "Large scope. Confirm this is a single engagement and not multiple projects."
    : null;

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">How many hours do you<br /><em>estimate</em> for this project?</h2>
      <p className="screen-sub">Include all design work — research, wireframing, UI, revisions, and handoff.</p>

      <div className="num-field">
        <div className="num-label">Total estimated hours</div>
        <div className="num-wrap">
          <input
            className="num-in"
            type="number"
            min="1"
            max="5000"
            placeholder="60"
            value={state.hours || ""}
            onChange={e => onUpdate({ hours: e.target.value })}
            autoFocus
          />
          <span className="num-unit">hrs</span>
        </div>
      </div>

      {warn && <div className="warn-box">{warn}</div>}
      <div className="info-note">Buffer (15%) and revision adjustments will be added automatically.</div>
      <PrimaryBtn onClick={onNext} disabled={!state.hours || hrs <= 0}>Continue →</PrimaryBtn>
    </div>
  );
}

function ReviewQuick({ state, onNext, onBack, jumpTo }: any) {
  const proj = PROJECT_TYPES.find(p => p.id === state.projectType);
  const exp  = EXPERIENCE_LEVELS.find(e => e.id === state.experience);

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Review your<br /><em>estimate details.</em></h2>
      <p className="screen-sub">Confirm before generating your pricing breakdown.</p>
      <div className="rev-box">
        {[
          { k: "Project type",    v: proj?.label,                                         step: 1 },
          { k: "Estimated hours", v: `${state.hours} hrs`,                                step: 2 },
          { k: "Revision cycles", v: `${state.revisions} cycle${state.revisions>1?"s":""}`, step: 3 },
          { k: "Experience",      v: `${exp?.label} · ${inr(exp?.rate)}/hr`,              step: 4 },
        ].map(r => (
          <div className="rev-row" key={r.k}>
            <span className="rev-k">{r.k}</span>
            <span>
              <span className="rev-v">{r.v}</span>
              <span className="rev-ed" onClick={() => jumpTo(r.step)}>Edit</span>
            </span>
          </div>
        ))}
      </div>
      <GoldBtn onClick={onNext}>Generate Estimate →</GoldBtn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE FLOW
// ─────────────────────────────────────────────────────────────────────────────

function StepScreens({ state, onUpdate, onNext, onBack, stepLabel }: any) {
  const total = state.primaryScreens + state.secondaryScreens;
  const warn  = total > 50
    ? "Very large screen count. Ensure this is a single engagement scope."
    : null;

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">How many <em>screens</em><br />does this project have?</h2>
      <p className="screen-sub">
        Primary screens = distinct full-page views (4 hrs each).<br />
        Secondary = modals, overlays, empty states (1.5 hrs each).
      </p>

      <div className="screens-pair">
        <div className="num-field">
          <div className="num-label">Primary screens</div>
          <div className="num-wrap">
            <input
              className="num-in"
              type="number"
              min="0"
              max="999"
              placeholder="8"
              value={state.primaryScreens || ""}
              onChange={e => onUpdate({ primaryScreens: Math.max(0, parseInt(e.target.value) || 0) })}
              autoFocus
            />
            <span className="num-unit">screens</span>
          </div>
        </div>
        <div className="num-field">
          <div className="num-label">Secondary screens <span style={{ color: "var(--ink3)", fontWeight: 300 }}>(optional)</span></div>
          <div className="num-wrap">
            <input
              className="num-in"
              type="number"
              min="0"
              max="999"
              placeholder="0"
              value={state.secondaryScreens || ""}
              onChange={e => onUpdate({ secondaryScreens: Math.max(0, parseInt(e.target.value) || 0) })}
            />
            <span className="num-unit">screens</span>
          </div>
        </div>
      </div>

      {warn && <div className="warn-box">{warn}</div>}
      <PrimaryBtn onClick={onNext} disabled={state.primaryScreens < 1}>Continue →</PrimaryBtn>
    </div>
  );
}

function ReviewScope({ state, onNext, onBack, jumpTo }: any) {
  const proj    = PROJECT_TYPES.find(p => p.id === state.projectType);
  const exp     = EXPERIENCE_LEVELS.find(e => e.id === state.experience);
  const pl      = PLATFORM_OPTIONS.find(p => p.id === state.platform);
  const fc      = FLOW_COMPLEXITY.find(f => f.id === state.flowComplexity);
  const ds      = DESIGN_SYSTEM.find(d => d.id === state.designSystem);
  const uxNames = state.uxActivities.map(id => ALL_UX_ITEMS.find(u => u.id === id)?.label).filter(Boolean).join(", ") || "None";
  const screenStr = state.aiAnalysis
    ? `${state.primaryScreens} primary + ${state.secondaryScreens} secondary (AI)`
    : `${state.primaryScreens} primary${state.secondaryScreens > 0 ? " + " + state.secondaryScreens + " secondary" : ""}`;

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Review your<br /><em>scope details.</em></h2>
      <p className="screen-sub">Confirm before generating your estimate.</p>

      <div className="rev-box">
        {[
          { k: "Project type",     v: proj?.label,                                         step: 1 },
          { k: "Screen count",     v: screenStr,                                           step: 2 },
          { k: "Platform",         v: pl?.label,                                           step: 3 },
          { k: "Flow complexity",  v: `${fc?.label} (${fc?.tag})`,                        step: 4 },
          { k: "Design system",    v: ds?.label,                                           step: 5 },
          { k: "UX activities",    v: uxNames,                                             step: 6 },
          { k: "Revision cycles",  v: `${state.revisions} cycle${state.revisions>1?"s":""}`, step: 7 },
          { k: "Experience",       v: `${exp?.label} · ${inr(exp?.rate)}/hr`,             step: 8 },
        ].map(r => (
          <div className="rev-row" key={r.k}>
            <span className="rev-k">{r.k}</span>
            <span>
              <span className="rev-v">{r.v}</span>
              <span className="rev-ed" onClick={() => jumpTo(r.step)}>Edit</span>
            </span>
          </div>
        ))}
      </div>
      <GoldBtn onClick={onNext}>Generate Estimate →</GoldBtn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI FLOW
// ─────────────────────────────────────────────────────────────────────────────

function StepAIDescription({ state, onUpdate, onAnalyse, onSkip, onBack }: any) {
  const [desc, setDesc] = useState(state._aiDesc || "");

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Describe your<br /><em>project.</em></h2>
      <p className="screen-sub">Paste a brief, RFP, or your own notes. AI will extract primary screens, secondary screens, and key flows.</p>

      <textarea
        className="txt-area"
        placeholder="e.g. A mobile app for booking fitness classes with login, profile, booking flow, payment integration and an admin dashboard for gym owners to manage schedules and view analytics."
        value={desc}
        onChange={e => setDesc(e.target.value)}
      />
      <p className="info-note">More detail yields more accurate extraction. Include user roles, key features, and any integrations.</p>

      <GoldBtn onClick={() => { onUpdate({ _aiDesc: desc }); onAnalyse(desc); }} disabled={desc.trim().length < 20}>
        Analyse with AI →
      </GoldBtn>
      <OutlineBtn onClick={onSkip}>Skip — enter screens manually instead</OutlineBtn>
    </div>
  );
}

function StepAILoading() {
  return (
    <div className="screen">
      <div className="ai-loading">
        <div className="spinner" />
        <p className="ai-loading-text">Analysing your project description…</p>
        <span className="ai-loading-sub">Extracting screens, flows, and features</span>
      </div>
    </div>
  );
}

function StepAIConfirm({ state, onUpdate, onNext, onBack }: any) {
  const a         = state.aiAnalysis;
  const remP      = state._aiRemovedP || [];
  const remS      = state._aiRemovedS || [];
  const activeP   = a.primaryScreens.filter((_, i) => !remP.includes(i));
  const activeS   = a.secondaryScreens.filter((_, i) => !remS.includes(i));
  const effHrs    = activeP.length * 4 + activeS.length * 1.5;

  const removeP   = i => onUpdate({ _aiRemovedP: [...remP, i] });
  const restoreP  = i => onUpdate({ _aiRemovedP: remP.filter(x => x !== i) });
  const removeS   = i => onUpdate({ _aiRemovedS: [...remS, i] });
  const restoreS  = i => onUpdate({ _aiRemovedS: remS.filter(x => x !== i) });

  function confirm() {
    onUpdate({
      primaryScreens: activeP.length,
      secondaryScreens: activeS.length,
      _aiActiveP: activeP,
      _aiActiveS: activeS,
    });
    onNext();
  }

  return (
    <div className="screen">
      <Back onClick={onBack} label="Edit description" />
      <h2 className="screen-title">Review <em>extracted</em><br />scope.</h2>
      <p className="screen-sub">Remove any screens that are out of scope. Secondary screens are weighted at 1.5 hrs each.</p>

      <DescriptionPreview description={state._aiDesc} />

      {/* Flows + Features */}
      <div className="flows-grid">
        <div className="ff-card">
          <div className="ff-title">Key Flows</div>
          <ul className="ff-list">
            {a.keyFlows.map((f, i) => (
              <li key={i}><span className="ff-dot" />{f}</li>
            ))}
          </ul>
        </div>
        <div className="ff-card">
          <div className="ff-title">Core Features</div>
          <ul className="ff-list">
            {a.coreFeatures.map((f, i) => (
              <li key={i}><span className="ff-dot" />{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Primary Screens */}
      <div className="sc-section">
        <div className="sc-section-hd">
          <span className="sc-section-title">Primary Screens</span>
          <span className="sc-badge">{activeP.length} active · 4 hrs each</span>
        </div>
        <div className="sc-list">
          {a.primaryScreens.map((sc, i) => {
            const removed = remP.includes(i);
            return (
              <div key={i} className={`sc-item${removed ? " removed" : ""}`}>
                <span className="sc-item-left">
                  <span className="sc-item-name">{sc.name}</span>
                  <span className="sc-item-why">{sc.reason}</span>
                </span>
                <span className="sc-badge-p">Primary</span>
                {removed
                  ? <button className="sc-restore" onClick={() => restoreP(i)}>Restore</button>
                  : <button className="sc-remove" onClick={() => removeP(i)}>×</button>
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Screens */}
      <div className="sc-section">
        <div className="sc-section-hd">
          <span className="sc-section-title">Secondary Screens</span>
          <span className="sc-badge">{activeS.length} active · 1.5 hrs each</span>
        </div>
        <div className="sc-list">
          {a.secondaryScreens.map((sc, i) => {
            const removed = remS.includes(i);
            return (
              <div key={i} className={`sc-item${removed ? " removed" : ""}`}>
                <span className="sc-item-left">
                  <span className="sc-item-name">{sc.name}</span>
                  <span className="sc-item-why">{sc.reason}</span>
                </span>
                <span className="sc-badge-s">Secondary</span>
                {removed
                  ? <button className="sc-restore" onClick={() => restoreS(i)}>Restore</button>
                  : <button className="sc-remove" onClick={() => removeS(i)}>×</button>
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="confirm-summary">
        <div className="conf-cell">
          <div className="conf-num">{activeP.length}</div>
          <div className="conf-lbl">Primary screens</div>
        </div>
        <div className="conf-cell">
          <div className="conf-num">{activeS.length}</div>
          <div className="conf-lbl">Secondary screens</div>
        </div>
        <div className="conf-cell accent">
          <div className="conf-num">{Math.round(effHrs)} hrs</div>
          <div className="conf-lbl">Base screen effort before modifiers</div>
        </div>
      </div>

      <PrimaryBtn onClick={confirm} disabled={activeP.length === 0}>Confirm Scope →</PrimaryBtn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUSTAINABILITY STEPS
// ─────────────────────────────────────────────────────────────────────────────

function StepPMOverhead({ state, onUpdate, onNext, onBack }: any) {
  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Project management<br /><em>overhead?</em></h2>
      <p className="screen-sub">
        How much coordination, meetings, and client management does this project involve?
        Applied as a percentage of total design hours.
      </p>
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
  const effRate  = expLevel ? Math.round(expLevel.rate / util) : null;

  return (
    <div className="screen">
      <Back onClick={onBack} />
      <h2 className="screen-title">Sustainability<br /><em>settings.</em></h2>
      <p className="screen-sub">
        These defaults reflect Indian freelance market realities. Adjust only if your situation differs.
      </p>

      <div className="sus-block">
        <div className="sus-row-hd">
          <div className="sus-lbl">Utilization rate</div>
          <div className="sus-val">{Math.round(util * 100)}%</div>
        </div>
        <input
          type="range" min="30" max="100" step="5"
          value={Math.round(util * 100)}
          onChange={e => onUpdate({ utilizationRate: Number(e.target.value) / 100 })}
          className="sus-slider"
        />
        <div className="sus-range-labels"><span>30% — heavy admin</span><span>100% — fully billable</span></div>
        {effRate && (
          <div className="sus-preview">
            {expLevel.rangeLabel} midpoint ÷ {Math.round(util * 100)}% utilization
            = <strong>{inr(effRate)}/hr effective rate</strong>
          </div>
        )}
        <p className="sus-note">Covers non-billable time: admin, marketing, client communication, and business development.</p>
      </div>

      <div className="sus-block">
        <div className="sus-row-hd">
          <div className="sus-lbl">Freelance sustainability multiplier</div>
          <div className="sus-val">{mult.toFixed(2)}×</div>
        </div>
        <input
          type="range" min="100" max="175" step="5"
          value={Math.round(mult * 100)}
          onChange={e => onUpdate({ freelanceMult: Number(e.target.value) / 100 })}
          className="sus-slider"
        />
        <div className="sus-range-labels"><span>1.00× — no premium</span><span>1.75× — high overhead</span></div>
        <p className="sus-note">Covers what salaried designers don't pay: software, hardware, health insurance, and business risk.</p>
      </div>

      <div
        className={"gst-row" + (state.includeGST ? " gst-on" : "")}
        onClick={() => onUpdate({ includeGST: !state.includeGST })}
      >
        <div>
          <div className="gst-label">Add GST (18%)</div>
          <div className="gst-sub">Enable if you are GST-registered. Shown separately in results.</div>
        </div>
        <div className="tog-track">
          <div className={"tog-thumb" + (state.includeGST ? " tog-on" : "")} />
        </div>
      </div>

      <GoldBtn onClick={onNext}>Generate Estimate →</GoldBtn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

function ResultsScreen({ state, onRestart }: any) {
  const [copied, setCopied] = useState(false);
  const est    = calcEstimate(state);
  const just   = buildJustification(state, est);
  const pmLbl  = PM_OVERHEAD.find(p => p.id === (state.pmOverhead || "standard"))?.label || "Standard";

  function copy() {
    navigator.clipboard.writeText(just);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function download() {
    const pt = PROJECT_TYPES.find(p => p.id === state.projectType)?.label;
    const bk = est.breakdown.map(r => `  ${r.label}: ${inr(r.amount)} (${r.note})`).join("\n");
    const lines = [
      "FAIRSCOPE — PROJECT ESTIMATE",
      "═".repeat(42),
      "",
      `Project: ${pt}`,
      `Mode: ${state.mode === "quick" ? "Quick Estimate" : state.mode === "ai" ? "AI Mode + Scope Builder" : "Scope Builder"}`,
      `Design Hours: ${est.totalHrs} hrs`,
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
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const hrsDetail = est.hrsDetail;
  const hasAI     = state.mode === "ai" && state._aiActiveP;

  return (
    <div className="result-wrap">
      {/* ── Range Hero ── */}
      <div className="range-hero">
        <div className="rh-eyebrow">Suggested Professional Range</div>
        <div className="rh-range">{inr(est.low)} – {inr(est.high)}</div>
        <div className="rh-hrs">{est.totalHrs} design hrs · {est.expLevel?.rangeLabel}</div>
        <div className="rh-note">
          Effective {inr(est.effRateMid)}/hr after {Math.round((1 - est.utilization) * 100)}% utilization adjustment
          {state.includeGST ? ` · GST ${inr(est.gstMid)} included` : ""}
        </div>
      </div>

      {/* ── Scope Breakdown (hours → cost at effective rate) ── */}
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
          <span className="bk-subtotal-l">Base design cost</span>
          <span className="bk-subtotal-a">{inr(est.designCostMid)}</span>
        </div>
      </div>

      {/* ── Pricing Layers (sustainability stack) ── */}
      <div className="result-card">
        <div className="rc-title">Pricing Layers</div>
        <div className="bk-row">
          <span>
            <div className="bk-l">Base design cost</div>
            <div className="bk-note">{est.totalHrs} hrs × {inr(est.effRateMid)}/hr effective rate</div>
          </span>
          <span className="bk-a">{inr(est.designCostMid)}</span>
        </div>
        {est.pmCostMid > 0 && (
          <div className="bk-row">
            <span>
              <div className="bk-l">Project management — {pmLbl}</div>
              <div className="bk-note">+{Math.round(est.pmPct * 100)}% of design cost</div>
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

      {/* ── Effort Grid (scope/AI only) ── */}
      {state.mode !== "quick" && hrsDetail && (
        <div className="result-card">
          <div className="rc-title">Effort Breakdown</div>
          <div className="hrs-grid">
            <div className="hrs-cell">
              <div className="hrs-n">{hrsDetail.primaryHrs}</div>
              <div className="hrs-l">Primary screens ({state.primaryScreens})</div>
            </div>
            {state.secondaryScreens > 0 && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.secondaryHrs}</div>
                <div className="hrs-l">Secondary screens ({state.secondaryScreens})</div>
              </div>
            )}
            {hrsDetail.uxHrs > 0 && (
              <div className="hrs-cell">
                <div className="hrs-n">{hrsDetail.uxHrs}</div>
                <div className="hrs-l">UX research ({state.uxActivities.length} activities)</div>
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
              <div className="hrs-l">Total design hours</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Rate Transparency ── */}
      <div className="result-card">
        <div className="rc-title">Rate Transparency</div>
        <div className="rate-grid">
          <div className="rate-cell">
            <div className="rate-val">{est.expLevel?.rangeLabel || "—"}</div>
            <div className="rate-lbl">Market rate range</div>
          </div>
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

      {/* ── AI Confirmed Screens ── */}
      {hasAI && (
        <div className="result-card">
          <div className="rc-title">AI Scope — Confirmed Screens</div>
          <div className="ai-screens-cloud">
            {state._aiActiveP.map((sc, i) => (
              <span key={i} className="ai-tag-p">{sc.name}</span>
            ))}
            {state._aiActiveS.map((sc, i) => (
              <span key={i} className="ai-tag-s">{sc.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Client Justification ── */}
      <div className="result-card">
        <div className="rc-title">Client-Ready Justification</div>
        <p className="jtext">{just}</p>
      </div>

      <div className="res-acts">
        <button className="act act-p" onClick={download}>Download Breakdown</button>
        <button className={`act act-g${copied ? " copied" : ""}`} onClick={copy}>
          {copied ? "Copied ✓" : "Copy Justification"}
        </button>

      </div>
      <button className="restart" onClick={onRestart}>Start a new estimate</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP — FLOW ORCHESTRATION
// ─────────────────────────────────────────────────────────────────────────────

const INIT_STATE = {
  mode:             null,
  projectType:      null,
  hours:            "",
  primaryScreens:   0,
  secondaryScreens: 0,
  platform:         "single",
  flowComplexity:   "moderate",
  designSystem:     "none",
  revisions:        2,
  experience:       null,
  uxActivities:     [],
  pmOverhead:       "light",
  utilizationRate:  UTILIZATION_DEFAULT,
  freelanceMult:    FREELANCE_MULT_DEFAULT,
  includeGST:       false,
  aiAnalysis:       null,
  _aiDesc:          "",
  _aiRemovedP:      [],
  _aiRemovedS:      [],
  _aiActiveP:       null,
  _aiActiveS:       null,
};

// ─────────────────────────────────────────────────────────────────────────────
// FLOW ROADMAP
// ─────────────────────────────────────────────────────────────────────────────

const STEPPER_LABELS = {
  quick: ["Project", "Hours", "Revisions", "Experience", "Overhead", "Summary"],
  scope: ["Project", "Screens", "Platform", "Complexity", "System", "UX", "Revisions", "Experience", "Overhead", "Summary"],
  ai:    ["Project", "Brief", "AI Review", "Platform", "Complexity", "System", "UX", "Revisions", "Experience", "Overhead", "Summary"],
};

function FlowRoadmap({ mode, flowStep }: any) {
  const labels  = STEPPER_LABELS[mode];
  const wrapRef = useRef(null);

  // Scroll current pill into view whenever flowStep changes
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const current = wrap.querySelector(".stepper-pill.current");
    if (!current) return;
    const wrapRect    = wrap.getBoundingClientRect();
    const pillRect    = current.getBoundingClientRect();
    const pillCenter  = pillRect.left + pillRect.width / 2 - wrapRect.left;
    const targetScroll = wrap.scrollLeft + pillCenter - wrapRect.width / 2;
    wrap.scrollTo({ left: targetScroll, behavior: "smooth" });
  }, [flowStep]);

  if (!labels) return null;

  return (
    <div className="stepper-wrap" ref={wrapRef}>
      <div className="stepper">
        {labels.map((label, i) => {
          const step    = i + 1;
          const done    = flowStep > step;
          const current = flowStep === step;
          const state   = done ? "done" : current ? "current" : "upcoming";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && (
                <div className={`stepper-line${done || current ? " done-line" : ""}`} />
              )}
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
    </div>
  );
}

function FairScopeEstimator() {
  const [state,      setState]     = useState(INIT_STATE);
  const [screen,     setScreen]    = useState("entry");
  const [flowStep,   setFlowStep]  = useState(1);
  const [aiStatus,   setAiStatus]  = useState("idle");   // idle | loading | error
  const [sheetOpen,  setSheetOpen] = useState(false);
  const topRef = useRef(null);

  const upd = useCallback(patch => setState(s => ({ ...s, ...patch })), []);
  const top  = useCallback(() => { setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); }, []);

  const totalSteps = state.mode === "quick" ? 6 : state.mode === "ai" ? 11 : 10;
  const pct = screen === "results" ? 100 : screen === "entry" ? 0 : ((flowStep - 1) / totalSteps) * 100;
  const stepMeta = screen === "flow" ? `Step ${flowStep} of ${totalSteps}` : screen === "results" ? "Complete" : "";

  function goStep(n) { setFlowStep(n); top(); }
  function next() {
    const steps = state.mode === "quick" ? 6 : state.mode === "ai" ? 11 : 10;
    if (flowStep >= steps) { setScreen("results"); top(); }
    else goStep(flowStep + 1);
  }
  function back()    {
    if (flowStep <= 1) { setScreen("entry"); setState(INIT_STATE); top(); }
    else goStep(flowStep - 1);
  }

  function startMode(m) {
    upd({ mode: m });
    setFlowStep(1);
    setScreen("flow");
    top();
  }

  function restart() {
    setState(INIT_STATE);
    setScreen("entry");
    setFlowStep(1);
    setAiStatus("idle");
    top();
  }

  function showResults() { setScreen("results"); top(); }

  async function runAI(desc) {
    setAiStatus("loading");
    const pt = PROJECT_TYPES.find(p => p.id === state.projectType)?.label || "product";
    const prompt = `You are a senior UX designer scoping a ${pt} project. Analyse this description and extract design scope:
"${desc}"

Return ONLY valid JSON with no markdown, no preamble:
{
  "primaryScreens": [{"name":"","reason":""}],
  "secondaryScreens": [{"name":"","reason":""}],
  "keyFlows": [""],
  "coreFeatures": [""]
}

Rules:
- Primary screens: distinct full-page views requiring full design effort
- Secondary screens: modals, drawers, empty states, error screens, minor variants (1.5 hrs each)
- Be conservative and realistic for a professional estimate
- 3-5 key flows, 4-7 core features
- Max 18 primary, 12 secondary`;

    try {
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const analysis = JSON.parse(clean);
      upd({ aiAnalysis: analysis, _aiRemovedP: [], _aiRemovedS: [] });
      setAiStatus("done");
      goStep(3); // AI confirm step
    } catch (e) {
      setAiStatus("error");
      goStep(2); // back to description
    }
  }

  // ── QUICK FLOW STEPS ──────────────────────────────────────────────────────
  const QUICK_STEPS = [
    () => <StepProjectType    state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepHours          state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRevisions      state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepExperience     state={state} onUpdate={upd} onNext={next} onBack={back} isFinal={false} />,
    () => <StepPMOverhead     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepSustainability state={state} onUpdate={upd} onNext={showResults} onBack={back} />,
  ];

  // ── SCOPE FLOW STEPS ──────────────────────────────────────────────────────
  const SCOPE_STEPS = [
    () => <StepProjectType    state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepScreens        state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepPlatform       state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepFlowComplexity state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepDesignSystem   state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepUXActivities   state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRevisions      state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepExperience     state={state} onUpdate={upd} onNext={next} onBack={back} isFinal={false} />,
    () => <StepPMOverhead     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepSustainability state={state} onUpdate={upd} onNext={showResults} onBack={back} />,
  ];

  // ── AI FLOW STEPS ─────────────────────────────────────────────────────────
  const AI_STEPS = [
    () => <StepProjectType state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => (
      aiStatus === "error"
        ? <div className="screen">
            <Back onClick={back} />
            <div className="warn-box" style={{ marginTop: 24 }}>Analysis failed. Check your connection and try again.</div>
            <PrimaryBtn onClick={() => setAiStatus("idle")}>Try Again</PrimaryBtn>
            <OutlineBtn onClick={() => { upd({ mode: "scope" }); setState(s => ({ ...s, mode: "scope" })); setFlowStep(2); }}>Enter screens manually</OutlineBtn>
          </div>
        : <StepAIDescription state={state} onUpdate={upd} onAnalyse={runAI} onSkip={() => { upd({ mode: "scope" }); setFlowStep(2); }} onBack={back} />
    ),
    () => aiStatus === "loading"
      ? <StepAILoading />
      : <StepAIConfirm state={state} onUpdate={upd} onNext={next} onBack={() => { setAiStatus("idle"); goStep(2); }} />,
    () => <StepPlatform       state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepFlowComplexity state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepDesignSystem   state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepUXActivities   state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepRevisions      state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepExperience     state={state} onUpdate={upd} onNext={next} onBack={back} isFinal={false} />,
    () => <StepPMOverhead     state={state} onUpdate={upd} onNext={next} onBack={back} />,
    () => <StepSustainability state={state} onUpdate={upd} onNext={showResults} onBack={back} />,
  ];

  const STEPS = state.mode === "quick" ? QUICK_STEPS : state.mode === "ai" ? AI_STEPS : SCOPE_STEPS;
  const currentStepFn = STEPS[flowStep - 1];

  return (
    <>
      <style>{CSS}</style>
      <div className="layout" ref={topRef}>
        {/* ── MAIN COLUMN ── */}
        <div className="main-col">
          <div className="header-sticky">
            <header className="app-header">
              <div className="logo">Fair<span>Scope</span></div>
              {stepMeta && <div className="step-counter">{stepMeta}</div>}
            </header>

            <div className="progress-wrap">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {screen === "flow" && state.mode && (
              <FlowRoadmap mode={state.mode} flowStep={flowStep} />
            )}
          </div>

          <div className="main-inner">
            {screen === "entry"   && <EntryScreen onSelect={startMode} />}
            {screen === "flow"    && currentStepFn && currentStepFn()}
            {screen === "results" && <ResultsScreen state={state} onRestart={restart} />}
          </div>
        </div>

        {/* ── DESKTOP SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sb-wordmark">Fair<span>Scope</span></div>
          <LivePanel state={state} />
        </aside>
      </div>

      {/* ── MOBILE STICKY BAR ── */}
      {screen !== "entry" && (
        <MobileBar state={state} onTap={() => setSheetOpen(true)} />
      )}

      {/* ── MOBILE BOTTOM SHEET ── */}
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
