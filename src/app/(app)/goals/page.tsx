import { redirect } from 'next/navigation';

import { getServerSupabase, getAuthedUser } from '@/lib/supabase/server';
import type { Account } from '@/lib/types/account';
import type { Goal } from '@/lib/types/goal';

import GoalsClient from './goals-client';

/**
 * Savings goals list. Reads goals + active accounts (for the linked-account
 * picker and currency display) + latest snapshot per account (so each goal
 * can render real progress without the client doing extra fetches).
 */
export default async function GoalsPage() {
  const user = await getAuthedUser();
  if (!user) redirect('/login');

  const supabase = await getServerSupabase();

  const [goalsRes, accountsRes, snapshotsRes] = await Promise.all([
    supabase
      .from('savings_goals')
      .select(
        'id, user_id, name, target_amount, target_date, monthly_contribution, linked_account_id, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('accounts')
      .select('id, user_id, name, type, currency, archived_at, created_at')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('account_snapshots')
      .select('account_id, balance, snapshot_date')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(2000),
  ]);

  if (goalsRes.error) console.warn('[goals page] goals error', { code: goalsRes.error.code });
  if (accountsRes.error)
    console.warn('[goals page] accounts error', { code: accountsRes.error.code });
  if (snapshotsRes.error)
    console.warn('[goals page] snapshots error', { code: snapshotsRes.error.code });

  const goals: Goal[] = goalsRes.data ?? [];
  const accounts: Account[] = accountsRes.data ?? [];

  // Latest snapshot per account, used to compute "current" for linked goals.
  const latestByAccount = new Map<string, { balance: string; snapshot_date: string }>();
  for (const s of snapshotsRes.data ?? []) {
    const prev = latestByAccount.get(s.account_id);
    if (!prev || s.snapshot_date > prev.snapshot_date) {
      latestByAccount.set(s.account_id, { balance: s.balance, snapshot_date: s.snapshot_date });
    }
  }
  // Serialise the map for the client component as a plain object.
  const latestObj = Object.fromEntries(latestByAccount.entries());

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 pt-10">
      <header>
        <h1 className="serif-display text-3xl">Goals</h1>
        <p className="text-muted mt-2 text-sm">
          Targets and the path to hit them. Link a goal to a savings or brokerage account to track
          progress automatically.
        </p>
      </header>
      <GoalsClient initialGoals={goals} accounts={accounts} latestByAccount={latestObj} />
    </main>
  );
}
