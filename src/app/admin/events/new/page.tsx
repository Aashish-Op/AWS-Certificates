'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { createEventAction } from '@/server/actions/events';
import { siteConfig } from '@/config/site';

export default function NewEventPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [certificateTitle, setCertificateTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0] || '');
  const [issuerName, setIssuerName] = useState<string>(siteConfig.issuer);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);
      setSlug(generated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await createEventAction({
        name,
        slug,
        certificate_title: certificateTitle,
        event_date: eventDate,
        issuer_name: issuerName,
      });

      if (res.ok) {
        router.push(`/admin/events/${res.data.id}`);
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#5F6B7A] hover:text-[#0F1B2A]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Events</span>
        </Link>
      </div>

      <div className="rounded-lg border border-[#E9EBED] bg-white p-6 sm:p-8 shadow-none">
        <h1 className="text-2xl font-bold text-[#0F1B2A]">Create New Event</h1>
        <p className="mt-1 text-sm text-[#5F6B7A]">
          Set up an event to issue and verify student participation certificates.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 border border-[#D91515]/30 bg-[#FFF5F5] p-3 text-sm text-[#D91515] rounded"
          >
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#0F1B2A]">
              Event Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. AWS Cloud Discovery Day 2026"
              className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] placeholder-[#5F6B7A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-[#0F1B2A]">
              URL Slug
            </label>
            <input
              id="slug"
              type="text"
              required
              pattern="^[a-z0-9-]{3,60}$"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManuallyEdited(true);
              }}
              placeholder="e.g. aws-cloud-discovery-2026"
              className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 font-mono text-sm text-[#0F1B2A] placeholder-[#5F6B7A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
            />
            <p className="mt-1 text-xs text-[#5F6B7A]">
              3-60 lowercase letters, numbers, or dashes. Used in download filenames and identifiers.
            </p>
          </div>

          <div>
            <label htmlFor="certificateTitle" className="block text-sm font-medium text-[#0F1B2A]">
              Certificate Title
            </label>
            <input
              id="certificateTitle"
              type="text"
              required
              value={certificateTitle}
              onChange={(e) => setCertificateTitle(e.target.value)}
              placeholder="e.g. Certificate of Participation"
              className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] placeholder-[#5F6B7A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
            />
            <p className="mt-1 text-xs text-[#5F6B7A]">
              The title displayed on verification badges and LinkedIn profile entries.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="eventDate" className="block text-sm font-medium text-[#0F1B2A]">
                Event Date
              </label>
              <input
                id="eventDate"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="issuerName" className="block text-sm font-medium text-[#0F1B2A]">
                Issuer Organization
              </label>
              <input
                id="issuerName"
                type="text"
                required
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded bg-[#FF9900] px-4 py-2.5 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211] disabled:opacity-60"
            >
              {isPending ? 'Creating event...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
