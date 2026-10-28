'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle2, AlertCircle, AlertTriangle, Download, ArrowRight, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { stageImportAction, validateBatchAction, commitImportBatchAction } from '@/server/actions/import';

interface TabImportProps {
  eventId: string;
}

export function TabImport({ eventId }: TabImportProps) {
  const router = useRouter();

  // Wizard steps: 'upload' -> 'mapping' -> 'review' -> 'completed'
  const [step, setStep] = useState<'upload' | 'mapping' | 'review' | 'completed'>('upload');

  // Staged data
  const [batchId, setBatchId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);

  // Mapping
  const [emailCol, setEmailCol] = useState('');
  const [nameCol, setNameCol] = useState('');

  // Validation Report
  const [report, setReport] = useState<any | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [rowEdits, setRowEdits] = useState<Record<number, { name?: string; excluded?: boolean }>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'warning' | 'error' | 'already_issued'>('all');

  // Confirmation Modal
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitResult, setCommitResult] = useState<any | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Step 1: Upload file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setErrorMessage(null);

    startTransition(async () => {
      const res = await stageImportAction(eventId, formData);
      if (res.ok) {
        setBatchId(res.data.batchId);
        setHeaders(res.data.headers);
        setPreviewRows(res.data.previewRows);

        // Pre-select heuristic mappings per spec §7.7
        const detectedEmail = res.data.headers.find((h) => {
          const l = h.toLowerCase();
          return l.includes('email') || l.includes('mail');
        }) || res.data.headers[0] || '';

        const detectedName = res.data.headers.find((h) => {
          const l = h.toLowerCase();
          return l.includes('name') || l.includes('student') || l.includes('participant');
        }) || res.data.headers[1] || '';

        setEmailCol(detectedEmail);
        setNameCol(detectedName);

        setStep('mapping');
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  // Step 2: Validate column mapping
  const handleValidateMapping = () => {
    if (!batchId || !emailCol || !nameCol) return;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await validateBatchAction(batchId, {
        emailColumn: emailCol,
        nameColumn: nameCol,
      });

      if (res.ok) {
        setReport(res.data);
        setStep('review');
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  // Step 3: Commit
  const handleCommit = () => {
    if (!batchId) return;
    setShowCommitModal(false);
    setErrorMessage(null);

    startTransition(async () => {
      const res = await commitImportBatchAction({
        batchId,
        updateExistingNames: updateExisting,
        rowModifications: rowEdits,
      });

      if (res.ok) {
        setCommitResult(res.data);
        setStep('completed');
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  // Export CSV helper
  const handleDownloadExportCsv = () => {
    if (!commitResult?.records) return;

    const header = 'Email Address,Recipient Name,Certificate ID,Verification URL\n';
    const lines = commitResult.records.map((r: any) =>
      `"${r.email}","${r.name}","${r.certificateId}","${r.verifyUrl}"`
    );
    const blob = new Blob([header + lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AWS-SBG-LPU-Issued-Certificates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded border border-[#D91515]/30 bg-[#FFF5F5] p-3 text-sm text-[#D91515]"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div className="rounded-lg border border-[#E9EBED] bg-white p-6 sm:p-8 text-center space-y-4">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-[#5F6B7A]" />
          <div>
            <h2 className="text-lg font-bold text-[#0F1B2A]">Upload Attendee List</h2>
            <p className="mx-auto mt-1 max-w-md text-xs text-[#5F6B7A]">
              Upload a .csv or .xlsx file containing student names and registration numbers (max 5 MB, 5,000 rows).
            </p>
          </div>

          <div className="pt-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-[#FF9900] px-5 py-2.5 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211]">
              <Upload className="h-4 w-4" />
              <span>{isPending ? 'Processing spreadsheet...' : 'Choose Spreadsheet File'}</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isPending}
              />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: Column Mapping */}
      {step === 'mapping' && (
        <div className="rounded-lg border border-[#E9EBED] bg-white p-6 space-y-6">
          <div className="border-b border-[#E9EBED] pb-3">
            <h2 className="text-base font-bold text-[#0F1B2A]">Confirm Column Mapping</h2>
            <p className="text-xs text-[#5F6B7A]">
              Verify which columns correspond to the Email Address and Recipient Name.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">
                Email Address Column
              </label>
              <select
                value={emailCol}
                onChange={(e) => setEmailCol(e.target.value)}
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">
                Full Name Column
              </label>
              <select
                value={nameCol}
                onChange={(e) => setNameCol(e.target.value)}
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Raw preview */}
          <div>
            <h3 className="text-xs font-bold text-[#5F6B7A] uppercase mb-2">
              Sample Data (First 5 Rows)
            </h3>
            <div className="overflow-x-auto rounded border border-[#E9EBED]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9FB] text-[#5F6B7A]">
                  <tr>
                    {headers.slice(0, 5).map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EBED]">
                  {previewRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {headers.slice(0, 5).map((h) => (
                        <td key={h} className="px-3 py-1.5 text-[#0F1B2A]">
                          {row[h] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="rounded border border-[#E9EBED] bg-white px-4 py-2 text-xs font-semibold text-[#0F1B2A]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleValidateMapping}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded bg-[#FF9900] px-4 py-2 text-xs font-semibold text-[#0F1B2A] hover:bg-[#EC7211]"
            >
              <span>{isPending ? 'Validating...' : 'Validate and Review'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Validation Report */}
      {step === 'review' && report && (
        <div className="space-y-6">
          {/* Summary counts cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <div className="rounded border border-[#E9EBED] bg-white p-3 text-center">
              <span className="block text-xs text-[#5F6B7A]">Total</span>
              <span className="text-lg font-bold text-[#0F1B2A]">{report.summary.total}</span>
            </div>
            <div className="rounded border border-[#037F0C]/20 bg-[#F2FBF3] p-3 text-center">
              <span className="block text-xs text-[#037F0C]">Valid</span>
              <span className="text-lg font-bold text-[#037F0C]">{report.summary.valid}</span>
            </div>
            <div className="rounded border border-[#8D6605]/20 bg-[#FFFDF0] p-3 text-center">
              <span className="block text-xs text-[#8D6605]">Warnings</span>
              <span className="text-lg font-bold text-[#8D6605]">{report.summary.warnings}</span>
            </div>
            <div className="rounded border border-[#D91515]/20 bg-[#FFF5F5] p-3 text-center">
              <span className="block text-xs text-[#D91515]">Errors</span>
              <span className="text-lg font-bold text-[#D91515]">{report.summary.errors}</span>
            </div>
            <div className="rounded border border-[#E9EBED] bg-white p-3 text-center">
              <span className="block text-xs text-[#5F6B7A]">Already Issued</span>
              <span className="text-lg font-bold text-[#0F1B2A]">{report.summary.alreadyIssued}</span>
            </div>
            <div className="rounded border border-[#0972D3]/20 bg-[#F0F7FD] p-3 text-center">
              <span className="block text-xs text-[#0972D3]">To Issue</span>
              <span className="text-lg font-bold text-[#0972D3]">{report.summary.newToIssue}</span>
            </div>
          </div>

          {/* Options & Filters */}
          <div className="flex flex-col gap-4 rounded-lg border border-[#E9EBED] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#0F1B2A] cursor-pointer">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="rounded border-[#E9EBED]"
              />
              <span>Update names for already-issued rows (increments render version)</span>
            </label>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#5F6B7A] mr-1">Filter:</span>
              {(['all', 'valid', 'warning', 'error', 'already_issued'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold capitalize ${
                    filterStatus === st
                      ? 'bg-[#232F3E] text-white'
                      : 'bg-[#F9F9FB] border border-[#E9EBED] text-[#5F6B7A]'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Review Table */}
          <div className="overflow-hidden rounded-lg border border-[#E9EBED] bg-white">
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-[#E9EBED] bg-[#F9F9FB] font-semibold text-[#5F6B7A]">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Name (Editable)</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Validation Notes</th>
                    <th className="px-3 py-2 text-right">Exclude</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EBED]">
                  {report.rows
                    .filter((r: any) => filterStatus === 'all' || r.status === filterStatus)
                    .map((row: any) => {
                      const mod = rowEdits[row.rowIndex];
                      const isExcluded = mod?.excluded ?? row.excluded;
                      const currentName = mod?.name ?? row.normalizedName;

                      return (
                        <tr
                          key={row.rowIndex}
                          className={isExcluded ? 'opacity-40 bg-[#F9F9FB]' : 'hover:bg-[#F9F9FB]'}
                        >
                          <td className="px-3 py-2 text-[#5F6B7A]">{row.rowIndex + 1}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-[#0F1B2A]">
                            {row.normalizedEmail}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={currentName}
                              disabled={isExcluded}
                              onChange={(e) =>
                                setRowEdits({
                                  ...rowEdits,
                                  [row.rowIndex]: {
                                    ...rowEdits[row.rowIndex],
                                    name: e.target.value,
                                  },
                                })
                              }
                              className="rounded border border-[#E9EBED] bg-white px-2 py-1 text-xs text-[#0F1B2A] focus:border-[#0972D3]"
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.status === 'valid' && (
                              <span className="text-[#037F0C] font-semibold">Valid</span>
                            )}
                            {row.status === 'warning' && (
                              <span className="text-[#8D6605] font-semibold">Warning</span>
                            )}
                            {row.status === 'error' && (
                              <span className="text-[#D91515] font-semibold">Error</span>
                            )}
                            {row.status === 'already_issued' && (
                              <span className="text-[#5F6B7A] font-semibold">Already Issued</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {row.errors.length > 0 && (
                              <div className="text-[#D91515]">{row.errors.join('; ')}</div>
                            )}
                            {row.warnings.length > 0 && (
                              <div className="text-[#8D6605]">{row.warnings.join('; ')}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="checkbox"
                              checked={isExcluded}
                              onChange={(e) =>
                                setRowEdits({
                                  ...rowEdits,
                                  [row.rowIndex]: {
                                    ...rowEdits[row.rowIndex],
                                    excluded: e.target.checked,
                                  },
                                })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep('mapping')}
              className="rounded border border-[#E9EBED] bg-white px-4 py-2 text-xs font-semibold text-[#0F1B2A]"
            >
              Back to Mapping
            </button>

            <button
              type="button"
              onClick={() => setShowCommitModal(true)}
              disabled={isPending || report.summary.newToIssue === 0}
              className="inline-flex items-center gap-2 rounded bg-[#FF9900] px-5 py-2.5 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211] disabled:opacity-60"
            >
              <span>Commit & Issue {report.summary.newToIssue} Certificates</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showCommitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#E9EBED] bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[#0F1B2A]">Confirm Issuance</h3>
            <p className="text-sm text-[#5F6B7A]">
              You are about to issue <strong>{report?.summary?.newToIssue}</strong> new certificates for this event.
            </p>
            <ul className="text-xs text-[#5F6B7A] space-y-1 list-disc pl-5">
              <li>Each attendee will receive a unique, collision-resistant Certificate ID.</li>
              <li>Commit operation is idempotent and runs safely in a single batch.</li>
              <li>Issued certificates will become visible to students when the event status is Published.</li>
            </ul>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCommitModal(false)}
                className="rounded border border-[#E9EBED] bg-white px-4 py-2 text-xs font-semibold text-[#0F1B2A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommit}
                className="rounded bg-[#FF9900] px-4 py-2 text-xs font-semibold text-[#0F1B2A] hover:bg-[#EC7211]"
              >
                Confirm & Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Completed */}
      {step === 'completed' && commitResult && (
        <div className="rounded-lg border border-[#037F0C]/30 bg-white p-6 sm:p-8 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#037F0C]" />
          <div>
            <h2 className="text-xl font-bold text-[#0F1B2A]">Certificates Issued Successfully</h2>
            <p className="mt-1 text-sm text-[#5F6B7A]">
              Issued <strong>{commitResult.issuedCount}</strong> new certificates
              {commitResult.updatedCount > 0 && `, updated ${commitResult.updatedCount} existing`}
              {commitResult.skippedCount > 0 && `, skipped ${commitResult.skippedCount}`}.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={handleDownloadExportCsv}
              className="inline-flex items-center justify-center gap-2 rounded bg-[#232F3E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#131A22]"
            >
              <Download className="h-4 w-4" />
              <span>Download Record CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('upload');
                setBatchId(null);
                setReport(null);
                setCommitResult(null);
              }}
              className="rounded border border-[#E9EBED] bg-white px-4 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#F9F9FB]"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
