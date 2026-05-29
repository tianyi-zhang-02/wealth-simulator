import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

// Plain number (no z.coerce) so input/output types align — the form uses
// valueAsNumber and JSON.parse already decodes numerics natively.
const money = z.number().refine((n) => Math.round(n * 100) === n * 100, 'at most 2 decimal places');

const targetAmount = money.positive('target must be positive').max(999_999_999_999.99);
const monthlyContribution = money.min(0, 'must be ≥ 0').max(999_999_999_999.99);

// Empty string → undefined for optional date/uuid fields when the form
// uses an empty <input>/select.
const optionalDate = isoDate.optional().or(z.literal('').transform(() => undefined));
const optionalUuid = z
  .string()
  .uuid()
  .optional()
  .or(z.literal('').transform(() => undefined));

export const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  target_amount: targetAmount,
  target_date: optionalDate,
  monthly_contribution: monthlyContribution,
  linked_account_id: optionalUuid,
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    target_amount: targetAmount.optional(),
    target_date: optionalDate,
    monthly_contribution: monthlyContribution.optional(),
    linked_account_id: optionalUuid,
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'no fields to update',
  });
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
