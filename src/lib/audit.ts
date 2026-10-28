import 'server-only';

/**
 * Centralized audit logging helper.
 * Every admin mutation calls this to create an audit trail.
 *
 * Usage:
 *   await audit({
 *     actorId: userId,
 *     action: 'certificate.revoke',
 *     entityType: 'certificate',
 *     entityId: certId,
 *     metadata: { reason },
 *   });
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

interface AuditEntry {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function audit(entry: AuditEntry): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('audit_log').insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    metadata: entry.metadata ?? {},
  });

  if (error) {
    // Audit failures must not crash the main operation but must be logged
    logger.error('Failed to write audit log', {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      dbError: error.message,
    });
  }
}
