import Link from 'next/link';
import { BrandMark } from '@/components/ui/brand-mark';
import { HeaderAuthButtons } from './header-auth-buttons';
import { createClient } from '@/lib/supabase/server';

/**
 * Site-wide header.
 * Dark navy bar with brand mark left, navigation right.
 * Dynamically displays Sign In/Register when logged out, and Sign Out when logged in.
 */
export async function Header() {
  let isAuthenticated = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthenticated = !!user;
  } catch {
    isAuthenticated = false;
  }

  return (
    <header className="bg-[var(--color-squid-ink)] text-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <BrandMark />
        </Link>

        <HeaderAuthButtons isAuthenticated={isAuthenticated} />
      </div>
    </header>
  );
}
