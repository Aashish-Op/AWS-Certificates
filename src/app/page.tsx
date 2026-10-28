'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { isValidCertificateId } from '@/lib/certificate/ids';

/**
 * Home page.
 * Per spec §9: single clear headline, "Verify a certificate" ID input
 * as primary element, secondary Sign in / Register. No hero illustration,
 * no marketing sections.
 */
export default function HomePage() {
  const router = useRouter();
  const [certId, setCertId] = useState('');
  const [error, setError] = useState('');

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Strip dashes and whitespace
    const cleaned = certId.replace(/[-\s]/g, '').toUpperCase();

    if (!cleaned) {
      setError('Enter a certificate ID to verify.');
      return;
    }

    if (!isValidCertificateId(cleaned)) {
      setError(
        'Invalid certificate ID format. It should be 12 characters (e.g. XXXX-XXXX-XXXX).'
      );
      return;
    }

    router.push(`/verify/${cleaned}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-[var(--color-deep-ink)] sm:text-[var(--font-size-2xl)]">
          {siteConfig.issuer}
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Certificate Verification Portal
        </p>

        <form
          onSubmit={handleVerify}
          className="mt-8 flex flex-col gap-3"
          noValidate
        >
          <label
            htmlFor="cert-id"
            className="text-left text-sm font-medium text-[var(--color-deep-ink)]"
          >
            Verify a certificate
          </label>
          <div className="flex gap-2">
            <input
              id="cert-id"
              type="text"
              value={certId}
              onChange={(e) => {
                setCertId(e.target.value);
                if (error) setError('');
              }}
              placeholder="XXXX-XXXX-XXXX"
              autoComplete="off"
              inputMode="text"
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-base text-[var(--color-deep-ink)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-link)] focus:outline-none focus:ring-2 focus:ring-[var(--color-link)]/20"
              aria-describedby={error ? 'cert-id-error' : undefined}
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-deep-ink)] hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <Search className="h-4 w-4" />
              Verify
            </button>
          </div>
          {error && (
            <p
              id="cert-id-error"
              role="alert"
              className="text-left text-sm text-[var(--color-error)]"
            >
              {error}
            </p>
          )}
        </form>

        <div className="mt-8 flex items-center justify-center gap-4 text-sm">
          <span className="text-[var(--color-text-secondary)]">
            Are you a student?
          </span>
          <Link
            href="/login"
            className="text-[var(--color-link)] hover:underline"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-[var(--color-link)] hover:underline"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
