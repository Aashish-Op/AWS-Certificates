'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { loginAction } from '@/server/actions/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';
  const registered = searchParams.get('registered') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await loginAction({ email, password, next: nextPath });
      if (res.ok) {
        router.push(res.data.redirect);
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  return (
    <div className="w-full max-w-md border border-[#E9EBED] bg-white p-6 sm:p-8 rounded-lg shadow-none">
      <h1 className="text-2xl font-bold text-[#0F1B2A]">Sign in</h1>
      <p className="mt-1 text-sm text-[#5F6B7A]">
        Access your certificates and download verified credentials.
      </p>

      {registered && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 border border-[#037F0C]/30 bg-[#F2FBF3] p-3 text-sm text-[#037F0C] rounded"
        >
          Account created successfully. Please sign in below.
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

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#0F1B2A]"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#0972D3] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
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
          {isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 border-t border-[#E9EBED] pt-4 text-center text-sm text-[#5F6B7A]">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-[#0972D3] hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-sm text-[#5F6B7A]">Loading sign in form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
