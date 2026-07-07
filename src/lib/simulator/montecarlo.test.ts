import { describe, expect, it } from 'vitest';

import type { Assumptions } from '@/lib/validation/scenarios';

import { simulate } from './engine';
import { runMonteCarlo } from './montecarlo';

// 5% return, 0% inflation (so real == nominal), one earner from age 30.
const base: Assumptions = {
  horizonStartYear: 2026,
  horizonEndYear: 2030,
  people: [
    {
      id: 'p1',
      name: 'A',
      birthYear: 1996,
      careerStages: [{ label: 'job', startAge: 30, baseSalary: 100_000, annualRaisePct: 0 }],
    },
  ],
  startingNetWorth: 100_000,
  startingInvested: 100_000,
  effectiveTaxRatePct: 0,
  investment: { returnPct: 5, returnPctLow: 3, returnPctHigh: 7 },
  inflationPct: 0,
  windfalls: [],
  majorExpenses: [],
  recurringAnnualExpenses: 0,
};

describe('runMonteCarlo', () => {
  it('volatility = 0 collapses onto the deterministic projection (regression)', () => {
    const mc = runMonteCarlo(base, { volatilityPct: 0, runs: 50 });
    const deterministic = simulate(base).rows.map((r) => r.netWorthRealTodayDollars);
    // All three bands equal each other and the deterministic path.
    expect(mc.p50).toEqual(deterministic);
    expect(mc.p10).toEqual(mc.p50);
    expect(mc.p90).toEqual(mc.p50);
  });

  it('with volatility, the bands spread out (p10 < p50 < p90) and are reproducible', () => {
    const a = runMonteCarlo(base, { volatilityPct: 15, runs: 500 });
    const last = a.years.length - 1;
    expect(a.p10[last]!).toBeLessThan(a.p50[last]!);
    expect(a.p50[last]!).toBeLessThan(a.p90[last]!);
    // Seeded → identical result on a second run.
    const b = runMonteCarlo(base, { volatilityPct: 15, runs: 500 });
    expect(b.p50).toEqual(a.p50);
  });

  it('success probability against a goal-seek target is a fraction in [0,1]', () => {
    const withTarget: Assumptions = { ...base, target: { amount: 300_000, age: 33 } }; // 2029
    const mc = runMonteCarlo(withTarget, { volatilityPct: 15, runs: 500 });
    expect(mc.successProbability).not.toBeNull();
    expect(mc.successProbability!).toBeGreaterThanOrEqual(0);
    expect(mc.successProbability!).toBeLessThanOrEqual(1);
  });

  it('no target → null success probability', () => {
    const mc = runMonteCarlo(base, { volatilityPct: 15, runs: 50 });
    expect(mc.successProbability).toBeNull();
  });
});
