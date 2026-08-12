'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { Mail, Lock, User, School, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { ADDLogo } from '@/components/brand/add-logo';
import type { Language } from '@/types';

export default function RegisterForm() {
  const language = useAcademyStore((s) => s.language) as Language;
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side password validation mirrors the Supabase server-side policy
    // (min 8 chars + lowercase, uppercase, digit and symbol) so users get an
    // inline error instead of a server round-trip rejection.
    if (
      password.length < 8 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError(t('reg_password_policy', language));
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      let schoolId: string | null = null;
      if (enrollmentCode.trim()) {
        const { data: school } = await supabase
          .from('academy_schools')
          .select('id, verified')
          .eq('id', enrollmentCode.trim())
          .eq('verified', true)
          .single();

        if (!school) {
          setError(t('reg_enrollment_invalid', language));
          setLoading(false);
          return;
        }
        schoolId = school.id;
      }

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            school_id: schoolId,
            tier: schoolId ? 'school' : 'free',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });

      if (authError) {
        setError(authError.message?.trim() && authError.message !== '{}' ? authError.message : t('reg_failed', language));
        setLoading(false);
        return;
      }

      if (schoolId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('academy_students')
            .update({ tier: 'school', school_id: schoolId })
            .eq('id', user.id);
        }
      }

      setSuccess(t('auth_check_email', language));
      setLoading(false);
    } catch {
      setError(t('reg_unexpected', language));
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });
    if (authError) {
      setError(authError.message?.trim() && authError.message !== '{}' ? authError.message : t('reg_failed', language));
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding (mirrors the login page) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div>
          <ADDLogo variant="academy" size="lg" />
        </div>
        <div>
          <h1 className="font-heading text-4xl font-bold leading-tight">
            {t('login_hero_title1', language)}
            <br />
            <span className="text-secondary italic">{t('login_hero_title2', language)}</span>
          </h1>
          <p className="mt-4 text-primary-foreground/60 max-w-md">
            {t('login_hero_desc', language)}
          </p>
        </div>
        <p className="text-xs text-primary-foreground/40">
          &copy; {new Date().getFullYear()} ADD Individual Solutions Ltd. {t('login_rights', language)}
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <ADDLogo variant="academy" size="md" />
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground">
            {t('auth_register', language)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('reg_subtitle', language)}
          </p>

          {/* Error message */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Google */}
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={loading || !!success}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              {t('auth_google', language)}
            </button>

            {/* GitHub */}
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={loading || !!success}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              {t('auth_github', language)}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">{t('auth_or', language)}</span>
              </div>
            </div>
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth_name', language)}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading || !!success}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('reg_name_ph', language)}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth_email', language)}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || !!success}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('reg_email_ph', language)}
                />
              </div>
            </div>
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth_password', language)}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || !!success}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('reg_password_ph', language)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Optional school enrollment code */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth_enrollment_code', language)}</label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={enrollmentCode}
                  onChange={(e) => setEnrollmentCode(e.target.value)}
                  disabled={loading || !!success}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('reg_enrollment_ph', language)}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{t('auth_enrollment_hint', language)}</p>
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? t('loading', language) : t('auth_register', language)}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('auth_has_account', language)}{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              {t('auth_login', language)}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
