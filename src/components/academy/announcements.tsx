'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Megaphone, ChevronRight, Clock, AlertCircle, AlertOctagon } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  target_audience: string;
  target_school_id: string | null;
  created_by: string;
  published_at: string;
  expires_at: string | null;
  created_at: string;
}

interface AnnouncementRead {
  announcement_id: string;
}

const PRIORITY_CONFIG = {
  normal: {
    icon: Megaphone,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Announcement',
  },
  important: {
    icon: AlertCircle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Important',
  },
  urgent: {
    icon: AlertOctagon,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'Urgent',
  },
} as const;

function timeAgo(dateStr: string, lang: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (lang === 'ro') {
    if (minutes < 1) return 'chiar acum';
    if (minutes < 60) return `acum ${minutes}m`;
    if (hours < 24) return `acum ${hours}h`;
    return `acum ${days}z`;
  }
  if (lang === 'el') {
    if (minutes < 1) return 'μόλις τώρα';
    if (minutes < 60) return `πριν από ${minutes}λ`;
    if (hours < 24) return `πριν από ${hours}ω`;
    return `πριν από ${days}η`;
  }
  if (lang === 'de') {
    if (minutes < 1) return 'gerade eben';
    if (minutes < 60) return `vor ${minutes}m`;
    if (hours < 24) return `vor ${hours}h`;
    return `vor ${days}T`;
  }
  if (lang === 'fr') {
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes}m`;
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${days}j`;
  }
  if (lang === 'it') {
    if (minutes < 1) return 'proprio ora';
    if (minutes < 60) return `${minutes}m fa`;
    if (hours < 24) return `${hours}h fa`;
    return `${days}g fa`;
  }
  if (lang === 'ar') {
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes}د`;
    if (hours < 24) return `منذ ${hours}س`;
    return `منذ ${days}ي`;
  }
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function AnnouncementBell() {
  const { user } = useAuth();
  const language = useAcademyStore((s) => s.language);
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // W4.1 — this helper previously took only (en, ro), so EVERY Greek user
  // silently saw English. Greek is now required, not optional.
  // W4.2 — extended to cover de/fr/it/ar so those locales stop falling back to English.
  const t = (en: string, ro: string, el: string, de: string, fr: string, it: string, ar: string) =>
    language === 'ro'
      ? ro
      : language === 'el'
        ? el
        : language === 'de'
          ? de
          : language === 'fr'
            ? fr
            : language === 'it'
              ? it
              : language === 'ar'
                ? ar
                : en;

  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;

    const { data: annData } = await createClient()
      .from('academy_announcements')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(50);

    if (annData) {
      // Filter by target audience
      const filtered = annData.filter((a: Announcement) => {
        if (a.target_audience === 'all') return true;
        if (a.target_audience === 'org' && user.schoolId) {
          return !a.target_school_id || a.target_school_id === user.schoolId;
        }
        if (a.target_audience === 'free' && !user.subscription) return true;
        if (a.target_audience === 'paid' && user.subscription) return true;
        return false;
      });
      setAnnouncements(filtered);
    }

    const { data: readData } = await createClient()
      .from('academy_announcement_reads')
      .select('announcement_id')
      .eq('student_id', user.id);

    if (readData) {
      setReadIds(new Set(readData.map((r: AnnouncementRead) => r.announcement_id)));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const markAsRead = async (announcementId: string) => {
    if (!user || readIds.has(announcementId)) return;

    await createClient().from('academy_announcement_reads').insert({
      announcement_id: announcementId,
      student_id: user.id,
    });

    setReadIds((prev) => new Set([...prev, announcementId]));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unread = announcements.filter((a) => !readIds.has(a.id));
    if (unread.length === 0) return;

    const inserts = unread.map((a) => ({
      announcement_id: a.id,
      student_id: user.id,
    }));

    await createClient().from('academy_announcement_reads').insert(inserts);
    setReadIds(new Set(announcements.map((a) => a.id)));
  };

  const unreadCount = announcements.filter((a) => !readIds.has(a.id)).length;

  if (!user) return null;

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => {
          setOpen(true);
          fetchAnnouncements();
        }}
        className="relative rounded-full p-1.5 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground transition-colors"
        aria-label={t('Announcements', 'Anunțuri', 'Ανακοινώσεις', 'Ankündigungen', 'Annonces', 'Annunci', 'الإعلانات')}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-xs"
            onClick={() => setOpen(false)}
          />

          {/* Sliding panel */}
          <div className="relative w-full max-w-sm bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h2 className="font-heading text-sm font-bold text-foreground">
                  {t('Announcements', 'Anunțuri', 'Ανακοινώσεις', 'Ankündigungen', 'Annonces', 'Annunci', 'الإعلانات')}
                </h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {unreadCount} {t('new', 'noi', 'νέα', 'neu', 'nouveau', 'nuovo', 'جديد')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-muted transition-colors"
                  >
                    {t(
                      'Mark all read',
                      'Marchează citite',
                      'Σήμανση όλων ως αναγνωσμένων',
                      'Alle als gelesen markieren',
                      'Tout marquer comme lu',
                      'Segna tutto come letto',
                      'تحديد الكل كمقروء'
                    )}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="py-12 text-center">
                  <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t(
                      'No announcements yet',
                      'Niciun anunț încă',
                      'Δεν υπάρχουν ανακοινώσεις ακόμη',
                      'Noch keine Ankündigungen',
                      'Aucune annonce pour le moment',
                      'Nessun annuncio ancora',
                      'لا توجد إعلانات بعد'
                    )}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {announcements.map((announcement) => {
                    const isRead = readIds.has(announcement.id);
                    const config = PRIORITY_CONFIG[announcement.priority];
                    const Icon = config.icon;

                    return (
                      <button
                        key={announcement.id}
                        onClick={() => markAsRead(announcement.id)}
                        className={cn(
                          'w-full text-left px-4 py-3 transition-colors hover:bg-muted/50',
                          !isRead && 'bg-primary/[0.03]'
                        )}
                      >
                        <div className="flex gap-3">
                          {/* Priority indicator */}
                          <div className={cn('mt-0.5 rounded-lg p-1.5 h-fit', config.bg)}>
                            <Icon className={cn('h-3.5 w-3.5', config.color)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className={cn(
                                  'text-sm truncate',
                                  isRead ? 'font-normal text-foreground/70' : 'font-semibold text-foreground'
                                )}>
                                  {announcement.title}
                                </h3>
                                {!isRead && (
                                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                                {timeAgo(announcement.published_at, language)}
                              </span>
                            </div>

                            <p className={cn(
                              'mt-1 text-xs leading-relaxed line-clamp-3',
                              isRead ? 'text-muted-foreground/60' : 'text-muted-foreground'
                            )}>
                              {announcement.content}
                            </p>

                            {announcement.priority !== 'normal' && (
                              <span className={cn(
                                'mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                                config.bg, config.color
                              )}>
                                {config.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
