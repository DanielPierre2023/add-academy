import type { Language } from '@/types';
import type { ForumCategory } from '@/lib/forum/actions';

/** Localized relative time, e.g. "3h ago" / "acum 3h" / "πριν 3ω". */
export function relativeTime(iso: string, lang: Language): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));

  const units: Array<[number, string, string, string]> = [
    [60, 's', 's', 'δ'],
    [3600, 'm', 'm', 'λ'],
    [86400, 'h', 'h', 'ω'],
    [2592000, 'd', 'z', 'μ'],
    [31536000, 'mo', 'lună', 'μήν'],
  ];

  const now = { en: 'just now', ro: 'chiar acum', el: 'μόλις τώρα' };
  if (secs < 45) return now[lang] ?? now.en;

  let value = secs;
  let suffixIdx = 0;
  let divisor = 1;
  for (let i = 0; i < units.length; i++) {
    if (secs < units[i][0]) {
      suffixIdx = i;
      break;
    }
    divisor = units[i][0];
    suffixIdx = i + 1 < units.length ? i + 1 : i;
  }
  value = Math.floor(secs / divisor);
  const unit = units[Math.min(suffixIdx, units.length - 1)];
  const label = lang === 'ro' ? unit[2] : lang === 'el' ? unit[3] : unit[1];

  if (lang === 'ro') return `acum ${value}${label}`;
  if (lang === 'el') return `πριν ${value}${label}`;
  return `${value}${label} ago`;
}

export function categoryName(c: ForumCategory, lang: Language): string {
  if (lang === 'ro') return c.name_ro;
  if (lang === 'el') return c.name_el;
  return c.name_en;
}

export function categoryDesc(c: ForumCategory, lang: Language): string {
  if (lang === 'ro') return c.desc_ro ?? '';
  if (lang === 'el') return c.desc_el ?? '';
  return c.desc_en ?? '';
}
