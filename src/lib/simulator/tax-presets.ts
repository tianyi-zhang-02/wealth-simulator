/**
 * Rough, editable tax-rate presets to seed the simulator's single
 * `effectiveTaxRatePct` input.
 *
 * ## Last reviewed: 2026-07
 *
 * THESE ARE ILLUSTRATIVE ESTIMATES, NOT TAX ADVICE. They blend a rough
 * federal effective income-tax rate (by income) with a rough state
 * effective income-tax rate, to get a single "effective rate" to start
 * from. They deliberately ignore filing status, deductions, credits, FICA
 * vs. income tax, capital-gains treatment, AMT, local/city taxes (e.g.
 * NYC), and everything else. The engine uses ONE flat effective rate on
 * all income — so this is just a convenient starting number the user is
 * expected to override.
 */

export const TAX_LAST_REVIEWED = '2026-07';

/**
 * Rough US federal EFFECTIVE income-tax rate (%) as a step function of
 * gross household income. Effective (not marginal), ordinary income,
 * ignores FICA. Very approximate.
 */
export function federalEffectiveRate(grossIncome: number): number {
  const brackets: Array<[limit: number, rate: number]> = [
    [50_000, 10],
    [100_000, 15],
    [200_000, 19],
    [400_000, 24],
    [600_000, 28],
    [1_000_000, 31],
    [Infinity, 34],
  ];
  for (const [limit, rate] of brackets) {
    if (grossIncome < limit) return rate;
  }
  return 34;
}

export type StateTax = {
  code: string;
  name: string;
  /** Rough effective state income-tax rate (%) for a high-income professional. */
  rate: number;
};

// Rough effective state income-tax rates for a ~professional income.
// No-income-tax states are 0. Highly approximate; override freely.
export const STATE_TAXES: readonly StateTax[] = [
  { code: 'AL', name: 'Alabama', rate: 5 },
  { code: 'AK', name: 'Alaska', rate: 0 },
  { code: 'AZ', name: 'Arizona', rate: 3 },
  { code: 'AR', name: 'Arkansas', rate: 5 },
  { code: 'CA', name: 'California', rate: 10 },
  { code: 'CO', name: 'Colorado', rate: 4 },
  { code: 'CT', name: 'Connecticut', rate: 6 },
  { code: 'DE', name: 'Delaware', rate: 6 },
  { code: 'DC', name: 'District of Columbia', rate: 8 },
  { code: 'FL', name: 'Florida', rate: 0 },
  { code: 'GA', name: 'Georgia', rate: 5 },
  { code: 'HI', name: 'Hawaii', rate: 8 },
  { code: 'ID', name: 'Idaho', rate: 6 },
  { code: 'IL', name: 'Illinois', rate: 5 },
  { code: 'IN', name: 'Indiana', rate: 3 },
  { code: 'IA', name: 'Iowa', rate: 5 },
  { code: 'KS', name: 'Kansas', rate: 5 },
  { code: 'KY', name: 'Kentucky', rate: 4 },
  { code: 'LA', name: 'Louisiana', rate: 4 },
  { code: 'ME', name: 'Maine', rate: 6 },
  { code: 'MD', name: 'Maryland', rate: 6 },
  { code: 'MA', name: 'Massachusetts', rate: 5 },
  { code: 'MI', name: 'Michigan', rate: 4 },
  { code: 'MN', name: 'Minnesota', rate: 8 },
  { code: 'MS', name: 'Mississippi', rate: 5 },
  { code: 'MO', name: 'Missouri', rate: 4 },
  { code: 'MT', name: 'Montana', rate: 6 },
  { code: 'NE', name: 'Nebraska', rate: 6 },
  { code: 'NV', name: 'Nevada', rate: 0 },
  { code: 'NH', name: 'New Hampshire', rate: 0 },
  { code: 'NJ', name: 'New Jersey', rate: 8 },
  { code: 'NM', name: 'New Mexico', rate: 5 },
  { code: 'NY', name: 'New York', rate: 7 },
  { code: 'NC', name: 'North Carolina', rate: 4 },
  { code: 'ND', name: 'North Dakota', rate: 2 },
  { code: 'OH', name: 'Ohio', rate: 3 },
  { code: 'OK', name: 'Oklahoma', rate: 4 },
  { code: 'OR', name: 'Oregon', rate: 9 },
  { code: 'PA', name: 'Pennsylvania', rate: 3 },
  { code: 'RI', name: 'Rhode Island', rate: 5 },
  { code: 'SC', name: 'South Carolina', rate: 6 },
  { code: 'SD', name: 'South Dakota', rate: 0 },
  { code: 'TN', name: 'Tennessee', rate: 0 },
  { code: 'TX', name: 'Texas', rate: 0 },
  { code: 'UT', name: 'Utah', rate: 5 },
  { code: 'VT', name: 'Vermont', rate: 8 },
  { code: 'VA', name: 'Virginia', rate: 5 },
  { code: 'WA', name: 'Washington', rate: 0 },
  { code: 'WV', name: 'West Virginia', rate: 5 },
  { code: 'WI', name: 'Wisconsin', rate: 6 },
  { code: 'WY', name: 'Wyoming', rate: 0 },
];

/**
 * Combined rough effective rate (%) = federal(income) + state, clamped to
 * the schema's 0–80 range. Rounded to a whole percent.
 */
export function estimateEffectiveTaxRate(stateCode: string, grossIncome: number): number {
  const state = STATE_TAXES.find((s) => s.code === stateCode);
  const stateRate = state ? state.rate : 0;
  const combined = federalEffectiveRate(grossIncome) + stateRate;
  return Math.max(0, Math.min(80, Math.round(combined)));
}
