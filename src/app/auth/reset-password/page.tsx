'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // 'checking' -> verifying the recovery link; 'ready' -> valid session; 'invalid' -> bad/expired link
  const [sessionState, setSessionState] = useState<'checking' | 'ready' | 'invalid'>('checking');

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
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
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

      // Optional hardening: sign out any other active sessions after a password change.
      await supabase.auth.signOut({ scope: 'others' }).catch(() => {});

      setSuccess(true);
      // Redirect to home after a short delay
      setTimeout(() => router.push('/'), 2000);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  // Still verifying the recovery link
  if (sessionState === 'checking') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Verifying your reset link…</p>
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
          Reset link invalid or expired
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          This password-reset link is no longer valid
