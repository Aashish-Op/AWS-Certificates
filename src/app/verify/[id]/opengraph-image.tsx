import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidCertificateId } from '@/lib/certificate/ids';
import { formatCertificateId } from '@/config/site';

export const alt = 'AWS SBG LPU Verified Certificate';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: Props) {
  const { id: rawId } = await params;
  const certId = rawId.toUpperCase();

  let cert: any = null;
  let event: any = null;

  if (isValidCertificateId(certId)) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('certificates')
      .select('id, name, status, events:event_id(name, certificate_title, issuer_name, status)')
      .eq('id', certId)
      .single();

    if (data && (data.events as any)?.status === 'published') {
      cert = data;
      event = data.events;
    }
  }

  const isRevoked = cert?.status === 'revoked';

  if (!cert || !event) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#232F3E',
            color: '#FFFFFF',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: 28, color: '#FF9900', fontWeight: 'bold' }}>
            AWS Student Builder Group, LPU
          </div>
          <div style={{ fontSize: 44, fontWeight: 'bold', marginTop: 20 }}>
            Certificate Verification
          </div>
          <div style={{ fontSize: 24, color: '#AAB7B8', marginTop: 10 }}>
            Certificate not found or ID is invalid
          </div>
        </div>
      ),
      { ...size }
    );
  }

  if (isRevoked) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#FFF5F5',
            padding: 80,
            border: '16px solid #D91515',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 28, color: '#5F6B7A', fontWeight: 'bold' }}>
              {event.issuer_name}
            </span>
            <span
              style={{
                backgroundColor: '#D91515',
                color: '#FFFFFF',
                padding: '8px 24px',
                borderRadius: 8,
                fontSize: 22,
                fontWeight: 'bold',
              }}
            >
              REVOKED
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 52, fontWeight: 'bold', color: '#0F1B2A' }}>
              {cert.name}
            </div>
            <div style={{ fontSize: 32, color: '#5F6B7A', marginTop: 8 }}>
              {event.certificate_title}
            </div>
          </div>

          <div style={{ fontSize: 22, color: '#879596' }}>
            ID: {formatCertificateId(cert.id)} • This certificate has been revoked
          </div>
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          padding: 80,
          border: '16px solid #232F3E',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 26, color: '#FF9900', fontWeight: 'bold' }}>
              AWS Student Builder Group
            </span>
            <span style={{ fontSize: 20, color: '#5F6B7A' }}>
              Lovely Professional University
            </span>
          </div>
          <span
            style={{
              backgroundColor: '#F2FBF3',
              color: '#037F0C',
              border: '2px solid #037F0C',
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 20,
              fontWeight: 'bold',
            }}
          >
            VERIFIED CERTIFICATE
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 22, color: '#5F6B7A', textTransform: 'uppercase', letterSpacing: 2 }}>
            This certifies that
          </div>
          <div style={{ fontSize: 56, fontWeight: 'bold', color: '#0F1B2A', marginTop: 8 }}>
            {cert.name}
          </div>
          <div style={{ fontSize: 30, color: '#0972D3', marginTop: 12, fontWeight: 600 }}>
            {event.certificate_title}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #E9EBED', paddingTop: 24 }}>
          <div style={{ fontSize: 22, color: '#5F6B7A' }}>
            Event: <strong style={{ color: '#0F1B2A' }}>{event.name}</strong>
          </div>
          <div style={{ fontSize: 22, color: '#5F6B7A', fontFamily: 'monospace' }}>
            ID: {formatCertificateId(cert.id)}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
