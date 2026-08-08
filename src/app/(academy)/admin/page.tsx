'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  Key,
  Copy,
  Check,
  Trash2,
  Shield,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import { supabase } from '@/lib/auth/supabase';
import { cn } from '@/lib/utils';

interface SchoolMember {
  id: string;
  email: string;
  display_name: string | null;
  full_name: string | null;
  org_role: 'admin' | 'member' | null;
  created_at: string;
}

interface SchoolData {
  id: string;
  name: string;
  slug: string;
  country: string;
  domain: string | null;
  invite_code: string | null;
  verified: boolean;
  max_students: number;
  current_students: number;
}

export default function AdminPage() {
  const language = useAcademyStore((s) => s.language);
  const { user, isAdmin } = useAuth();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [members, setMembers] = useState<SchoolMember[]>([]);
  const [copied, setCopied] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.schoolId) return;
    setLoading(true);

    const { data: schoolData } = await supabase
      .from('academy_schools')
      .select('*')
      .eq('id', user.schoolId)
      .single();

    if (schoolData) {
      setSchool(schoolData as SchoolData);
      setDomainInput(schoolData.domain || '');
    }

    const { data: memberData } = await supabase
      .from('academy_students')
      .select('id, email, display_name, full_name, org_role, created_at')
      .eq('school_id', user.schoolId)
      .order('created_at', { ascending: true });

    if (memberData) setMembers(memberData as SchoolMember[]);
    setLoading(false);
  }, [user?.schoolId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyInviteCode = () => {
    if (school?.invite_code) {
      navigator.clipboard.writeText(school.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const regenerateCode = async () => {
    if (!school) return;
    const newCode = `${school.slug.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    await supabase
      .from('academy_schools')
      .update({ invite_code: newCode })
      .eq('id', school.id);
    setSchool({ ...school, invite_code: newCode });
  };

  const updateDomain = async () => {
    if (!school) return;
    await supabase
      .from('academy_schools')
      .update({ domain: domainInput || null })
      .eq('id', school.id);
    setSchool({ ...school, domain: domainInput || null });
  };

  const removeMember = async (memberId: string) => {
    if (!school) return;
    await supabase
      .from('academy_students')
      .update({ school_id: null, org_role: null, tier: 'free' })
      .eq('id', memberId);
    setMembers(members.filter((m) => m.id !== memberId));
  };

  if (!isAdmin) {
    return (
      <div className="py-12 text-center">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 font-heading text-xl font-bold text-foreground">
          {language === 'ro' ? 'Acces restricționat' : 'Admin access required'}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {language === 'ro'
            ? 'Doar administratorii organizației pot accesa această pagină.'
            : 'Only organization admins can access this page.'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-6 w-6 text-secondary" />
          {school?.name || 'Organization'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {language === 'ro' ? 'Administrare organizație' : 'Organization administration'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">{language === 'ro' ? 'Studenți' : 'Students'}</div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {school?.current_students} / {school?.max_students}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">{language === 'ro' ? 'Locuri disponibile' : 'Available seats'}</div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {(school?.max_students || 0) - (school?.current_students || 0)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">{language === 'ro' ? 'Status' : 'Status'}</div>
          <div className={cn('mt-1 text-2xl font-bold', school?.verified ? 'text-green-600' : 'text-amber-500')}>
            {school?.verified
              ? (language === 'ro' ? 'Verificat' : 'Verified')
              : (language === 'ro' ? 'În așteptare' : 'Pending')}
          </div>
        </div>
      </div>

      {/* Invite Code */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
          <Key className="h-5 w-5 text-secondary" />
          {language === 'ro' ? 'Cod de invitare' : 'Invite Code'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {language === 'ro'
            ? 'Distribuie acest cod elevilor/studenților pentru a se alătura.'
            : 'Share this code with students to join your organization.'}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 rounded-lg border border-border bg-muted px-4 py-3 font-mono text-lg font-bold tracking-widest text-foreground">
            {school?.invite_code || '—'}
          </div>
          <button
            onClick={copyInviteCode}
            className="rounded-lg border border-border p-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
          </button>
          <button
            onClick={regenerateCode}
            className="rounded-lg border border-border p-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Regenerate code"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Domain auto-join */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
          <Globe className="h-5 w-5 text-primary" />
          {language === 'ro' ? 'Auto-asociere pe domeniu' : 'Domain Auto-Join'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {language === 'ro'
            ? 'Utilizatorii cu adrese de email pe acest domeniu se vor alătura automat.'
            : 'Users with email addresses on this domain will auto-join your organization.'}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="school.edu"
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={updateDomain}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {language === 'ro' ? 'Salvează' : 'Save'}
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
          <Users className="h-5 w-5 text-primary" />
          {language === 'ro' ? 'Studenți' : 'Students'} ({members.length})
        </h3>

        <div className="mt-4 divide-y divide-border">
          {members.map((member) => {
            const name = member.display_name || member.full_name || member.email.split('@')[0];
            return (
              <div key={member.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{name}</div>
                    <div className="text-xs text-muted-foreground">{member.email}</div>
                  </div>
                  {member.org_role === 'admin' && (
                    <span className="rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] font-bold text-secondary">
                      Admin
                    </span>
                  )}
                </div>
                {member.id !== user?.id && member.org_role !== 'admin' && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove student"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
