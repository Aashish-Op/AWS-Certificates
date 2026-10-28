'use server';

import { requireAdmin } from '@/server/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { ActionResult, success, failure } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { parseSpreadsheet } from '@/lib/import/parse';
import { validateImportBatch, ColumnMapping } from '@/lib/import/validate';
import { createCertificateId } from '@/lib/certificate/ids';
import { RateLimits } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';

export async function stageImportAction(
  eventId: string,
  formData: FormData
): Promise<ActionResult<{ batchId: string; headers: string[]; previewRows: Record<string, string>[] }>> {
  const admin = await requireAdmin();

  const rl = await RateLimits.importAction(admin.id);
  if (!rl.success) {
    return failure('RATE_LIMITED', 'Too many import actions. Please try again later.');
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return failure('VALIDATION_ERROR', 'No file was provided');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsed;
  try {
    parsed = await parseSpreadsheet(buffer, file.name);
  } catch (err: any) {
    return failure('VALIDATION_ERROR', err?.message || 'Failed to parse spreadsheet');
  }

  if (parsed.rows.length === 0) {
    return failure('VALIDATION_ERROR', 'The spreadsheet does not contain any data rows.');
  }

  const supabase = createAdminClient();
  const { data: batch, error } = await supabase
    .from('import_batches')
    .insert({
      event_id: eventId,
      created_by: admin.id,
      filename: file.name,
      status: 'staged',
      headers: parsed.headers,
      raw_rows: parsed.rows,
    })
    .select('id')
    .single();

  if (error || !batch) {
    return failure('INTERNAL_ERROR', error?.message || 'Failed to stage import batch');
  }

  await audit({
    actorId: admin.id,
    action: 'import.stage',
    entityType: 'import_batch',
    entityId: batch.id,
    metadata: { filename: file.name, rowCount: parsed.rows.length },
  });

  return success({
    batchId: batch.id,
    headers: parsed.headers,
    previewRows: parsed.rows.slice(0, 20),
  });
}

export async function validateBatchAction(
  batchId: string,
  mapping: ColumnMapping
): Promise<ActionResult<any>> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: batch, error: batchErr } = await supabase
    .from('import_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (batchErr || !batch) {
    return failure('NOT_FOUND', 'Import batch not found');
  }

  // Load existing certificates for this event
  const { data: existingCerts } = await supabase
    .from('certificates')
    .select('reg_no, id')
    .eq('event_id', batch.event_id);

  const existingMap = new Map<string, string>();
  (existingCerts || []).forEach((c) => {
    if (c.reg_no) existingMap.set(c.reg_no, c.id);
  });

  const report = validateImportBatch(batch.raw_rows as Record<string, string>[], mapping, existingMap);

  // Update batch mapping & summary
  await supabase
    .from('import_batches')
    .update({
      mapping,
      summary: report.summary,
    })
    .eq('id', batchId);

  return success(report);
}

export interface CommitOptions {
  batchId: string;
  updateExistingNames?: boolean;
  rowModifications?: Record<number, { name?: string; excluded?: boolean }>;
}

