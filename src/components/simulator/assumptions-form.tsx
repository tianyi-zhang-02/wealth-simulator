'use client';

import { useMemo, useState } from 'react';

import { CAREER_PRESETS } from '@/lib/simulator/career-presets';
import {
  ROLE_PRESETS,
  searchRolePresets,
  TRACK_LABELS,
  type RolePreset,
  type RoleTrack,
} from '@/lib/simulator/rolePresets';
import {
  estimateEffectiveTaxRate,
  STATE_TAXES,
  TAX_LAST_REVIEWED,
} from '@/lib/simulator/tax-presets';
import type {
  Assumptions,
  CareerStage,
  Lifestyle,
  MajorExpense,
  Person,
  Windfall,
} from '@/lib/validation/scenarios';

import { newId } from './default-assumptions';

type Setter = (next: Assumptions) => void;

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-border rounded border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[11px] tracking-[0.2em] uppercase">{title}</span>
        <span className="text-muted text-xs">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="border-border border-t px-4 py-4">{children}</div> : null}
    </section>
  );
}

/**
 * Numeric input that fixes the "type-and-prepend-0" UX bug:
 *
 *   - When the underlying value is `0`, the input renders empty with a `0`
 *     placeholder. Typing puts characters into an empty field instead of
 *     prepending to a literal "0".
 *   - During editing, we keep a local string buffer so the user can clear,
 *     type "-", or type "1." mid-decimal without the parent forcing the
 *     value back to 0 on every keystroke.
 *   - Click/focus selects the entire value so non-zero fields are easy to
 *     replace too.
 *   - On blur, an empty or unparseable buffer propagates as `0` and the
 *     local buffer is released so external prop updates (e.g. the
 *     "Use my actual data" prefill) take over again.
 *
 * The pattern is deliberately controlled-but-tolerant: while the user is
 * actively editing, the local buffer wins; outside of editing, the prop
 * value is the source of truth. This avoids the React 19
 * `set-state-in-effect` lint and the fight-the-cursor bugs that come with
 * naive `useEffect`-based re-syncing.
 */
function NumField({
  label,
  value,
  step = 1,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  // null = "not currently editing; derive display from prop".
  // string = "user is editing; use this string verbatim".
  const [draft, setDraft] = useState<string | null>(null);

  const display = draft !== null ? draft : value === 0 ? '' : String(value);

  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={display}
          placeholder="0"
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            // Only propagate when the buffer parses to a finite number.
            // Empty / "-" / "1." stay local until blur — propagating those
            // as 0 would clobber what the user is in the middle of typing.
            if (next.trim() === '') return;
            const n = Number(next);
            if (Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => {
            // Release the buffer back to prop-derived display. If the user
            // left it empty or garbage, fall back to 0 so the form's number
            // shape stays valid.
            if (draft !== null) {
              const trimmed = draft.trim();
              if (trimmed === '' || !Number.isFinite(Number(trimmed))) {
                onChange(0);
              }
              setDraft(null);
            }
          }}
          className="border-border focus:border-foreground nums w-full rounded border bg-transparent px-3 py-2 text-base outline-none"
        />
        {suffix ? <span className="text-muted text-xs">{suffix}</span> : null}
      </div>
    </label>
  );
}

/**
 * Inline role-library search for a career stage. The user types a query;
 * matching roles render as a small clickable list. Clicking one fills
 * baseSalary / annualRaisePct / bonusPct on the stage; everything stays
 * editable afterward.
 *
 * Deliberately stateless about "which role was picked" — once applied,
 * the stage is just a stage, not a tagged preset. The library is a
 * starting point, not a category. This matches the disclaimer the UI
 * surfaces ("starting estimates, replace with your own figures") — you
 * should never be able to tell, after editing, that someone "is" still
 * the BigLaw associate preset.
 */
