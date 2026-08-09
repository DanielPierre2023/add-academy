'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Send,
  Tag,
  DollarSign,
  TrendingUp,
  BookOpen,
  Lock,
  Unlock,
  Percent,
  MapPin,
  Search,
  Filter,
  Download,
  Bell,
  Settings,
  Activity,
  Eye,
  CreditCard,
  Calendar,
  Clock,
  Award,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Megaphone,
  Bug,
  MessageSquare,
  MessageCircle,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import { supabase } from '@/lib/auth/supabase';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { STAGES } from '@/types';
import {
  ALL_PLANS,
  STAGE_PLANS,
  PACKAGE_PLANS,
  SAAS_PLANS,
  SAAS_PRODUCTS,
} from '@/lib/subscriptions/plans';

/* ─── Types ─────────────────────────────────────────── */

interface SchoolMember {
  id: string;
  email: string;
  display_name: string | null;
  full_name: string | null;
  org_role: 'admin' | 'member' | null;
  tier: string;
  created_at: string;
  last_active_at: string | null;
  school_id: string | null;
  preferred_language: string | null;
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
  ai_tutor_daily_limit: number;
  logo_url: string | null;
  created_at: string;
}

interface SubscriptionData {
  id: string;
  student_id: string;
  tier: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  unlocked_stages: number[];
  unlocked_products: string[];
  discount_percent: number;
  auto_renew: boolean;
  created_at: string;
  stripe_subscription_id: string | null;
}

interface CourseData {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
}

