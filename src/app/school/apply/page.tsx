'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/components/auth/auth-provider';
import { t } from '@/lib/i18n';
import { submitSchoolApplication, getMySchool } from '@/lib/school/actions';
import {
  School,
  Globe,
  MapPin,
  User,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Language } from '@/types';

export default function SchoolApplyPage() {
  const language = useAcademyStore((s) => s.language) as Language;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'form' | 'pending' | 'verified'>('form');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Check if user already has a school
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCheckingExisting(false);
      return;
    }

    getMySchool().then((school) => {
      if (school) {
        if (school.verified) {
          setStatus('verified');
        } else {
          setStatus('pending');
        }
      }
      setCheckingExisting(false);
    });
  }, [user, authLoading]);

  // Pre-fill contact info from user profile
  useEffect(() => {
    if (user) {
      if (!contactName && user.name) setContactName(user.name);
      if (!contactEmail && user.email) setContactEmail(user.email);
    }
  }, [user, contactName, contactEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await submitSchoolApplication({
      name,
      country,
      city,
      contactName,
      contactEmail,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setStatus('pending');
    setLoading(false);
  }

  if (authLoading || checkingExisting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-12 text-center space-y-4">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            You need to be logged in to apply for school access.
          </p>
          <Link href="/login?redirect=/school/apply">
            <Button>{t('auth_login', language)}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (status === 'verified') {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-950/30">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold">{t('school_verified', language)}</h2>
          <Link href="/school/dashboard">
            <Button>{t('school_dashboard', language)}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (status === 'pending') {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/30">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold">{t('school_pending', language)}</h2>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <School className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('school_apply_title', language)}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t('school_apply_desc', language)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolName">{t('school_name', language)}</Label>
            <div className="relative">
              <School className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="schoolName"
                type="text"
                placeholder="e.g. Colegiul National Eminescu"
                className="pl-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="country">{t('school_country', language)}</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="country"
                  type="text"
                  placeholder="e.g. Romania"
                  className="pl-10"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t('school_city', language)}</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="city"
                  type="text"
                  placeholder="e.g. Cluj-Napoca"
                  className="pl-10"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">{t('school_contact_name', language)}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="contactName"
                type="text"
                placeholder="Your name"
                className="pl-10"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">{t('school_contact_email', language)}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="contactEmail"
                type="email"
                placeholder="you@school.edu"
                className="pl-10"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('loading', language) : t('school_submit', language)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
