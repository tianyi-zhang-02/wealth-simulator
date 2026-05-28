import { NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { isAllowedOrigin } from '@/lib/security/origin';
import { getClientIp, rateLimit } from '@/lib/security/rate-limit';
import { getServerSupabase } from '@/lib/supabase/server';
import { sendOtpSchema } from '@/lib/validation/auth';

// Rate-limit: 5 send-OTP requests per IP per hour. Tight by design — sending
// emails is expensive and a cheap abuse vector.
const SEND_OTP_LIMIT = 5;
const SEND_OTP_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return apiError.forbidden();

  const ip = getClientIp(request);
  const rl = rateLimit({
    key: `send-otp:${ip}`,
    limit: SEND_OTP_LIMIT,
    windowMs: SEND_OTP_WINDOW_MS,
  });
  if (!rl.allowed) return apiError.tooManyRequests(rl.resetInSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError.badRequest();
  }

  const parsed = sendOtpSchema.safeParse(body);
  if (!parsed.success) return apiError.badRequest();

  const supabase = await getServerSupabase();
  const startedAt = Date.now();
  const { data, error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      // Lets new emails sign in (creates the auth.users row on first verify).
      shouldCreateUser: true,
    },
  });
  const elapsedMs = Date.now() - startedAt;

  // Verbose server-side logging — never returned to the client. Whatever the
  // result, the public response stays a generic { ok: true } so we don't leak
  // email-enumeration signals.
  if (error) {
    // Single-string log so Next.js's dev-log file captures the full payload.
    console.warn(
      `[send-otp] supabase.auth.signInWithOtp ERROR ${JSON.stringify({
        elapsedMs,
        status: error.status,
        code: error.code,
        name: error.name,
        message: error.message,
      })}`,
    );
  } else {
    console.info(
      `[send-otp] supabase.auth.signInWithOtp ok ${JSON.stringify({
        elapsedMs,
        // data fields are deliberately limited — no PII in logs.
        hasUser: !!data?.user,
        hasSession: !!data?.session,
      })}`,
    );
  }

  return NextResponse.json({ ok: true });
}
