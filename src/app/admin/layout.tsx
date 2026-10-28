import { requireAdmin } from '@/server/auth-guard';
import Link from 'next/link';
import { Calendar, PlusCircle, Shield, FileText, ArrowLeft } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F9F9FB]">
      <div className="border-b border-[#E9EBED] bg-[#232F3E] text-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded bg-[#FF9900] px-2 py-0.5 text-xs font-bold text-[#0F1B2A]">
              ADMIN
            </span>
            <span className="text-sm font-semibold text-white">
              AWS SBG LPU Operations Console
            </span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D5D9D9] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Student Dashboard</span>
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-[#E9EBED] bg-white py-6 hidden md:block min-h-[calc(100vh-190px)]">
          <nav className="space-y-1 px-3">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 rounded px-3 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#F9F9FB]"
            >
              <Calendar className="h-4 w-4 text-[#5F6B7A]" />
              <span>Events</span>
            </Link>
            <Link
              href="/admin/events/new"
              className="flex items-center gap-2.5 rounded px-3 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#F9F9FB]"
            >
              <PlusCircle className="h-4 w-4 text-[#5F6B7A]" />
              <span>Create Event</span>
            </Link>
            <Link
              href="/admin/audit"
              className="flex items-center gap-2.5 rounded px-3 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#F9F9FB]"
            >
              <Shield className="h-4 w-4 text-[#5F6B7A]" />
              <span>Audit Log</span>
            </Link>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
