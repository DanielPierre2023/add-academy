'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { ADDLogo } from '@/components/brand/add-logo';

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signUpWithEmail(email, password, name);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center max-w-md">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Mail className="h-8 w-8" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Check your email</h2>
          <p className="mt-2 text-muted-foreground">
            We&apos;ve sent a confirmation link to <strong className="text-foreground">{email}</strong>.
            Click it to activate your account.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <ADDLogo variant="academy" size="lg" />
        <div>
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Your AI learning
            <br />
            <span className="text-secondary italic">journey starts here.</span>
          </h1>
          <p className="mt-4 text-primary-foreground/60 max-w-md">
            Join thousands of learners building real-world AI skills — from LLM fundamentals
            to deploying production AI agents.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold text-secondary">66</div>
              <div className="text-xs text-primary-foreground/50">Lectures</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">274</div>
              <div className="text-xs text-primary-foreground/50">Code blocks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">312</div>
              <div className="text-xs text-primary-foreground/50">Quiz questions</div>
            </div>
          </div>
        </div>
        <p className="text-xs text-primary-foreground/40">
          &copy; {new Date().getFullYear()} ADD Individual Solutions Ltd.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <ADDLogo variant="academy" size="md" />
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground">Create your account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with free access to Stage 0 &amp; 1. Upgrade anytime.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Min. 8 characters"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>

          <div className="mt-6 rounded-lg border border-secondary/20 bg-secondary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Part of a school or organization?{' '}
              <Link href="/login" className="font-semibold text-secondary hover:underline">
                Use your org code
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
