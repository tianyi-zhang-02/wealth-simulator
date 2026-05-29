import { NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/api/require-user';

/**
 * GET /api/transactions/categories
 *   Distinct non-null categories the user has used, ordered by recency.
 *   Drives the autocomplete on the add/edit transaction form.
 */
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.supabase
    .from('transactions')
    .select('category, occurred_on')
    .eq('user_id', guard.user.id)
    .not('category', 'is', null)
    .order('occurred_on', { ascending: false })
    .limit(500);

  if (error) {
    console.warn('[GET /api/transactions/categories] db error', { code: error.code });
    return apiError.serverError();
  }

  // De-dupe while preserving most-recent ordering.
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const row of data ?? []) {
    const cat = row.category;
    if (typeof cat === 'string' && cat.length > 0 && !seen.has(cat)) {
      seen.add(cat);
      categories.push(cat);
    }
  }

  return NextResponse.json({ categories });
}
