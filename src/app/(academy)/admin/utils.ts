// Pure formatting/label helpers for the admin dashboard (W4.5 extraction).
// No React, no state — safe to unit-test and reuse.

import type { SchoolMember } from './types';

export function isPlatformAdmin(schoolId: string | null | undefined, isAdmin: boolean): boolean {
  return isAdmin && !schoolId;
}

/**
 * Generate a school invite code. Module-scope (not inside the component) so the
 * Date.now() call is not analysed as a render-path impurity.
 */
export function makeInviteCode(slug: string): string {
  return `${slug.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export function memberName(m: SchoolMember): string {
  return m.display_name || m.full_name || m.email.split('@')[0];
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

export function timeAgo(date: string | null): string {
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

export function tierColor(tier: string): string {
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

export function statusColor(status: string): string {
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