interface ReportData {
  id: string;
  student_id: string;
  student_email: string;
  student_name: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  page_url: string;
  user_agent: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Helpers ───────────────────────────────────────── */

function isPlatformAdmin(schoolId: string | null | undefined, isAdmin: boolean): boolean {
  return isAdmin && !schoolId;
}

function memberName(m: SchoolMember): string {
  return m.display_name || m.full_name || m.email.split('@')[0];
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateShort(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

function timeAgo(date: string | null): string {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateShort(date);
}

function tierColor(tier: string): string {
  switch (tier) {
    case 'enterprise':
    case 'full_access':
      return 'bg-violet-500/10 text-violet-500';
    case 'llm_course':
      return 'bg-blue-500/10 text-blue-500';
    case 'saas_bundle':
      return 'bg-emerald-500/10 text-emerald-500';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-500/10 text-green-500';
    case 'trialing':
      return 'bg-blue-500/10 text-blue-500';
    case 'past_due':
      return 'bg-amber-500/10 text-amber-500';
    case 'canceled':
    case 'unpaid':
      return 'bg-red-500/10 text-red-500';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/* ─── Stat Card ─────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  trendLabel,
  color = 'text-primary',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-border/80 transition-colors">
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-2 text-xs font-medium', color)}>
          <Icon className="h-4 w-4" />
          {label}
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-[10px] font-medium',
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {trend === 'up' ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : null}
            {trendLabel}
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      {subValue && <div className="mt-0.5 text-xs text-muted-foreground">{subValue}</div>}
    </div>
  );
}

/* ─── Search & Filter bar ──────────────────────────── */

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
      />
    </div>
  );
}

/* ─── Component ─────────────────────────────────────── */

export default function AdminPage() {
  const language = useAcademyStore((s) => s.language);
  const { user, isAdmin } = useAuth();

  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [allStudents, setAllStudents] = useState<SchoolMember[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | false>(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Search & filter states
  const [studentSearch, setStudentSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [subSearch, setSubSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState<'all' | 'free' | 'paid' | 'org'>('all');
  const [subFilter, setSubFilter] = useState<'all' | 'active' | 'canceled' | 'past_due'>('all');
  const [reportSearch, setReportSearch] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Dialog states
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailType, setEmailType] = useState<'individual' | 'org' | 'all'>('individual');

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSchoolId, setInviteSchoolId] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');

  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountStudentId, setDiscountStudentId] = useState('');
  const [discountPercent, setDiscountPercent] = useState(10);

  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');

  const [newOrgDialogOpen, setNewOrgDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [newOrgCountry, setNewOrgCountry] = useState('');
  const [newOrgCity, setNewOrgCity] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgContact, setNewOrgContact] = useState('');
  const [newOrgDomain, setNewOrgDomain] = useState('');
  const [newOrgMaxStudents, setNewOrgMaxStudents] = useState(50);

  const platformAdmin = isPlatformAdmin(user?.schoolId, isAdmin);

  const t = useCallback(
    (en: string, ro: string) => (language === 'ro' ? ro : en),
    [language]
  );

  /* ─── Data fetching ─────────────────────────────── */

  const fetchData = useCallback(async () => {
    setLoading(true);

    if (platformAdmin) {
      const [
        { data: schoolsData },
        { data: studentsData },
        { data: subsData },
        { data: coursesData },
        { data: reportsData },
      ] = await Promise.all([
        supabase.from('academy_schools').select('*').order('name', { ascending: true }),
        supabase
          .from('academy_students')
          .select('id, email, display_name, full_name, org_role, tier, created_at, last_active_at, school_id, preferred_language')
          .order('created_at', { ascending: false }),
        supabase.from('academy_subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('academy_courses').select('*').order('sort_order', { ascending: true }),
        supabase.from('academy_reports').select('*').order('created_at', { ascending: false }),
      ]);
      if (schoolsData) setSchools(schoolsData as SchoolData[]);
      if (studentsData) setAllStudents(studentsData as SchoolMember[]);
      if (subsData) setSubscriptions(subsData as SubscriptionData[]);
      if (coursesData) setCourses(coursesData as CourseData[]);
      if (reportsData) setReports(reportsData as ReportData[]);
    } else if (user?.schoolId) {
      const [{ data: schoolData }, { data: memberData }, { data: subsData }] = await Promise.all([
        supabase.from('academy_schools').select('*').eq('id', user.schoolId).single(),
        supabase
          .from('academy_students')
          .select('id, email, display_name, full_name, org_role, tier, created_at, last_active_at, school_id, preferred_language')
          .eq('school_id', user.schoolId)
          .order('created_at', { ascending: true }),
        supabase.from('academy_subscriptions').select('*').order('created_at', { ascending: false }),
      ]);
      if (schoolData) setSchools([schoolData as SchoolData]);
      if (memberData) setAllStudents(memberData as SchoolMember[]);
      if (subsData) setSubscriptions(subsData as SubscriptionData[]);
    }

    setLoading(false);
  }, [platformAdmin, user?.schoolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Computed data ─────────────────────────────── */

  const totalStudents = allStudents.length;
  const orgStudents = allStudents.filter((s) => s.school_id).length;
  const freeStudents = allStudents.filter((s) => !s.school_id).length;
  const totalSeats = schools.reduce((sum, s) => sum + s.max_students, 0);
  const usedSeats = schools.reduce((sum, s) => sum + s.current_students, 0);

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active').length;
  const canceledSubscriptions = subscriptions.filter((s) => s.status === 'canceled').length;

  const recentStudents = allStudents.filter((s) => {
    const d = new Date(s.created_at);
    const now = new Date();
    return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  });

  const activeToday = allStudents.filter((s) => {
    if (!s.last_active_at) return false;
    const d = new Date(s.last_active_at);
    const now = new Date();
    return now.getTime() - d.getTime() < 24 * 60 * 60 * 1000;
  });

  const membersOfSchool = (schoolId: string) =>
    allStudents.filter((s) => s.school_id === schoolId);

  // Revenue estimation (based on subscription tiers)
  const monthlyRevenue = useMemo(() => {
    let total = 0;
    subscriptions
      .filter((s) => s.status === 'active')
      .forEach((sub) => {
        const plan = ALL_PLANS.find((p) => p.id === sub.tier || p.id === sub.tier.replace('_', '-'));
        if (plan) {
          total += (plan.price * (100 - sub.discount_percent)) / 100 / 3; // monthly from 3-month cycle
        } else if (sub.tier === 'full_access') {
          total += 99 / 3;
        }
      });
    return total;
  }, [subscriptions]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    let result = allStudents;
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      result = result.filter(
        (s) =>
          s.email.toLowerCase().includes(q) ||
          (s.display_name || '').toLowerCase().includes(q) ||
          (s.full_name || '').toLowerCase().includes(q)
      );
    }
    if (studentFilter === 'free') result = result.filter((s) => !s.school_id && s.tier === 'free');
    if (studentFilter === 'paid') result = result.filter((s) => s.tier !== 'free');
    if (studentFilter === 'org') result = result.filter((s) => !!s.school_id);
    return result;
  }, [allStudents, studentSearch, studentFilter]);

  // Filtered subscriptions
  const filteredSubscriptions = useMemo(() => {
    let result = subscriptions;
    if (subSearch) {
      const q = subSearch.toLowerCase();
      result = result.filter((s) => {
        const student = allStudents.find((st) => st.id === s.student_id);
        return (
          s.tier.toLowerCase().includes(q) ||
          (student && (student.email.toLowerCase().includes(q) || memberName(student).toLowerCase().includes(q)))
        );
      });
    }
    if (subFilter === 'active') result = result.filter((s) => s.status === 'active');
    if (subFilter === 'canceled') result = result.filter((s) => s.status === 'canceled');
    if (subFilter === 'past_due') result = result.filter((s) => s.status === 'past_due');
    return result;
  }, [subscriptions, subSearch, subFilter, allStudents]);

  /* ─── Actions ───────────────────────────────────── */

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateCode = async (school: SchoolData) => {
    const newCode = `${school.slug.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from('academy_schools').update({ invite_code: newCode }).eq('id', school.id);
    setSchools((prev) => prev.map((s) => (s.id === school.id ? { ...s, invite_code: newCode } : s)));
  };

  const toggleVerified = async (school: SchoolData) => {
    const newVerified = !school.verified;
    await supabase.from('academy_schools').update({ verified: newVerified }).eq('id', school.id);
    setSchools((prev) => prev.map((s) => (s.id === school.id ? { ...s, verified: newVerified } : s)));
  };

  const updateMaxStudents = async (school: SchoolData, delta: number) => {
    const newMax = Math.max(school.current_students, school.max_students + delta);
    await supabase.from('academy_schools').update({ max_students: newMax }).eq('id', school.id);
    setSchools((prev) => prev.map((s) => (s.id === school.id ? { ...s, max_students: newMax } : s)));
  };

  const removeMemberFromOrg = async (member: SchoolMember) => {
    setActionLoading(member.id);
    await supabase
      .from('academy_students')
      .update({ school_id: null, org_role: null, tier: 'free' })
      .eq('id', member.id);
    if (member.school_id) {
      const school = schools.find((s) => s.id === member.school_id);
      if (school) {
        await supabase
          .from('academy_schools')
          .update({ current_students: Math.max(0, school.current_students - 1) })
          .eq('id', school.id);
        setSchools((prev) =>
          prev.map((s) =>
            s.id === member.school_id
              ? { ...s, current_students: Math.max(0, s.current_students - 1) }
              : s
          )
        );
      }
    }
    setAllStudents((prev) =>
      prev.map((s) =>
        s.id === member.id ? { ...s, school_id: null, org_role: null, tier: 'free' } : s
      )
    );
    setActionLoading(null);
  };

  const toggleOrgAdmin = async (member: SchoolMember) => {
    setActionLoading(member.id);
    const newRole = member.org_role === 'admin' ? 'member' : 'admin';
    await supabase.from('academy_students').update({ org_role: newRole }).eq('id', member.id);
    setAllStudents((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, org_role: newRole } : s))
    );
    setActionLoading(null);
  };

  const deleteStudent = async (member: SchoolMember) => {
    if (!confirm(`Delete ${memberName(member)} (${member.email})? This cannot be undone.`)) return;
    setActionLoading(member.id);
    await supabase.from('academy_subscriptions').delete().eq('student_id', member.id);
    await supabase.from('academy_students').delete().eq('id', member.id);
    setAllStudents((prev) => prev.filter((s) => s.id !== member.id));
    setSubscriptions((prev) => prev.filter((s) => s.student_id !== member.id));
    setActionLoading(null);
  };

  const updateStudentTier = async (studentId: string, newTier: string) => {
    setActionLoading(studentId);
    await supabase.from('academy_students').update({ tier: newTier }).eq('id', studentId);
    setAllStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, tier: newTier } : s))
    );
    setActionLoading(null);
  };

  const updateSubscriptionDiscount = async (subId: string, discount: number) => {
    await supabase.from('academy_subscriptions').update({ discount_percent: discount }).eq('id', subId);
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, discount_percent: discount } : s))
    );
  };

  const toggleSubscriptionAutoRenew = async (sub: SubscriptionData) => {
    const newValue = !sub.auto_renew;
    await supabase.from('academy_subscriptions').update({ auto_renew: newValue }).eq('id', sub.id);
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, auto_renew: newValue } : s))
    );
  };

  const cancelSubscription = async (sub: SubscriptionData) => {
    if (!confirm('Cancel this subscription?')) return;
    await supabase
      .from('academy_subscriptions')
      .update({ status: 'canceled', cancel_at_period_end: true })
      .eq('id', sub.id);
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === sub.id ? { ...s, status: 'canceled', cancel_at_period_end: true } : s
      )
    );
  };

  const toggleCourseActive = async (course: CourseData) => {
    const newActive = !course.is_active;
    await supabase.from('academy_courses').update({ is_active: newActive }).eq('id', course.id);
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, is_active: newActive } : c))
    );
  };

  const grantStageAccess = async (studentId: string, stageNum: number) => {
    const sub = subscriptions.find((s) => s.student_id === studentId && s.status === 'active');
    if (sub) {
      const stages = [...new Set([...sub.unlocked_stages, stageNum])].sort();
      await supabase.from('academy_subscriptions').update({ unlocked_stages: stages }).eq('id', sub.id);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, unlocked_stages: stages } : s))
      );
    } else {
      // Create a new subscription with this stage unlocked
      const { data } = await supabase
        .from('academy_subscriptions')
        .insert({
          student_id: studentId,
          tier: 'free',
          status: 'active',
          unlocked_stages: [stageNum],
          unlocked_products: [],
          discount_percent: 0,
        })
        .select()
        .single();
      if (data) setSubscriptions((prev) => [data as SubscriptionData, ...prev]);
    }
  };

  const revokeStageAccess = async (studentId: string, stageNum: number) => {
    const sub = subscriptions.find((s) => s.student_id === studentId && s.status === 'active');
    if (sub) {
      const stages = sub.unlocked_stages.filter((n) => n !== stageNum);
      await supabase.from('academy_subscriptions').update({ unlocked_stages: stages }).eq('id', sub.id);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, unlocked_stages: stages } : s))
      );
    }
  };

  const createOrganization = async () => {
    if (!newOrgName || !newOrgSlug || !newOrgCountry || !newOrgEmail || !newOrgContact) return;
    const inviteCode = `${newOrgSlug.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase
      .from('academy_schools')
      .insert({
        name: newOrgName,
        slug: newOrgSlug,
        country: newOrgCountry,
        city: newOrgCity || null,
        contact_email: newOrgEmail,
        contact_name: newOrgContact,
        domain: newOrgDomain || null,
        invite_code: inviteCode,
        max_students: newOrgMaxStudents,
      })
      .select()
      .single();
    if (data && !error) {
      setSchools((prev) => [...prev, data as SchoolData]);
      setNewOrgDialogOpen(false);
      setNewOrgName('');
      setNewOrgSlug('');
      setNewOrgCountry('');
      setNewOrgCity('');
      setNewOrgEmail('');
      setNewOrgContact('');
      setNewOrgDomain('');
      setNewOrgMaxStudents(50);
    }
  };

  const deleteOrganization = async (school: SchoolData) => {
    if (!confirm(`Delete organization "${school.name}"? All members will become individual students.`)) return;
    // Remove all members from this org
    await supabase
      .from('academy_students')
      .update({ school_id: null, org_role: null, tier: 'free' })
      .eq('school_id', school.id);
    await supabase.from('academy_schools').delete().eq('id', school.id);
    setSchools((prev) => prev.filter((s) => s.id !== school.id));
    setAllStudents((prev) =>
      prev.map((s) =>
        s.school_id === school.id ? { ...s, school_id: null, org_role: null, tier: 'free' } : s
      )
    );
  };

  /* ─── Report actions ─────────────────────────────── */

  const updateReportStatus = async (reportId: string, status: ReportData['status']) => {
    await supabase.from('academy_reports').update({ status }).eq('id', reportId);
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
  };

  const respondToReport = async (reportId: string) => {
    if (!replyText.trim()) return;
    const now = new Date().toISOString();
    await supabase
      .from('academy_reports')
      .update({
        admin_response: replyText.trim(),
        responded_at: now,
        status: 'resolved' as const,
      })
      .eq('id', reportId);
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, admin_response: replyText.trim(), responded_at: now, status: 'resolved' as const }
          : r
      )
    );
    setReplyingTo(null);
    setReplyText('');
  };

  const deleteReport = async (reportId: string) => {
    await supabase.from('academy_reports').delete().eq('id', reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const filteredReports = useMemo(() => {
    let result = reports;
    if (reportSearch) {
      const q = reportSearch.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.student_name.toLowerCase().includes(q) ||
          r.student_email.toLowerCase().includes(q)
      );
    }
    if (reportFilter !== 'all') {
      result = result.filter((r) => r.status === reportFilter);
    }
    return result;
  }, [reports, reportSearch, reportFilter]);

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
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('Loading cockpit...', 'Se încarcă...')}</p>
      </div>
    );
  }

  /* ─── Member row ────────────────────────────────── */

  const MemberRow = ({
    member,
    canManage,
    showOrg,
    compact,
  }: {
    member: SchoolMember;
    canManage: boolean;
    showOrg?: boolean;
    compact?: boolean;
  }) => {
    const name = memberName(member);
    const isSelf = member.id === user?.id;
    const isLoading = actionLoading === member.id;
    const memberSchool = member.school_id ? schools.find((s) => s.id === member.school_id) : null;
    const memberSub = subscriptions.find(
      (s) => s.student_id === member.id && s.status === 'active'
    );

    return (
      <div className={cn('flex items-center justify-between gap-2', compact ? 'py-2' : 'py-2.5')}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {name[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-medium text-foreground truncate">{name}</span>
              {isSelf && (
                <span className="text-[10px] text-muted-foreground">(you)</span>
              )}
              {member.org_role === 'admin' && !member.school_id && (
                <span className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                  Platform Admin
                </span>
              )}
              {member.org_role === 'admin' && member.school_id && (
                <span className="shrink-0 rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] font-bold text-secondary">
                  Org Admin
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">{member.email}</span>
              {showOrg && memberSchool && (
                <>
                  <span>·</span>
                  <span className="truncate">{memberSchool.name}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', tierColor(member.tier))}>
              {member.tier}
            </span>
            {member.last_active_at && (
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {timeAgo(member.last_active_at)}
              </span>
            )}
          </div>
        </div>

        {canManage && !isSelf && (
          <div className="flex items-center gap-0.5 shrink-0">
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
                title={member.org_role === 'admin' ? 'Remove org admin' : 'Make org admin'}
              >
                <Crown className="h-3.5 w-3.5" />
              </button>
            )}
            {member.school_id && (
              <button
                onClick={() => removeMemberFromOrg(member)}
                disabled={isLoading}
                className="rounded p-1.5 text-muted-foreground hover:text-amber-500 transition-colors"
                title="Remove from organization"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </button>
            )}
            {platformAdmin && (
              <>
                <button
                  onClick={() => {
                    setEmailTo(member.email);
                    setEmailType('individual');
                    setEmailDialogOpen(true);
                  }}
                  className="rounded p-1.5 text-muted-foreground hover:text-primary transition-colors"
                  title="Send email"
                >
                  <Mail className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setDiscountStudentId(member.id);
                    setDiscountDialogOpen(true);
                  }}
                  className="rounded p-1.5 text-muted-foreground hover:text-emerald-500 transition-colors"
                  title="Manage discount"
                >
                  <Percent className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteStudent(member)}
                  disabled={isLoading}
                  className="rounded p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete student"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ─── TAB: Overview ────────────────────────────── */

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label={t('Total Students', 'Total Studenți')}
          value={totalStudents}
          subValue={`${recentStudents.length} this week`}
          trend={recentStudents.length > 0 ? 'up' : 'neutral'}
          trendLabel={recentStudents.length > 0 ? `+${recentStudents.length}` : '—'}
        />
        <StatCard
          icon={Building2}
          label={t('Organizations', 'Organizații')}
          value={schools.length}
          subValue={`${schools.filter((s) => s.verified).length} verified`}
          color="text-secondary"
        />
        <StatCard
          icon={CreditCard}
          label={t('Active Subs', 'Abonamente Active')}
          value={activeSubscriptions}
          subValue={`${canceledSubscriptions} canceled`}
          trend={activeSubscriptions > canceledSubscriptions ? 'up' : 'down'}
          trendLabel={`${Math.round((activeSubscriptions / Math.max(1, subscriptions.length)) * 100)}%`}
          color="text-emerald-500"
        />
        <StatCard
          icon={DollarSign}
          label={t('Est. Monthly Rev.', 'Venit Lunar Est.')}
          value={`€${monthlyRevenue.toFixed(0)}`}
          subValue={`€${(monthlyRevenue * 3).toFixed(0)} / quarter`}
          color="text-violet-500"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Activity}
          label={t('Active Today', 'Activi Azi')}
          value={activeToday.length}
          subValue={`${Math.round((activeToday.length / Math.max(1, totalStudents)) * 100)}% of total`}
          color="text-green-500"
        />
        <StatCard
          icon={UserCheck}
          label={t('In Organizations', 'În Organizații')}
          value={orgStudents}
          subValue={`${freeStudents} individual`}
        />
        <StatCard
          icon={BarChart3}
          label={t('Seats Used', 'Locuri Utilizate')}
          value={`${usedSeats}/${totalSeats}`}
          subValue={totalSeats > 0 ? `${Math.round((usedSeats / totalSeats) * 100)}% capacity` : 'No seats'}
          color="text-amber-500"
        />
        <StatCard
          icon={BookOpen}
          label={t('Active Courses', 'Cursuri Active')}
          value={courses.filter((c) => c.is_active).length}
          subValue={`${courses.length} total`}
          color="text-blue-500"
        />
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          {t('Quick Actions', 'Acțiuni Rapide')}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)}>
            <Mail className="h-3.5 w-3.5" />
            {t('Send Email', 'Trimite Email')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setNewOrgDialogOpen(true)}>
            <Building2 className="h-3.5 w-3.5" />
            {t('New Organization', 'Organizație Nouă')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnnouncementDialogOpen(true)}>
            <Megaphone className="h-3.5 w-3.5" />
            {t('Announcement', 'Anunț')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('students')}>
            <Users className="h-3.5 w-3.5" />
            {t('Manage Students', 'Gestionează Studenți')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('subscriptions')}>
            <CreditCard className="h-3.5 w-3.5" />
            {t('Subscriptions', 'Abonamente')}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('Refresh Data', 'Reîncarcă Date')}
          </Button>
        </div>
      </div>

      {/* Recent students */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-green-500" />
          {t('Recent Registrations', 'Înregistrări Recente')} ({recentStudents.length})
        </h3>
        {recentStudents.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{t('No new students this week.', 'Niciun student nou săptămâna aceasta.')}</p>
        ) : (
          <div className="divide-y divide-border">
            {recentStudents.slice(0, 5).map((member) => (
              <MemberRow key={member.id} member={member} canManage={platformAdmin} showOrg compact />
            ))}
            {recentStudents.length > 5 && (
              <button
                onClick={() => setActiveTab('students')}
                className="w-full py-2 text-xs text-primary hover:underline"
              >
                {t(`View all ${recentStudents.length} new students →`, `Vezi toți ${recentStudents.length} studenți noi →`)}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Organizations overview */}
      {schools.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-secondary" />
            {t('Organizations', 'Organizații')}
          </h3>
          <div className="space-y-2">
            {schools.map((school) => {
              const members = membersOfSchool(school.id);
              const utilization = school.max_students > 0
                ? Math.round((members.length / school.max_students) * 100)
                : 0;
              return (
                <div
                  key={school.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setActiveTab('organizations')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary text-xs font-bold">
                      {school.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground truncate">{school.name}</span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium',
                            school.verified ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                          )}
                        >
                          {school.verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {school.country}{school.city ? `, ${school.city}` : ''} · {school.contact_email}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-foreground">
                      {members.length}/{school.max_students}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {utilization}% {t('capacity', 'capacitate')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* ─── TAB: Students ────────────────────────────── */

  const StudentsTab = () => (
    <div className="space-y-4">
      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={studentSearch}
            onChange={setStudentSearch}
            placeholder={t('Search students by name or email...', 'Caută studenți...')}
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'free', 'paid', 'org'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStudentFilter(f)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                studentFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? t('All', 'Toți') : f === 'free' ? 'Free' : f === 'paid' ? 'Paid' : 'Org'}
              <span className="ml-1 opacity-60">
                ({f === 'all'
                  ? totalStudents
                  : f === 'free'
                  ? allStudents.filter((s) => !s.school_id && s.tier === 'free').length
                  : f === 'paid'
                  ? allStudents.filter((s) => s.tier !== 'free').length
                  : orgStudents})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Student count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {t(`Showing ${filteredStudents.length} of ${totalStudents} students`, `Se afișează ${filteredStudents.length} din ${totalStudents} studenți`)}
        </p>
        <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)}>
          <Mail className="h-3.5 w-3.5" />
          {t('Email All', 'Email tuturor')}
        </Button>
      </div>

      {/* Students list */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">{t('No students found.', 'Niciun student găsit.')}</p>
          </div>
        ) : (
          filteredStudents.map((member) => (
            <div key={member.id} className="px-4">
              <MemberRow member={member} canManage={platformAdmin} showOrg />
            </div>
          ))
        )}
      </div>
    </div>
  );

  /* ─── TAB: Organizations ────────────────────────── */

  const OrganizationsTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-sm">
          <SearchBar
            value={orgSearch}
            onChange={setOrgSearch}
            placeholder={t('Search organizations...', 'Caută organizații...')}
          />
        </div>
        {platformAdmin && (
          <Button size="sm" onClick={() => setNewOrgDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t('New Organization', 'Organizație Nouă')}
          </Button>
        )}
      </div>

      {schools.filter((s) => !orgSearch || s.name.toLowerCase().includes(orgSearch.toLowerCase()) || s.contact_email.toLowerCase().includes(orgSearch.toLowerCase())).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">{t('No organizations found.', 'Nu există organizații.')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schools
            .filter((s) => !orgSearch || s.name.toLowerCase().includes(orgSearch.toLowerCase()) || s.contact_email.toLowerCase().includes(orgSearch.toLowerCase()))
            .map((school) => {
              const isExpanded = expandedSchool === school.id;
              const members = membersOfSchool(school.id);
              const schoolAdmins = members.filter((m) => m.org_role === 'admin');
              const utilization = school.max_students > 0
                ? Math.round((members.length / school.max_students) * 100)
                : 0;

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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary text-sm font-bold">
                      {school.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-bold text-foreground">{school.name}</span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-bold',
                            school.verified ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                          )}
                        >
                          {school.verified ? t('Verified', 'Verificat') : t('Pending', 'În așteptare')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {school.country}{school.city ? `, ${school.city}` : ''}
                        </span>
                        <span>·</span>
                        <span>{school.slug}</span>
                        {school.domain && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {school.domain}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-foreground">
                        {members.length}<span className="text-sm font-normal text-muted-foreground">/{school.max_students}</span>
                      </div>
                      <div className="w-20 h-1.5 bg-muted rounded-full mt-1">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-amber-500' : 'bg-green-500'
                          )}
                          style={{ width: `${Math.min(100, utilization)}%` }}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-4">
                      {/* Info grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <div className="text-muted-foreground mb-0.5">Contact</div>
                          <div className="font-medium text-foreground">{school.contact_name}</div>
                          <div className="text-muted-foreground">{school.contact_email}</div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <div className="text-muted-foreground mb-0.5">Admins</div>
                          <div className="font-medium text-foreground">
                            {schoolAdmins.length > 0 ? schoolAdmins.map((a) => memberName(a)).join(', ') : 'None'}
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <div className="text-muted-foreground mb-0.5">AI Tutor Limit</div>
                          <div className="font-medium text-foreground">{school.ai_tutor_daily_limit}/day</div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <div className="text-muted-foreground mb-0.5">Created</div>
                          <div className="font-medium text-foreground">{formatDate(school.created_at)}</div>
                        </div>
                      </div>

                      {/* Invite code + actions */}
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
                        <Button variant="outline" size="sm" onClick={() => regenerateCode(school)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                          New code
                        </Button>
                        {platformAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleVerified(school)}
                              className={school.verified ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'}
                            >
                              {school.verified ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              {school.verified ? 'Revoke' : 'Verify'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => updateMaxStudents(school, 10)}>
                              <UserPlus className="h-3.5 w-3.5" />
                              +10 seats
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => updateMaxStudents(school, -10)}>
                              <UserMinus className="h-3.5 w-3.5" />
                              -10 seats
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteOrganization(school)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Org
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Members */}
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                          <Users className="h-4 w-4 text-primary" />
                          Members ({members.length})
                        </h4>
                        {members.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No members yet.</p>
                        ) : (
                          <div className="divide-y divide-border rounded-lg border border-border">
                            {members.map((member) => (
                              <div key={member.id} className="px-3">
                                <MemberRow member={member} canManage={true} compact />
                              </div>
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
    </div>
  );

  /* ─── TAB: Subscriptions ────────────────────────── */

  const SubscriptionsTab = () => (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CreditCard} label="Active" value={activeSubscriptions} color="text-green-500" />
        <StatCard icon={XCircle} label="Canceled" value={canceledSubscriptions} color="text-red-500" />
        <StatCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={`€${monthlyRevenue.toFixed(0)}`}
          color="text-emerald-500"
        />
        <StatCard
          icon={Percent}
          label="Avg Discount"
          value={`${subscriptions.length > 0 ? Math.round(subscriptions.reduce((s, sub) => s + sub.discount_percent, 0) / subscriptions.length) : 0}%`}
          color="text-amber-500"
        />
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={subSearch}
            onChange={setSubSearch}
            placeholder={t('Search by student or tier...', 'Caută după student sau plan...')}
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'canceled', 'past_due'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSubFilter(f)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                subFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All' : f === 'past_due' ? 'Past Due' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Subscription list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filteredSubscriptions.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No subscriptions found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredSubscriptions.map((sub) => {
              const student = allStudents.find((s) => s.id === sub.student_id);
              return (
                <div key={sub.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {student ? memberName(student) : sub.student_id.slice(0, 8)}
                        </span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', tierColor(sub.tier))}>
                          {sub.tier}
                        </span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', statusColor(sub.status))}>
                          {sub.status}
                        </span>
                        {sub.discount_percent > 0 && (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                            -{sub.discount_percent}%
                          </span>
                        )}
                        {sub.cancel_at_period_end && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                            Cancels at end
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                        {student && <span>{student.email}</span>}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(sub.current_period_start)} — {formatDate(sub.current_period_end)}
                        </span>
                        {sub.unlocked_stages.length > 0 && (
                          <span>Stages: {sub.unlocked_stages.join(', ')}</span>
                        )}
                        {sub.unlocked_products.length > 0 && (
                          <span>Products: {sub.unlocked_products.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    {platformAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setDiscountStudentId(sub.student_id);
                            setDiscountPercent(sub.discount_percent);
                            setDiscountDialogOpen(true);
                          }}
                          title="Adjust discount"
                        >
                          <Percent className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => toggleSubscriptionAutoRenew(sub)}
                          title={sub.auto_renew ? 'Disable auto-renew' : 'Enable auto-renew'}
                          className={sub.auto_renew ? 'text-green-500' : 'text-muted-foreground'}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        {sub.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => cancelSubscription(sub)}
                            className="text-muted-foreground hover:text-destructive"
                            title="Cancel subscription"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pricing plans reference */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          {t('Pricing Plans Reference', 'Referință Planuri')}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_PLANS.map((plan) => (
            <div key={plan.id} className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{plan.name.en}</span>
                <div className="flex items-center gap-1">
                  {plan.originalPrice && (
                    <span className="text-[10px] text-muted-foreground line-through">€{plan.originalPrice}</span>
                  )}
                  <span className="text-sm font-bold text-foreground">€{plan.price}</span>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{plan.type} · 3-month cycle</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ─── TAB: Courses & Access ─────────────────────── */

  const CoursesTab = () => (
    <div className="space-y-4">
      {/* Courses */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-500" />
          {t('Courses', 'Cursuri')}
        </h3>
        {courses.length === 0 ? (
          <p className="text-xs text-muted-foreground">No courses found in database.</p>
        ) : (
          <div className="space-y-2">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{course.icon || '📚'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{course.name}</span>
                      <span className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-medium',
                        course.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      )}>
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{course.category}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{course.description}</div>
                  </div>
                </div>
                {platformAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCourseActive(course)}
                    className={course.is_active ? 'text-red-500 hover:text-red-600' : 'text-green-500 hover:text-green-600'}
                  >
                    {course.is_active ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    {course.is_active ? 'Disable' : 'Enable'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage Access Management */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-500" />
          {t('Stage Access Control', 'Control Acces Etape')}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {t(
            'Grant or revoke individual stage access for any student. Stages 0-1 are always free.',
            'Acordă sau revocă accesul la etape individuale. Etapele 0-1 sunt gratuite.'
          )}
        </p>
        <div className="space-y-2">
          {allStudents
            .filter((s) => s.id !== user?.id)
            .slice(0, 20)
            .map((student) => {
              const sub = subscriptions.find((s) => s.student_id === student.id && s.status === 'active');
              const unlockedStages = sub?.unlocked_stages || [];
              return (
                <div key={student.id} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{memberName(student)}</span>
                      <span className="text-[11px] text-muted-foreground">{student.email}</span>
                    </div>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', tierColor(student.tier))}>
                      {student.tier}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {STAGES.map((stage) => {
                      const isFree = stage.number <= 1;
                      const isUnlocked = isFree || unlockedStages.includes(stage.number) || student.tier === 'full_access' || student.tier === 'enterprise';
                      return (
                        <button
                          key={stage.number}
                          disabled={isFree || student.tier === 'full_access' || student.tier === 'enterprise'}
                          onClick={() => {
                            if (isUnlocked && !isFree) {
                              revokeStageAccess(student.id, stage.number);
                            } else if (!isUnlocked) {
                              grantStageAccess(student.id, stage.number);
                            }
                          }}
                          className={cn(
                            'flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                            isUnlocked
                              ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                              : 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
                            (isFree || student.tier === 'full_access' || student.tier === 'enterprise') && 'opacity-50 cursor-default'
                          )}
                          title={`Stage ${stage.number}: ${stage.name.en}`}
                        >
                          {isUnlocked ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                          S{stage.number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* SaaS Products */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-500" />
          GenAI SaaS Products
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SAAS_PRODUCTS.map((product) => {
            const usersWithProduct = subscriptions.filter(
              (s) => s.status === 'active' && s.unlocked_products.includes(product.id)
            ).length;
            return (
              <div key={product.id} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{product.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-foreground">{product.name}</div>
                    <div className="text-[10px] text-muted-foreground">{product.description}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {usersWithProduct} active {usersWithProduct === 1 ? 'user' : 'users'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ─── TAB: Communications ───────────────────────── */

  const CommunicationsTab = () => {
    const emailTemplates = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to ADD Academy! 🎓',
        body: `Hi {{name}},\n\nWelcome to ADD Academy! We're excited to have you on board.\n\nYour journey into AI and Machine Learning starts now. Here's what you can do:\n\n• Explore free lectures in Stages 0 & 1\n• Try our interactive AI Tutor\n• Earn XP and climb the leaderboard\n\nBest regards,\nThe ADD Academy Team`,
      },
      {
        id: 'org-invite',
        name: 'Organization Invitation',
        subject: 'You\'ve been invited to join {{org}} on ADD Academy',
        body: `Hi {{name}},\n\nYou've been invited to join {{org}} on ADD Academy.\n\nUse this invite code to join: {{code}}\n\nAs a member, you'll get full access to all courses and materials.\n\nGet started at: https://add-academy.vercel.app\n\nBest regards,\nThe ADD Academy Team`,
      },
      {
        id: 'course-launch',
        name: 'New Course Announcement',
        subject: '🚀 New Course Available: {{course}}',
        body: `Hi {{name}},\n\nWe're thrilled to announce a new course on ADD Academy:\n\n{{course}}\n\n{{description}}\n\nStart learning now at: https://add-academy.vercel.app\n\nBest regards,\nThe ADD Academy Team`,
      },
      {
        id: 'renewal',
        name: 'Subscription Renewal',
        subject: 'Your ADD Academy subscription is renewing soon',
        body: `Hi {{name}},\n\nYour {{plan}} subscription will renew on {{date}}.\n\nCurrent plan: {{plan}}\nPrice: €{{price}}/quarter\n\nIf you have any questions, reply to this email.\n\nBest regards,\nThe ADD Academy Team`,
      },
      {
        id: 'discount',
        name: 'Special Discount',
        subject: '🎉 Special offer: {{discount}}% off your next subscription',
        body: `Hi {{name}},\n\nWe'd like to offer you a special {{discount}}% discount on your next ADD Academy subscription.\n\nUse code: {{code}}\n\nThis offer expires on {{expiry}}.\n\nBest regards,\nThe ADD Academy Team`,
      },
    ];

    return (
      <div className="space-y-4">
        {/* Quick send */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            {t('Quick Send', 'Trimite Rapid')}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEmailType('all');
                setEmailTo('all-students');
                setEmailSubject('');
                setEmailBody('');
                setEmailDialogOpen(true);
              }}
            >
              <Users className="h-3.5 w-3.5" />
              {t('Email All Students', 'Email Toți Studenții')}
            </Button>
            {schools.map((school) => (
              <Button
                key={school.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmailType('org');
                  setEmailTo(school.contact_email);
                  setEmailSubject(`Message for ${school.name}`);
                  setEmailBody('');
                  setEmailDialogOpen(true);
                }}
              >
                <Building2 className="h-3.5 w-3.5" />
                {school.name}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnnouncementDialogOpen(true)}
            >
              <Megaphone className="h-3.5 w-3.5" />
              {t('New Announcement', 'Anunț Nou')}
            </Button>
          </div>
        </div>

        {/* Email templates */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            {t('Email Templates', 'Șabloane Email')}
          </h3>
          <div className="space-y-2">
            {emailTemplates.map((tmpl) => (
              <div key={tmpl.id} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{tmpl.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Subject: {tmpl.subject}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEmailSubject(tmpl.subject);
                      setEmailBody(tmpl.body);
                      setEmailType('individual');
                      setEmailTo('');
                      setEmailDialogOpen(true);
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Use
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invitation generator */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-500" />
            {t('Invitation Generator', 'Generator Invitații')}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Generate invite links for organizations. Each organization has a unique invite code.
          </p>
          <div className="space-y-2">
            {schools.map((school) => {
              const inviteUrl = `https://add-academy.vercel.app/school/apply?code=${school.invite_code}`;
              return (
                <div key={school.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{school.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{inviteUrl}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                        setCopied(school.id);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied === school.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === school.id ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => regenerateCode(school)}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /* ─── TAB: Analytics ────────────────────────────── */

  const AnalyticsTab = () => {
    // Compute analytics
    const studentsByTier = allStudents.reduce(
      (acc, s) => {
        acc[s.tier] = (acc[s.tier] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const studentsByLang = allStudents.reduce(
      (acc, s) => {
        const lang = s.preferred_language || 'en';
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const studentsByMonth = allStudents.reduce(
      (acc, s) => {
        const month = new Date(s.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const subsByTier = subscriptions
      .filter((s) => s.status === 'active')
      .reduce(
        (acc, s) => {
          acc[s.tier] = (acc[s.tier] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    const orgsByCountry = schools.reduce(
      (acc, s) => {
        acc[s.country] = (acc[s.country] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const maxBarValue = (data: Record<string, number>) => Math.max(...Object.values(data), 1);

    const BarChart = ({ data, label }: { data: Record<string, number>; label: string }) => {
      const max = maxBarValue(data);
      const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
      return (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3">{label}</h4>
          <div className="space-y-2">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 truncate text-right">{key}</span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(5, (value / max) * 100)}%` }}
                  >
                    <span className="text-[10px] font-medium text-primary-foreground">{value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {/* Top-level metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Total Users" value={totalStudents} color="text-primary" />
          <StatCard icon={Activity} label="Active Today" value={activeToday.length} color="text-green-500" />
          <StatCard icon={TrendingUp} label="Growth (7d)" value={`+${recentStudents.length}`} color="text-blue-500" />
          <StatCard
            icon={Award}
            label="Conversion"
            value={`${totalStudents > 0 ? Math.round((allStudents.filter((s) => s.tier !== 'free').length / totalStudents) * 100) : 0}%`}
            subValue="free → paid"
            color="text-violet-500"
          />
        </div>

        {/* Charts */}
        <div className="grid sm:grid-cols-2 gap-4">
          <BarChart data={studentsByTier} label={t('Students by Tier', 'Studenți pe Plan')} />
          <BarChart data={subsByTier} label={t('Active Subscriptions by Tier', 'Abonamente Active pe Plan')} />
          <BarChart data={studentsByLang} label={t('Students by Language', 'Studenți pe Limbă')} />
          <BarChart data={orgsByCountry} label={t('Organizations by Country', 'Organizații pe Țară')} />
        </div>

        {/* Registration timeline */}
        <BarChart data={studentsByMonth} label={t('Registrations by Month', 'Înregistrări pe Lună')} />

        {/* Top organizations by size */}
        {schools.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-foreground mb-3">
              {t('Organizations by Size', 'Organizații după Dimensiune')}
            </h4>
            <div className="space-y-2">
              {[...schools]
                .sort((a, b) => membersOfSchool(b.id).length - membersOfSchool(a.id).length)
                .map((school) => {
                  const members = membersOfSchool(school.id);
                  const pct = school.max_students > 0 ? Math.round((members.length / school.max_students) * 100) : 0;
                  return (
                    <div key={school.id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-32 truncate text-right">{school.name}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all flex items-center justify-end pr-2',
                            pct > 90 ? 'bg-red-500/60' : pct > 70 ? 'bg-amber-500/60' : 'bg-secondary/60'
                          )}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        >
                          <span className="text-[10px] font-medium text-foreground">{members.length}/{school.max_students}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-10">{pct}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ─── TAB: Reports ───────────────────────────────── */

  const reportStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/10 text-blue-500';
      case 'in_progress': return 'bg-amber-500/10 text-amber-500';
      case 'resolved': return 'bg-green-500/10 text-green-500';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const reportPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500';
      case 'medium': return 'bg-amber-500/10 text-amber-500';
      case 'low': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'bug': return '🐛';
      case 'ui': return '🎨';
      case 'content': return '📝';
      case 'feature': return '💡';
      case 'performance': return '🐌';
      default: return '📋';
    }
  };

  const openReports = reports.filter((r) => r.status === 'open').length;
  const inProgressReports = reports.filter((r) => r.status === 'in_progress').length;
  const resolvedReports = reports.filter((r) => r.status === 'resolved').length;

  const ReportsTab = () => (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Bug} label="Total Reports" value={reports.length} color="text-primary" />
        <StatCard icon={AlertCircle} label="Open" value={openReports} color="text-blue-500" />
        <StatCard icon={Clock} label="In Progress" value={inProgressReports} color="text-amber-500" />
        <StatCard icon={CheckCircle2} label="Resolved" value={resolvedReports} color="text-green-500" />
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={reportSearch}
            onChange={setReportSearch}
            placeholder={t('Search reports...', 'Caută rapoarte...')}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setReportFilter(f)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                reportFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Reports list */}
      {filteredReports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Bug className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {reports.length === 0
              ? t('No reports yet. Users can submit reports using the bug button.', 'Niciun raport încă.')
              : t('No reports match your filters.', 'Niciun raport nu corespunde filtrelor.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <div key={report.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Report header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{categoryIcon(report.category)}</span>
                      <span className="text-sm font-semibold text-foreground">{report.title}</span>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', reportStatusColor(report.status))}>
                        {report.status === 'in_progress' ? 'In Progress' : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', reportPriorityColor(report.priority))}>
                        {report.priority}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {report.category}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {report.student_name} ({report.student_email})
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(report.created_at)}
                      </span>
                      {report.page_url && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {report.page_url}
                        </span>
                      )}
                    </div>
                    {report.description && (
                      <div className="mt-2 text-sm text-foreground/80 bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                        {report.description}
                      </div>
                    )}

                    {/* Admin response */}
                    {report.admin_response && (
                      <div className="mt-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-green-600 mb-1">
                          <MessageCircle className="h-3 w-3" />
                          Admin Response · {formatDate(report.responded_at)}
                        </div>
                        <div className="text-sm text-foreground/80 whitespace-pre-wrap">{report.admin_response}</div>
                      </div>
                    )}

                    {/* Reply form */}
                    {replyingTo === report.id && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={t('Write your response...', 'Scrie răspunsul tău...')}
                          rows={3}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setReplyingTo(null); setReplyText(''); }}>
                            Cancel
                          </Button>
                          <Button size="sm" disabled={!replyText.trim()} onClick={() => respondToReport(report.id)}>
                            <Send className="h-3.5 w-3.5" />
                            Send & Resolve
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {report.status === 'open' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateReportStatus(report.id, 'in_progress')}
                        className="text-amber-500"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Start
                      </Button>
                    )}
                    {(report.status === 'open' || report.status === 'in_progress') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(report.id);
                          setReplyText(report.admin_response || '');
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Reply
                      </Button>
                    )}
                    {report.status !== 'closed' && report.status !== 'resolved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateReportStatus(report.id, 'resolved')}
                        className="text-green-500"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolve
                      </Button>
                    )}
                    {report.status === 'resolved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateReportStatus(report.id, 'closed')}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Close
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReport(report.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ─── Dialogs ──────────────────────────────────── */

  const EmailDialog = () => (
    <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {emailType === 'all'
              ? t('Email All Students', 'Email Toți Studenții')
              : emailType === 'org'
              ? t('Email Organization', 'Email Organizație')
              : t('Send Email', 'Trimite Email')}
          </DialogTitle>
          <DialogDescription>
            {emailType === 'all'
              ? `This will send to ${totalStudents} students.`
              : 'Compose and send an email.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {emailType === 'individual' && (
            <div>
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                value={emailTo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailTo(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={emailSubject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>
          <div>
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              value={emailBody}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEmailBody(e.target.value)}
              placeholder="Write your message..."
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            onClick={() => {
              // Copy email content to clipboard for now (email API integration pending)
              const content = `To: ${emailType === 'all' ? 'All Students' : emailTo}\nSubject: ${emailSubject}\n\n${emailBody}`;
              navigator.clipboard.writeText(content);
              setEmailDialogOpen(false);
              alert('Email content copied to clipboard. Email API integration coming soon.');
            }}
          >
            <Send className="h-3.5 w-3.5" />
            {t('Send', 'Trimite')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const DiscountDialog = () => {
    const student = allStudents.find((s) => s.id === discountStudentId);
    const sub = subscriptions.find((s) => s.student_id === discountStudentId && s.status === 'active');
    return (
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('Manage Discount', 'Gestionează Reducere')}</DialogTitle>
            <DialogDescription>
              {student ? `Discount for ${memberName(student)}` : 'Set discount percentage.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="discount-pct">Discount (%)</Label>
              <Input
                id="discount-pct"
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscountPercent(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex gap-2">
              {[0, 10, 20, 25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setDiscountPercent(pct)}
                  className={cn(
                    'rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                    discountPercent === pct ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              onClick={() => {
                if (sub) {
                  updateSubscriptionDiscount(sub.id, discountPercent);
                }
                setDiscountDialogOpen(false);
              }}
            >
              <Check className="h-3.5 w-3.5" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const AnnouncementDialog = () => (
    <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('New Announcement', 'Anunț Nou')}</DialogTitle>
          <DialogDescription>
            {t('Send an announcement to all students.', 'Trimite un anunț tuturor studenților.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="announcement-title">Title</Label>
            <Input
              id="announcement-title"
              value={announcementTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnouncementTitle(e.target.value)}
              placeholder="Announcement title..."
            />
          </div>
          <div>
            <Label htmlFor="announcement-body">Message</Label>
            <Textarea
              id="announcement-body"
              value={announcementBody}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnnouncementBody(e.target.value)}
              placeholder="Write your announcement..."
              rows={6}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            onClick={() => {
              const content = `📢 ${announcementTitle}\n\n${announcementBody}`;
              navigator.clipboard.writeText(content);
              setAnnouncementDialogOpen(false);
              alert('Announcement copied to clipboard. Notification system integration coming soon.');
            }}
          >
            <Megaphone className="h-3.5 w-3.5" />
            {t('Publish', 'Publică')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const NewOrgDialog = () => (
    <Dialog open={newOrgDialogOpen} onOpenChange={setNewOrgDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Create Organization', 'Creează Organizație')}</DialogTitle>
          <DialogDescription>
            {t('Add a new organization to the platform.', 'Adaugă o organizație nouă pe platformă.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="org-name">Name *</Label>
              <Input
                id="org-name"
                value={newOrgName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setNewOrgName(e.target.value);
                  if (!newOrgSlug) setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <Label htmlFor="org-slug">Slug *</Label>
              <Input
                id="org-slug"
                value={newOrgSlug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgSlug(e.target.value)}
                placeholder="acme-corp"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="org-country">Country *</Label>
              <Input
                id="org-country"
                value={newOrgCountry}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgCountry(e.target.value)}
                placeholder="Germany"
              />
            </div>
            <div>
              <Label htmlFor="org-city">City</Label>
              <Input
                id="org-city"
                value={newOrgCity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgCity(e.target.value)}
                placeholder="Berlin"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="org-email">Contact Email *</Label>
              <Input
                id="org-email"
                type="email"
                value={newOrgEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgEmail(e.target.value)}
                placeholder="contact@acme.com"
              />
            </div>
            <div>
              <Label htmlFor="org-contact">Contact Name *</Label>
              <Input
                id="org-contact"
                value={newOrgContact}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgContact(e.target.value)}
                placeholder="John Smith"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="org-domain">Domain</Label>
              <Input
                id="org-domain"
                value={newOrgDomain}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgDomain(e.target.value)}
                placeholder="acme.com"
              />
            </div>
            <div>
              <Label htmlFor="org-max">Max Students</Label>
              <Input
                id="org-max"
                type="number"
                value={newOrgMaxStudents}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgMaxStudents(parseInt(e.target.value) || 50)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={createOrganization}>
            <Plus className="h-3.5 w-3.5" />
            {t('Create', 'Creează')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  /* ─── Main Render ──────────────────────────────── */

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-secondary" />
            {platformAdmin
              ? t('Admin Cockpit', 'Cockpit Admin')
              : t('Organization Dashboard', 'Tablou Organizație')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {platformAdmin
              ? t('Complete platform management at your fingertips', 'Gestionare completă a platformei')
              : t('Manage your organization', 'Gestionează organizația ta')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={t('Refresh', 'Reîncarcă')}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">
            <BarChart3 className="h-3.5 w-3.5" />
            {t('Overview', 'Prezentare')}
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="h-3.5 w-3.5" />
            {t('Students', 'Studenți')}
          </TabsTrigger>
          <TabsTrigger value="organizations">
            <Building2 className="h-3.5 w-3.5" />
            {t('Organizations', 'Organizații')}
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <CreditCard className="h-3.5 w-3.5" />
            {t('Subscriptions', 'Abonamente')}
          </TabsTrigger>
          <TabsTrigger value="courses">
            <BookOpen className="h-3.5 w-3.5" />
            {t('Courses', 'Cursuri')}
          </TabsTrigger>
          <TabsTrigger value="communications">
            <Mail className="h-3.5 w-3.5" />
            {t('Comms', 'Comunicări')}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-3.5 w-3.5" />
            {t('Analytics', 'Analiză')}
          </TabsTrigger>
          <TabsTrigger value="reports">
            <Bug className="h-3.5 w-3.5" />
            {t('Reports', 'Rapoarte')}
            {openReports > 0 && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {openReports}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="students">
          <StudentsTab />
        </TabsContent>
        <TabsContent value="organizations">
          <OrganizationsTab />
        </TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="courses">
          <CoursesTab />
        </TabsContent>
        <TabsContent value="communications">
          <CommunicationsTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>

      {/* All dialogs */}
      <EmailDialog />
      <DiscountDialog />
      <AnnouncementDialog />
      <NewOrgDialog />
    </div>
  );
}
