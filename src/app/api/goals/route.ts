import { NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/api/require-user';
import { isAllowedOrigin } from '@/lib/security/origin';
import type { Goal } from '@/lib/types/goal';
import { createGoalSchema } from '@/lib/validation/goals';

/**
 * GET /api/goals
 *   Lists the caller's savings goals, oldest first (so the list is stable
 *   across refreshes; the client can re-order if needed).
 */
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.supabase
    .from('savings_goals')
    .select(
      'id, user_id, name, target_amount, target_date, monthly_contribution, linked_account_id, created_at',
    )
    .eq('user_id', guard.user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[GET /api/goals] db error', { code: error.code });
    return apiError.serverError();
  }
  return NextResponse.json({ goals: (data ?? []) as Goal[] });
}

/**
 * POST /api/goals
 *   Body: { name, target_amount, target_date?, monthly_contribution, linked_account_id? }
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

  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) return apiError.badRequest();

  // If a linked account is specified, verify it belongs to the user.
  if (parsed.data.linked_account_id) {
    const { data: account, error: accErr } = await guard.supabase
      .from('accounts')
      .select('id')
      .eq('id', parsed.data.linked_account_id)
      .eq('user_id', guard.user.id)
      .maybeSingle();
    if (accErr) {
      console.warn('[POST /api/goals] account lookup error', { code: accErr.code });
      return apiError.serverError();
    }
    if (!account) return apiError.badRequest('unknown_account');
  }

  const { data, error } = await guard.supabase
    .from('savings_goals')
    .insert({
      user_id: guard.user.id,
      name: parsed.data.name,
      target_amount: parsed.data.target_amount,
      target_date: parsed.data.target_date ?? null,
      monthly_contribution: parsed.data.monthly_contribution,
      linked_account_id: parsed.data.linked_account_id ?? null,
    })
    .select(
      'id, user_id, name, target_amount, target_date, monthly_contribution, linked_account_id, created_at',
    )
    .single();

  if (error) {
    console.warn('[POST /api/goals] db error', { code: error.code });
    return apiError.serverError();
  }
  return NextResponse.json({ goal: data as Goal }, { status: 201 });
}