export async function commitImportBatchAction(
  options: CommitOptions
): Promise<ActionResult<{
  issuedCount: number;
  updatedCount: number;
  skippedCount: number;
  records: Array<{ regNo: string; email: string; name: string; certificateId: string; verifyUrl: string }>;
}>> {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { batchId, updateExistingNames = false, rowModifications = {} } = options;

  const { data: batch, error: fetchErr } = await supabase
    .from('import_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (fetchErr || !batch) {
    return failure('NOT_FOUND', 'Import batch not found');
  }

  if (batch.status === 'committed') {
    return failure('CONFLICT', 'This batch has already been committed.');
  }

  const mapping = batch.mapping as ColumnMapping | null;
  if (!mapping) {
    return failure('VALIDATION_ERROR', 'Column mapping has not been set for this batch.');
  }

  // Fetch existing certs
  const { data: existingCerts } = await supabase
    .from('certificates')
    .select('id, reg_no, name, render_version')
    .eq('event_id', batch.event_id);

  const existingMap = new Map<string, { id: string; name: string; render_version: number }>();
  (existingCerts || []).forEach((c) => {
    if (c.reg_no) existingMap.set(c.reg_no, c);
  });

  const rawRows = batch.raw_rows as Record<string, string>[];
  const report = validateImportBatch(rawRows, mapping, new Map(Array.from(existingMap.entries()).map(([k, v]) => [k, v.id])));

  const recordsToInsert: Array<{
    id: string;
    event_id: string;
    reg_no: string;
    email: string | null;
    name: string;
    status: 'valid';
    render_version: number;
    issued_by: string;
  }> = [];

  const recordsToUpdate: Array<{
    id: string;
    name: string;
    render_version: number;
  }> = [];

  const exportRecords: Array<{ regNo: string; email: string; name: string; certificateId: string; verifyUrl: string }> = [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://certificate.awslpu.in';

  let issuedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of report.rows) {
    const mod = rowModifications[row.rowIndex];
    if (mod?.excluded || row.excluded) {
      skippedCount++;
      continue;
    }

    if (row.status === 'error') {
      skippedCount++;
      continue;
    }

    const finalName = mod?.name ? mod.name.trim() : row.normalizedName;
    const existing = existingMap.get(row.normalizedRegNo);

    if (existing) {
      if (updateExistingNames && existing.name !== finalName) {
        recordsToUpdate.push({
          id: existing.id,
          name: finalName,
          render_version: (existing.render_version || 1) + 1,
        });
        updatedCount++;
        exportRecords.push({
          regNo: row.normalizedRegNo,
          email: row.normalizedEmail || '',
          name: finalName,
          certificateId: existing.id,
          verifyUrl: `${siteUrl}/verify/${existing.id}`,
        });
      } else {
        skippedCount++;
        exportRecords.push({
          regNo: row.normalizedRegNo,
          email: row.normalizedEmail || '',
          name: existing.name,
          certificateId: existing.id,
          verifyUrl: `${siteUrl}/verify/${existing.id}`,
        });
      }
    } else {
      // New certificate to issue with collision retry
      const certId = createCertificateId();
      recordsToInsert.push({
        id: certId,
        event_id: batch.event_id,
        reg_no: row.normalizedRegNo,
        email: row.normalizedEmail || null,
        name: finalName,
        status: 'valid',
        render_version: 1,
        issued_by: admin.id,
      });
      issuedCount++;
      exportRecords.push({
        regNo: row.normalizedRegNo,
        email: row.normalizedEmail || '',
        name: finalName,
        certificateId: certId,
        verifyUrl: `${siteUrl}/verify/${certId}`,
      });
    }
  }

  // Insert in batches of 200
  if (recordsToInsert.length > 0) {
    const CHUNK_SIZE = 200;
    for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
      const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
      const { error: insertErr } = await supabase
        .from('certificates')
        .upsert(chunk, { onConflict: 'event_id,reg_no', ignoreDuplicates: true });

      if (insertErr) {
        return failure('INTERNAL_ERROR', `Failed to insert certificates: ${insertErr.message}`);
      }
    }
  }

  // Update modified names
  for (const upd of recordsToUpdate) {
    await supabase
      .from('certificates')
      .update({ name: upd.name, render_version: upd.render_version })
      .eq('id', upd.id);
  }

  // Mark batch committed
  await supabase
    .from('import_batches')
    .update({
      status: 'committed',
      committed_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  await audit({
    actorId: admin.id,
    action: 'import.commit',
    entityType: 'import_batch',
    entityId: batchId,
    metadata: {
      eventId: batch.event_id,
      issuedCount,
      updatedCount,
      skippedCount,
      totalExported: exportRecords.length,
    },
  });

  revalidatePath(`/admin/events/${batch.event_id}`);
  revalidatePath('/dashboard');

  return success({
    issuedCount,
    updatedCount,
    skippedCount,
    records: exportRecords,
  });
}
