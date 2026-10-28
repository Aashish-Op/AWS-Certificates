'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { forgotPasswordAction } from '@/server/actions/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await forgotPasswordAction({ email });
      if (res.ok) {
        setStatusMessage(res.data.message);
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-[#E9EBED] bg-white p-6 sm:p-8 rounded-lg shadow-none">
        <h1 className="text-2xl font-bold text-[#0F1B2A]">Reset password</h1>
        <p className="mt-1 text-sm text-[#5F6B7A]">
          Enter your registered email address to receive password reset instructions.
        </p>

        {statusMessage && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 border border-[#037F0C]/30 bg-[#F2FBF3] p-3 text-sm text-[#037F0C] rounded"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{statusMessage}</span>
          </div>
        )}

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
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#0F1B2A]"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] placeholder-[#5F6B7A] focus:border-[#0972D3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0972D3]"
              placeholder="name@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded bg-[#FF9900] px-4 py-2.5 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211] focus:outline-none focus:ring-2 focus:ring-[#0972D3] focus:ring-offset-1 disabled:opacity-60"
          >
            {isPending ? 'Sending request...' : 'Send reset instructions'}
          </button>
        </form>

        <div className="mt-6 border-t border-[#E9EBED] pt-4 text-center text-sm text-[#5F6B7A]">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-[#0972D3] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
