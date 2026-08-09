'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Supabase sets the session from the hash fragment automatically via detectSessionInUrl
  useEffect(() => {
    const supabase = createClient();
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is authenticated via recovery link — form is ready
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/'), 2000);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(240_50%_5%)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[hsl(240_30%_20%)] bg-[hsl(240_40%_8%/0.85)] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <Lock className="mx-auto h-10 w-10 text-[hsl(38_80%_55%)] mb-3" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            Set New Password
          </h1>
          <p className="mt-1.5 text-sm text-[hsl(220_20%_60%)]">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg text-white font-medium">Password updated successfully!</p>
            <p className="text-sm text-[hsl(220_20%_60%)]">Redirecting to home...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-[hsl(220_20%_65%)]">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                className="h-10 border-[hsl(240_20%_22%)] bg-[hsl(240_20%_12%)] text-white placeholder:text-[hsl(220_20%_35%)] focus-visible:border-[hsl(38_80%_55%)] focus-visible:ring-[hsl(38_80%_55%/0.2)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs font-medium text-[hsl(220_20%_65%)]">
                Confirm Password
              </Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Repeat your password"
                className="h-10 border-[hsl(240_20%_22%)] bg-[hsl(240_20%_12%)] text-white placeholder:text-[hsl(220_20%_35%)] focus-visible:border-[hsl(38_80%_55%)] focus-visible:ring-[hsl(38_80%_55%/0.2)]"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] font-semibold hover:bg-[hsl(38_80%_48%)] shadow-lg shadow-[hsl(38_80%_55%/0.2)]"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
