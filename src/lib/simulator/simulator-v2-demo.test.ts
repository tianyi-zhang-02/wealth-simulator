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
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}
function fmtMoney0(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

describe('demo: lifestyle creep — flat mode (hand-checkable)', () => {
  it('CASE A: $50k base, 3% inflation, 1% creep, 3 yrs', () => {
    const a: Assumptions = {
      horizonStartYear: 2030,
      horizonEndYear: 2032,
      people: [],
      startingNetWorth: 0,
      startingInvested: 0,
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
      effectiveTaxRatePct: 0,
      investment: { returnPct: 0, returnPctLow: 0, returnPctHigh: 0 },
      inflationPct: 0,
      windfalls: [],
      majorExpenses: [],
      recurringAnnualExpenses: 50_000,
      lifestyle: { mode: 'incomeScaled', lifestyleCreepPct: 0, creepShareOfRaisePct: 50 },
    };
    const { rows } = simulate(a);
    console.log(
      '\n=== LIFESTYLE INCOME-SCALED: $50k base · $100k income +10%/yr · 50% absorbed · 0% infl ===',
    );
    console.log('Walk:');
    console.log('  baseline_0 = 50_000 × (1+0) = 50_000');
    console.log('  raise_1    = afterTax_1 - afterTax_0 = 110_000 - 100_000 = 10_000');
    console.log('  baseline_1 = 50_000 × 1.0 + 10_000 × 0.50 = 55_000');
    console.log('');
    console.log(
      `  row 0 engine: afterTax ${fmt$(rows[0]!.afterTaxIncome)}, expenses ${fmt$(rows[0]!.expenses)}  (expect $50,000)`,
    );
    console.log(
      `  row 1 engine: afterTax ${fmt$(rows[1]!.afterTaxIncome)}, expenses ${fmt$(rows[1]!.expenses)}  (expect $55,000)`,
    );
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

describe('demo: lifestyle creep — questions raised during sign-off review', () => {
  it('Q1: 10-year hand-check, separate-vs-combined convention check', () => {
    /**
     * User: "base $40k expenses, 3% inflation, 1% lifestyle creep, over 10
     * years — what's the year-10 expense figure, and which convention
     * produced it (inflation and creep combined as a single rate ~4%, or
     * compounded separately)?"
     *
     * The engine compounds them SEPARATELY:
     *   row_i = recurringAnnualExpenses × (1+infl)^(i+1) × (1+creep)^(i+1)
     *
     * NOT the "combined" approximation 1.04^(i+1). The two diverge by ~0.06%
     * per period because (1.03)(1.01) = 1.0403, not 1.04. Over 10 years
     * the gap shows up cleanly in the dollar number below.
     */
    const a: Assumptions = {
      horizonStartYear: 2030,
      horizonEndYear: 2039, // 10 rows (i=0..9, year-10 expense = row 9)
      people: [],
      startingNetWorth: 0,
      startingInvested: 0,
      effectiveTaxRatePct: 0,
      investment: { returnPct: 0, returnPctLow: 0, returnPctHigh: 0 },
      inflationPct: 3,
      windfalls: [],
      majorExpenses: [],
      recurringAnnualExpenses: 40_000,
      lifestyle: { mode: 'flat', lifestyleCreepPct: 1, creepShareOfRaisePct: 0 },
    };
    const { rows } = simulate(a);
    const last = rows[rows.length - 1]!;
    const separatelyCompounded = 40_000 * Math.pow(1.03, 10) * Math.pow(1.01, 10);
    const combinedRate = 40_000 * Math.pow(1.04, 10);
    console.log(
      '\n=== LIFESTYLE-Q1: $40k base · 3% infl · 1% creep · 10 yrs (year-10 expense) ===',
    );
    console.log(`  Engine row 9 (year ${last.year}):             ${fmt$(last.expenses)}`);
    console.log(
      `  Hand: 40,000 × (1.03)^10 × (1.01)^10 = ${fmt$(separatelyCompounded)}  ← separately compounded`,
    );
    console.log(
      `  Hand: 40,000 × (1.04)^10             = ${fmt$(combinedRate)}  ← combined-as-single-rate (rejected)`,
    );
    console.log(
      `  Engine − separate:  ${fmt$(last.expenses - separatelyCompounded)}  (should be $0.00)`,
    );
    console.log(
      `  Engine − combined:  ${fmt$(last.expenses - combinedRate)}  (small but nonzero — proves engine uses SEPARATE)`,
    );
    console.log('');
    expect(last.expenses).toBeCloseTo(separatelyCompounded, 2);
    // Sanity: must NOT equal the combined approximation to within $1.
    expect(Math.abs(last.expenses - combinedRate)).toBeGreaterThan(1);
  });

  it('Q2: income-scaled — confirm the unspent half of a raise reaches savings', () => {
    /**
     * User: "show that when income rises by $X in a year with creepShare
     * 50%, exactly $0.5X moves into spending AND the other $0.5X remains
     * available to save — i.e. confirm the unspent half of the raise isn't
     * silently dropped from savings."
     *
     * Setup chosen so savings rate ≥ creepShare and we're in the
     * no-shortfall regime throughout, making the change isolatable:
     *
     *   - $100k income year 0, $110k year 1 (=$10k raise)
     *   - 0% tax → afterTax = gross
     *   - 0% inflation → isolates the raise math
     *   - 50% savings rate → intended = 50% of afterTax
     *   - $50k baseline expenses, mode incomeScaled, creepShare 50%
     *
     * Year 0:
     *   afterTax = 100,000, intended = 50,000, consumable = 50,000
     *   baseline_0 = 50,000 × (1+0) = 50,000
     *   expenses (50,000) == consumable (50,000), no shortfall.
     *   saved = intended = 50,000
     *
     * Year 1:
     *   afterTax = 110,000, intended = 55,000, consumable = 55,000
     *   raise = 10,000; creep absorbs 50% × 10,000 = 5,000
     *   baseline_1 = 50,000 × 1.0 + 5,000 = 55,000
     *   expenses (55,000) == consumable (55,000), no shortfall.
     *   saved = intended = 55,000
     *
     *   ΔafterTax = +10,000
     *   ΔE        = +5,000     ← exactly half absorbed into spending
     *   Δsaved    = +5,000     ← exactly half reached savings
     *
     * The unspent half ($5k) is fully accounted for in saved$. It is NOT
     * silently dropped.
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
      effectiveTaxRatePct: 0,
      investment: { returnPct: 0, returnPctLow: 0, returnPctHigh: 0 },
      inflationPct: 0,
      windfalls: [],
      majorExpenses: [],
      recurringAnnualExpenses: 50_000,
      lifestyle: { mode: 'incomeScaled', lifestyleCreepPct: 0, creepShareOfRaisePct: 50 },
    };
    const { rows } = simulate(a);
    const y0 = rows[0]!;
    const y1 = rows[1]!;
    const deltaIncome = y1.afterTaxIncome - y0.afterTaxIncome;
    const deltaExpenses = y1.expenses - y0.expenses;
    const deltaSaved = y1.saved - y0.saved;
    console.log('\n=== LIFESTYLE-Q2: 50/50 raise split (creepShare 50%, savingsRate 50%) ===');
    console.log('  Year 0: afterTax = $100,000   expenses = $50,000   saved = $50,000');
    console.log('  Year 1: afterTax = $110,000   expenses = $55,000   saved = $55,000');
    console.log('');
    console.log(
      `  Engine year 0: afterTax ${fmt$(y0.afterTaxIncome)}, expenses ${fmt$(y0.expenses)}, saved ${fmt$(y0.saved)}`,
    );
    console.log(
      `  Engine year 1: afterTax ${fmt$(y1.afterTaxIncome)}, expenses ${fmt$(y1.expenses)}, saved ${fmt$(y1.saved)}`,
    );
    console.log('');
    console.log(`  Δ afterTax = ${fmt$(deltaIncome)}  ← the +$10k raise`);
    console.log(`  Δ expenses = ${fmt$(deltaExpenses)}   ← exactly half of the raise`);
    console.log(
      `  Δ saved    = ${fmt$(deltaSaved)}   ← the OTHER half — not dropped, fully shows up in savings`,
    );
    console.log(
      `  sum check:  ΔE + Δsaved = ${fmt$(deltaExpenses + deltaSaved)}  (must equal Δ afterTax)`,
    );
    console.log('');
    expect(deltaIncome).toBeCloseTo(10_000, 2);
    expect(deltaExpenses).toBeCloseTo(5_000, 2);
    expect(deltaSaved).toBeCloseTo(5_000, 2);
    expect(deltaExpenses + deltaSaved).toBeCloseTo(deltaIncome, 2);
  });

  it('Q3: derived savings + equity — hand-checkable', () => {
    /**
     * The new model: savings is DERIVED (after-tax income − spending), and
     * equity/RSU comp is part of gross income, taxed like salary.
     *
     * Person: base $200k, bonus 20% ($40k), equity $150k
     *   → gross = 200k + 40k + 150k = $390,000
     *   → after-tax at 30% = 390k × 0.70 = $273,000
     * Expenses $80k, no inflation, no lifestyle creep, 0% return.
     *   → saved = 273,000 − 80,000 = $193,000 every year
     *   → implied savings rate = 193k / 273k ≈ 70.7% of after-tax
     * Balance (start 0): year 0 = 193k, year 1 = 386k, year 2 = 579k.
     */
    const a: Assumptions = {
      horizonStartYear: 2030,
      horizonEndYear: 2032,
      people: [
        {
          id: 'p1',
          name: 'A',
          birthYear: 2000,
          careerStages: [
            {
              label: 'Senior SWE',
              startAge: 30,
              baseSalary: 200_000,
              annualRaisePct: 0,
              bonusPct: 20,
              annualEquity: 150_000,
            },
          ],
        },
      ],
      startingNetWorth: 0,
      startingInvested: 0,
      effectiveTaxRatePct: 30,
      investment: { returnPct: 0, returnPctLow: 0, returnPctHigh: 0 },
      inflationPct: 0,
      windfalls: [],
      majorExpenses: [],
      recurringAnnualExpenses: 80_000,
    };
    const { rows } = simulate(a);
    const r0 = rows[0]!;
    const impliedRate = (r0.saved / r0.afterTaxIncome) * 100;
    console.log(
      '\n=== DERIVED SAVINGS + EQUITY: base 200k + 20% bonus + 150k equity, 30% tax, 80k spend ===',
    );
    console.log(
      `  gross income:        ${fmt$(r0.grossIncome)}   (expect $390,000: 200k + 40k bonus + 150k equity)`,
    );
    console.log(`  after-tax (30%):     ${fmt$(r0.afterTaxIncome)}   (expect $273,000)`);
    console.log(`  expenses:            ${fmt$(r0.expenses)}   (expect $80,000)`);
    console.log(`  saved = afterTax−exp:${fmt$(r0.saved)}   (expect $193,000)`);
    console.log(`  implied savings rate:${impliedRate.toFixed(1)}%   (expect ≈ 70.7%)`);
    console.log(
      `  balance year 0/1/2:  ${fmt$(rows[0]!.netWorth)} / ${fmt$(rows[1]!.netWorth)} / ${fmt$(rows[2]!.netWorth)}`,
    );
    console.log('');
    expect(r0.grossIncome).toBe(390_000);
    expect(r0.afterTaxIncome).toBeCloseTo(273_000, 2);
    expect(r0.saved).toBeCloseTo(193_000, 2);
    expect(impliedRate).toBeCloseTo(70.7, 1);
    expect(rows[0]!.netWorth).toBeCloseTo(193_000, 2);
    expect(rows[1]!.netWorth).toBeCloseTo(386_000, 2);
    expect(rows[2]!.netWorth).toBeCloseTo(579_000, 2);
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
    console.log(
      'Scenario: $50k start, $100k income, 25% tax, 80% savings rate, $40k expenses, 7% return.',
    );
    console.log(`Projected at age 50: ${fmtMoney0(result.projected)}`);
    console.log(`Target:              ${fmtMoney0(result.target)}`);
    console.log(`Gap:                 ${fmtMoney0(result.gap)}`);
    console.log('');

    console.log('Lever solutions + round-trip verification:');
    console.log(
      "  (each lever's solved value re-fed into the engine — projection should ≈ target)",
    );

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
