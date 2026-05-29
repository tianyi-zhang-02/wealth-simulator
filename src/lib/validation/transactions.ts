import { z } from 'zod';

export const TRANSACTION_KINDS = [
  'income',
  'savings_deposit',
  'savings_withdrawal',
  'expense',
] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

// amount arrives as a JS number (form uses valueAsNumber; JSON.parse decodes
// numerics natively). No coercion — keeping input and output types aligned
// avoids zodResolver complaining about a Resolver<unknown> vs Resolver<number>
// mismatch when the form generic is z.infer<...>.
const amount = z
  .number()
  .positive()
  .max(999_999_999_999.99, 'amount too large')
  .refine((n) => Math.round(n * 100) === n * 100, 'at most 2 decimal places');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

const category = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .optional()
  .or(z.literal('').transform(() => undefined));
const note = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal('').transform(() => undefined));

export const createTransactionSchema = z.object({
  account_id: z.string().uuid(),
  kind: z.enum(TRANSACTION_KINDS),
  amount,
  category,
  note,
  occurred_on: isoDate,
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z
  .object({
    account_id: z.string().uuid().optional(),
    kind: z.enum(TRANSACTION_KINDS).optional(),
    amount: amount.optional(),
    category,
    note,
    occurred_on: isoDate.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'no fields to update',
  });
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

/**
 * Query-string filters for GET /api/transactions. All optional; missing
 * filters mean "no constraint".
 */
export const transactionFiltersSchema = z.object({
  account: z.string().uuid().optional(),
  kind: z.enum(TRANSACTION_KINDS).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  limit: z.coerce.number().int().positive().max(500).default(200),
});
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
