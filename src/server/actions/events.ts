'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/server/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { ActionResult, success, failure } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { certificateLayoutSchema } from '@/lib/certificate/layout';
import { processTemplateImage } from '@/lib/certificate/template-processor';
import { renderCertificatePdf } from '@/lib/certificate/render-pdf';

const createEventSchema = z.object({
  name: z.string().trim().min(3, 'Event name must be at least 3 characters'),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,60}$/, 'Slug must be 3-60 lowercase alphanumeric chars or dashes'),
  certificate_title: z.string().trim().min(3, 'Certificate title must be at least 3 characters'),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Event date must be YYYY-MM-DD'),
  issuer_name: z.string().trim().min(3, 'Issuer name must be at least 3 characters'),
});

export async function createEventAction(formData: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = createEventSchema.safeParse(formData);
  if (!parsed.success) {
    return failure('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid input');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('events')
    .insert({
      ...parsed.data,
      created_by: admin.id,
      status: 'draft',
      render_rev: 1,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505' || error.message.includes('slug')) {
      return failure('CONFLICT', 'An event with this slug already exists.');
    }
    return failure('INTERNAL_ERROR', error.message);
  }

  await audit({
    actorId: admin.id,
    action: 'event.create',
    entityType: 'event',
    entityId: data.id,
    metadata: { name: parsed.data.name, slug: parsed.data.slug },
  });

  revalidatePath('/admin');
  return success({ id: data.id });
}

export async function updateEventAction(
  eventId: string,
  formData: unknown
): Promise<ActionResult<void>> {
  const admin = await requireAdmin();
  const parsed = createEventSchema.safeParse(formData);
  if (!parsed.success) {
    return failure('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid input');
  }

  const supabase = createAdminClient();

  // Check if any certificates have been issued; if so, slug cannot be changed
  const { count } = await supabase
    .from('certificates')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  const updatePayload: Record<string, any> = {
    name: parsed.data.name,
    certificate_title: parsed.data.certificate_title,
    event_date: parsed.data.event_date,
    issuer_name: parsed.data.issuer_name,
    updated_at: new Date().toISOString(),
  };

  if ((count || 0) === 0) {
    updatePayload.slug = parsed.data.slug;
  }

  const { error } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', eventId);

  if (error) {
    return failure('INTERNAL_ERROR', error.message);
  }

  await audit({
    actorId: admin.id,
    action: 'event.update',
    entityType: 'event',
    entityId: eventId,
    metadata: updatePayload,
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/events/${eventId}`);
  return success(undefined);
}

export async function togglePublishEventAction(
  eventId: string,
  newStatus: 'draft' | 'published'
): Promise<ActionResult<{ certificateCount: number }>> {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { count } = await supabase
    .from('certificates')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  const certCount = count || 0;

  const { error } = await supabase
    .from('events')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  if (error) {
    return failure('INTERNAL_ERROR', error.message);
  }

  await audit({
    actorId: admin.id,
    action: newStatus === 'published' ? 'event.publish' : 'event.unpublish',
    entityType: 'event',
    entityId: eventId,
    metadata: { status: newStatus, certificateCount: certCount },
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath('/dashboard');

  return success({ certificateCount: certCount });
}

export async function updateEventLayoutAction(
  eventId: string,
  layoutData: unknown
): Promise<ActionResult<{ newRev: number }>> {
  const admin = await requireAdmin();
  const parsed = certificateLayoutSchema.safeParse(layoutData);
  if (!parsed.success) {
    return failure('VALIDATION_ERROR', 'Invalid layout configuration format');
  }

  const supabase = createAdminClient();

  // Fetch current event to bump render_rev
  const { data: event, error: fetchErr } = await supabase
    .from('events')
    .select('render_rev')
    .eq('id', eventId)
    .single();

  if (fetchErr || !event) {
    return failure('NOT_FOUND', 'Event not found');
  }

  const newRev = (event.render_rev || 1) + 1;

  const { error: updateErr } = await supabase
    .from('events')
    .update({
      layout: parsed.data,
      render_rev: newRev,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (updateErr) {
    return failure('INTERNAL_ERROR', updateErr.message);
  }

  await audit({
    actorId: admin.id,
    action: 'event.layout_update',
    entityType: 'event',
    entityId: eventId,
    metadata: { render_rev: newRev },
  });

  revalidatePath(`/admin/events/${eventId}`);
  return success({ newRev });
}

export async function uploadEventTemplateAction(
  eventId: string,
  formData: FormData
): Promise<ActionResult<{ templateWidth: number; templateHeight: number }>> {
  const admin = await requireAdmin();
  const file = formData.get('template') as File | null;
  if (!file) {
    return failure('VALIDATION_ERROR', 'No file was provided');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let processed;
  try {
    processed = await processTemplateImage(buffer);
  } catch (err: any) {
    return failure('VALIDATION_ERROR', err?.message || 'Failed to process template image');
  }

  const supabase = createAdminClient();
  const printMasterPath = `templates/${eventId}/print-master.jpg`;
  const webVersionPath = `templates/${eventId}/web-version.jpg`;

  // Upload to Supabase Storage 'templates' bucket
  try {
    await supabase.storage.from('templates').upload(printMasterPath, processed.printMaster, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    await supabase.storage.from('templates').upload(webVersionPath, processed.webVersion, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  } catch (err: any) {
    console.warn('Storage bucket upload notice:', err?.message);
  }

  // Update event record
  const { data: currentEvent } = await supabase
    .from('events')
    .select('render_rev')
    .eq('id', eventId)
    .single();

  const newRev = (currentEvent?.render_rev || 1) + 1;

  const { error: updateError } = await supabase
    .from('events')
    .update({
      template_path: printMasterPath,
      template_web_path: webVersionPath,
      template_width: processed.width,
      template_height: processed.height,
      render_rev: newRev,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (updateError) {
    return failure('INTERNAL_ERROR', updateError.message);
  }

  await audit({
    actorId: admin.id,
    action: 'event.template_upload',
    entityType: 'event',
    entityId: eventId,
    metadata: {
      width: processed.width,
      height: processed.height,
      render_rev: newRev,
    },
  });

  revalidatePath(`/admin/events/${eventId}`);
  return success({
    templateWidth: processed.width,
    templateHeight: processed.height,
  });
}

export async function previewEventCertificateAction(
  eventId: string,
  sampleName: string,
  layoutData?: unknown
): Promise<ActionResult<{ pdfBase64: string }>> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    return failure('NOT_FOUND', 'Event not found');
  }

  let templateBuffer: Buffer;
  if (event.template_path) {
    const { data: fileData } = await supabase.storage
      .from('templates')
      .download(event.template_path);

    if (fileData) {
      templateBuffer = Buffer.from(await fileData.arrayBuffer());
    } else {
      // Fallback empty white template if storage not configured yet
      const sharp = (await import('sharp')).default;
      templateBuffer = await sharp({
        create: {
          width: event.template_width || 3508,
          height: event.template_height || 2480,
          channels: 3,
          background: { r: 245, g: 247, b: 250 },
        },
      })
        .jpeg()
        .toBuffer();
    }
  } else {
    // Fallback template
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

  const layout = layoutData ? (layoutData as any) : event.layout;

  const pdfBytes = await renderCertificatePdf({
    certificateId: 'SAMPLE123456',
    recipientName: sampleName,
    eventTitle: event.certificate_title || event.name,
    issuerName: event.issuer_name,
    templateBuffer,
    templateWidth: event.template_width || 3508,
    templateHeight: event.template_height || 2480,
    layout,
  });

  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
  return success({ pdfBase64 });
}
