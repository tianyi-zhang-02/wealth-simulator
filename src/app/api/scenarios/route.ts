import { NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/api/require-user';
import { isAllowedOrigin } from '@/lib/security/origin';
import type { Scenario } from '@/lib/types/scenario';
import { createScenarioSchema } from '@/lib/validation/scenarios';

/**
 * GET /api/scenarios — list the caller's saved scenarios (most-recently
 * updated first; the simulator UI typically wants the freshest one).
 */
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.supabase
    .from('scenarios')
    .select('id, user_id, name, assumptions, created_at, updated_at')
    .eq('user_id', guard.user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('[GET /api/scenarios] db error', { code: error.code });
    return apiError.serverError();
  }
  return NextResponse.json({ scenarios: (data ?? []) as Scenario[] });
}

/**
 * POST /api/scenarios — body { name, assumptions }. The assumptions blob is
 * zod-validated before insert; storing arbitrary jsonb without validation
 * would let a hostile client persist garbage that the simulator engine
 * would later choke on.
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

  const parsed = createScenarioSchema.safeParse(body);
  if (!parsed.success) return apiError.badRequest();

  const { data, error } = await guard.supabase
    .from('scenarios')
    .insert({
      user_id: guard.user.id,
      name: parsed.data.name,
      assumptions: parsed.data.assumptions,
    })
    .select('id, user_id, name, assumptions, created_at, updated_at')
    .single();

  if (error) {
    console.warn('[POST /api/scenarios] db error', { code: error.code });
    return apiError.serverError();
  }

  return NextResponse.json({ scenario: data as Scenario }, { status: 201 });
}
