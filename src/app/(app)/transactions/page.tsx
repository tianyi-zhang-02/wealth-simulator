import { redirect } from 'next/navigation';

import { getServerSupabase, getAuthedUser } from '@/lib/supabase/server';
import type { Account } from '@/lib/types/account';
import type { TransactionWithAccount } from '@/lib/types/transaction';

import TransactionsClient from './transactions-client';

/**
 * Transactions list. Server component reads both the recent transactions
 * (joined with each transaction's account) and the user's active accounts
 * for the filter dropdown + add form.
 */
export default async function TransactionsPage() {
  const user = await getAuthedUser();
  if (!user) redirect('/login');

  const supabase = await getServerSupabase();

  const [{ data: txData, error: txErr }, { data: acctData, error: acctErr }] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        'id, user_id, account_id, kind, amount, category, note, occurred_on, created_at, ' +
          'account:accounts(id, name, type, currency)',
      )
      .eq('user_id', user.id)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('accounts')
      .select('id, user_id, name, type, currency, archived_at, created_at')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
  ]);

  if (txErr) console.warn('[transactions page] tx db error', { code: txErr.code });
  if (acctErr) console.warn('[transactions page] account db error', { code: acctErr.code });

  const initialTransactions: TransactionWithAccount[] =
    (txData as unknown as TransactionWithAccount[] | null) ?? [];
  const accounts: Account[] = acctData ?? [];

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 pt-10">
      <header>
        <h1 className="serif-display text-3xl">Transactions</h1>
        <p className="text-muted mt-2 text-sm">
          Income, savings flow, expenses — last 200 entries.
        </p>
      </header>

      <TransactionsClient initialTransactions={initialTransactions} accounts={accounts} />
    </main>
  );
}
