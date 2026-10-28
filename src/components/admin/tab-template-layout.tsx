'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Eye, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { uploadEventTemplateAction, updateEventLayoutAction, previewEventCertificateAction } from '@/server/actions/events';
import { DEFAULT_CERTIFICATE_LAYOUT, CertificateLayout } from '@/lib/certificate/layout';
import { AVAILABLE_FONTS } from '@/lib/certificate/fonts-list';

interface TabTemplateLayoutProps {
  event: any;
}

const SAMPLE_NAMES = [
  'Aarav Shah',
  'Ashish Kumar Prasad Gupta',
  'Renée Müller-Chloë',
];

export function TabTemplateLayout({ event }: TabTemplateLayoutProps) {
  const router = useRouter();

  const [layout, setLayout] = useState<CertificateLayout>(
    event.layout || DEFAULT_CERTIFICATE_LAYOUT
  );
  const [selectedSampleName, setSelectedSampleName] = useState(SAMPLE_NAMES[0]!);
  const [customSampleName, setCustomSampleName] = useState('');
  const [previewPdfBase64, setPreviewPdfBase64] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('template', file);

    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await uploadEventTemplateAction(event.id, formData);
      if (res.ok) {
        setStatusMessage('Template image processed and uploaded successfully.');
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  const handleSaveLayout = () => {
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await updateEventLayoutAction(event.id, layout);
      if (res.ok) {
        setStatusMessage(`Layout saved successfully (render revision ${res.data.newRev}).`);
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  const handleGeneratePreview = () => {
    const testName = customSampleName.trim() || selectedSampleName;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await previewEventCertificateAction(event.id, testName, layout);
      if (res.ok) {
        setPreviewPdfBase64(res.data.pdfBase64);
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

      {/* 1. Template File Upload */}
      <div className="rounded-lg border border-[#E9EBED] bg-white p-6">
        <h2 className="text-base font-bold text-[#0F1B2A] border-b border-[#E9EBED] pb-3">
          1. Certificate Template Image
        </h2>
        <p className="mt-2 text-xs text-[#5F6B7A]">
          Upload a high-resolution PNG or JPG certificate template exported from Canva or Figma (max 10 MB).
          Our pipeline generates a print-ready master and web-optimized version.
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-[#E9EBED] bg-[#F9F9FB] px-4 py-2.5 text-sm font-semibold text-[#0F1B2A] hover:bg-white hover:border-[#0972D3]">
            <Upload className="h-4 w-4 text-[#5F6B7A]" />
            <span>Choose Template Image</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleTemplateUpload}
              className="hidden"
              disabled={isPending}
            />
          </label>

          {event.template_path ? (
            <span className="text-xs text-[#037F0C] font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Template configured ({event.template_width} × {event.template_height}px)
            </span>
          ) : (
            <span className="text-xs text-[#5F6B7A]">No template uploaded yet.</span>
          )}
        </div>
      </div>

      {/* 2. Layout Controls */}
      <div className="rounded-lg border border-[#E9EBED] bg-white p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#E9EBED] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#0F1B2A]">2. Element Placement & Typography</h2>
            <p className="text-xs text-[#5F6B7A]">
              Coordinates are resolution-independent fractions (0.0 to 1.0) of template width and height.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveLayout}
            disabled={isPending}
            className="rounded bg-[#FF9900] px-4 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211] disabled:opacity-60"
          >
            {isPending ? 'Saving...' : 'Save Layout Settings'}
          </button>
        </div>

        {/* Name placement */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#0F1B2A]">Recipient Name Box</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Horizontal X (0 - 1)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={layout.name.x}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    name: { ...layout.name, x: parseFloat(e.target.value) || 0 },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Vertical Y (0 - 1)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={layout.name.y}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    name: { ...layout.name, y: parseFloat(e.target.value) || 0 },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Max Width Fraction (0.1 - 1)</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="1"
                value={layout.name.maxWidth}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    name: { ...layout.name, maxWidth: parseFloat(e.target.value) || 0.5 },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Font Family</label>
              <select
                value={layout.name.fontFamily}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    name: { ...layout.name, fontFamily: e.target.value },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Max Font Size (Fraction)</label>
              <input
                type="number"
                step="0.002"
                min="0.01"
                max="0.2"
                value={layout.name.fontSize}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    name: { ...layout.name, fontSize: parseFloat(e.target.value) || 0.045 },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Min Font Size (Fraction)</label>
              <input
                type="number"
                step="0.002"
                min="0.01"
                max="0.1"
                value={layout.name.minFontSize}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    name: { ...layout.name, minFontSize: parseFloat(e.target.value) || 0.02 },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Text Color (Hex)</label>
              <input
                type="text"
                value={layout.name.color}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    name: { ...layout.name, color: e.target.value },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* QR Code placement */}
        <div className="space-y-3 border-t border-[#E9EBED] pt-4">
          <h3 className="text-sm font-bold text-[#0F1B2A]">QR Code</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Center X (0 - 1)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={layout.qr.x}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    qr: { ...layout.qr, x: parseFloat(e.target.value) || 0 },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Center Y (0 - 1)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={layout.qr.y}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    qr: { ...layout.qr, y: parseFloat(e.target.value) || 0 },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Size Fraction (0.05 - 0.3)</label>
              <input
                type="number"
                step="0.01"
                min="0.03"
                max="0.4"
                value={layout.qr.size}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    qr: { ...layout.qr, size: parseFloat(e.target.value) || 0.1 },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Certificate ID text */}
        <div className="space-y-3 border-t border-[#E9EBED] pt-4">
          <h3 className="text-sm font-bold text-[#0F1B2A]">Certificate ID Text</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Position X (0 - 1)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={layout.certId.x}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    certId: { ...layout.certId, x: parseFloat(e.target.value) || 0 },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Position Y (0 - 1)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={layout.certId.y}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    certId: { ...layout.certId, y: parseFloat(e.target.value) || 0 },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6B7A]">Color (Hex)</label>
              <input
                type="text"
                value={layout.certId.color}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    certId: { ...layout.certId, color: e.target.value },
                  })
                }
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-1.5 text-sm font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Real Renderer Preview per spec §7.6 */}
      <div className="rounded-lg border border-[#E9EBED] bg-white p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E9EBED] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#0F1B2A]">
              3. Live Renderer Preview (True Source of Truth)
            </h2>
            <p className="text-xs text-[#5F6B7A]">
              Generates an exact PDF with pdf-lib and embedded fonts to verify glyph fitting and dimensions.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGeneratePreview}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded bg-[#FF9900] px-3.5 py-2 text-xs font-bold text-[#0F1B2A] hover:bg-[#EC7211] disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            <span>Generate Live Preview</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#5F6B7A]">Quick sample names:</span>
          {SAMPLE_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setSelectedSampleName(name);
                setCustomSampleName('');
              }}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${
                selectedSampleName === name && !customSampleName
                  ? 'bg-[#232F3E] text-white'
                  : 'bg-[#F9F9FB] border border-[#E9EBED] text-[#0F1B2A] hover:bg-[#E9EBED]'
              }`}
            >
              {name}
            </button>
          ))}
          <input
            type="text"
            placeholder="Or type custom name..."
            value={customSampleName}
            onChange={(e) => setCustomSampleName(e.target.value)}
            className="rounded border border-[#E9EBED] px-2.5 py-1 text-xs text-[#0F1B2A]"
          />
        </div>

        {previewPdfBase64 ? (
          <div className="mt-4 rounded border border-[#E9EBED] bg-[#525659] p-2">
            <iframe
              src={`data:application/pdf;base64,${previewPdfBase64}#toolbar=0&navpanes=0`}
              className="w-full h-[550px] rounded"
              title="Real PDF Renderer Preview"
            />
          </div>
        ) : (
          <div className="rounded border border-dashed border-[#E9EBED] bg-[#F9F9FB] p-8 text-center text-sm text-[#5F6B7A]">
            <Eye className="mx-auto h-8 w-8 text-[#5F6B7A]/50 mb-2" />
            Click <strong>Generate Live Preview</strong> above to verify recipient placement and glyph rendering.
          </div>
        )}
      </div>
    </div>
  );
}
