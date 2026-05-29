import { redirect } from 'next/navigation';

import { getServerSupabase, getAuthedUser } from '@/lib/supabase/server';
import type { Account } from '@/lib/types/account';

import NewTransactionClient from './new-transaction-client';

/**
 * Standalone "Add transaction" page — the target of the raised "+" in the
 * bottom nav. Lighter than the inline form on /transactions: just the form,
 * with a back link and an explicit save → redirect.
 */
export default async function NewTransactionPage() {
  const user = await getAuthedUser();
  if (!user) redirect('/login');

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, user_id, name, type, currency, archived_at, created_at')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (error) console.warn('[new transaction page] db error', { code: error.code });

  const accounts: Account[] = data ?? [];

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 pt-10">
      <header>
        <h1 className="serif-display text-3xl">Add transaction</h1>
        <p className="text-muted mt-2 text-sm">Quick add — saves and returns to the list.</p>
      </header>

      <NewTransactionClient accounts={accounts} />
    </main>
  );
}
