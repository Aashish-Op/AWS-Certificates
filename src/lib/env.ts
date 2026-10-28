import { z } from 'zod';

/**
 * Server-side environment variables.
 * This module must only be imported in server code.
 * It will throw at import time if any required variable is missing.
 */
const serverSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),


  // Site
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),

  // LinkedIn (optional)
  LINKEDIN_ORG_ID: z.string().optional(),

  // Sentry (optional for local dev)
  SENTRY_DSN: z.string().url().optional(),
});

/**
 * Client-side (public) environment variables.
 * Only NEXT_PUBLIC_ prefixed variables are available in the browser.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function validateEnv<T extends z.ZodType>(
  schema: T,
  data: Record<string, string | undefined>,
  label: string
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `❌ Invalid ${label} environment variables:\n${formatted}\n\nCheck your .env.local file.`
    );
  }
  return result.data as z.infer<T>;
}

/**
 * Validated server environment. Import only in server modules.
 * Returns undefined values gracefully during build when env vars aren't available.
 */
export function getServerEnv(): ServerEnv {
  return validateEnv(serverSchema, process.env as Record<string, string | undefined>, 'server');
}

/**
 * Validated client environment.
 */
export function getClientEnv(): ClientEnv {
  return validateEnv(clientSchema, process.env as Record<string, string | undefined>, 'client');
}
