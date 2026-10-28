import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client using the service-role key.
 * BYPASSES RLS. Use only in server-side services where elevated
 * access is required (e.g. user creation, certificate issuance).
 *
 * This module is protected by the `server-only` import — it will
 * throw a build error if imported in client code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
