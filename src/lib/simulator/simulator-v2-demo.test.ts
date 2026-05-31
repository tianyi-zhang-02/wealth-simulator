/**
 * Reproducible printouts for the Features 3 + 4 sign-off. Same shape as
 * `scenarios-demo.test.ts` — each `it()` block dumps a hand-checkable
 * case to console so the user can compare to a calculator without
 * running the app.
 *
 * Run with:
 *   npx vitest run simulator-v2-demo --reporter=verbose
 */

import { describe, it, expect } from 'vitest';

import type { Assumptions } from '@/lib/validation/scenarios';

import { simulate } from './engine';
import { netWorthAtAge, solveGoalSeek } from './goalSeek';

function fmt$(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}
function fmtMoney0(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

describe('demo: lifestyle creep — flat mode (hand-checkable)', () => {
  it('CASE A: $50k base, 3% inflation, 1% creep, 3 yrs', () => {
    const a: Assumptions = {
      horizonStartYear: 2030,
      horizonEndYear: 2032,
      people: [],
      startingNetWorth: 0,
      startingInvested: 0,
      annualSavingsRatePct: 0,
      effectiveTaxRatePct: 0,
      investment: { returnPct: 0, returnPctLow: 0, returnPctHigh: 0 },
      inflationPct: 3,
      windfalls: [],
      majorExpenses: [],
      recurringAnnualExpenses: 50_000,
      lifestyle: { mode: 'flat', lifestyleCreepPct: 1, creepShareOfRaisePct: 0 },
    };
    const { rows } = simulate(a);
    console.log('\n=== LIFESTYLE FLAT: $50k base · 3% infl · 1% creep · 3 yrs ===');
    console.log('Formula: row_i = 50000 × (1.03)^(i+1) × (1.01)^(i+1) = 50000 × (1.0403)^(i+1)');
    for (let i = 0; i < rows.length; i += 1) {
      const expected = 50_000 * Math.pow(1.03, i + 1) * Math.pow(1.01, i + 1);
      console.log(
        `  row ${i} (year ${rows[i]!.year}): engine ${fmt$(rows[i]!.expenses).padStart(12)}   ` +
          `hand ${fmt$(expected).padStart(12)}   diff ${fmt$(rows[i]!.expenses - expected)}`,
      );
    }
    console.log('');
    expect(rows.length).toBe(3);
  });
});

describe('demo: lifestyle creep — income-scaled mode (hand-checkable)', () => {
  it('CASE B: $100k → $110k income, 50% raise absorption, 0% inflation', () => {
    /**
     * 0% inflation isolates the raise-absorption math.
     *
     * Year 0: baseline_0 = 50_000 × (1 + 0) = 50_000
     *         afterTax_0 = 100_000 (no tax)
     * Year 1: raise = 110_000 - 100_000 = 10_000
     *         baseline_1 = 50_000 × 1.0 + 10_000 × 0.50 = 55_000
     */
    const a: Assumptions = {
      horizonStartYear: 2030,
      horizonEndYear: 2031,
      people: [
        {
          id: 'p1',
          name: 'A',
          birthYear: 2000,
          careerStages: [{ label: 'X', startAge: 30, baseSalary: 100_000, annualRaisePct: 10 }],
        },
      ],
      startingNetWorth: 0,
      startingInvested: 0,
      annualSavingsRatePct: 0,
      effectiveTaxRatePct: 0,
      investment: { returnPct: 0, returnPctLow: 0, returnPctHigh: 0 },
      inflationPct: 0,
      windfalls: [],
      majorExpenses: [],
      recurringAnnualExpenses: 50_000,
      lifestyle: { mode: 'incomeScaled', lifestyleCreepPct: 0, creepShareOfRaisePct: 50 },
    };
    const { rows } = simulate(a);
    console.log('\n=== LIFESTYLE INCOME-SCALED: $50k base · $100k income +10%/yr · 50% absorbed · 0% infl ===');
    console.log('Walk:');
    console.log('  baseline_0 = 50_000 × (1+0) = 50_000');
    console.log('  raise_1    = afterTax_1 - afterTax_0 = 110_000 - 100_000 = 10_000');
    console.log('  baseline_1 = 50_000 × 1.0 + 10_000 × 0.50 = 55_000');
    console.log('');
    console.log(`  row 0 engine: afterTax ${fmt$(rows[0]!.afterTaxIncome)}, expenses ${fmt$(rows[0]!.expenses)}  (expect $50,000)`);
    console.log(`  row 1 engine: afterTax ${fmt$(rows[1]!.afterTaxIncome)}, expenses ${fmt$(rows[1]!.expenses)}  (expect $55,000)`);
    console.log('');
    expect(rows[0]!.expenses).toBeCloseTo(50_000, 2);
    expect(rows[1]!.expenses).toBeCloseTo(55_000, 2);
  });

  it('CASE C: same as B with 3% inflation on top (compound check)', () => {
    /**
     * Year 0: baseline_0 = 50_000 × 1.03 = 51_500
     * Year 1: baseline_1 = 51_500 × 1.03 + raise × 0.50
     *                    = 53,045 + 10,000 × 0.50 = 58,045
     */
    const a: Assumptions = {
      horizonStartYear: 2030,
      horizonEndYear: 2031,
      people: [
        {
          id: 'p1',
          name: 'A',
          birthYear: 2000,
          careerStages: [{ label: 'X', startAge: 30, baseSalary: 100_000, annualRaisePct: 10 }],
        },
      ],
      startingNetWorth: 0,
      startingInvested: 0,
      annualSavingsRatePct: 0,
      effectiveTaxRatePct: 0,
      investment: { returnPct: 0, returnPctLow: 0, returnPctHigh: 0 },
      inflationPct: 3,
      windfalls: [],
      majorExpenses: [],
      recurringAnnualExpenses: 50_000,
      lifestyle: { mode: 'incomeScaled', lifestyleCreepPct: 0, creepShareOfRaisePct: 50 },
    };
    const { rows } = simulate(a);
    console.log('\n=== LIFESTYLE INCOME-SCALED + 3% INFL: same as B + inflation ===');
    console.log('Walk:');
    console.log('  baseline_0 = 50,000 × 1.03 = 51,500');
    console.log('  raise_1    = 10,000');
    console.log('  baseline_1 = 51,500 × 1.03 + 10,000 × 0.50 = 53,045 + 5,000 = 58,045');
    console.log('');
    console.log(`  row 0 engine: expenses ${fmt$(rows[0]!.expenses)}  (expect $51,500)`);
    console.log(`  row 1 engine: expenses ${fmt$(rows[1]!.expenses)}  (expect $58,045)`);
    console.log('');
    expect(rows[0]!.expenses).toBeCloseTo(51_500, 2);
    expect(rows[1]!.expenses).toBeCloseTo(58_045, 2);
  });
});

describe('demo: goal-seek round trip (correctness guarantee)', () => {
  it('CASE D: solve all 4 levers, plug each back in, confirm projection ≈ target', () => {
    const a: Assumptions = {
      horizonStartYear: 2030,
      horizonEndYear: 2050,
      people: [
        {
          id: 'p1',
          name: 'A',
          birthYear: 2000,
          careerStages: [{ label: 'X', startAge: 30, baseSalary: 100_000, annualRaisePct: 0 }],
        },
      ],
      startingNetWorth: 50_000,
      startingInvested: 50_000,
      annualSavingsRatePct: 80,
      effectiveTaxRatePct: 25,
      investment: { returnPct: 7, returnPctLow: 7, returnPctHigh: 7 },
      inflationPct: 0,
      windfalls: [],
      majorExpenses: [],
      recurringAnnualExpenses: 40_000,
      target: { amount: 2_000_000, age: 50 },
    };

    const result = solveGoalSeek(a);
    if (result.kind !== 'short') throw new Error(`expected short, got ${result.kind}`);

    console.log('\n=== GOAL-SEEK CASE D: target $2M at age 50 ===');
    console.log('Scenario: $50k start, $100k income, 25% tax, 80% savings rate, $40k expenses, 7% return.');
    console.log(`Projected at age 50: ${fmtMoney0(result.projected)}`);
    console.log(`Target:              ${fmtMoney0(result.target)}`);
    console.log(`Gap:                 ${fmtMoney0(result.gap)}`);
    console.log('');

    console.log('Lever solutions + round-trip verification:');
    console.log('  (each lever\'s solved value re-fed into the engine — projection should ≈ target)');

    // 1. Extra contribution
    const eL = result.levers.extraMonthlyContribution;
    if (eL.ok) {
      const rt = netWorthAtAge({ ...a, extraAnnualContribution: eL.value }, 50);
      const monthly = eL.value / 12;
      console.log(
        `  Save extra:  ${fmtMoney0(monthly)}/mo  →  re-simulate at age 50 = ${fmtMoney0(rt)}  ` +
          `(diff ${fmtMoney0(rt - result.target)})`,
      );
      expect(Math.abs(rt - result.target)).toBeLessThan(5_000);
    } else {
      console.log(`  Save extra:  ${eL.reason}`);
    }

    // 2. Return %
    const rL = result.levers.returnPct;
    if (rL.ok) {
      const rt = netWorthAtAge({ ...a, investment: { ...a.investment, returnPct: rL.value } }, 50);
      console.log(
        `  Return:      ${rL.value.toFixed(2)}%       →  re-simulate at age 50 = ${fmtMoney0(rt)}  ` +
          `(diff ${fmtMoney0(rt - result.target)})`,
      );
      expect(Math.abs(rt - result.target)).toBeLessThan(5_000);
    }

    // 3. Spending
    const sL = result.levers.annualExpenses;
    if (sL.ok) {
      const rt = netWorthAtAge({ ...a, recurringAnnualExpenses: sL.value }, 50);
      const monthly = sL.value / 12;
      console.log(
        `  Spend:       ${fmtMoney0(monthly)}/mo   →  re-simulate at age 50 = ${fmtMoney0(rt)}  ` +
          `(diff ${fmtMoney0(rt - result.target)})`,
      );
      expect(Math.abs(rt - result.target)).toBeLessThan(5_000);
    }

    // 4. Age
    const aL = result.levers.targetAge;
    if (aL.ok) {
      const rt = netWorthAtAge(a, aL.value);
      console.log(
        `  Age:         ${aL.value.toFixed(2)} yrs  →  re-simulate at that age = ${fmtMoney0(rt)}  ` +
          `(diff ${fmtMoney0(rt - result.target)})`,
      );
      expect(Math.abs(rt - result.target)).toBeLessThan(5_000);
    }
    console.log('');
  });
});
