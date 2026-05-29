import { redirect } from 'next/navigation';

import { getServerSupabase, getAuthedUser } from '@/lib/supabase/server';
import type { Scenario } from '@/lib/types/scenario';

import SimulatorClient from './simulator-client';

/**
 * Household Wealth Simulator — see STEP_10_SIMULATOR_SPEC.md.
 *
 * The simulation itself runs entirely client-side (pure math, instant).
 * The server's only jobs here are auth + loading saved scenarios so the
 * scenario selector has something to choose from.
 */
export default async function SimulatorPage() {
  const user = await getAuthedUser();
  if (!user) redirect('/login');

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('scenarios')
    .select('id, user_id, name, assumptions, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) console.warn('[simulator page] scenarios error', { code: error.code });

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 pt-10">
      <header>
        <h1 className="serif-display text-3xl">Simulator</h1>
        <p className="text-muted mt-2 text-sm">
          Project household net worth across two careers, windfalls, major
          expenses, and investment-return bands. Estimates based on your
          assumptions — not a prediction or financial advice.
        </p>
      </header>
      <SimulatorClient initialScenarios={(data ?? []) as Scenario[]} />
    </main>
  );
}
