import Link from 'next/link';
import { siteConfig } from '@/config/site';

/**
 * Site-wide footer.
 * Simple, restrained. Contains privacy link, support email, and disclaimer.
 */
export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-6 text-xs text-[var(--color-text-secondary)] sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-deep-ink)] transition-colors"
          >
            Privacy
          </Link>
          <a
            href={siteConfig.linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-text-secondary)] hover:text-[#0A66C2] transition-colors"
          >
            LinkedIn
          </a>
          <span>
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-deep-ink)] transition-colors"
            >
              {siteConfig.supportEmail}
            </a>
          </span>
        </div>
        <p className="text-center">
          This is official AWS Student Builder Group LPU Certification Platform
        </p>
      </div>
    </footer>
  );
}
