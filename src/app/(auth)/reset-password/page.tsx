'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch {
      setErrorMessage('Failed to update password. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-[#E9EBED] bg-white p-6 sm:p-8 rounded-lg shadow-none">
        <h1 className="text-2xl font-bold text-[#0F1B2A]">Set new password</h1>
        <p className="mt-1 text-sm text-[#5F6B7A]">
          Choose a new password for your account (minimum 8 characters).
        </p>

        {success && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 border border-[#037F0C]/30 bg-[#F2FBF3] p-3 text-sm text-[#037F0C] rounded"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span>Password updated successfully. Redirecting to your dashboard...</span>
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

        {!success && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#0F1B2A]"
              >
                New password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 pr-10 text-sm text-[#0F1B2A] placeholder-[#5F6B7A] focus:border-[#0972D3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0972D3]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5F6B7A] hover:text-[#0F1B2A]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded bg-[#FF9900] px-4 py-2.5 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211] focus:outline-none focus:ring-2 focus:ring-[#0972D3] focus:ring-offset-1 disabled:opacity-60"
            >
              {isPending ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-[#E9EBED] pt-4 text-center text-sm text-[#5F6B7A]">
          <Link href="/login" className="font-medium text-[#0972D3] hover:underline">
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
