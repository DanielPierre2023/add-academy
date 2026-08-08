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
  ChevronDown,
  ChevronRight,
  Plus,
  UserCheck,
  BarChart3,
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
  school_id: string | null;
}

interface SchoolData {
  id: string;
  name: string;
  slug: string;
  country: string;
  city: string | null;
  domain: string | null;
  invite_code: string | null;
  contact_email: string;
  verified: boolean;
  max_students: number;
  current_students: number;
}

/** Platform admin = org_role 'admin' without a school_id */
function isPlatformAdmin(schoolId: string | null | undefined, isAdmin: boolean): boolean {
  return isAdmin && !schoolId;
}

export default function AdminPage() {
  const language = useAcademyStore((s) => s.language);
  const { user, isAdmin } = useAuth();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [allStudents, setAllStudents] = useState<SchoolMember[]>([]);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | false>(false);
  const [loading, setLoading] = useState(true);

  const platformAdmin = isPlatformAdmin(user?.schoolId, isAdmin);

  // ── Platform admin: fetch ALL schools + ALL students ──
  const fetchPlatformData = useCallback(async () => {
    setLoading(true);

    const [{ data: schoolsData }, { data: studentsData }] = await Promise.all([
      supabase
        .from('academy_schools')
        .select('*')
        .order('name', { ascending: true }),
      supabase
        .from('academy_students')
        .select('id, email, display_name, full_name, org_role, created_at, school_id')
        .order('created_at', { ascending: false }),
    ]);

    if (schoolsData) setSchools(schoolsData as SchoolData[]);
    if (studentsData) setAllStudents(studentsData as SchoolMember[]);
    setLoading(false);
  }, []);

  // ── School admin: fetch own school + members ──
  const fetchSchoolData = useCallback(async () => {
    if (!user?.schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: schoolData }, { data: memberData }] = await Promise.all([
      supabase
        .from('academy_schools')
        .select('*')
        .eq('id', user.schoolId)
        .single(),
      supabase
        .from('academy_students')
        .select('id, email, display_name, full_name, org_role, created_at, school_id')
        .eq('school_id', user.schoolId)
        .order('created_at', { ascending: true }),
    ]);

    if (schoolData) setSchools([schoolData as SchoolData]);
    if (memberData) setAllStudents(memberData as SchoolMember[]);
    setLoading(false);
  }, [user?.schoolId]);

  useEffect(() => {
    if (platformAdmin) {
      fetchPlatformData();
    } else {
      fetchSchoolData();
    }
  }, [platformAdmin, fetchPlatformData, fetchSchoolData]);

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateCode = async (school: SchoolData) => {
    const newCode = `${school.slug.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    await supabase
      .from('academy_schools')
      .update({ invite_code: newCode })
      .eq('id', school.id);
    setSchools((prev) =>
      prev.map((s) => (s.id === school.id ? { ...s, invite_code: newCode } : s))
    );
  };

  const toggleVerified = async (school: SchoolData) => {
    if (!platformAdmin) return;
    const newVerified = !school.verified;
    await supabase
      .from('academy_schools')
      .update({ verified: newVerified })
      .eq('id', school.id);
    setSchools((prev) =>
      prev.map((s) => (s.id === school.id ? { ...s, verified: newVerified } : s))
    );
  };

  const removeMember = async (memberId: string) => {
    await supabase
      .from('academy_students')
      .update({ school_id: null, org_role: null, tier: 'free' })
      .eq('id', memberId);
    setAllStudents((prev) => prev.filter((m) => m.id !== memberId));
  };

  // ── Access check ──
  if (!isAdmin) {
    return (
      <div className="py-12 text-center">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 font-heading text-xl font-bold text-foreground">
          {language === 'ro' ? 'Acces restricționat' : 'Admin access required'}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {language === 'ro'
            ? 'Doar administratorii pot accesa această pagină.'
            : 'Only admins can access this page.'}
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

  // ── Computed stats ──
  const totalStudents = allStudents.length;
  const orgStudents = allStudents.filter((s) => s.school_id).length;
  const freeStudents = allStudents.filter((s) => !s.school_id).length;
  const totalSeats = schools.reduce((sum, s) => sum + s.max_students, 0);
  const usedSeats = schools.reduce((sum, s) => sum + s.current_students, 0);

  const membersOfSchool = (schoolId: string) =>
    allStudents.filter((s) => s.school_id === schoolId);

  return (
    <div className="py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-secondary" />
          {platformAdmin
            ? (language === 'ro' ? 'Administrare Platformă' : 'Platform Administration')
            : (language === 'ro' ? 'Administrare Organizație' : 'Organization Administration')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {platformAdmin
            ? (language === 'ro'
              ? 'Gestionează toate organizațiile și studenții'
              : 'Manage all organizations and students')
            : (language === 'ro'
              ? 'Administrare organizație'
              : 'Organization administration')}
        </p>
      </div>

      {/* Platform-wide stats (platform admin only) */}
      {platformAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {language === 'ro' ? 'Organizații' : 'Organizations'}
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">{schools.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {language === 'ro' ? 'Total Studenți' : 'Total Students'}
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">{totalStudents}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              {language === 'ro' ? 'În Organizații' : 'In Organizations'}
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {orgStudents} <span className="text-sm font-normal text-muted-foreground">/ {freeStudents} free</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              {language === 'ro' ? 'Locuri Utilizate' : 'Seats Used'}
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {usedSeats} / {totalSeats}
            </div>
          </div>
        </div>
      )}

      {/* Organizations list */}
      {schools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {language === 'ro' ? 'Nu există organizații încă.' : 'No organizations yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {schools.map((school) => {
            const isExpanded = expandedSchool === school.id;
            const members = membersOfSchool(school.id);

            return (
              <div key={school.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* School header */}
                <button
                  onClick={() => setExpandedSchool(isExpanded ? null : school.id)}
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-foreground truncate">
                        {school.name}
                      </span>
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-bold',
                          school.verified
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-amber-500/10 text-amber-500'
                        )}
                      >
                        {school.verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {school.country}{school.city ? `, ${school.city}` : ''} · {school.slug}
                      {school.domain ? ` · ${school.domain}` : ''}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-foreground">
                      {school.current_students}/{school.max_students}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {language === 'ro' ? 'studenți' : 'students'}
                    </div>
                  </div>
                </button>

                {/* Expanded school details */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Actions row */}
                    <div className="flex flex-wrap gap-2">
                      {/* Invite code */}
                      {school.invite_code && (
                        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5">
                          <Key className="h-3.5 w-3.5 text-secondary" />
                          <span className="font-mono text-sm font-bold tracking-wider text-foreground">
                            {school.invite_code}
                          </span>
                          <button
                            onClick={() => copyInviteCode(school.invite_code!)}
                            className="ml-1 text-muted-foreground hover:text-foreground"
                          >
                            {copied === school.invite_code ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {platformAdmin && (
                        <>
                          <button
                            onClick={() => regenerateCode(school)}
                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            {language === 'ro' ? 'Regenerează cod' : 'Regenerate code'}
                          </button>
                          <button
                            onClick={() => toggleVerified(school)}
                            className={cn(
                              'flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                              school.verified
                                ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'
                                : 'border-green-500/30 text-green-500 hover:bg-green-500/10'
                            )}
                          >
                            {school.verified
                              ? (language === 'ro' ? 'Revocă verificare' : 'Revoke verification')
                              : (language === 'ro' ? 'Verifică' : 'Verify')}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Members list */}
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                        <Users className="h-4 w-4 text-primary" />
                        {language === 'ro' ? 'Studenți' : 'Students'} ({members.length})
                      </h4>

                      {members.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          {language === 'ro' ? 'Niciun student încă.' : 'No students yet.'}
                        </p>
                      ) : (
                        <div className="divide-y divide-border">
                          {members.map((member) => {
                            const name = member.display_name || member.full_name || member.email.split('@')[0];
                            return (
                              <div key={member.id} className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                    {name[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-foreground">{name}</div>
                                    <div className="text-[11px] text-muted-foreground">{member.email}</div>
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
                                    title={language === 'ro' ? 'Elimină studentul' : 'Remove student'}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Free students (platform admin only) */}
      {platformAdmin && freeStudents > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <Users className="h-5 w-5 text-muted-foreground" />
            {language === 'ro' ? 'Studenți Individuali (fără organizație)' : 'Individual Students (no organization)'}
            <span className="text-sm font-normal text-muted-foreground">({freeStudents})</span>
          </h3>
          <div className="mt-4 divide-y divide-border">
            {allStudents
              .filter((s) => !s.school_id)
              .slice(0, 50)
              .map((member) => {
                const name = member.display_name || member.full_name || member.email.split('@')[0];
                return (
                  <div key={member.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                        {name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{name}</div>
                        <div className="text-[11px] text-muted-foreground">{member.email}</div>
                      </div>
                      {member.org_role === 'admin' && (
                        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                          Platform Admin
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            {freeStudents > 50 && (
              <p className="py-2 text-xs text-muted-foreground">
                ... {language === 'ro' ? `și încă ${freeStudents - 50}` : `and ${freeStudents - 50} more`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
