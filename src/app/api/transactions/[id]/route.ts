import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/api/require-user';
import { isAllowedOrigin } from '@/lib/security/origin';
import type { TransactionWithAccount } from '@/lib/types/transaction';
import { updateTransactionSchema } from '@/lib/validation/transactions';

const idSchema = z.string().uuid();

const TRANSACTION_SELECT =
  'id, user_id, account_id, kind, amount, category, note, occurred_on, created_at, ' +
  'account:accounts(id, name, type, currency)';

/**
 * PATCH /api/transactions/:id
 *   Partially updates a transaction. account_id changes are re-checked
 *   against the caller's account list to avoid orphaned references.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return apiError.forbidden();

  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const params = await ctx.params;
  if (!idSchema.safeParse(params.id).success) return apiError.badRequest();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError.badRequest();
  }

  const parsed = updateTransactionSchema.safeParse(body);
  if (!parsed.success) return apiError.badRequest();

  // If account is being changed, verify the new account belongs to the user.
  if (parsed.data.account_id) {
    const { data: account, error: accountErr } = await guard.supabase
      .from('accounts')
      .select('id')
      .eq('id', parsed.data.account_id)
      .eq('user_id', guard.user.id)
      .maybeSingle();
    if (accountErr) {
      console.warn('[PATCH /api/transactions/:id] account lookup error', { code: accountErr.code });
      return apiError.serverError();
    }
    if (!account) return apiError.badRequest('unknown_account');
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.account_id !== undefined) patch.account_id = parsed.data.account_id;
  if (parsed.data.kind !== undefined) patch.kind = parsed.data.kind;
  if (parsed.data.amount !== undefined) patch.amount = parsed.data.amount;
  // `category` and `note` use `.optional().or(z.literal('').transform(() => undefined))`,
  // so an empty string is normalized to `undefined`. To clear a field, the
  // client sends `null` (which fails our schema → use empty string).
  if ('category' in (body as object)) patch.category = parsed.data.category ?? null;
  if ('note' in (body as object)) patch.note = parsed.data.note ?? null;
  if (parsed.data.occurred_on !== undefined) patch.occurred_on = parsed.data.occurred_on;

  if (Object.keys(patch).length === 0) return apiError.badRequest();

  const { data, error } = await guard.supabase
    .from('transactions')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', guard.user.id)
    .select(TRANSACTION_SELECT)
    .single();

  if (error) {
    console.warn('[PATCH /api/transactions/:id] db error', { code: error.code });
    return apiError.serverError();
  }
  if (!data) return apiError.notFound();

  return NextResponse.json({ transaction: data as unknown as TransactionWithAccount });
}

/**
 * DELETE /api/transactions/:id
 *   Hard delete — transactions don't anchor historical aggregates the way
 *   account_snapshots do, so removal is fine.
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return apiError.forbidden();

  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const params = await ctx.params;
  if (!idSchema.safeParse(params.id).success) return apiError.badRequest();

  const { error } = await guard.supabase
    .from('transactions')
    .delete()
    .eq('id', params.id)
    .eq('user_id', guard.user.id);

  if (error) {
    console.warn('[DELETE /api/transactions/:id] db error', { code: error.code });
    return apiError.serverError();
  }

  return NextResponse.json({ ok: true });
}
