'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/components/auth/auth-provider';
import { t } from '@/lib/i18n';
import { getMySchool, getSchoolStudents, inviteSchoolMember } from '@/lib/school/actions';
import { formatTime } from '@/lib/utils';
import {
  School,
  Users,
  Copy,
  Check,
  GraduationCap,
  BookOpen,
  Trophy,
  Clock,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Language } from '@/types';

interface SchoolData {
  id: string;
  name: string;
  country: string;
  city: string | null;
  contact_name: string;
  contact_email: string;
  invite_code: string | null;
  verified: boolean;
  max_students: number;
  ai_tutor_daily_limit: number;
}

interface StudentData {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  tier: string;
  enrolled_at: string;
  last_active_at: string | null;
  lecturesCompleted: number;
  totalTimeSeconds: number;
  quizAverage: number | null;
}

export default function SchoolDashboardPage() {
  const language = useAcademyStore((s) => s.language) as Language;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [school, setSchool] = useState<SchoolData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Invite panel state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadData = useCallback(async () => {
    const schoolData = await getMySchool();
    if (!schoolData) {
      router.push('/school/apply');
      return;
    }

    if (!schoolData.verified) {
      router.push('/school/apply');
      return;
    }

    setSchool(schoolData as SchoolData);

    const result = await getSchoolStudents(schoolData.id);
    if (result.error) {
      setError(result.error);
    } else {
      setStudents(result.students as StudentData[]);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/school/dashboard');
      return;
    }
    loadData();
  }, [user, authLoading, router, loadData]);

  async function handleCopyCode() {
    if (!school) return;
    await navigator.clipboard.writeText(school.invite_code || school.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    const res = await inviteSchoolMember({ email: inviteEmail, fullName: inviteName || undefined });
    setInviting(false);
    if (res?.error) {
      setInviteMsg({ ok: false, text: res.error });
    } else {
      setInviteMsg({ ok: true, text: t('school_invite_sent', language) || `Invitation sent to ${res.email}.` });
      setInviteEmail('');
      setInviteName('');
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!school) return null;

  // Aggregate stats
  const totalLectures = students.reduce((sum, s) => sum + s.lecturesCompleted, 0);
  const avgQuiz =
    students.filter((s) => s.quizAverage != null).length > 0
      ? Math.round(
          students
            .filter((s) => s.quizAverage != null)
            .reduce((sum, s) => sum + (s.quizAverage || 0), 0) /
            students.filter((s) => s.quizAverage != null).length
        )
      : null;
  const totalTime = students.reduce((sum, s) => sum + s.totalTimeSeconds, 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <School className="h-8 w-8 text-primary" />
            {school.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {school.city ? `${school.city}, ` : ''}{school.country}
          </p>
        </div>
        <Badge variant="outline" className="self-start text-green-700 border-green-300 bg-green-50 dark:text-green-300 dark:border-green-800 dark:bg-green-950/30">
          {t('school_verified', language)}
        </Badge>
      </div>

      {/* Enrollment Code Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('school_enrollment_code', language)}
              </p>
              <p className="font-mono text-lg font-bold tracking-wider mt-1">
                {school.invite_code || school.id}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCopyCode}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  {t('school_copied', language)}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t('school_copy_code', language)}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invite a Member Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('school_invite_member', language) || 'Invite a member'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-name">{t('auth_name', language)}</Label>
                <Input
                  id="invite-name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder={t('auth_name', language)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t('auth_email', language)}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="member@example.com"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={inviting} className="gap-2">
                <UserPlus className="h-4 w-4" />
                {inviting
                  ? (t('school_invite_sending', language) || 'Sending…')
                  : (t('school_invite_send', language) || 'Send invitation')}
              </Button>
              {inviteMsg && (
                <span className={inviteMsg.ok ? 'text-sm text-green-600 dark:text-green-400' : 'text-sm text-red-600 dark:text-red-400'}>
                  {inviteMsg.text}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('school_student_count', language)}</p>
                <p className="text-2xl font-bold">
                  {students.length}
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}/ {school.max_students}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <BookOpen className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('school_lectures_done', language)}</p>
                <p className="text-2xl font-bold">{totalLectures}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('school_quiz_avg', language)}</p>
                <p className="text-2xl font-bold">{avgQuiz != null ? `${avgQuiz}%` : '--'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('school_time_spent', language)}</p>
                <p className="text-2xl font-bold">{totalTime > 0 ? formatTime(totalTime) : '0m'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {t('school_students', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('school_no_students', language)}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">{t('auth_name', language)}</th>
                    <th className="pb-3 pr-4 font-medium">{t('auth_email', language)}</th>
                    <th className="pb-3 pr-4 font-medium text-center">{t('school_lectures_done', language)}</th>
                    <th className="pb-3 pr-4 font-medium text-center">{t('school_quiz_avg', language)}</th>
                    <th className="pb-3 pr-4 font-medium text-center">{t('school_time_spent', language)}</th>
                    <th className="pb-3 font-medium">{t('school_last_active', language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {student.full_name || student.display_name || '—'}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {student.email}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {student.lecturesCompleted}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {student.quizAverage != null ? `${student.quizAverage}%` : '—'}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {student.totalTimeSeconds > 0 ? formatTime(student.totalTimeSeconds) : '—'}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {student.last_active_at
                          ? new Date(student.last_active_at).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
