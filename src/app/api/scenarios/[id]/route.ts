import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/api/require-user';
import { isAllowedOrigin } from '@/lib/security/origin';
import type { Scenario } from '@/lib/types/scenario';
import { updateScenarioSchema } from '@/lib/validation/scenarios';

const idSchema = z.string().uuid();

/**
 * GET /api/scenarios/:id
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const params = await ctx.params;
  if (!idSchema.safeParse(params.id).success) return apiError.badRequest();

  const { data, error } = await guard.supabase
    .from('scenarios')
    .select('id, user_id, name, assumptions, created_at, updated_at')
    .eq('id', params.id)
    .eq('user_id', guard.user.id)
    .maybeSingle();

  if (error) {
    console.warn('[GET /api/scenarios/:id] db error', { code: error.code });
    return apiError.serverError();
  }
  if (!data) return apiError.notFound();
  return NextResponse.json({ scenario: data as Scenario });
}

/**
 * PATCH /api/scenarios/:id — body { name?, assumptions? }. The updated_at
 * trigger touches the row server-side; we never trust a client-sent
 * updated_at.
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

  const parsed = updateScenarioSchema.safeParse(body);
  if (!parsed.success) return apiError.badRequest();

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.assumptions !== undefined) patch.assumptions = parsed.data.assumptions;

  if (Object.keys(patch).length === 0) return apiError.badRequest();

  const { data, error } = await guard.supabase
    .from('scenarios')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', guard.user.id)
    .select('id, user_id, name, assumptions, created_at, updated_at')
    .single();

  if (error) {
    console.warn('[PATCH /api/scenarios/:id] db error', { code: error.code });
    return apiError.serverError();
  }
  if (!data) return apiError.notFound();

  return NextResponse.json({ scenario: data as Scenario });
}

/**
 * DELETE /api/scenarios/:id — hard delete. Scenarios are throwaway by
 * design; if the user wants to keep history they should rename rather
 * than recreate.
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return apiError.forbidden();

  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const params = await ctx.params;
  if (!idSchema.safeParse(params.id).success) return apiError.badRequest();

  const { error } = await guard.supabase
    .from('scenarios')
    .delete()
    .eq('id', params.id)
    .eq('user_id', guard.user.id);

  if (error) {
    console.warn('[DELETE /api/scenarios/:id] db error', { code: error.code });
    return apiError.serverError();
  }
  return NextResponse.json({ ok: true });
}
