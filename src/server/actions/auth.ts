'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeEmail, validateEmail, normalizeRegNo, validateRegNo } from '@/lib/import/normalize';
import { siteConfig } from '@/config/site';
import { RateLimits } from '@/lib/rate-limit';
import { ActionResult, success, failure } from '@/lib/errors';

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  regNo: z.string().trim().min(4, 'Registration number must be at least 4 characters').max(20, 'Registration number too long'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  next: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
});

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  return headerList.get('x-real-ip') || '127.0.0.1';
}

function sanitizeRedirectPath(path: string | undefined): string {
  if (!path) return '/dashboard';
  // Enforce same-origin relative URL starting with / and not //
  if (path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')) {
    return path;
  }
  return '/dashboard';
}

export async function registerAction(formData: unknown): Promise<ActionResult<{ redirect: string }>> {
  const ip = await getClientIp();

  // Rate limiting check
  const rl = await RateLimits.register(ip);
  if (!rl.success) {
    return failure(
      'RATE_LIMITED',
      'Too many registration attempts from this network. Please try again in an hour.'
    );
  }

  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    return failure('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid form input');
  }

  const { fullName, regNo, email, password } = parsed.data;
  const normalizedEmail = normalizeEmail(email);
  const normalizedRegNo = normalizeRegNo(regNo);

  const regNoError = validateRegNo(normalizedRegNo);
  if (regNoError) {
    return failure('VALIDATION_ERROR', regNoError);
  }

  const emailError = validateEmail(normalizedEmail);
  if (emailError) {
    return failure('VALIDATION_ERROR', emailError);
  }

  const adminClient = createAdminClient();

  // Check if registration number already registered in profiles
  const { data: existingReg } = await adminClient
    .from('profiles')
    .select('user_id')
    .eq('reg_no', normalizedRegNo)
    .maybeSingle();

  if (existingReg) {
    return failure('CONFLICT', 'An account with this Registration Number already exists. Sign in instead.');
  }

  // 1. Create auth user with admin API (bypasses email confirmation)
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName.trim(), reg_no: normalizedRegNo },
  });

  if (createError) {
    if (createError.message.toLowerCase().includes('already registered') || createError.message.toLowerCase().includes('user already exists')) {
      return failure('CONFLICT', 'An account with this email already exists. Sign in instead.');
    }
    return failure('INTERNAL_ERROR', createError.message);
  }

  const newUserId = userData.user.id;

  // 2. Insert into profiles table
  const { error: profileError } = await adminClient.from('profiles').insert({
    user_id: newUserId,
    full_name: fullName.trim(),
    reg_no: normalizedRegNo,
    email: normalizedEmail,
  });

  if (profileError) {
    // Compensating action: rollback created auth user so no orphaned user is left
    await adminClient.auth.admin.deleteUser(newUserId);

    if (
      profileError.code === '23505' ||
      profileError.message.includes('unique')
    ) {
      if (profileError.message.includes('reg_no')) {
        return failure('CONFLICT', 'An account with this Registration Number already exists. Sign in instead.');
      }
      return failure(
        'CONFLICT',
        `An account with this email address already exists. If it is yours, please sign in instead.`
      );
    }
    return failure('INTERNAL_ERROR', 'Failed to create profile. Please try again.');
  }

  // 3. Establish session on the client
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signInError) {
    // The account was created; user can still sign in
    return success({ redirect: '/login?registered=1' });
  }

  return success({ redirect: '/dashboard' });
}

export async function loginAction(formData: unknown): Promise<ActionResult<{ redirect: string }>> {
  const ip = await getClientIp();

  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return failure('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid form input');
  }

  const { email, password, next } = parsed.data;

  // Rate limiting check
  const rl = await RateLimits.login(ip, email);
  if (!rl.success) {
    return failure(
      'RATE_LIMITED',
      'Too many failed login attempts. Please wait 15 minutes before trying again.'
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return failure('UNAUTHORIZED', 'Incorrect email or password.');
  }

  return success({ redirect: sanitizeRedirectPath(next) });
}

export async function logoutAction(): Promise<ActionResult<void>> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return success(undefined);
}

export async function forgotPasswordAction(formData: unknown): Promise<ActionResult<{ message: string }>> {
  const ip = await getClientIp();

  const parsed = forgotPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return failure('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid email');
  }

  const { email } = parsed.data;

  const rlEmail = await RateLimits.forgotPasswordEmail(email);
  const rlIp = await RateLimits.forgotPasswordIp(ip);
  if (!rlEmail.success || !rlIp.success) {
    return failure('RATE_LIMITED', 'Too many password reset requests. Please try again later.');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteConfig.url}/reset-password`,
  });

  if (error) {
    // If SMTP is not yet configured (Phase 0 decision §7), provide graceful message
    return success({
      message: 'If an account exists with this email, a reset link will be sent. If email delivery is unavailable, contact your administrator.',
    });
  }

  return success({
    message: 'If an account exists with this email, password reset instructions have been sent.',
  });
}
