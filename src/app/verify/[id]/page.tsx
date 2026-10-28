import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { CheckCircle2, AlertTriangle, Search, ExternalLink, ShieldCheck, Award, Share2 } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidCertificateId } from '@/lib/certificate/ids';
import { formatCertificateId, siteConfig } from '@/config/site';
import { DEFAULT_CERTIFICATE_LAYOUT, computeNameLayout } from '@/lib/certificate/layout';
import { buildLinkedInAddUrl, buildLinkedInShareUrl } from '@/lib/linkedin';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';


interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { id } = await params;
  const cleanId = id.replace(/[-\s]/g, '').toUpperCase();
  if (!isValidCertificateId(cleanId)) {
    return {
      title: 'Certificate Not Found - AWS SBG LPU',
      robots: { index: false, follow: false },
    };
  }

  if (cleanId === 'SAMPLE123456') {
    return {
      title: 'Sample Certificate (Preview) - AWS SBG LPU',
      description: 'Official preview certificate for AWS Student Builder Group LPU.',
      robots: { index: false, follow: false },
    };
  }

  const supabase = createAdminClient();
  const { data: cert } = await supabase
    .from('certificates')
    .select('name, status, events:event_id(certificate_title, issuer_name, status)')
    .eq('id', cleanId)
    .single();

  const event: any = cert?.events;
  if (!cert || event?.status !== 'published') {
    return {
      title: 'Certificate Not Found - AWS SBG LPU',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${cert.name} - ${event?.certificate_title || 'Certificate'}`,
    description: `Official certificate verified by ${event?.issuer_name || 'AWS Student Builder Group, LPU'}. Certificate ID: ${formatCertificateId(cleanId)}`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${cert.name} - Verified Certificate`,
      description: `Official certificate issued by ${event?.issuer_name || 'AWS Student Builder Group, LPU'}.`,
      type: 'article',
    },
  };
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { id: rawId } = await params;
  const cleanId = rawId.replace(/[-\s]/g, '').toUpperCase();

  const isFormatValid = isValidCertificateId(cleanId);

  let cert: any = null;
  let event: any = null;

  if (isFormatValid) {
    if (cleanId === 'SAMPLE123456') {
      const supabase = createAdminClient();
      const { data: latestEvent } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      event = latestEvent || {
        name: 'AWS Cloud Discovery Day 2026',
        certificate_title: 'Certificate of Participation',
        event_date: new Date().toISOString().split('T')[0],
        issuer_name: 'AWS Student Builder Group, Lovely Professional University',
        template_web_path: null,
        template_width: 1024,
        template_height: 724,
        layout: DEFAULT_CERTIFICATE_LAYOUT,
        status: 'published',
      };

      cert = {
        id: 'SAMPLE123456',
        name: 'Ashish Kumar Prasad Gupta',
        status: 'valid',
        issued_at: new Date().toISOString(),
        revoked_at: null,
      };
    } else {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('certificates')
        .select(`
          id,
          name,
          status,
          issued_at,
          revoked_at,
          events:event_id (
            name,
            certificate_title,
            event_date,
            issuer_name,
            template_web_path,
            template_width,
            template_height,
            layout,
            status
          )
        `)
        .eq('id', cleanId)
        .single();

      if (data && (data.events as any)?.status === 'published') {
        cert = data;
        event = data.events;
      }
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // 1. Not Found State (Malformed ID, non-existent, or unpublished event)
  if (!cert || !event) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F9F9FB] px-4 py-12">
        <div className="mx-auto max-w-xl rounded-lg border border-[#E9EBED] bg-white p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF5F5] text-[#D91515]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-[#0F1B2A]">
            Certificate Not Found
          </h1>
          <p className="mt-2 text-sm text-[#5F6B7A]">
            No certificate matching the ID <strong className="font-mono text-[#0F1B2A]">{formatCertificateId(cleanId)}</strong> was found in our verification registry.
          </p>

          <form action="/verify" method="GET" className="mt-6 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              name="id"
              placeholder="e.g. 2345-6789-ABCD"
              className="flex-1 rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] placeholder-[#5F6B7A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded bg-[#FF9900] px-4 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211]"
            >
              <Search className="h-4 w-4" />
              <span>Verify</span>
            </button>
          </form>

          <div className="mt-6 border-t border-[#E9EBED] pt-4 text-xs text-[#5F6B7A]">
            <Link href="/" className="text-[#0972D3] hover:underline">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isRevoked = cert.status === 'revoked';
  const layout = event.layout || DEFAULT_CERTIFICATE_LAYOUT;
  const aspectRatio = (event.template_width || 3508) / (event.template_height || 2480);
  const computed = computeNameLayout(cert.name, layout, aspectRatio);

  const supabase = createAdminClient();
  let webImageUrl = '/sample-template.png';
  if (event.template_web_path) {
    const { data: publicUrlData } = supabase.storage
      .from('templates')
      .getPublicUrl(event.template_web_path);
    if (publicUrlData?.publicUrl) {
      webImageUrl = publicUrlData.publicUrl;
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const formattedCertId = formatCertificateId(cert.id);
  const verifyPageUrl = `${siteUrl}/verify/${formattedCertId}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verifyPageUrl, {
      margin: 1,
      width: 256,
      errorCorrectionLevel: 'M',
    });
  } catch (e) {
    console.error('Failed to generate QR data URL:', e);
  }

  const eventDateObj = event.event_date ? new Date(event.event_date) : new Date();
  const addLinkedInUrl = buildLinkedInAddUrl({
    certificateTitle: event.certificate_title || 'Certificate of Participation',
    certId: cert.id,
    eventDate: eventDateObj,
  });
  const shareUrl = buildLinkedInShareUrl(cert.id);

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F9F9FB] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Verification Status Banner */}
        {isRevoked ? (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-lg border border-[#D91515]/30 bg-[#FFF5F5] p-4 text-[#D91515]"
          >
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <div>
              <h2 className="font-bold text-base">This certificate has been revoked</h2>
              <p className="text-xs text-[#5F6B7A] mt-0.5">
                Revoked on {formatDate(cert.revoked_at)}. This credential is no longer valid.
              </p>
            </div>
          </div>
        ) : (
          <div
            role="status"
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-[#037F0C]/30 bg-[#F2FBF3] p-4 text-[#037F0C]"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 shrink-0 text-[#037F0C]" />
              <div>
                <h2 className="font-bold text-base text-[#0F1B2A]">Valid Certificate</h2>
                <p className="text-xs text-[#5F6B7A] mt-0.5">
                  Verified authentic credential issued by{' '}
                  <a
                    href={siteConfig.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0972D3] hover:underline"
                  >
                    {event.issuer_name}
                  </a>.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <a
                href={addLinkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded bg-[#0A66C2] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#004182] transition-colors shadow-sm"
              >
                <Award className="h-3.5 w-3.5" />
                <span>Add to LinkedIn</span>
              </a>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded border border-[#037F0C]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#037F0C] hover:bg-[#E3F6E5] transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </a>
            </div>
          </div>
        )}

        {/* Certificate Full Rendering */}
        {!isRevoked && (
          <div className="overflow-hidden rounded-lg border border-[#E9EBED] bg-white shadow-md">
            <div className="relative w-full overflow-hidden select-none" style={{ aspectRatio: `${aspectRatio}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={webImageUrl}
                alt={`Certificate for ${cert.name}`}
                className="h-full w-full object-cover"
              />

              {/* Recipient Name Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: `${layout.name.y * 100}%`,
                  left: `${layout.name.x * 100}%`,
                  transform:
                    layout.name.align === 'center'
                      ? 'translate(-50%, -50%)'
                      : layout.name.align === 'right'
                      ? 'translate(-100%, -50%)'
                      : 'translate(0, -50%)',
                  maxWidth: `${layout.name.maxWidth * 100}%`,
                  textAlign: layout.name.align,
                  fontSize: `clamp(14px, ${(computed.fontSizeFraction * 100) / aspectRatio}vw, 42px)`,
                  color: layout.name.color || '#5200D5',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  fontFamily: layout.name.fontFamily || 'Inter, sans-serif',
                }}
              >
                {cert.name}
              </div>

              {/* Verifiable QR Code Overlay */}
              {qrDataUrl && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${layout.qr.y * 100}%`,
                    left: `${layout.qr.x * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${layout.qr.size * 100}%`,
                    pointerEvents: 'none',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="Verifiable QR Code"
                    className="w-full h-auto aspect-square rounded-sm bg-white p-0.5 shadow-sm"
                  />
                </div>
              )}

              {/* Certificate ID Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: `${layout.certId.y * 100}%`,
                  left: `${layout.certId.x * 100}%`,
                  transform:
                    layout.certId.align === 'center'
                      ? 'translate(-50%, -50%)'
                      : layout.certId.align === 'right'
                      ? 'translate(-100%, -50%)'
                      : 'translate(0, -50%)',
                  fontSize: `clamp(8px, ${(layout.certId.fontSize * 100) / aspectRatio}vw, 15px)`,
                  color: layout.certId.color || '#5F6B7A',
                  textAlign: layout.certId.align,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  fontFamily: 'monospace',
                }}
              >
                Certificate ID: {formattedCertId}
              </div>
            </div>
          </div>
        )}

        {/* Details Table */}
        <div className="rounded-lg border border-[#E9EBED] bg-white p-6 shadow-none">
          <h2 className="text-base font-bold text-[#0F1B2A] border-b border-[#E9EBED] pb-3">
            Certificate Record
          </h2>

          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs font-medium text-[#5F6B7A]">Recipient</dt>
              <dd className="mt-0.5 font-bold text-[#0F1B2A] text-base">{cert.name}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#5F6B7A]">Certificate ID</dt>
              <dd className="mt-0.5 font-mono font-bold text-[#0F1B2A]">
                {formatCertificateId(cert.id)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#5F6B7A]">Certificate Title</dt>
              <dd className="mt-0.5 text-[#0F1B2A]">{event.certificate_title}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#5F6B7A]">Event</dt>
              <dd className="mt-0.5 text-[#0F1B2A]">{event.name}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#5F6B7A]">Event Date</dt>
              <dd className="mt-0.5 text-[#0F1B2A]">{formatDate(event.event_date)}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#5F6B7A]">Issued By</dt>
              <dd className="mt-0.5">
                <a
                  href={siteConfig.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#0972D3] hover:underline"
                >
                  <span>{event.issuer_name}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#5F6B7A]">Issue Date</dt>
              <dd className="mt-0.5 text-[#0F1B2A]">{formatDate(cert.issued_at)}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-[#5F6B7A]">Status</dt>
              <dd className="mt-0.5">
                {isRevoked ? (
                  <span className="font-semibold text-[#D91515]">Revoked</span>
                ) : (
                  <span className="font-semibold text-[#037F0C]">Valid</span>
                )}
              </dd>
            </div>
          </dl>

          {/* Offline verification note per spec §7.4 */}
          <div className="mt-6 border-t border-[#E9EBED] pt-4 text-xs text-[#5F6B7A]">
            <p>
              <strong>How to verify an offline copy:</strong> Compare the recipient name, event title, event date, and Certificate ID shown on this page against the printed PDF. Any discrepancy indicates an altered certificate.
            </p>
          </div>
        </div>

        {/* LinkedIn Official Credential Action Card */}
        {!isRevoked && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-[#E9EBED] bg-white p-5 shadow-none">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0A66C2]/10 text-[#0A66C2]">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F1B2A]">
                  Add this credential to your LinkedIn Profile
                </h3>
                <p className="mt-0.5 text-xs text-[#5F6B7A]">
                  Adds directly under <strong>Licenses & Certifications</strong> on your profile, linked to the official{' '}
                  <a
                    href={siteConfig.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0972D3] hover:underline"
                  >
                    AWS Student Builder Group at LPU
                  </a>{' '}
                  LinkedIn organization page.
                </p>
              </div>
            </div>
            <a
              href={addLinkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 w-full sm:w-auto items-center justify-center gap-1.5 rounded bg-[#0A66C2] px-4 py-2 text-xs font-bold text-white hover:bg-[#004182] transition-colors shadow-sm"
            >
              <Award className="h-4 w-4" />
              <span>Add to LinkedIn Profile</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
