// Data shapes for the admin dashboard. Extracted from admin-dashboard.tsx
// (W4.5) so the monolith holds behaviour, not type declarations.

export interface SchoolMember {
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

export interface SchoolData {
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

export interface SubscriptionData {
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

export interface CourseData {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
}

export interface ReportData {
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

export interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  target_audience: 'all' | 'free' | 'paid' | 'org';
  target_school_id: string | null;
  created_by: string;
  published_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}
