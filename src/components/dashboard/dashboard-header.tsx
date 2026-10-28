'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/server/actions/auth';

interface DashboardHeaderProps {
  fullName: string;
  email: string;
  regNo?: string;
  isAdmin?: boolean;
}

export function DashboardHeader({ fullName, email, regNo, isAdmin }: DashboardHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await logoutAction();
      router.push('/login');
      router.refresh();
    });
  };

  return (
    <div className="border-b border-[#E9EBED] bg-white px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B2A]">{fullName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#5F6B7A]">
            <span>
              Email: <strong className="font-semibold text-[#0F1B2A]">{email}</strong>
            </span>
            {regNo && (
              <>
                <span>•</span>
                <span>
                  Registration No: <strong className="font-semibold text-[#0F1B2A]">{regNo}</strong>
                </span>
              </>
            )}
            {isAdmin && (
              <>
                <span>•</span>
                <span className="rounded bg-[#232F3E] px-2 py-0.5 text-xs font-semibold text-white">
                  Admin
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <a
              href="/admin"
              className="inline-flex items-center rounded border border-[#232F3E] bg-[#232F3E] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#131A22]"
            >
              Admin Console
            </a>
          )}
          <button
            onClick={handleSignOut}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded border border-[#E9EBED] bg-white px-3.5 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#F9F9FB] disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            <span>{isPending ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
