/**
 * Role-level starting points for the career-stage builder. Two tracks for
 * now: `legal` (BigLaw → in-house → government) and `swe` (IC SWE → EM →
 * MLE/research). Each entry fills the salary-curve fields on a career
 * stage; everything stays editable after the user picks one.
 *
 * ## Last reviewed: 2026-07
 *
 * These numbers are ROUGH ILLUSTRATIVE DEFAULTS, not market data and not
 * sourced from a specific survey. They reflect a back-of-envelope read of
 * publicly-discussed US total compensation as of the date above. The point
 * is to give a starting anchor so nobody types into a blank field — NOT to
 * assert "this is what the role pays." Override every number with your own
 * real offer / W-2 figure.
 *
 * Comp is split three ways, matching the engine:
 *   - `baseSalary`   — annual base, pre-bonus/equity, pre-tax.
 *   - `bonusPct`     — cash bonus as a % of base.
 *   - `annualEquity` — annual equity / RSU grant value in dollars. For
 *     big-tech and frontier-AI roles this is often the LARGEST component —
 *     that's the whole reason it's modeled. Treated as ordinary taxable
 *     income (RSUs vest as W-2 income).
 *   - `annualRaisePct` — within-stage YoY raise on base (nominal). To model
 *     a promotion, add a second stage with a higher `startAge`.
 */

export type RoleTrack = 'legal' | 'swe';

export const TRACK_LABELS: Record<RoleTrack, string> = {
  legal: 'Legal',
  swe: 'Software / ML',
};

export type RolePreset = {
  /** Stable id for React keys. */
  id: string;
  track: RoleTrack;
  /** Human-readable title shown in the picker. */
  title: string;
  /** Annual base salary in USD (pre-bonus, pre-equity, pre-tax). */
  baseSalary: number;
  /** Within-stage annual raise on base, nominal %. */
  annualRaisePct: number;
  /** Bonus as % of base. */
  bonusPct: number;
  /** Annual equity / RSU grant value in USD. 0 for cash-only roles. */
  annualEquity: number;
  /** One-line context shown under the title. Plain language. */
  notes: string;
};

