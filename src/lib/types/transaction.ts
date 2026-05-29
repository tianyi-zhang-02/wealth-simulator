import type { TransactionKind } from '@/lib/validation/transactions';

/**
 * Database row shape for `public.transactions`. Until we hook up
 * `supabase gen types typescript`, we maintain this by hand.
 */
export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  kind: TransactionKind;
  /** Stored as numeric(14,2) — Supabase serializes to a string. */
  amount: string;
  category: string | null;
  note: string | null;
  occurred_on: string;
  created_at: string;
};

/** Transaction joined with the account it belongs to. */
export type TransactionWithAccount = Transaction & {
  account: { id: string; name: string; type: string; currency: string } | null;
};
