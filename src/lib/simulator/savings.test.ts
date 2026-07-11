import { describe, expect, it } from 'vitest';

import type { Assumptions } from '@/lib/validation/scenarios';

import { simulate } from './engine';

// $100k income, no tax, no inflation → surplus = income − expenses. The
// invested share routes a positive surplus between the invested pool (earns
// the return) and the cash pool (kept, but earns nothing).
function mk(share: number | undefined, overrides: Partial<Assumptions> = {}): Assumptions {
  return {
    horizonStartYear: 2026,
    horizonEndYear: 2026,
    people: [
      {
        id: 'p1',
        name: 'A',
        birthYear: 1990,
        careerStages: [{ label: 'j', startAge: 30, baseSalary: 100_000, annualRaisePct: 0 }],
      },
    ],
    startingNetWorth: 0,
    startingInvested: 0,
    effectiveTaxRatePct: 0,
    investment: { returnPct: 0, returnPctLow: 0, returnPctHigh: 0 },
    inflationPct: 0,
    windfalls: [],
    majorExpenses: [],
    recurringAnnualExpenses: 40_000,
    ...(share !== undefined ? { investedSharePct: share } : {}),
    ...overrides,
  };
}

const last = (a: Assumptions) => simulate(a).rows.at(-1)!;

describe('invested share of surplus (two-pool model)', () => {
  it('absent or 100% routes the whole surplus into the invested pool (regression)', () => {
    expect(last(mk(undefined)).netWorth).toBe(60_000);
    expect(last(mk(undefined)).investedBalance).toBe(60_000);
    expect(last(mk(100)).investedBalance).toBe(60_000);
  });

  it('a lower share keeps the money — as cash, not invested (nothing vanishes)', () => {
    const r = last(mk(50));
    expect(r.netWorth).toBe(60_000); // still all there
    expect(r.investedBalance).toBe(30_000); // but only half compounds
    expect(r.saved).toBe(60_000); // reported savings = everything kept
  });

  it('only the invested share earns the return (cash drag)', () => {
    const twoYears = {
      horizonEndYear: 2027,
      investment: { returnPct: 10, returnPctLow: 10, returnPctHigh: 10 },
    };
    // share 50: y1 invested 30k / cash 30k; y2 growth 3k → invested 63k, cash 60k.
    expect(last(mk(50, twoYears)).netWorth).toBeCloseTo(123_000, 2);
    // share 100: y2 growth 6k → 126k. The 3k gap is the un-invested cash drag.
    expect(last(mk(100, twoYears)).netWorth).toBeCloseTo(126_000, 2);
  });

  it('startingInvested is honored: only the invested part of starting net worth compounds', () => {
    const a = mk(100, {
      people: [],
      recurringAnnualExpenses: 0,
      startingNetWorth: 100_000,
      startingInvested: 40_000,
      investment: { returnPct: 10, returnPctLow: 10, returnPctHigh: 10 },
    });
    const r = last(a);
    expect(r.investmentGrowth).toBeCloseTo(4_000, 2); // 10% of 40k, NOT of 100k
    expect(r.netWorth).toBeCloseTo(104_000, 2); // 44k invested + 60k cash
  });

  it('a shortfall draws cash first, investments untouched', () => {
    const a = mk(50, {
      startingNetWorth: 100_000,
      startingInvested: 60_000, // 40k cash
      recurringAnnualExpenses: 130_000, // surplus −30k
    });
    const r = last(a);
    expect(r.saved).toBe(-30_000);
    expect(r.investedBalance).toBe(60_000); // invested pool untouched
    expect(r.netWorth).toBe(70_000); // cash 40k → 10k
  });

  it('a shortfall deeper than cash spills into the invested pool', () => {
    const a = mk(50, {
      startingNetWorth: 100_000,
      startingInvested: 90_000, // only 10k cash
      recurringAnnualExpenses: 130_000, // surplus −30k
    });
    const r = last(a);
    expect(r.investedBalance).toBe(70_000); // 90k − 20k spillover
    expect(r.netWorth).toBe(70_000);
  });
});
