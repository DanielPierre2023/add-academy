'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

/* ─── Types ────────────────────────────────────────────── */

export type SubscriptionTier =
  | 'free'
  | 'stage'          // individual stage access
  | 'saas_single'    // single GenAI SaaS product
  | 'saas_bundle'    // all 5 GenAI SaaS products
  | 'llm_course'     // full LLM course (all stages)
  | 'full_access';   // everything

export interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: string;
  /** Which specific stages are unlocked (for 'stage' tier) */
  unlockedStages: number[];
  /** Which specific SaaS products are unlocked (for 'saas_single' tier) */
  unlockedProducts: string[];
  periodStart: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
  discountPercent: number;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  country: string;
  city: string | null;
  domain: string | null;
  inviteCode: string | null;
  logoUrl: string | null;
  verified: boolean;
  maxStudents: number;
  currentStudents: number;
}

export interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  schoolId: string | null;
  orgRole: 'admin' | 'member' | null;
  subscription: Subscription | null;
  createdAt: string;
}

interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  isOrgUser: boolean;
  isAdmin: boolean;
  /** Current subscription tier (org users get full_access) */
  effectiveTier: SubscriptionTier;
  /** Check if user can access a specific stage */
  canAccessStage: (stageNumber: number) => boolean;
  /** Check if user can access a specific SaaS product */
  canAccessProduct: (productId: string) => boolean;

  // Auth actions
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithOrgCode: (code: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

/* ─── Context ──────────────────────────────────────────── */

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/* ─── Provider ─────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch full user profile from academy_students + academy_subscriptions + academy_roles
  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<AppUser | null> => {
    try {
      const supabase = createClient();
      // Query academy_students — try with subscription join first, fall back to without
      let student: Record<string, unknown> | null = null;

      // Attempt 1: with subscription join (using FK hint)
      const { data: withSubs, error: joinError } = await supabase
        .from('academy_students')
        .select('*, academy_subscriptions!academy_subscriptions_student_id_fkey(*)')
        .eq('id', supabaseUser.id)
        .single();

      if (!joinError && withSubs) {
        student = withSubs;
      } else {
        // Attempt 2: without join (still gets profile)
        const { data: withoutSubs } = await supabase
          .from('academy_students')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        if (withoutSubs) {
          student = { ...withoutSubs, academy_subscriptions: [] };
        }
      }

      // Check trusted academy_roles table for admin status
      const { data: roleRow } = await supabase
        .from('academy_roles')
        .select('role')
        .eq('user_id', supabaseUser.id)
        .single();

      const trustedRole = roleRow?.role === 'admin' ? 'admin' : (student?.org_role as string | null) === 'member' ? 'member' : null;

      if (!student) {
        // Student record not found — the handle_academy_signup trigger
        // should have created it. Return a basic user object.
        return {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
          avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
          schoolId: null,
          orgRole: trustedRole as 'admin' | 'member' | null,
          subscription: null,
          createdAt: new Date().toISOString(),
        };
      }

      // Map the active subscription (most recent active one)
      const activeSubs = ((student.academy_subscriptions as Record<string, unknown>[]) || [])
        .filter((s: Record<string, unknown>) => s.status === 'active')
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
          String(b.created_at || '').localeCompare(String(a.created_at || ''))
        );
      const sub = activeSubs[0];

      const subscription: Subscription | null = sub
        ? {
            id: sub.id as string,
            tier: sub.tier as SubscriptionTier,
            status: sub.status as string,
            unlockedStages: (sub.unlocked_stages as number[]) || [],
            unlockedProducts: (sub.unlocked_products as string[]) || [],
            periodStart: sub.current_period_start as string | null,
            periodEnd: sub.current_period_end as string | null,
            cancelAtPeriodEnd: sub.cancel_at_period_end as boolean,
            autoRenew: (sub.auto_renew as boolean) ?? true,
            discountPercent: (sub.discount_percent as number) || 0,
          }
        : null;

      return {
        id: student.id as string,
        email: student.email as string,
        displayName: (student.display_name || student.full_name) as string | null,
        avatarUrl: student.avatar_url as string | null,
        schoolId: student.school_id as string | null,
        orgRole: trustedRole as 'admin' | 'member' | null,
        subscription,
        createdAt: student.created_at as string,
      };
    } catch {
      // Fallback: return basic user from Supabase auth
      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        displayName: supabaseUser.user_metadata?.full_name || null,
        avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
        schoolId: null,
        orgRole: null,
        subscription: null,
        createdAt: new Date().toISOString(),
      };
    }
  }, []);

  // Listen to auth state changes.
  // Use getSession() as the single source for the initial state,
  // and onAuthStateChange only for subsequent events (SIGNED_IN,
  // SIGNED_OUT, TOKEN_REFRESHED). This prevents a race where
  // both fire concurrently and one resolves with a stale/null
  // session, causing a flash of locked/login content.
  useEffect(() => {
    let initialised = false;
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Skip the INITIAL_SESSION event — getSession() handles it below
        if (!initialised) return;

        setSession(newSession);
        if (newSession?.user) {
          const profile = await fetchUserProfile(newSession.user);
          setUser(profile);
        } else {
          setUser(null);
        }
      }
    );

    // Initial session check — the single place that sets loading = false
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        const profile = await fetchUserProfile(s.user);
        setUser(profile);
      }
      setLoading(false);
      initialised = true;
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  /* ─── Computed ─────────────────────────────────── */

  const isOrgUser = !!user?.schoolId;
  const isAdmin = user?.orgRole === 'admin';

  const effectiveTier: SubscriptionTier = isOrgUser
    ? 'full_access'
    : user?.subscription?.tier || 'free';

  const canAccessStage = useCallback(
    (stageNumber: number): boolean => {
      if (stageNumber <= 1) return true; // Stage 0 and 1 are free
      if (isOrgUser) return true;
      if (!user?.subscription) return false;

      const now = new Date().toISOString();
      if (user.subscription.periodEnd && user.subscription.periodEnd < now) return false;

      switch (user.subscription.tier) {
        case 'full_access':
        case 'llm_course':
          return true;
        case 'stage':
          return user.subscription.unlockedStages.includes(stageNumber);
        default:
          return false;
      }
    },
    [user, isOrgUser]
  );

  const canAccessProduct = useCallback(
    (productId: string): boolean => {
      if (isOrgUser) return true;
      if (!user?.subscription) return false;

      const now = new Date().toISOString();
      if (user.subscription.periodEnd && user.subscription.periodEnd < now) return false;

      switch (user.subscription.tier) {
        case 'full_access':
        case 'saas_bundle':
          return true;
        case 'saas_single':
          return user.subscription.unlockedProducts.includes(productId);
        default:
          return false;
      }
    },
    [user, isOrgUser]
  );

  /* ─── Auth actions ──────────────────────────────── */

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    return { error: error?.message || null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });
    return { error: error?.message || null };
  }, []);

  const signInWithOrgCode = useCallback(async (code: string, email: string, password: string) => {
    const supabase = createClient();

    // Sign up (the handle_academy_signup trigger will create the student record)
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: email.split('@')[0] } },
    });

    if (authError) {
      // Try sign in if user already exists
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) return { error: signInError.message };
    }

    // Enroll in school via server action (updates sensitive columns server-side)
    const { enrollInSchool } = await import('@/lib/auth/enroll-school');
    const result = await enrollInSchool(code);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error: error?.message || null };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isOrgUser,
        isAdmin,
        effectiveTier,
        canAccessStage,
        canAccessProduct,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithOrgCode,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
