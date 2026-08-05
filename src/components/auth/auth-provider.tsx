'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface AcademyUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  tier: 'free' | 'pro' | 'team' | 'enterprise' | 'school';
  schoolId: string | null;
  isSchoolContact: boolean;
}

interface AuthContextType {
  user: AcademyUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function mapSupabaseUser(
  supabaseUser: SupabaseUser,
  studentData?: Record<string, unknown> | null,
  isSchoolContact = false
): AcademyUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name:
      (studentData?.full_name as string) ||
      (studentData?.display_name as string) ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      '',
    avatarUrl:
      (studentData?.avatar_url as string) ||
      supabaseUser.user_metadata?.avatar_url ||
      null,
    tier: ((studentData?.tier as string) || 'free') as AcademyUser['tier'],
    schoolId: (studentData?.school_id as string) || null,
    isSchoolContact,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AcademyUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    try {
      const supabase = createClient();

      // Fetch student profile and check if user is a school contact in parallel
      const [studentResult, schoolResult] = await Promise.all([
        supabase
          .from('academy_students')
          .select('full_name, display_name, avatar_url, tier, school_id')
          .eq('id', supabaseUser.id)
          .single(),
        supabase
          .from('academy_schools')
          .select('id')
          .eq('contact_user_id', supabaseUser.id)
          .eq('verified', true)
          .maybeSingle(),
      ]);

      setUser(mapSupabaseUser(supabaseUser, studentResult.data, !!schoolResult.data));
    } catch {
      // If student profile doesn't exist yet (trigger hasn't fired), use basic user data
      setUser(mapSupabaseUser(supabaseUser, null));
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (supabaseUser) {
      await fetchStudentProfile(supabaseUser);
    }
  }, [fetchStudentProfile]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user: supabaseUser } }) => {
      if (supabaseUser) {
        fetchStudentProfile(supabaseUser);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchStudentProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await fetchStudentProfile(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchStudentProfile]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut: handleSignOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
