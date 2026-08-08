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
  UserCheck,
  BarChart3,
  UserMinus,
  UserPlus,
  Crown,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import { supabase } from '@/lib/auth/supabase';
import { cn } from '@/lib/utils';

/* ─── Types ─────────────────────────────────────────── */

interface SchoolMember {
  id: string;
  email: string;
  display_name: string | null;
  full_name: string | null;
  org_role: 'admin' | 'member' | null;
  tier: string;
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
  contact_name: string;
  verified: boolean;
  max_students: number;
  current_students: number;
}

/* ─── Helpers ───────────────────────────────────────── */

/** Platform admin = org_role 'admin' without a school_id */
function isPlatformAdmin(schoolId: string | null | undefined, isAdmin: boolean): boolean {
  return isAdmin && !schoolId;
}

function memberName(m: SchoolMember): string {
  return m.display_name || m.full_name || m.email.split('@')[0];
}

/* ─── Component ─────────────────────────────────────── */

export default function AdminPage() {
  const language = useAcademyStore((s) => s.language);
  const { user, isAdmin } = useAuth();

  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [allStudents, setAllStudents] = useState<SchoolMember[]>([]);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | false>(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const platformAdmin = isPlatformAdmin(user?.schoolId, isAdmin);

  const t = useCallback(
    (en: string, ro: string) => (language === 'ro' ? ro : en),
    [language]
  );

  /* ─── Data fetching ─────────────────────────────── */

  const fetchData = useCallback(async () => {
    setLoading(true);

    if (platformAdmin) {
      // Platform admin: ALL schools + ALL students
      const [{ data: schoolsData }, { data: studentsData }] = await Promise.all([
        supabase
          .from('academy_schools')
          .select('*')
          .order('name', { ascending: true }),
        supabase
          .from('academy_students')
          .select('id, email, display_name, full_name, org_role, tier, created_at, school_id')
          .order('created_at', { ascending: false }),
      ]);
      if (schoolsData) setSchools(schoolsData as SchoolData[]);
      if (studentsData) setAllStudents(studentsData as SchoolMember[]);
    } else if (user?.schoolId) {
      // School admin: own school + its members
      const [{ data: schoolData }, { data: memberData }] = await Promise.all([
        supabase
          .from('academy_schools')
          .select('*')
          .eq('id', user.schoolId)
          .single(),
        supabase
          .from('academy_students')
          .select('id, email, display_name, full_name, org_role, tier, created_at, school_id')
          .eq('school_id', user.schoolId)
          .order('created_at', { ascending: true }),
      ]);
      if (schoolData) setSchools([schoolData as SchoolData]);
      if (memberData) setAllStudents(memberData as SchoolMember[]);
    }

    setLoading(false);
  }, [platformAdmin, user?.schoolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Actions ───────────────────────────────────── */

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
    const newVerified = !school.verified;
    await supabase
      .from('academy_schools')
      .update({ verified: newVerified })
      .eq('id', school.id);
    setSchools((prev) =>
      prev.map((s) => (s.id === school.id ? { ...s, verified: newVerified } : s))
    );
  };

  const updateMaxStudents = async (school: SchoolData, delta: number) => {
    const newMax = Math.max(school.current_students, school.max_students + delta);
    await supabase
      .from('academy_schools')
      .update({ max_students: newMax })
      .eq('id', school.id);
    setSchools((prev) =>
      prev.map((s) => (s.id === school.id ? { ...s, max_students: newMax } : s))
    );
  };

  /** Remove a member from their org */
  const removeMemberFromOrg = async (member: SchoolMember) => {
    setActionLoading(member.id);
    await supabase
      .from('academy_students')
      .update({ school_id: null, org_role: null, tier: 'free' })
      .eq('id', member.id);

    // Decrement school count
    if (member.school_id) {
      await supabase.rpc('academy_decrement_school_seats', { p_school_id: member.school_id }).catch(() => {
        // If the RPC doesn't exist, update directly
        const school = schools.find((s) => s.id === member.school_id);
        if (school) {
          supabase
            .from('academy_schools')
            .update({ current_students: Math.max(0, school.current_students - 1) })
            .eq('id', school.id);
        }
      });
    }

    setAllStudents((prev) =>
      prev.map((s) =>
        s.id === member.id ? { ...s, school_id: null, org_role: null, tier: 'free' } : s
      )
    );
    setActionLoading(null);
  };

  /** Toggle a member's org_role between 'admin' and 'member' */
  const toggleOrgAdmin = async (member: SchoolMember) => {
    setActionLoading(member.id);
    const newRole = member.org_role === 'admin' ? 'member' : 'admin';
    await supabase
      .from('academy_students')
      .update({ org_role: newRole })
      .eq('id', member.id);
    setAllStudents((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, org_role: newRole } : s))
    );
    setActionLoading(null);
  };

  /** Delete a student entirely (platform admin only) */
  const deleteStudent = async (member: SchoolMember) => {
    setActionLoading(member.id);
    // Remove subscriptions first
    await supabase
      .from('academy_subscriptions')
      .delete()
      .eq('student_id', member.id);
    // Remove student record
    await supabase
      .from('academy_students')
      .delete()
      .eq('id', member.id);
    setAllStudents((prev) => prev.filter((s) => s.id !== member.id));
    setActionLoading(null);
  };

  /* ─── Access gate ───────────────────────────────── */

  if (!isAdmin) {
    return (
      <div className="py-12 text-center">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 font-heading text-xl font-bold text-foreground">
          {t('Admin access required', 'Acces restricționat')}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {t('Only admins can access this page.', 'Doar administratorii pot accesa această pagină.')}
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

  /* ─── Stats ─────────────────────────────────────── */

  const totalStudents = allStudents.length;
  const orgStudents = allStudents.filter((s) => s.school_id).length;
  const freeStudents = allStudents.filter((s) => !s.school_id).length;
  const totalSeats = schools.reduce((sum, s) => sum + s.max_students, 0);
  const usedSeats = schools.reduce((sum, s) => sum + s.current_students, 0);

  const membersOfSchool = (schoolId: string) =>
    allStudents.filter((s) => s.school_id === schoolId);

  /* ─── Member row (shared between platform + school admin views) ── */

  const MemberRow = ({ member, canManage }: { member: SchoolMember; canManage: boolean }) => {
    const name = memberName(member);
    const isSelf = member.id === user?.id;
    const isLoading = actionLoading === member.id;

    return (
      <div className="flex items-center justify-between py-2.5 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
            {name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {name}
              {isSelf && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">{member.email}</div>
          </div>
          {member.org_role === 'admin' && member.school_id && (
            <span className="shrink-0 rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] font-bold text-secondary">
              Org Admin
            </span>
          )}
          {member.org_role === 'admin' && !member.school_id && (
            <span className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
              Platform Admin
            </span>
          )}
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {member.tier}
          </span>
        </div>

        {canManage && !isSelf && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Toggle org admin */}
            {member.school_id && (
              <button
                onClick={() => toggleOrgAdmin(member)}
                disabled={isLoading}
                className={cn(
                  'rounded p-1.5 transition-colors',
                  member.org_role === 'admin'
                    ? 'text-secondary hover:text-secondary/70'
                    : 'text-muted-foreground hover:text-secondary'
                )}
                title={
                  member.org_role === 'admin'
                    ? t('Remove org admin role', 'Elimină rolul de admin')
                    : t('Make org admin', 'Fă admin organizație')
                }
              >
                <Crown className="h-4 w-4" />
              </button>
            )}

            {/* Remove from org */}
            {member.school_id && (
              <button
                onClick={() => removeMemberFromOrg(member)}
                disabled={isLoading}
                className="rounded p-1.5 text-muted-foreground hover:text-amber-500 transition-colors"
                title={t('Remove from organization', 'Elimină din organizație')}
              >
                <UserMinus className="h-4 w-4" />
              </button>
            )}

            {/* Delete student (platform admin only) */}
            {platformAdmin && (
              <button
                onClick={() => deleteStudent(member)}
                disabled={isLoading}
                className="rounded p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                title={t('Delete student', 'Șterge studentul')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ─── Render ────────────────────────────────────── */

  return (
    <div className="py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-secondary" />
            {platformAdmin
              ? t('Platform Administration', 'Administrare Platformă')
              : t('Organization Administration', 'Administrare Organizație')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {platformAdmin
              ? t(
                  'Manage all organizations, students, and subscriptions',
                  'Gestionează toate organizațiile, studenții și abonamentele'
                )
              : t('Manage your organization members', 'Gestionează membrii organizației')}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={t('Refresh', 'Reîncarcă')}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats cards */}
      <div className={cn('grid gap-4', platformAdmin ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3')}>
        {platformAdmin && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {t('Organizations', 'Organizații')}
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">{schools.length}</div>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {t('Total Students', 'Total Studenți')}
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">{totalStudents}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCheck className="h-4 w-4" />
            {platformAdmin
              ? t('In Organizations', 'În Organizații')
              : t('Members', 'Membri')}
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {orgStudents}
            {platformAdmin && (
              <span className="text-sm font-normal text-muted-foreground"> / {freeStudents} free</span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            {t('Seats Used', 'Locuri Utilizate')}
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {usedSeats} / {totalSeats}
          </div>
        </div>
      </div>

      {/* ── Organizations ──────────────────────────── */}
      {schools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t('No organizations yet.', 'Nu există organizații încă.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-secondary" />
            {t('Organizations', 'Organizații')}
          </h2>

          {schools.map((school) => {
            const isExpanded = expandedSchool === school.id;
            const members = membersOfSchool(school.id);
            const schoolAdmins = members.filter((m) => m.org_role === 'admin');

            return (
              <div
                key={school.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* School header row */}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-foreground">{school.name}</span>
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-bold',
                          school.verified
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-amber-500/10 text-amber-500'
                        )}
                      >
                        {school.verified ? t('Verified', 'Verificat') : t('Pending', 'În așteptare')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {school.country}
                      {school.city ? `, ${school.city}` : ''} · {school.slug}
                      {school.domain ? ` · ${school.domain}` : ''}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-foreground">
                      {school.current_students}/{school.max_students}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {t('students', 'studenți')}
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-5">
                    {/* School info + actions */}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {school.contact_email}
                      </span>
                      {school.domain && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5" />
                          {school.domain}
                        </span>
                      )}
                      {schoolAdmins.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Crown className="h-3.5 w-3.5 text-secondary" />
                          {schoolAdmins.map((a) => memberName(a)).join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
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

                      {(platformAdmin || isAdmin) && (
                        <button
                          onClick={() => regenerateCode(school)}
                          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {t('New code', 'Cod nou')}
                        </button>
                      )}

                      {platformAdmin && (
                        <>
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
                              ? t('Revoke verification', 'Revocă verificare')
                              : t('Verify', 'Verifică')}
                          </button>
                          <button
                            onClick={() => updateMaxStudents(school, 10)}
                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            +10 {t('seats', 'locuri')}
                          </button>
                          <button
                            onClick={() => updateMaxStudents(school, -10)}
                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            -10 {t('seats', 'locuri')}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Members list */}
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
                        <Users className="h-4 w-4 text-primary" />
                        {t('Members', 'Membri')} ({members.length})
                      </h4>

                      {members.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          {t('No members yet.', 'Niciun membru încă.')}
                        </p>
                      ) : (
                        <div className="divide-y divide-border">
                          {members.map((member) => (
                            <MemberRow key={member.id} member={member} canManage={true} />
                          ))}
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

      {/* ── Individual students (platform admin only) ─ */}
      {platformAdmin && freeStudents > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <Users className="h-5 w-5 text-muted-foreground" />
            {t('Individual Students (no organization)', 'Studenți Individuali (fără organizație)')}
            <span className="text-sm font-normal text-muted-foreground">({freeStudents})</span>
          </h3>
          <div className="mt-4 divide-y divide-border">
            {allStudents
              .filter((s) => !s.school_id)
              .map((member) => (
                <MemberRow key={member.id} member={member} canManage={true} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
