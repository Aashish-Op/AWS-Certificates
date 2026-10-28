import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { Plus, Calendar, FileText, CheckCircle2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Events - Admin Console',
};

export default async function AdminEventsPage() {
  const supabase = createAdminClient();

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      slug,
      name,
      certificate_title,
      event_date,
      issuer_name,
      status,
      created_at,
      certificates (count)
    `)
    .order('event_date', { ascending: false });

  const eventList = events || [];

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B2A]">Events</h1>
          <p className="mt-1 text-sm text-[#5F6B7A]">
            Manage certification events, templates, and student credentials.
          </p>
        </div>

        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 rounded bg-[#FF9900] px-4 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211]"
        >
          <Plus className="h-4 w-4" />
          <span>Create Event</span>
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E9EBED] bg-white shadow-none">
        {eventList.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-[#5F6B7A]" />
            <h3 className="mt-3 text-base font-bold text-[#0F1B2A]">No events created</h3>
            <p className="mt-1 text-sm text-[#5F6B7A]">
              Get started by creating your first event and uploading a template.
            </p>
            <div className="mt-5">
              <Link
                href="/admin/events/new"
                className="inline-flex items-center gap-2 rounded bg-[#FF9900] px-4 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211]"
              >
                <Plus className="h-4 w-4" />
                <span>Create Event</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E9EBED] bg-[#F9F9FB] text-xs font-semibold uppercase text-[#5F6B7A]">
                <tr>
                  <th className="px-6 py-3">Event Name</th>
                  <th className="px-6 py-3">Event Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Certificates</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EBED]">
                {eventList.map((ev: any) => {
                  const certCount = ev.certificates?.[0]?.count || 0;
                  const isPublished = ev.status === 'published';

                  return (
                    <tr key={ev.id} className="hover:bg-[#F9F9FB]">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0F1B2A]">{ev.name}</div>
                        <div className="text-xs text-[#5F6B7A]">{ev.certificate_title}</div>
                        <div className="text-xs font-mono text-[#5F6B7A]">/{ev.slug}</div>
                      </td>
                      <td className="px-6 py-4 text-[#0F1B2A] whitespace-nowrap">
                        {formatDate(ev.event_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 rounded bg-[#F2FBF3] px-2.5 py-1 text-xs font-semibold text-[#037F0C]">
                            <CheckCircle2 className="h-3 w-3" />
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-[#E9EBED] px-2.5 py-1 text-xs font-semibold text-[#5F6B7A]">
                            <Clock className="h-3 w-3" />
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-[#0F1B2A]">
                        {certCount}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/events/${ev.id}`}
                          className="inline-flex items-center rounded border border-[#E9EBED] bg-white px-3 py-1.5 text-xs font-semibold text-[#0972D3] hover:bg-[#F9F9FB]"
                        >
                          Manage Event
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
