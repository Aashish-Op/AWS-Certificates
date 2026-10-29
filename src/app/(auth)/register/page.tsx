'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { registerAction } from '@/server/actions/auth';

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await registerAction({
        fullName,
        regNo,
        email,
        password,
      });

      if (res.ok) {
        router.push(res.data.redirect);
        router.refresh();
      } else {
        setErrorMessage(res.error.message);
      }
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-[#E9EBED] bg-white p-6 sm:p-8 rounded-lg shadow-none">
        <h1 className="text-2xl font-bold text-[#0F1B2A]">Create an account</h1>
        <p className="mt-1 text-sm text-[#5F6B7A]">
          Register with your registration number and email to access and download your certificates.
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
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-[#0F1B2A]"
            >
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] placeholder-[#5F6B7A] focus:border-[#0972D3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0972D3]"
              placeholder="e.g. Name Surname"
            />
          </div>

          <div>
            <label
              htmlFor="regNo"
              className="block text-sm font-medium text-[#0F1B2A]"
            >
              Registration number
            </label>
            <input
              id="regNo"
              name="regNo"
              type="text"
              required
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              className="mt-1 block w-full rounded border border-[#E9EBED] bg-[#F9F9FB] px-3 py-2 text-sm text-[#0F1B2A] placeholder-[#5F6B7A] focus:border-[#0972D3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0972D3]"
              placeholder="e.g. 12501000"
            />
            <p className="mt-1 text-xs text-[#5F6B7A]">
              Your university registration number used at event sign-in.
            </p>
          </div>

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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#0F1B2A]"
            >
              Password
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
                aria-describedby="password-hint"
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
            <p id="password-hint" className="mt-1 text-xs text-[#5F6B7A]">
              Minimum 8 characters.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded bg-[#FF9900] px-4 py-2.5 text-sm font-semibold text-[#0F1B2A] hover:bg-[#EC7211] focus:outline-none focus:ring-2 focus:ring-[#0972D3] focus:ring-offset-1 disabled:opacity-60"
          >
            {isPending ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 border-t border-[#E9EBED] pt-4 text-center text-sm text-[#5F6B7A]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[#0972D3] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
