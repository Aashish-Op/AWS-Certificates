import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface VerifySearchPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function VerifySearchPage({ searchParams }: VerifySearchPageProps) {
  const { id } = await searchParams;

  if (id) {
    const cleanId = id.trim().replace(/[-\s]/g, '').toUpperCase();
    if (cleanId) {
      redirect(`/verify/${cleanId}`);
    }
  }

  redirect('/');
}
