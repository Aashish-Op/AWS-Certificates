'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Share2, Award, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import { formatCertificateId } from '@/config/site';

interface CertificateCardProps {
  certificate: {
    id: string;
    name: string;
    status: 'valid' | 'revoked';
    issued_at: string;
    event: {
      name: string;
      certificate_title: string;
      event_date: string;
      issuer_name: string;
    };
  };
  linkedInAddUrl: string;
  linkedInShareUrl: string;
  verifyUrl: string;
}

export function CertificateCard({
  certificate,
  linkedInAddUrl,
  linkedInShareUrl,
  verifyUrl,
}: CertificateCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isRevoked = certificate.status === 'revoked';

  return (
    <div className="flex flex-col justify-between rounded-lg border border-[#E9EBED] bg-white p-5 shadow-none transition hover:border-[#D5D9D9]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5F6B7A]">
              {certificate.event.issuer_name}
            </span>
            <h2 className="mt-1 text-lg font-bold text-[#0F1B2A]">
              {certificate.event.certificate_title}
            </h2>
            <p className="text-sm font-medium text-[#5F6B7A]">
              Event: {certificate.event.name}
            </p>
          </div>

          <div>
            {isRevoked ? (
              <span className="inline-flex items-center gap-1 rounded bg-[#FFF5F5] px-2.5 py-1 text-xs font-semibold text-[#D91515] border border-[#D91515]/20">
                <AlertTriangle className="h-3 w-3" />
                Revoked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-[#F2FBF3] px-2.5 py-1 text-xs font-semibold text-[#037F0C] border border-[#037F0C]/20">
                <Check className="h-3 w-3" />
                Valid
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#E9EBED] pt-3 text-xs text-[#5F6B7A]">
          <div>
            <span className="block text-[#5F6B7A]">Event Date</span>
            <span className="font-semibold text-[#0F1B2A]">
              {formatDate(certificate.event.event_date)}
            </span>
          </div>
          <div>
            <span className="block text-[#5F6B7A]">Certificate ID</span>
            <span className="font-mono font-semibold text-[#0F1B2A]">
              {formatCertificateId(certificate.id)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-[#E9EBED] pt-4">
        {isRevoked ? (
          <p className="text-xs text-[#D91515]">
            This certificate has been revoked by the issuing organization. Download and social sharing are disabled.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/certificates/${certificate.id}/download`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded bg-[#FF9900] px-3.5 py-2 text-xs font-bold text-[#0F1B2A] hover:bg-[#EC7211]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </a>

              <Link
                href={`/verify/${certificate.id}`}
                className="inline-flex items-center justify-center gap-1.5 rounded border border-[#E9EBED] bg-white px-3 py-2 text-xs font-semibold text-[#0F1B2A] hover:bg-[#F9F9FB]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Verify Page</span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={linkedInAddUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-[#0972D3] bg-white px-3 py-1.5 text-xs font-semibold text-[#0972D3] hover:bg-[#F0F7FD]"
              >
                <Award className="h-3.5 w-3.5" />
                <span>Add to LinkedIn</span>
              </a>

              <a
                href={linkedInShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded border border-[#E9EBED] bg-white px-3 py-1.5 text-xs font-semibold text-[#5F6B7A] hover:bg-[#F9F9FB] hover:text-[#0F1B2A]"
                title="Share on LinkedIn"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 rounded border border-[#E9EBED] bg-white px-3 py-1.5 text-xs font-semibold text-[#5F6B7A] hover:bg-[#F9F9FB] hover:text-[#0F1B2A]"
                title="Copy verification link"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#037F0C]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
