'use client';

import Link from 'next/link';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';

export function Footer() {
  const language = useAcademyStore((s) => s.language);

  return (
    <footer className="border-t border-primary/10 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="text-xl font-heading font-bold tracking-wide text-secondary">
                ADD
              </span>
              <span className="text-lg text-primary-foreground/90">
                Academica
              </span>
            </Link>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              {t('home_subtitle', language)}
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/add.individual.solutions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-secondary hover:text-secondary-foreground transition-colors"
                aria-label="Facebook"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a
                href="https://www.linkedin.com/company/add-individual-solutions-ltd/about/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-secondary hover:text-secondary-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a
                href="https://www.youtube.com/channel/UClrxo4ku5xixHqJyWpu31eA"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-secondary hover:text-secondary-foreground transition-colors"
                aria-label="YouTube"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-secondary">
              {language === 'ro' ? 'Linkuri Rapide' : language === 'el' ? 'Γρήγοροι Σύνδεσμοι' : language === 'de' ? 'Schnelllinks' : language === 'fr' ? 'Liens Rapides' : language === 'it' ? 'Link Rapidi' : language === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  {t('nav_home', language)}
                </Link>
              </li>
              <li>
                <Link href="/lectures/1" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  {t('home_start', language)}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  {t('nav_dashboard', language)}
                </Link>
              </li>
              <li>
                <Link href="/certificate" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  {t('nav_certificate', language)}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-secondary">
              {language === 'ro' ? 'Compania' : language === 'el' ? 'Εταιρεία' : language === 'de' ? 'Unternehmen' : language === 'fr' ? 'Entreprise' : language === 'it' ? 'Azienda' : language === 'ar' ? 'الشركة' : 'Company'}
            </h3>
            <ul className="space-y-2.5">
              <li>
                <a href="https://add-individual-solutions.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  ADD Individual Solutions
                </a>
              </li>
              <li>
                <a href="https://add-individual-solutions.com/privacy" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  {language === 'ro' ? 'Politica de Confidențialitate' : language === 'el' ? 'Πολιτική Απορρήτου' : language === 'de' ? 'Datenschutzrichtlinie' : language === 'fr' ? 'Politique de Confidentialité' : language === 'it' ? 'Informativa sulla Privacy' : language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                </a>
              </li>
              <li>
                <a href="https://add-individual-solutions.com/terms" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  {language === 'ro' ? 'Termeni și Condiții' : language === 'el' ? 'Όροι & Προϋποθέσεις' : language === 'de' ? 'Allgemeine Geschäftsbedingungen' : language === 'fr' ? 'Conditions Générales' : language === 'it' ? 'Termini e Condizioni' : language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-secondary">
              {language === 'ro' ? 'Contact' : language === 'el' ? 'Επικοινωνία' : language === 'de' ? 'Kontakt' : language === 'fr' ? 'Contact' : language === 'it' ? 'Contatti' : language === 'ar' ? 'اتصل بنا' : 'Contact'}
            </h3>
            <ul className="space-y-2.5">
              <li className="text-sm text-primary-foreground/70">
                Larnaca, Cyprus
              </li>
              <li>
                <a href="tel:+35796919606" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  +357 96 919606
                </a>
              </li>
              <li>
                <a href="mailto:contact@add-individual-solutions.com" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  contact@add-individual-solutions.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <p className="text-xs text-primary-foreground/50">
            &copy; {new Date().getFullYear()} ADD Individual Solutions Ltd.{' '}
            {language === 'ro'
              ? 'Toate drepturile rezervate.'
              : language === 'el'
                ? 'Με επιφύλαξη παντός δικαιώματος.'
                : language === 'de'
                  ? 'Alle Rechte vorbehalten.'
                  : language === 'fr'
                    ? 'Tous droits réservés.'
                    : language === 'it'
                      ? 'Tutti i diritti riservati.'
                      : language === 'ar'
                        ? 'جميع الحقوق محفوظة.'
                        : 'All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  );
}
