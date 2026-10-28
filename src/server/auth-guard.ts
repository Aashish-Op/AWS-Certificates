import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

/**
 * Require an authenticated user.
 * Redirects to /login if not authenticated.
 * Returns the user object.
 */
export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

/**
 * Require an authenticated admin user.
 * Checks `admins.user_id` — never by email match.
 * Redirects to /dashboard if authenticated but not admin.
 * Redirects to /login if not authenticated.
 */
export async function requireAdmin() {
  const user = await requireAuth();

  const adminClient = createAdminClient();
  const { data: adminRow } = await adminClient
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!adminRow) {
    redirect('/dashboard');
  }

  return user;
}

/**
 * Check if the current user is an admin (without redirecting).
 * Returns true/false.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  return !!data;
}
