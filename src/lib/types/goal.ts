/**
 * Database row shape for `public.savings_goals`.
 */
export type Goal = {
  id: string;
  user_id: string;
  name: string;
  /** numeric(14,2) — Supabase serializes to a string. */
  target_amount: string;
  /** YYYY-MM-DD or null. */
  target_date: string | null;
  monthly_contribution: string;
  linked_account_id: string | null;
  created_at: string;
};