export const ROLE_PRESETS: readonly RolePreset[] = [
  // ---------------- Legal (mostly cash comp) ----------------
  {
    id: 'biglaw-assoc-y1',
    track: 'legal',
    title: 'BigLaw Associate (Year 1)',
    baseSalary: 225_000,
    annualRaisePct: 0,
    bonusPct: 25,
    annualEquity: 0,
    notes: 'Lockstep first-year base at top-paying firms; cash bonus on top.',
  },
  {
    id: 'biglaw-assoc-mid',
    track: 'legal',
    title: 'BigLaw Associate (Years 3–5)',
    baseSalary: 280_000,
    annualRaisePct: 8,
    bonusPct: 35,
    annualEquity: 0,
    notes: 'Mid-class-year lockstep; bonus scales with class.',
  },
  {
    id: 'biglaw-senior-assoc',
    track: 'legal',
    title: 'BigLaw Senior Associate (Years 6–8)',
    baseSalary: 390_000,
    annualRaisePct: 5,
    bonusPct: 45,
    annualEquity: 0,
    notes: 'Top-of-scale associates at top-paying firms.',
  },
  {
    id: 'biglaw-counsel',
    track: 'legal',
    title: 'BigLaw Counsel / Of Counsel',
    baseSalary: 450_000,
    annualRaisePct: 3,
    bonusPct: 40,
    annualEquity: 0,
    notes: 'Non-partner-track senior role; flatter curve.',
  },
  {
    id: 'biglaw-partner',
    track: 'legal',
    title: 'BigLaw Equity Partner',
    baseSalary: 1_000_000,
    annualRaisePct: 5,
    bonusPct: 100,
    annualEquity: 0,
    notes: 'Highly variable; midpoint guess. Real number depends on firm + book of business.',
  },
  {
    id: 'inhouse-counsel',
    track: 'legal',
    title: 'In-house Counsel (mid-level)',
    baseSalary: 220_000,
    annualRaisePct: 4,
    bonusPct: 15,
    annualEquity: 20_000,
    notes: 'Corporate legal, mid-career; some equity at tech companies.',
  },
  {
    id: 'inhouse-senior',
    track: 'legal',
    title: 'Senior In-house Counsel',
    baseSalary: 320_000,
    annualRaisePct: 4,
    bonusPct: 25,
    annualEquity: 60_000,
    notes: 'Director-level in-house; meaningful equity at tech companies.',
  },
  {
    id: 'general-counsel',
    track: 'legal',
    title: 'General Counsel',
    baseSalary: 500_000,
    annualRaisePct: 3,
    bonusPct: 50,
    annualEquity: 150_000,
    notes: 'Chief legal officer at a mid-size company; equity a real slice of comp.',
  },
  {
    id: 'gov-attorney',
    track: 'legal',
    title: 'Federal Government Attorney',
    baseSalary: 130_000,
    annualRaisePct: 3,
    bonusPct: 0,
    annualEquity: 0,
    notes: 'Mid-career GS-13 to GS-14 federal; no bonus/equity typical.',
  },
  {
    id: 'public-interest',
    track: 'legal',
    title: 'Public-interest Attorney',
    baseSalary: 75_000,
    annualRaisePct: 3,
    bonusPct: 0,
    annualEquity: 0,
    notes: 'Nonprofit / legal-aid / DA office entry-mid level.',
  },

  // ---------------- Software / ML (equity-heavy) ----------------
  {
    id: 'swe-junior',
    track: 'swe',
    title: 'Junior SWE (L3 / SDE I)',
    baseSalary: 145_000,
    annualRaisePct: 6,
    bonusPct: 15,
    annualEquity: 40_000,
    notes: 'New-grad big-tech; equity already a big chunk of total comp.',
  },
  {
    id: 'swe-mid',
    track: 'swe',
    title: 'Mid SWE (L4 / SDE II)',
    baseSalary: 180_000,
    annualRaisePct: 5,
    bonusPct: 20,
    annualEquity: 90_000,
    notes: '2–4 yrs at a top-paying tech employer; equity ≈ half of base.',
  },
  {
    id: 'swe-senior',
    track: 'swe',
    title: 'Senior SWE (L5)',
    baseSalary: 240_000,
    annualRaisePct: 4,
    bonusPct: 25,
    annualEquity: 180_000,
    notes: '5–8 yrs; equity often rivals base at big tech.',
  },
  {
    id: 'swe-staff',
    track: 'swe',
    title: 'Staff SWE (L6)',
    baseSalary: 320_000,
    annualRaisePct: 4,
    bonusPct: 30,
    annualEquity: 350_000,
    notes: 'Senior IC; total comp is equity-dominated.',
  },
  {
    id: 'swe-principal',
    track: 'swe',
    title: 'Principal SWE (L7)',
    baseSalary: 420_000,
    annualRaisePct: 4,
    bonusPct: 35,
    annualEquity: 600_000,
    notes: 'Top IC track; rare and highly variable, mostly equity.',
  },
  {
    id: 'em-manager',
    track: 'swe',
    title: 'Engineering Manager (M1)',
    baseSalary: 260_000,
    annualRaisePct: 5,
    bonusPct: 25,
    annualEquity: 200_000,
    notes: 'First-line manager at a top-paying tech employer.',
  },
  {
    id: 'em-senior',
    track: 'swe',
    title: 'Senior EM / Director (M2)',
    baseSalary: 340_000,
    annualRaisePct: 4,
    bonusPct: 30,
    annualEquity: 400_000,
    notes: 'Multi-team or director-level org; equity-heavy.',
  },
  {
    id: 'mle-mid',
    track: 'swe',
    title: 'ML Engineer (mid)',
    baseSalary: 200_000,
    annualRaisePct: 6,
    bonusPct: 20,
    annualEquity: 120_000,
    notes: 'Applied ML/MLE at a big-tech company.',
  },
  {
    id: 'mle-senior',
    track: 'swe',
    title: 'Senior ML Engineer',
    baseSalary: 280_000,
    annualRaisePct: 5,
    bonusPct: 25,
    annualEquity: 250_000,
    notes: 'Senior applied-ML IC; equity a large share.',
  },
  {
    id: 'res-engineer',
    track: 'swe',
    title: 'Research Engineer (frontier labs)',
    baseSalary: 300_000,
    annualRaisePct: 5,
    bonusPct: 15,
    annualEquity: 500_000,
    notes: 'AI lab; comp is dominated by equity — the "heavily on stock" case.',
  },
  {
    id: 'res-scientist',
    track: 'swe',
    title: 'Research Scientist (PhD, frontier labs)',
    baseSalary: 350_000,
    annualRaisePct: 4,
    bonusPct: 15,
    annualEquity: 800_000,
    notes: 'Sr. research scientist at an AI lab; equity often dwarfs cash.',
  },
];

/**
 * Case-insensitive search across title + track label + notes. Empty query
 * returns all roles. Caller is responsible for display order / grouping.
 */
export function searchRolePresets(query: string): RolePreset[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [...ROLE_PRESETS];
  return ROLE_PRESETS.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.track.toLowerCase().includes(q) ||
      TRACK_LABELS[r.track].toLowerCase().includes(q) ||
      r.notes.toLowerCase().includes(q),
  );
}
