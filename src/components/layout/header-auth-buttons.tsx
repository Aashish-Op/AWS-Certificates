'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/server/actions/auth';

interface HeaderAuthButtonsProps {
  isAuthenticated: boolean;
}

export function HeaderAuthButtons({ isAuthenticated }: HeaderAuthButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await logoutAction();
      router.push('/login');
      router.refresh();
    });
  };

  if (isAuthenticated) {
    return (
      <nav className="flex items-center gap-4 text-sm">
        <Link
          href="/dashboard"
          className="text-white/80 hover:text-white transition-colors"
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition-colors disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          <span>{isPending ? 'Signing out...' : 'Sign out'}</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link
        href="/login"
        className="text-white/80 hover:text-white transition-colors"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-deep-ink)] hover:bg-[var(--color-primary-hover)] transition-colors"
      >
        Register
      </Link>
    </nav>
  );
}
