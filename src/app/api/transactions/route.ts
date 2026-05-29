import { NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/api/require-user';
import { isAllowedOrigin } from '@/lib/security/origin';
import type { TransactionWithAccount } from '@/lib/types/transaction';
import { createTransactionSchema, transactionFiltersSchema } from '@/lib/validation/transactions';

const TRANSACTION_SELECT =
  'id, user_id, account_id, kind, amount, category, note, occurred_on, created_at, ' +
  'account:accounts(id, name, type, currency)';

/**
 * GET /api/transactions?account=&kind=&from=&to=&limit=
 *   Lists the caller's transactions in reverse-chronological order, joined
 *   with each transaction's account (id, name, type, currency).
 */
export async function GET(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = transactionFiltersSchema.safeParse({
    account: url.searchParams.get('account') ?? undefined,
    kind: url.searchParams.get('kind') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) return apiError.badRequest();

  let query = guard.supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('user_id', guard.user.id)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(parsed.data.limit);

  if (parsed.data.account) query = query.eq('account_id', parsed.data.account);
  if (parsed.data.kind) query = query.eq('kind', parsed.data.kind);
  if (parsed.data.from) query = query.gte('occurred_on', parsed.data.from);
  if (parsed.data.to) query = query.lte('occurred_on', parsed.data.to);

  const { data, error } = await query;
  if (error) {
    console.warn('[GET /api/transactions] db error', { code: error.code });
    return apiError.serverError();
  }

  return NextResponse.json({
    transactions: (data ?? []) as unknown as TransactionWithAccount[],
  });
}

/**
 * POST /api/transactions
 *   Body: { account_id, kind, amount, category?, note?, occurred_on }
 */
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return apiError.forbidden();

  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError.badRequest();
  }

  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) return apiError.badRequest();

  // Verify the account belongs to this user before inserting — Supabase RLS
  // would block the insert anyway, but a clearer 400 beats a generic 500.
  const { data: account, error: accountErr } = await guard.supabase
    .from('accounts')
    .select('id')
    .eq('id', parsed.data.account_id)
    .eq('user_id', guard.user.id)
    .maybeSingle();
  if (accountErr) {
    console.warn('[POST /api/transactions] account lookup error', { code: accountErr.code });
    return apiError.serverError();
  }
  if (!account) return apiError.badRequest('unknown_account');

  const { data, error } = await guard.supabase
    .from('transactions')
    .insert({
      user_id: guard.user.id,
      account_id: parsed.data.account_id,
      kind: parsed.data.kind,
      amount: parsed.data.amount,
      category: parsed.data.category ?? null,
      note: parsed.data.note ?? null,
      occurred_on: parsed.data.occurred_on,
    })
    .select(TRANSACTION_SELECT)
    .single();

  if (error) {
    console.warn('[POST /api/transactions] db error', { code: error.code });
    return apiError.serverError();
  }

  return NextResponse.json(
    { transaction: data as unknown as TransactionWithAccount },
    { status: 201 },
  );
}