function RoleSearchBox({ onPick }: { onPick: (preset: RolePreset) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  // Group the (optionally filtered) roles by track so an empty query is a
  // browsable, categorized list — not just a search box.
  const groups = useMemo<Array<[RoleTrack, RolePreset[]]>>(() => {
    const byTrack = new Map<RoleTrack, RolePreset[]>();
    for (const r of searchRolePresets(query)) {
      const arr = byTrack.get(r.track) ?? [];
      arr.push(r);
      byTrack.set(r.track, arr);
    }
    return [...byTrack.entries()];
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Delay blur close so an onMouseDown on a result can fire first.
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={`Browse or search ${ROLE_PRESETS.length} roles (e.g. "biglaw", "L5", "MLE")…`}
        className="border-border focus:border-foreground placeholder:text-muted/50 w-full rounded border bg-transparent px-3 py-2 text-xs outline-none"
      />
      {open ? (
        <div
          className="border-border bg-background absolute top-full right-0 left-0 z-10 mt-1 max-h-80 overflow-auto rounded border shadow-lg"
          role="listbox"
        >
          {groups.length === 0 ? (
            <p className="text-muted px-3 py-3 text-[11px]">No roles match “{query}”.</p>
          ) : (
            groups.map(([track, roles]) => (
              <div key={track}>
                <p className="text-muted bg-background/95 sticky top-0 px-3 py-1.5 text-[10px] font-medium tracking-[0.16em] uppercase backdrop-blur">
                  {TRACK_LABELS[track]}
                </p>
                <ul>
                  {roles.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        // onMouseDown fires before the input's onBlur.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onPick(r);
                          setQuery('');
                          setOpen(false);
                        }}
                        className="hover:bg-foreground/5 flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
                      >
                        <span className="text-foreground text-xs">{r.title}</span>
                        <span className="text-muted nums text-[10px]">
                          ${r.baseSalary.toLocaleString()} base · +{r.annualRaisePct}% ·{' '}
                          {r.bonusPct}% bonus
                          {r.annualEquity > 0
                            ? ` · $${r.annualEquity.toLocaleString()} equity`
                            : ''}
                        </span>
                        {r.notes ? (
                          <span className="text-muted text-[10px] italic">{r.notes}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted text-xs">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="border-border focus:border-foreground placeholder:text-muted/50 rounded border bg-transparent px-3 py-2 text-base outline-none"
      />
    </label>
  );
}

/**
 * UI for `assumptions.lifestyle`. Absent state means "use pre-Feature-3
 * behavior" (= flat, 0% creep). To turn lifestyle creep off after enabling
 * it, set the mode dropdown to "Off" — that drops the key back to undefined.
 */
function LifestyleEditor({
  value,
  onChange,
}: {
  value: Lifestyle | undefined;
  onChange: (next: Lifestyle | undefined) => void;
}) {
  const mode: 'off' | 'flat' | 'incomeScaled' = value?.mode ?? 'off';

  function setMode(next: 'off' | 'flat' | 'incomeScaled') {
    if (next === 'off') {
      onChange(undefined);
      return;
    }
    onChange({
      mode: next,
      lifestyleCreepPct: value?.lifestyleCreepPct ?? 1,
      creepShareOfRaisePct: value?.creepShareOfRaisePct ?? 50,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-muted text-xs">Mode</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as 'off' | 'flat' | 'incomeScaled')}
          className="border-border bg-background rounded border px-3 py-2 text-sm"
        >
          <option value="off">Off — expenses only track inflation</option>
          <option value="flat">Flat — grow at inflation + a fixed % per year</option>
          <option value="incomeScaled">Income-scaled — absorb a % of each raise</option>
        </select>
      </label>

      {mode === 'flat' && value ? (
        <NumField
          label="Lifestyle creep above inflation"
          value={value.lifestyleCreepPct}
          step={0.25}
          min={-50}
          max={50}
          onChange={(n) => onChange({ ...value, lifestyleCreepPct: n })}
          suffix="%/yr"
        />
      ) : null}

      {mode === 'incomeScaled' && value ? (
        <NumField
          label="Share of each raise absorbed"
          value={value.creepShareOfRaisePct}
          step={5}
          min={0}
          max={100}
          onChange={(n) => onChange({ ...value, creepShareOfRaisePct: n })}
          suffix="%"
        />
      ) : null}

      <p className="text-muted text-[10px]">
        Lifestyle creep models that spending tends to rise over time. Flat mode adds a steady drift
        above inflation; income-scaled absorbs a portion of every raise. Off keeps the pre-creep
        behavior (expenses track inflation only).
      </p>
    </div>
  );
}

/**
 * Seeds the single `effectiveTaxRatePct` from a rough state + federal
 * estimate. Illustrative only — see `tax-presets.ts`. The user applies the
 * estimate, then fine-tunes the rate field directly.
 */
function TaxEstimator({
  currentRate,
  onApply,
}: {
  currentRate: number;
  onApply: (rate: number) => void;
}) {
  const [stateCode, setStateCode] = useState('CA');
  const [income, setIncome] = useState('250000');
  const incomeNum = Number(income);
  const estimate = estimateEffectiveTaxRate(stateCode, Number.isFinite(incomeNum) ? incomeNum : 0);

  return (
    <div className="border-border flex flex-col gap-2 rounded border p-3">
      <p className="text-muted text-[10px] tracking-[0.18em] uppercase">
        Estimate from state + income
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-muted text-xs">State</span>
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className="border-border bg-background rounded border px-2 py-2 text-sm"
          >
            {STATE_TAXES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted text-xs">Gross household income</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              step={10000}
              min={0}
              value={income}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setIncome(e.target.value)}
              className="border-border focus:border-foreground nums w-full rounded border bg-transparent px-2 py-2 text-sm outline-none"
            />
            <span className="text-muted text-xs">$</span>
          </div>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">
          Estimated effective ≈ <span className="nums font-medium">{estimate}%</span>
        </span>
        <button
          type="button"
          onClick={() => onApply(estimate)}
          disabled={estimate === currentRate}
          className="bg-foreground text-background rounded px-3 py-1 text-xs font-medium disabled:opacity-40"
        >
          Apply
        </button>
      </div>
      <p className="text-muted text-[10px] italic">
        Rough estimate, not tax advice — blends a federal effective rate (by income) with a state
        rate; ignores filing status, deductions, credits, FICA, and local/city taxes. Last reviewed{' '}
        {TAX_LAST_REVIEWED}. Adjust the rate below to fine-tune.
      </p>
    </div>
  );
}

export default function AssumptionsForm({
  value,
  onChange,
}: {
  value: Assumptions;
  onChange: Setter;
}) {
  function update(patch: Partial<Assumptions>) {
    onChange({ ...value, ...patch });
  }

  // ----------------- People helpers -----------------
  function setPeople(people: Person[]) {
    update({ people });
  }

  function addPerson() {
    setPeople([
      ...value.people,
      {
        id: newId(),
        name: `Person ${value.people.length + 1}`,
        birthYear: 1995,
        careerStages: [],
      },
    ]);
  }

  function patchPerson(personId: string, patch: Partial<Person>) {
    setPeople(value.people.map((p) => (p.id === personId ? { ...p, ...patch } : p)));
  }

  function removePerson(personId: string) {
    setPeople(value.people.filter((p) => p.id !== personId));
  }

  function setStages(personId: string, stages: CareerStage[]) {
    patchPerson(personId, { careerStages: stages });
  }

  function addStage(personId: string) {
    const p = value.people.find((x) => x.id === personId);
    if (!p) return;
    setStages(personId, [
      ...p.careerStages,
      { label: 'New stage', startAge: 22, baseSalary: 100_000, annualRaisePct: 3 },
    ]);
  }

  function patchStage(personId: string, idx: number, patch: Partial<CareerStage>) {
    const p = value.people.find((x) => x.id === personId);
    if (!p) return;
    setStages(
      personId,
      p.careerStages.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  }

  function removeStage(personId: string, idx: number) {
    const p = value.people.find((x) => x.id === personId);
    if (!p) return;
    setStages(
      personId,
      p.careerStages.filter((_, i) => i !== idx),
    );
  }

  function applyPreset(personId: string, presetId: string) {
    const preset = CAREER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setStages(
      personId,
      preset.stages.map((s) => ({ ...s })),
    );
  }

  // ----------------- Windfalls helpers -----------------
  function setWindfalls(windfalls: Windfall[]) {
    update({ windfalls });
  }

  // ----------------- Major-expenses helpers -----------------
  function setMajor(majorExpenses: MajorExpense[]) {
    update({ majorExpenses });
  }

  return (
    <div className="flex flex-col gap-3">
      <Section title="Horizon">
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="Start year"
            value={value.horizonStartYear}
            min={1900}
            max={2200}
            onChange={(n) => update({ horizonStartYear: Math.round(n) })}
          />
          <NumField
            label="End year"
            value={value.horizonEndYear}
            min={1900}
            max={2200}
            onChange={(n) => update({ horizonEndYear: Math.round(n) })}
          />
        </div>
      </Section>

      <Section title="Starting state">
        <div className="grid grid-cols-1 gap-3">
          <NumField
            label="Starting net worth"
            value={value.startingNetWorth}
            step={1000}
            onChange={(n) => update({ startingNetWorth: n })}
            suffix="$"
          />
          <NumField
            label="Starting invested (subset of net worth)"
            value={value.startingInvested}
            step={1000}
            min={0}
            onChange={(n) => update({ startingInvested: n })}
            suffix="$"
          />
          <NumField
            label="Recurring annual household expenses"
            value={value.recurringAnnualExpenses}
            step={1000}
            min={0}
            onChange={(n) => update({ recurringAnnualExpenses: n })}
            suffix="$"
          />
        </div>
      </Section>

      <Section title="Taxes">
        <div className="flex flex-col gap-3">
          <TaxEstimator
            currentRate={value.effectiveTaxRatePct}
            onApply={(rate) => update({ effectiveTaxRatePct: rate })}
          />
          <NumField
            label="Effective tax rate (applied to all income)"
            value={value.effectiveTaxRatePct}
            step={1}
            min={0}
            max={80}
            onChange={(n) => update({ effectiveTaxRatePct: n })}
            suffix="%"
          />
          <p className="text-muted text-[10px]">
            Savings is derived — each year you save whatever&apos;s left after tax and spending.
            There is no separate savings-rate input.
          </p>
        </div>
      </Section>

      <Section title="Lifestyle creep" defaultOpen={false}>
        <LifestyleEditor value={value.lifestyle} onChange={(next) => update({ lifestyle: next })} />
      </Section>

      <Section title="Investment & inflation">
        <div className="grid grid-cols-1 gap-3">
          <NumField
            label="Inflation"
            value={value.inflationPct}
            step={0.25}
            onChange={(n) => update({ inflationPct: n })}
            suffix="%"
          />
          <div className="grid grid-cols-3 gap-3">
            <NumField
              label="Return (low)"
              value={value.investment.returnPctLow}
              step={0.25}
              onChange={(n) => update({ investment: { ...value.investment, returnPctLow: n } })}
              suffix="%"
            />
            <NumField
              label="Return (base)"
              value={value.investment.returnPct}
              step={0.25}
              onChange={(n) => update({ investment: { ...value.investment, returnPct: n } })}
              suffix="%"
            />
            <NumField
              label="Return (high)"
              value={value.investment.returnPctHigh}
              step={0.25}
              onChange={(n) => update({ investment: { ...value.investment, returnPctHigh: n } })}
              suffix="%"
            />
          </div>
          <p className="text-muted text-[10px]">
            Constraint: low ≤ base ≤ high. Values outside this range will fail the save-scenario
            validation.
          </p>
        </div>
      </Section>

      <Section title={`People & careers (${value.people.length})`}>
        <div className="flex flex-col gap-4">
          {value.people.map((p) => (
            <div key={p.id} className="border-border rounded border p-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Name"
                  value={p.name}
                  maxLength={80}
                  onChange={(s) => patchPerson(p.id, { name: s })}
                />
                <NumField
                  label="Birth year"
                  value={p.birthYear}
                  min={1900}
                  max={2200}
                  onChange={(n) => patchPerson(p.id, { birthYear: Math.round(n) })}
                />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-muted text-[10px] tracking-[0.18em] uppercase">
                  Career stages ({p.careerStages.length})
                </span>
                <div className="flex items-center gap-2">
                  <select
                    className="border-border bg-background rounded border px-2 py-1 text-[11px]"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        applyPreset(p.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="" disabled>
                      Pick preset…
                    </option>
                    {CAREER_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => addStage(p.id)}
                    className="border-border hover:bg-foreground/5 rounded border px-2 py-1 text-[11px]"
                  >
                    + Stage
                  </button>
                </div>
              </div>

              {p.careerStages.length === 0 ? (
                <p className="text-muted mt-2 text-xs italic">No career stages yet.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {p.careerStages.map((s, i) => (
                    <li key={i} className="border-border rounded border p-3">
                      <div className="mb-3 flex flex-col gap-1">
                        <span className="text-muted text-[10px] tracking-[0.18em] uppercase">
                          Role library
                        </span>
                        <RoleSearchBox
                          onPick={(preset) =>
                            patchStage(p.id, i, {
                              baseSalary: preset.baseSalary,
                              annualRaisePct: preset.annualRaisePct,
                              bonusPct: preset.bonusPct,
                              annualEquity: preset.annualEquity,
                            })
                          }
                        />
                        <span className="text-muted text-[10px] italic">
                          Starting estimates — replace with your own figures.
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <TextField
                          label="Label"
                          value={s.label}
                          onChange={(v) => patchStage(p.id, i, { label: v })}
                        />
                        <NumField
                          label="Starts at age"
                          value={s.startAge}
                          min={0}
                          max={120}
                          onChange={(v) => patchStage(p.id, i, { startAge: v })}
                        />
                        <NumField
                          label="Base salary"
                          value={s.baseSalary}
                          step={1000}
                          min={0}
                          onChange={(v) => patchStage(p.id, i, { baseSalary: v })}
                          suffix="$"
                        />
                        <NumField
                          label="Annual raise"
                          value={s.annualRaisePct}
                          step={0.5}
                          onChange={(v) => patchStage(p.id, i, { annualRaisePct: v })}
                          suffix="%"
                        />
                        <NumField
                          label="Bonus (% of base)"
                          value={s.bonusPct ?? 0}
                          step={1}
                          min={0}
                          onChange={(v) => patchStage(p.id, i, { bonusPct: v })}
                          suffix="%"
                        />
                        <NumField
                          label="Equity / RSU per year"
                          value={s.annualEquity ?? 0}
                          step={5000}
                          min={0}
                          onChange={(v) => patchStage(p.id, i, { annualEquity: v })}
                          suffix="$"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStage(p.id, i)}
                        className="text-muted hover:text-negative mt-2 text-[11px]"
                      >
                        Remove stage
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => removePerson(p.id)}
                className="text-muted hover:text-negative mt-3 text-[11px]"
              >
                Remove person
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPerson}
            className="border-border hover:bg-foreground/5 self-start rounded border px-3 py-1.5 text-xs"
          >
            + Add person
          </button>
        </div>
      </Section>

      <Section title={`Windfalls (${value.windfalls.length})`} defaultOpen={false}>
        <div className="flex flex-col gap-3">
          {value.windfalls.map((w, i) => (
            <div key={i} className="border-border rounded border p-3">
              <div className="grid grid-cols-3 gap-3">
                <TextField
                  label="Label"
                  value={w.label}
                  onChange={(v) =>
                    setWindfalls(value.windfalls.map((x, j) => (j === i ? { ...x, label: v } : x)))
                  }
                />
                <NumField
                  label="Year"
                  value={w.year}
                  onChange={(v) =>
                    setWindfalls(
                      value.windfalls.map((x, j) => (j === i ? { ...x, year: Math.round(v) } : x)),
                    )
                  }
                />
                <NumField
                  label="Amount"
                  value={w.amount}
                  step={1000}
                  onChange={(v) =>
                    setWindfalls(value.windfalls.map((x, j) => (j === i ? { ...x, amount: v } : x)))
                  }
                  suffix="$"
                />
              </div>
              <button
                type="button"
                onClick={() => setWindfalls(value.windfalls.filter((_, j) => j !== i))}
                className="text-muted hover:text-negative mt-2 text-[11px]"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setWindfalls([
                ...value.windfalls,
                { label: 'Windfall', year: value.horizonStartYear, amount: 10_000 },
              ])
            }
            className="border-border hover:bg-foreground/5 self-start rounded border px-3 py-1.5 text-xs"
          >
            + Add windfall
          </button>
        </div>
      </Section>

      <Section title={`Major expenses (${value.majorExpenses.length})`} defaultOpen={false}>
        <div className="flex flex-col gap-3">
          {value.majorExpenses.map((e, i) => {
            const isRecurring = !('year' in e);
            return (
              <div key={i} className="border-border rounded border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-muted text-[10px] tracking-[0.18em] uppercase">
                    {isRecurring ? 'Recurring' : 'One-time'}
                  </span>
                  <button
                    type="button"
                    className="text-muted hover:text-foreground text-[11px] underline-offset-2 hover:underline"
                    onClick={() => {
                      setMajor(
                        value.majorExpenses.map((x, j) => {
                          if (j !== i) return x;
                          return isRecurring
                            ? { label: x.label, year: value.horizonStartYear, amount: 10_000 }
                            : {
                                label: x.label,
                                startYear: value.horizonStartYear,
                                annualAmount: 10_000,
                                years: 5,
                              };
                        }),
                      );
                    }}
                  >
                    switch to {isRecurring ? 'one-time' : 'recurring'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="Label"
                    value={e.label}
                    onChange={(v) =>
                      setMajor(
                        value.majorExpenses.map((x, j) => (j === i ? { ...x, label: v } : x)),
                      )
                    }
                  />
                  {'year' in e ? (
                    <>
                      <NumField
                        label="Year"
                        value={e.year}
                        onChange={(v) =>
                          setMajor(
                            value.majorExpenses.map((x, j) =>
                              j === i && 'year' in x ? { ...x, year: Math.round(v) } : x,
                            ),
                          )
                        }
                      />
                      <NumField
                        label="Amount"
                        value={e.amount}
                        step={1000}
                        onChange={(v) =>
                          setMajor(
                            value.majorExpenses.map((x, j) =>
                              j === i && 'year' in x ? { ...x, amount: v } : x,
                            ),
                          )
                        }
                        suffix="$"
                      />
                    </>
                  ) : (
                    <>
                      <NumField
                        label="Start year"
                        value={e.startYear}
                        onChange={(v) =>
                          setMajor(
                            value.majorExpenses.map((x, j) =>
                              j === i && 'startYear' in x ? { ...x, startYear: Math.round(v) } : x,
                            ),
                          )
                        }
                      />
                      <NumField
                        label="Annual amount"
                        value={e.annualAmount}
                        step={1000}
                        onChange={(v) =>
                          setMajor(
                            value.majorExpenses.map((x, j) =>
                              j === i && 'startYear' in x ? { ...x, annualAmount: v } : x,
                            ),
                          )
                        }
                        suffix="$"
                      />
                      <NumField
                        label="Years"
                        value={e.years}
                        min={1}
                        max={200}
                        onChange={(v) =>
                          setMajor(
                            value.majorExpenses.map((x, j) =>
                              j === i && 'startYear' in x
                                ? { ...x, years: Math.max(1, Math.round(v)) }
                                : x,
                            ),
                          )
                        }
                      />
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMajor(value.majorExpenses.filter((_, j) => j !== i))}
                  className="text-muted hover:text-negative mt-2 text-[11px]"
                >
                  Remove
                </button>
              </div>
            );
          })}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setMajor([
                  ...value.majorExpenses,
                  { label: 'One-time expense', year: value.horizonStartYear, amount: 50_000 },
                ])
              }
              className="border-border hover:bg-foreground/5 rounded border px-3 py-1.5 text-xs"
            >
              + One-time
            </button>
            <button
              type="button"
              onClick={() =>
                setMajor([
                  ...value.majorExpenses,
                  {
                    label: 'Recurring expense',
                    startYear: value.horizonStartYear,
                    annualAmount: 10_000,
                    years: 5,
                  },
                ])
              }
              className="border-border hover:bg-foreground/5 rounded border px-3 py-1.5 text-xs"
            >
              + Recurring
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}
