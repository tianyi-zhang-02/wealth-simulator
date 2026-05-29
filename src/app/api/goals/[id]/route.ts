import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/api/require-user';
import { isAllowedOrigin } from '@/lib/security/origin';
import type { Goal } from '@/lib/types/goal';
import { updateGoalSchema } from '@/lib/validation/goals';

const idSchema = z.string().uuid();

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

  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) return apiError.badRequest();

  // If linked_account_id is being set (non-null), verify ownership.
  if (parsed.data.linked_account_id) {
    const { data: account, error: accErr } = await guard.supabase
      .from('accounts')
      .select('id')
      .eq('id', parsed.data.linked_account_id)
      .eq('user_id', guard.user.id)
      .maybeSingle();
    if (accErr) {
      console.warn('[PATCH /api/goals/:id] account lookup error', { code: accErr.code });
      return apiError.serverError();
    }
    if (!account) return apiError.badRequest('unknown_account');
  }

  // Build the patch, only including keys the client actually sent. To clear
  // optional fields, the client sends the key with an empty string (which
  // the schema's `.or(z.literal('').transform(() => undefined))` normalises).
  const bodyObj = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.target_amount !== undefined) patch.target_amount = parsed.data.target_amount;
  if ('target_date' in bodyObj) patch.target_date = parsed.data.target_date ?? null;
  if (parsed.data.monthly_contribution !== undefined)
    patch.monthly_contribution = parsed.data.monthly_contribution;
  if ('linked_account_id' in bodyObj)
    patch.linked_account_id = parsed.data.linked_account_id ?? null;

  if (Object.keys(patch).length === 0) return apiError.badRequest();

  const { data, error } = await guard.supabase
    .from('savings_goals')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', guard.user.id)
    .select(
      'id, user_id, name, target_amount, target_date, monthly_contribution, linked_account_id, created_at',
    )
    .single();

  if (error) {
    console.warn('[PATCH /api/goals/:id] db error', { code: error.code });
    return apiError.serverError();
  }
  if (!data) return apiError.notFound();

  return NextResponse.json({ goal: data as Goal });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return apiError.forbidden();

  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const params = await ctx.params;
  if (!idSchema.safeParse(params.id).success) return apiError.badRequest();

  const { error } = await guard.supabase
    .from('savings_goals')
    .delete()
    .eq('id', params.id)
    .eq('user_id', guard.user.id);

  if (error) {
    console.warn('[DELETE /api/goals/:id] db error', { code: error.code });
    return apiError.serverError();
  }
  return NextResponse.json({ ok: true });
}
