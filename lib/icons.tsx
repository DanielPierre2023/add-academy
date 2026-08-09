// ═══════════════════════════════════════════
// Icon mapping — replaces all emoji icons with
// professional lucide-react SVG pictograms
// ═══════════════════════════════════════════

import {
  Compass,
  BookOpen,
  Binary,
  ScanSearch,
  Blocks,
  BarChart3,
  GraduationCap,
  Package,
  Wrench,
  Award,
  Terminal,
  Target,
  Trophy,
  Flame,
  Library,
  Star,
  Crown,
  PenLine,
  Palette,
  Film,
  FileText,
  Brain,
  Rocket,
  Bot,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** Map of icon key → lucide-react component */
export const ICON_MAP: Record<string, LucideIcon> = {
  // Stage icons
  Compass,
  BookOpen,
  Binary,
  ScanSearch,
  Blocks,
  BarChart3,
  GraduationCap,
  Package,
  Wrench,
  Award,
  // Achievement icons
  Terminal,
  Target,
  Trophy,
  Flame,
  Library,
  Star,
  Crown,
  PenLine,
  // SaaS product icons
  Palette,
  Film,
  FileText,
  // Course catalog icons
  Brain,
  Rocket,
  Bot,
  Zap,
};

/** Resolve an icon key string to a lucide-react component. Falls back to BookOpen. */
export function getIcon(key: string): LucideIcon {
  return ICON_MAP[key] || BookOpen;
}
