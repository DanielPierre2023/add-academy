'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { acceptInvitation } from '@/lib/school/actions';
import { Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import type { Language } from '@/types';

/**
 * Password reset page — users land here after clicking the reset link in their email.
 * The recovery token must be exchanged for a session BEFORE updateUser() is called.
 * We support both the PKCE flow (?code=...) and the token_hash flow (?token_hash=...&type=recovery),
 * and also honour a session already established via the SIGNED_IN / PASSWORD_RECOVERY event.
 *
 * NOTE: useSearchParams() must be inside a <Suspense> boundary for static generation,
 * so the exported page wraps the inner component.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const language = useAcademyStore((s) => s.language) as Language;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // 'checking' -> verifying the recovery link; 'ready' -> valid session; 'invalid' -> bad/expired link
  const [sessionState, setSessionState] = useState<'checking' | 'ready' | 'invalid'>('checking');

  // Whether this visit is an invited-member welcome flow (?welcome=1)
  const isWelcome = searchParams.get('welcome') === '1';

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    // A recovery session may arrive asynchronously via the auth state change event.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        setSessionState('ready');
      }
    });

    (async () => {
      // 1) If a session already exists (event fired before we subscribed), we're done.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (active) setSessionState('ready');
        return;
      }

      // 2) PKCE flow: ?code=...
      const code = searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (active) setSessionState(exchangeError ? 'invalid' : 'ready');
        return;
      }

      // 3) Token-hash flow: ?token_hash=...&type=recovery
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      if (tokenHash && type === 'recovery') {
        const { error: otpError } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: tokenHash,
        });
        if (active) setSessionState(otpError ? 'invalid' : 'ready');
        return;
      }

      // 4) Nothing usable — give the event listener a brief window, then mark invalid.
      setTimeout(() => {
        if (active) setSessionState((s) => (s === 'checking' ? 'invalid' : s));
      }, 1500);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('reset_pw_min', language));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('reset_pw_mismatch', language));
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Invited-member welcome flow: finalise enrollment into their school.
      // Only runs when arriving via an invite link (?welcome=1); normal resets are unaffected.
      if (isWelcome) {
        const { data: { user } } = await supabase.auth.getUser();
        const inviteToken = (user?.user_metadata as { invite_token?: string } | undefined)?.invite_token;
        if (inviteToken) {
          await acceptInvitation(inviteToken).catch(() => {});
        }
        // Do NOT sign out other sessions here — the member has just signed in.
        setSuccess(true);
        setTimeout(() => router.push('/school/dashboard'), 2000);
        return;
      }

      // Optional hardening: sign out any other active sessions after a password change.
      await supabase.auth.signOut({ scope: 'others' }).catch(() => {});

      setSuccess(true);
      // Redirect to home after a short delay
      setTimeout(() => router.push('/'), 2000);
    } catch {
      setError(t('reset_unexpected', language));
      setLoading(false);
    }
  }

  // Still verifying the recovery link
  if (sessionState === 'checking') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">{t('reset_verifying', language)}</p>
      </div>
    );
  }

  // Invalid or expired recovery link — never dead-end the user
  if (sessionState === 'invalid') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-6">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t('reset_invalid_title', language)}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t('reset_invalid_desc', language)}
        </p>
        <Button className="mt-6 gap-2" onClick={() => router.push('/login')}>
          {t('reset_back_to_login', language)}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 mb-6">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {isWelcome ? t('reset_welcome_aboard', language) : t('reset_pw_updated', language)}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isWelcome
            ? t('reset_success_welcome', language)
            : t('reset_success_reset', language)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {isWelcome ? t('reset_create_title', language) : t('reset_set_title', language)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isWelcome ? t('reset_create_sub', language) : t('reset_set_sub', language)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('reset_new_password', language)}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('reset_new_password_ph', language)}
              required
              minLength={8}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('reset_confirm_password', language)}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('reset_confirm_password_ph', language)}
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {loading ? t('reset_updating', language) : t('reset_update_btn', language)}
          </Button>
        </form>
      </div>
    </div>
  );
}
