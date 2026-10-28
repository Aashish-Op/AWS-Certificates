import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { RateLimits } from '@/lib/rate-limit';
import { renderCertificatePdf } from '@/lib/certificate/render-pdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const certId = rawId.replace(/[-\s]/g, '').toUpperCase();

  // 1. Require a session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Rate limit: 30 downloads / min per user
  const rl = await RateLimits.download(user.id);
  if (!rl.success) {
    return new NextResponse('Rate limit exceeded. Please wait a minute before downloading again.', {
      status: 429,
      headers: {
        'Retry-After': '60',
      },
    });
  }

  // 2. Load certificate and related event with service-role client
  const adminClient = createAdminClient();

  const { data: cert, error: certErr } = await adminClient
    .from('certificates')
    .select(`
      id,
      reg_no,
      email,
      name,
      status,
      render_version,
      event_id,
      events:event_id (
        id,
        slug,
        name,
        certificate_title,
        issuer_name,
        template_path,
        template_width,
        template_height,
        layout,
        render_rev,
        status
      )
    `)
    .eq('id', certId)
    .single();

  if (certErr || !cert || !cert.events) {
    return new NextResponse('Not found', { status: 404 });
  }

  const event: any = cert.events;

  // 3. Authorize: caller is admin OR profile.reg_no matches certificate.reg_no
  const { data: adminRow } = await adminClient
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  const isUserAdmin = !!adminRow;

  if (!isUserAdmin) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('reg_no, email')
      .eq('user_id', user.id)
      .single();

    const matchesRegNo = profile?.reg_no && cert.reg_no && profile.reg_no === cert.reg_no;
    const matchesEmail = profile?.email && cert.email && profile.email === cert.email;

    if (!profile || (!matchesRegNo && !matchesEmail)) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Non-admins additionally need valid status and published event
    if (cert.status !== 'valid' || event.status !== 'published') {
      return new NextResponse('Not found', { status: 404 });
    }
  }

  // 4. Cache key in `certificate-pdfs` bucket
  const cachePath = `${cert.event_id}/${cert.id}-r${event.render_rev || 1}-v${cert.render_version || 1}.pdf`;
  const downloadFileName = `AWS-SBG-LPU_${event.slug || 'event'}_${cert.id}.pdf`;

  // Check if already in storage bucket
  const { data: existingPdf } = await adminClient.storage
    .from('certificate-pdfs')
    .download(cachePath);

  if (!existingPdf) {
    // Generate lazily
    let templateBuffer: Buffer;
    if (event.template_path) {
      const { data: templateFile } = await adminClient.storage
        .from('templates')
        .download(event.template_path);

      if (templateFile) {
        templateBuffer = Buffer.from(await templateFile.arrayBuffer());
      } else {
        const sharp = (await import('sharp')).default;
        templateBuffer = await sharp({
          create: {
            width: event.template_width || 3508,
            height: event.template_height || 2480,
            channels: 3,
            background: { r: 255, g: 255, b: 255 },
          },
        })
          .jpeg()
          .toBuffer();
      }
    } else {
      const sharp = (await import('sharp')).default;
      templateBuffer = await sharp({
        create: {
          width: 3508,
          height: 2480,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();
    }

    const pdfBytes = await renderCertificatePdf({
      certificateId: cert.id,
      recipientName: cert.name,
      eventTitle: event.certificate_title || event.name,
      issuerName: event.issuer_name,
      templateBuffer,
      templateWidth: event.template_width || 3508,
      templateHeight: event.template_height || 2480,
      layout: event.layout,
    });

    // Upload to storage bucket
    try {
      await adminClient.storage
        .from('certificate-pdfs')
        .upload(cachePath, Buffer.from(pdfBytes), {
          contentType: 'application/pdf',
          upsert: true,
        });
    } catch (uploadErr) {
      console.warn('Failed to cache PDF in storage bucket:', uploadErr);
      // Fallback: return direct PDF bytes if storage bucket not configured locally
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${downloadFileName}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }
  }

  // 5. Create signed URL valid for 60 seconds
  const { data: signedData, error: signedErr } = await adminClient.storage
    .from('certificate-pdfs')
    .createSignedUrl(cachePath, 60, {
      download: downloadFileName,
    });

  if (signedErr || !signedData?.signedUrl) {
    // If signed URL generation fails (e.g. local mocked storage), download and send
    const { data: pdfBlob } = await adminClient.storage
      .from('certificate-pdfs')
      .download(cachePath);

    if (pdfBlob) {
      const buf = Buffer.from(await pdfBlob.arrayBuffer());
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${downloadFileName}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    return new NextResponse('Internal error', { status: 500 });
  }

  // Redirect to signed URL
  return NextResponse.redirect(signedData.signedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}
