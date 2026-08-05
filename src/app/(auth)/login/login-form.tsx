'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Language } from '@/types';

export default function LoginForm() {
  const language = useAcademyStore((s) => s.language) as Language;
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(errorParam === 'auth_callback_error' ? 'Authentication failed. Please try again.' : '');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (authError) {
      setError(authError.message);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/`,
    });
    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
    }
  }

  return (
    <div className="rounded-2xl border border-[hsl(240_30%_20%)] bg-[hsl(240_40%_8%/0.85)] p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          {t('nav_login', language)}
        </h1>
        <p className="mt-1.5 text-sm text-[hsl(220_20%_60%)]">
          Welcome back to your learning journey
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Password reset confirmation */}
      {resetSent && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[hsl(38_80%_55%/0.3)] bg-[hsl(38_80%_55%/0.1)] p-3 text-sm text-[hsl(38_80%_70%)]">
          <Mail className="h-4 w-4 shrink-0 text-[hsl(38_80%_55%)]" />
          Password reset email sent! Check your inbox.
        </div>
      )}

      {/* OAuth buttons */}
      <div className="space-y-2.5 mb-6">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[hsl(240_20%_25%)] bg-[hsl(240_20%_14%)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-[hsl(240_20%_35%)] hover:bg-[hsl(240_20%_18%)] disabled:opacity-50"
          onClick={() => handleOAuth('google')}
          disabled={loading}
        >
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {t('auth_google', language)}
        </button>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[hsl(240_20%_25%)] bg-[hsl(240_20%_14%)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-[hsl(240_20%_35%)] hover:bg-[hsl(240_20%_18%)] disabled:opacity-50"
          onClick={() => handleOAuth('github')}
          disabled={loading}
        >
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {t('auth_github', language)}
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[hsl(240_20%_22%)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[hsl(240_40%_8%)] px-3 text-xs text-[hsl(220_20%_45%)]">
            {t('auth_or', language)}
          </span>
        </div>
      </div>

      {/* Email/password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-[hsl(220_20%_65%)]">
            {t('auth_email', language)}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(220_20%_40%)]" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="h-10 border-[hsl(240_20%_22%)] bg-[hsl(240_20%_12%)] pl-10 text-white placeholder:text-[hsl(220_20%_35%)] focus-visible:border-[hsl(38_80%_55%)] focus-visible:ring-[hsl(38_80%_55%/0.2)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-[hsl(220_20%_65%)]">
              {t('auth_password', language)}
            </Label>
            <button
              type="button"
              className="text-xs text-[hsl(38_80%_55%)] hover:text-[hsl(38_80%_65%)] transition-colors"
              onClick={handleForgotPassword}
            >
              {t('auth_forgot', language)}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(220_20%_40%)]" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="h-10 border-[hsl(240_20%_22%)] bg-[hsl(240_20%_12%)] pl-10 text-white placeholder:text-[hsl(220_20%_35%)] focus-visible:border-[hsl(38_80%_55%)] focus-visible:ring-[hsl(38_80%_55%/0.2)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Submit button — gold accent */}
        <Button
          type="submit"
          className="w-full h-11 bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] font-semibold hover:bg-[hsl(38_80%_48%)] shadow-lg shadow-[hsl(38_80%_55%/0.2)] transition-all"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('loading', language)}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {t('auth_login', language)}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-[hsl(220_20%_55%)]">
        {t('auth_no_account', language)}{' '}
        <Link href="/register" className="font-medium text-[hsl(38_80%_55%)] hover:text-[hsl(38_80%_65%)] transition-colors">
          {t('auth_register', language)}
        </Link>
      </p>
    </div>
  );
}
