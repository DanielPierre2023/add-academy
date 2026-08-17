import type { Language } from '@/types';
import type { ForumCategory } from '@/lib/forum/actions';

/** Localized relative time, e.g. "3h ago" / "acum 3h" / "πριν 3ω". */
export function relativeTime(iso: string, lang: Language): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));

  // [threshold, en, ro, el, de, fr, it, ar]
  const units: Array<[number, string, string, string, string, string, string, string]> = [
    [60, 's', 's', 'δ', 's', 's', 's', 'ث'],
    [3600, 'm', 'm', 'λ', 'min', 'min', 'min', 'د'],
    [86400, 'h', 'h', 'ω', 'Std', 'h', 'h', 'س'],
    [2592000, 'd', 'z', 'μ', 'T', 'j', 'g', 'ي'],
    [31536000, 'mo', 'lună', 'μήν', 'Mon', 'mois', 'mese', 'ش'],
  ];

  const now = {
    en: 'just now', ro: 'chiar acum', el: 'μόλις τώρα',
    de: 'gerade eben', fr: "à l'instant", it: 'proprio ora', ar: 'الآن',
  };
  if (secs < 45) return (now as Record<string, string>)[lang] ?? now.en;

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
  const labelByLang: Record<Language, string> = {
    en: unit[1], ro: unit[2], el: unit[3], de: unit[4], fr: unit[5], it: unit[6], ar: unit[7],
  };
  const label = labelByLang[lang] ?? unit[1];

  switch (lang) {
    case 'ro': return `acum ${value}${label}`;
    case 'el': return `πριν ${value}${label}`;
    case 'de': return `vor ${value}${label}`;
    case 'fr': return `il y a ${value}${label}`;
    case 'it': return `${value}${label} fa`;
    case 'ar': return `منذ ${value}${label}`;
    default: return `${value}${label} ago`;
  }
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
