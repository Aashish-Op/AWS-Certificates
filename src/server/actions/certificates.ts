'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/server/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { ActionResult, success, failure } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { normalizeName, validateName } from '@/lib/import/normalize';

const editNameSchema = z.object({
  certificateId: z.string().min(12).max(12),
  newName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
});

const revokeSchema = z.object({
  certificateId: z.string().min(12).max(12),
  reason: z.string().trim().min(3, 'Revocation reason must be at least 3 characters'),
});

export async function editCertificateNameAction(
  formData: unknown
): Promise<ActionResult<{ newRenderVersion: number }>> {
  const admin = await requireAdmin();
  const parsed = editNameSchema.safeParse(formData);
  if (!parsed.success) {
    return failure('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid input');
  }

  const { certificateId, newName } = parsed.data;
  const normalized = normalizeName(newName);
  const nameVal = validateName(normalized);

  if (nameVal.errors.length > 0) {
    return failure('VALIDATION_ERROR', nameVal.errors.join(' '));
  }

  const supabase = createAdminClient();
  const { data: cert, error: fetchErr } = await supabase
    .from('certificates')
    .select('id, name, render_version, event_id')
    .eq('id', certificateId)
    .single();

  if (fetchErr || !cert) {
    return failure('NOT_FOUND', 'Certificate not found');
  }

  const oldName = cert.name;
  const newRenderVersion = (cert.render_version || 1) + 1;

  const { error: updateErr } = await supabase
    .from('certificates')
    .update({
      name: normalized,
      render_version: newRenderVersion,
    })
    .eq('id', certificateId);

  if (updateErr) {
    return failure('INTERNAL_ERROR', updateErr.message);
  }

  await audit({
    actorId: admin.id,
    action: 'certificate.edit_name',
    entityType: 'certificate',
    entityId: certificateId,
    metadata: {
      oldName,
      newName: normalized,
      newRenderVersion,
    },
  });

  revalidatePath(`/verify/${certificateId}`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/admin/events/${cert.event_id}`);

  return success({ newRenderVersion });
}

export async function revokeCertificateAction(
  formData: unknown
): Promise<ActionResult<void>> {
  const admin = await requireAdmin();
  const parsed = revokeSchema.safeParse(formData);
  if (!parsed.success) {
    return failure('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid input');
  }

  const { certificateId, reason } = parsed.data;
  const supabase = createAdminClient();

  const { data: cert, error: fetchErr } = await supabase
    .from('certificates')
    .select('id, event_id, status')
    .eq('id', certificateId)
    .single();

  if (fetchErr || !cert) {
    return failure('NOT_FOUND', 'Certificate not found');
  }

  const { error: updateErr } = await supabase
    .from('certificates')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    })
    .eq('id', certificateId);

  if (updateErr) {
    return failure('INTERNAL_ERROR', updateErr.message);
  }

  await audit({
    actorId: admin.id,
    action: 'certificate.revoke',
    entityType: 'certificate',
    entityId: certificateId,
    metadata: { reason },
  });

  revalidatePath(`/verify/${certificateId}`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/admin/events/${cert.event_id}`);

  return success(undefined);
}

export async function unrevokeCertificateAction(
  certificateId: string
): Promise<ActionResult<void>> {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: cert, error: fetchErr } = await supabase
    .from('certificates')
    .select('id, event_id, status')
    .eq('id', certificateId)
    .single();

  if (fetchErr || !cert) {
    return failure('NOT_FOUND', 'Certificate not found');
  }

  const { error: updateErr } = await supabase
    .from('certificates')
    .update({
      status: 'valid',
      revoked_at: null,
      revoked_reason: null,
    })
    .eq('id', certificateId);

  if (updateErr) {
    return failure('INTERNAL_ERROR', updateErr.message);
  }

  await audit({
    actorId: admin.id,
    action: 'certificate.unrevoke',
    entityType: 'certificate',
    entityId: certificateId,
  });

  revalidatePath(`/verify/${certificateId}`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/admin/events/${cert.event_id}`);

  return success(undefined);
}
