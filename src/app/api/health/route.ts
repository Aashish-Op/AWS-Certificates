import { NextResponse } from 'next/server';

/**
 * Health check endpoint.
 * Returns a minimal JSON response to confirm the app is running.
 * This is intentionally kept simple — Supabase DB connectivity
 * check will be added once Supabase is configured.
 */
export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  return NextResponse.json(health, { status: 200 });
}
