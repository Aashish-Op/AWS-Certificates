'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { updateEventAction, togglePublishEventAction } from '@/server/actions/events';

interface TabOverviewProps {
  event: any;
  certificateCount: number;
}

export function TabOverview({ event, certificateCount }: TabOverviewProps) {
  const router = useRouter();

  const [name, setName] = useState(event.name);
  const [slug, setSlug] = useState(event.slug);
  const [certificateTitle, setCertificateTitle] = useState(event.certificate_title);
  const [eventDate, setEventDate] = useState(event.event_date);
  const [issuerName, setIssuerName] = useState(event.issuer_name);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'draft' | 'published'>('draft');

  const isPublished = event.status === 'published';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await updateEventAction(event.id, {
        name,
        slug,
        certificate_title: certificateTitle,
        event_date: eventDate,
        issuer_name: issuerName,
      });

      if (res.ok) {
        setStatusMessage('Event details updated successfully.');
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  const handleTogglePublish = () => {
    setShowPublishModal(false);
    startTransition(async () => {
      const res = await togglePublishEventAction(event.id, targetStatus);
      if (res.ok) {
        setStatusMessage(
          targetStatus === 'published'
            ? `Event published. ${res.data.certificateCount} certificates are now visible to attendees.`
            : 'Event moved to draft. Certificates are hidden from attendees.'
        );
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Status banner and toggle */}
      <div className="flex flex-col gap-4 rounded-lg border border-[#E9EBED] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-semibold text-[#5F6B7A]">PUBLICATION STATUS</span>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                isPublished ? 'bg-[#037F0C]' : 'bg-[#5F6B7A]'
              }`}
            />
            <span className="font-bold text-[#0F1B2A] capitalize">
              {event.status}
            </span>
            <span className="text-xs text-[#5F6B7A]">
              • {certificateCount} {certificateCount === 1 ? 'certificate' : 'certificates'} issued
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setTargetStatus(isPublished ? 'draft' : 'published');
            setShowPublishModal(true);
          }}
          disabled={isPending}
          className={`inline-flex items-center justify-center rounded px-4 py-2 text-sm font-semibold ${
            isPublished
              ? 'border border-[#E9EBED] bg-white text-[#D91515] hover:bg-[#FFF5F5]'
              : 'bg-[#FF9900] text-[#0F1B2A] hover:bg-[#EC7211]'
          }`}
        >
          {isPublished ? 'Unpublish to Draft' : 'Publish Event'}
        </button>
      </div>

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

      {/* Confirmation Dialog for publishing per spec §7.6 */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#E9EBED] bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 text-[#0F1B2A]">
              <AlertTriangle className="h-6 w-6 text-[#FF9900]" />
              <h3 className="text-lg font-bold">
                {targetStatus === 'published' ? 'Publish Event?' : 'Unpublish Event?'}
              </h3>
            </div>
            <p className="mt-3 text-sm text-[#5F6B7A]">
              {targetStatus === 'published'
                ? `Publishing this event will make ${certificateCount} certificates immediately visible on attendee dashboards and publicly verifiable.`
                : 'Unpublishing will hide these certificates from student dashboards and make the verification link return a 404 until republished.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="rounded border border-[#E9EBED] bg-white px-3.5 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#F9F9FB]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTogglePublish}
                className="rounded bg-[#FF9900] px-4 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211]"
              >
                Confirm {targetStatus === 'published' ? 'Publish' : 'Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Form */}
      <form onSubmit={handleSave} className="rounded-lg border border-[#E9EBED] bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-[#0F1B2A] border-b border-[#E9EBED] pb-3">
          Event Details
        </h2>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#0F1B2A]">
            Event Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-[#0F1B2A]">
            URL Slug {certificateCount > 0 && <span className="text-xs text-[#5F6B7A] font-normal">(Locked: certificates already issued)</span>}
          </label>
          <input
            id="slug"
            type="text"
            required
            disabled={certificateCount > 0}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 font-mono text-sm text-[#0F1B2A] focus:border-[#0972D3] focus:bg-white focus:outline-none disabled:opacity-60"
          />
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
            className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] focus:border-[#0972D3] focus:bg-white focus:outline-none"
          />
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

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-[#FF9900] px-4 py-2 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211] disabled:opacity-60"
          >
            {isPending ? 'Saving changes...' : 'Save Details'}
          </button>
        </div>
      </form>
    </div>
  );
}
