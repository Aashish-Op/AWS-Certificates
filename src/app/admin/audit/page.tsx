import { requireAdmin } from '@/server/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { Shield, Clock, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Audit Log - Admin Console',
};

export default async function AdminAuditPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: logs } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const logList = logs || [];

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return `${d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B2A]">Audit Log</h1>
        <p className="mt-1 text-sm text-[#5F6B7A]">
          Immutable chronological record of administrative actions, imports, and certificate modifications.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E9EBED] bg-white shadow-none">
        {logList.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#5F6B7A]">
            <Shield className="mx-auto h-8 w-8 text-[#5F6B7A]/50 mb-2" />
            No audit log entries recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E9EBED] bg-[#F9F9FB] font-semibold uppercase text-[#5F6B7A]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EBED]">
                {logList.map((log: any) => (
                  <tr key={log.id} className="hover:bg-[#F9F9FB]">
                    <td className="px-4 py-3 whitespace-nowrap text-[#5F6B7A] font-mono">
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0F1B2A]">
                      <span className="rounded bg-[#E9EBED] px-2 py-0.5 font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-[#5F6B7A]">
                      {log.entity_type}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#5F6B7A]">
                      {log.entity_id}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-[#5F6B7A] font-mono text-[11px]">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
