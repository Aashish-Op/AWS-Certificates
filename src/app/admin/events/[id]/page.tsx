import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/server/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { EventTabs } from '@/components/admin/event-tabs';
import { ArrowLeft, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEventDetailPage({ params }: EventPageProps) {
  await requireAdmin();
  const { id } = await params;

  const supabase = createAdminClient();

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (eventErr || !event) {
    notFound();
  }

  const { data: certs } = await supabase
    .from('certificates')
    .select('id, name, email, status, render_version, issued_at')
    .eq('event_id', id)
    .order('issued_at', { ascending: false });

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F6B7A] hover:text-[#0F1B2A] mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Events</span>
        </Link>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F1B2A]">{event.name}</h1>
            <p className="text-xs text-[#5F6B7A]">
              Slug: <span className="font-mono">{event.slug}</span> • Event Date: {event.event_date}
            </p>
          </div>
        </div>
      </div>

      <EventTabs event={event} certificates={certs || []} />
    </div>
  );
}
