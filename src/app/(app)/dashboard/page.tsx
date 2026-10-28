import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/server/auth-guard';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { CertificateCard } from '@/components/dashboard/certificate-card';
import { buildLinkedInAddUrl, buildLinkedInShareUrl, buildVerifyUrl } from '@/lib/linkedin';
import { Award, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Student Dashboard - AWS SBG LPU Certificates',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('user_id', user.id)
    .single();

  const isUserAdmin = await isAdmin(user.id);

  // Fetch certificates via RLS-bound client
  const { data: certs } = await supabase
    .from('certificates')
    .select(`
      id,
      name,
      status,
      issued_at,
      events:event_id (
        name,
        certificate_title,
        event_date,
        issuer_name
      )
    `)
    .order('issued_at', { ascending: false });

  const certificatesList = (certs || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    issued_at: c.issued_at,
    event: {
      name: c.events?.name || 'Event',
      certificate_title: c.events?.certificate_title || 'Certificate',
      event_date: c.events?.event_date || '',
      issuer_name: c.events?.issuer_name || 'AWS Student Builder Group, LPU',
    },
  }));

  const userEmail = profile?.email || user.email || '';
  const fullName = profile?.full_name || user.email || 'Student';

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F9F9FB]">
      <DashboardHeader
        fullName={fullName}
        email={userEmail}
        isAdmin={isUserAdmin}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0F1B2A]">My Certificates</h2>
            <p className="text-sm text-[#5F6B7A]">
              Official certificates issued to {userEmail}
            </p>
          </div>
          <span className="rounded bg-[#E9EBED] px-2.5 py-1 text-xs font-semibold text-[#0F1B2A]">
            {certificatesList.length} {certificatesList.length === 1 ? 'Certificate' : 'Certificates'}
          </span>
        </div>

        {certificatesList.length === 0 ? (
          <div className="rounded-lg border border-[#E9EBED] bg-white p-8 sm:p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F9F9FB] text-[#5F6B7A]">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#0F1B2A]">
              No certificates issued yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#5F6B7A]">
              No certificates are linked to <strong className="text-[#0F1B2A]">{userEmail}</strong> yet. Certificates appear here after the organizers issue and publish them for an event you attended.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {certificatesList.map((cert) => {
              const eventDateObj = cert.event.event_date ? new Date(cert.event.event_date) : new Date();
              const addUrl = buildLinkedInAddUrl({
                certificateTitle: cert.event.certificate_title,
                certId: cert.id,
                eventDate: eventDateObj,
              });
              const shareUrl = buildLinkedInShareUrl(cert.id);
              const verifyUrl = buildVerifyUrl(cert.id);

              return (
                <CertificateCard
                  key={cert.id}
                  certificate={cert as any}
                  linkedInAddUrl={addUrl}
                  linkedInShareUrl={shareUrl}
                  verifyUrl={verifyUrl}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
