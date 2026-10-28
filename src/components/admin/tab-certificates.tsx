'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Edit2, AlertTriangle, CheckCircle2, AlertCircle, ExternalLink, Download } from 'lucide-react';
import { editCertificateNameAction, revokeCertificateAction, unrevokeCertificateAction } from '@/server/actions/certificates';
import { formatCertificateId } from '@/config/site';

interface TabCertificatesProps {
  eventId: string;
  initialCertificates: any[];
}

export function TabCertificates({ eventId, initialCertificates }: TabCertificatesProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'revoked'>('all');

  // Modals state
  const [editingCert, setEditingCert] = useState<any | null>(null);
  const [newName, setNewName] = useState('');

  const [revokingCert, setRevokingCert] = useState<any | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCerts = initialCertificates.filter((cert) => {
    const matchesStatus =
      statusFilter === 'all' || cert.status === statusFilter;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesStatus;

    const matchesSearch =
      cert.name.toLowerCase().includes(query) ||
      (cert.reg_no && cert.reg_no.toLowerCase().includes(query)) ||
      (cert.email && cert.email.toLowerCase().includes(query)) ||
      cert.id.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const handleEditNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCert) return;

    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await editCertificateNameAction({
        certificateId: editingCert.id,
        newName,
      });

      if (res.ok) {
        setStatusMessage(`Recipient name updated to "${newName}". Render version incremented.`);
        setEditingCert(null);
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  const handleRevokeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingCert) return;

    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await revokeCertificateAction({
        certificateId: revokingCert.id,
        reason: revokeReason,
      });

      if (res.ok) {
        setStatusMessage(`Certificate ${formatCertificateId(revokingCert.id)} has been revoked.`);
        setRevokingCert(null);
        setRevokeReason('');
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  const handleUnrevoke = (certId: string) => {
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await unrevokeCertificateAction(certId);
      if (res.ok) {
        setStatusMessage(`Certificate ${formatCertificateId(certId)} restored to valid status.`);
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          role="status"
          className="flex items-start gap-2 rounded border border-[#037F0C]/30 bg-[#F2FBF3] p-3 text-sm text-[#037F0C]"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded border border-[#D91515]/30 bg-[#FFF5F5] p-3 text-sm text-[#D91515]"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 rounded-lg border border-[#E9EBED] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5F6B7A]" />
          <input
            type="text"
            placeholder="Search by name, reg number, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded border border-[#E9EBED] bg-[#F9F9FB] pl-9 pr-3 py-1.5 text-sm text-[#0F1B2A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#5F6B7A]">Status:</span>
          {(['all', 'valid', 'revoked'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded px-3 py-1 text-xs font-semibold capitalize ${
                statusFilter === st
                  ? 'bg-[#232F3E] text-white'
                  : 'bg-[#F9F9FB] border border-[#E9EBED] text-[#5F6B7A] hover:bg-[#E9EBED]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Certificates Table */}
      <div className="overflow-hidden rounded-lg border border-[#E9EBED] bg-white shadow-none">
        {filteredCerts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#5F6B7A]">
            No certificates found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E9EBED] bg-[#F9F9FB] text-xs font-semibold uppercase text-[#5F6B7A]">
                <tr>
                  <th className="px-4 py-3">Certificate ID</th>
                  <th className="px-4 py-3">Recipient Name</th>
                  <th className="px-4 py-3">Reg. No.</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rev</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EBED]">
                {filteredCerts.map((cert) => {
                  const isRevoked = cert.status === 'revoked';

                  return (
                    <tr key={cert.id} className="hover:bg-[#F9F9FB]">
                      <td className="px-4 py-3 font-mono font-bold text-xs text-[#0F1B2A] whitespace-nowrap">
                        {formatCertificateId(cert.id)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#0F1B2A]">
                        {cert.name}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-xs text-[#0972D3]">
                        {cert.reg_no || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#5F6B7A]">
                        {cert.email || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isRevoked ? (
                          <span className="rounded bg-[#FFF5F5] px-2 py-0.5 text-xs font-semibold text-[#D91515] border border-[#D91515]/20">
                            Revoked
                          </span>
                        ) : (
                          <span className="rounded bg-[#F2FBF3] px-2 py-0.5 text-xs font-semibold text-[#037F0C] border border-[#037F0C]/20">
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5F6B7A]">
                        v{cert.render_version || 1}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCert(cert);
                            setNewName(cert.name);
                          }}
                          className="inline-flex items-center gap-1 rounded border border-[#E9EBED] bg-white px-2 py-1 text-xs font-medium text-[#0F1B2A] hover:bg-[#F9F9FB]"
                          title="Edit recipient name"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>

                        {isRevoked ? (
                          <button
                            type="button"
                            onClick={() => handleUnrevoke(cert.id)}
                            className="inline-flex items-center rounded border border-[#037F0C]/30 bg-[#F2FBF3] px-2 py-1 text-xs font-medium text-[#037F0C] hover:bg-[#E3F8E5]"
                          >
                            Unrevoke
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRevokingCert(cert);
                              setRevokeReason('');
                            }}
                            className="inline-flex items-center rounded border border-[#D91515]/30 bg-[#FFF5F5] px-2 py-1 text-xs font-medium text-[#D91515] hover:bg-[#FFEBEB]"
                          >
                            Revoke
                          </button>
                        )}

                        <Link
                          href={`/verify/${cert.id}`}
                          target="_blank"
                          className="inline-flex items-center rounded border border-[#E9EBED] bg-white px-2 py-1 text-xs font-medium text-[#0972D3] hover:bg-[#F9F9FB]"
                          title="View public verification"
                        >
                          <ExternalLink className="h-3 w-3" />
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

      {/* Edit Name Modal */}
      {editingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#E9EBED] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#0F1B2A]">Edit Recipient Name</h3>
            <p className="mt-1 text-xs text-[#5F6B7A]">
              Updates the name printed on the certificate. Certificate ID remains{' '}
              <strong className="font-mono text-[#0F1B2A]">{formatCertificateId(editingCert.id)}</strong>.
            </p>

            <form onSubmit={handleEditNameSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5F6B7A]">Current Name</label>
                <div className="text-sm font-semibold text-[#0F1B2A] mt-0.5">{editingCert.name}</div>
              </div>

              <div>
                <label htmlFor="newName" className="block text-xs font-medium text-[#5F6B7A]">
                  New Full Name
                </label>
                <input
                  id="newName"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCert(null)}
                  className="rounded border border-[#E9EBED] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F1B2A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-[#FF9900] px-4 py-1.5 text-xs font-semibold text-[#0F1B2A] hover:bg-[#EC7211]"
                >
                  {isPending ? 'Saving...' : 'Update Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#E9EBED] bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-[#D91515]">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-bold">Revoke Certificate</h3>
            </div>
            <p className="mt-2 text-xs text-[#5F6B7A]">
              Revoking certificate <strong className="font-mono text-[#0F1B2A]">{formatCertificateId(revokingCert.id)}</strong> for <strong>{revokingCert.name}</strong> will disable downloading and display a revoked banner on verification.
            </p>

            <form onSubmit={handleRevokeSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="revokeReason" className="block text-xs font-medium text-[#5F6B7A]">
                  Reason for Revocation (internal audit record)
                </label>
                <textarea
                  id="revokeReason"
                  required
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Issued by mistake / student did not attend event"
                  className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokingCert(null)}
                  className="rounded border border-[#E9EBED] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F1B2A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-[#D91515] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#B51111]"
                >
                  {isPending ? 'Revoking...' : 'Confirm Revoke'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
