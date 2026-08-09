'use client';

import { useAcademyStore } from '@/lib/store/academy-store';
import { Flame } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function XPBar() {
  const xp = useAcademyStore((s) => s.xp);
  const getLevel = useAcademyStore((s) => s.getLevel);
  const getXPProgress = useAcademyStore((s) => s.getXPProgress);
  const streak = useAcademyStore((s) => s.streak);

  const level = getLevel();
  const { current, needed, percentage } = getXPProgress();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="hidden md:flex items-center gap-2 cursor-default">
            {/* Level badge */}
            <span className="text-xs font-bold bg-secondary/90 text-secondary-foreground px-1.5 py-0.5 rounded">
              Lv.{level}
            </span>
            {/* XP bar */}
            <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            {/* Streak */}
            {streak > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-primary-foreground/60">
                <Flame className="h-3 w-3 text-orange-400" />{streak}
              </span>
            )}
          </div>
        }
      />
      <TooltipContent>
        <p className="text-xs">
          {xp} XP total — {current}/{needed} to level {level + 1}
          {streak > 0 && ` — ${streak} day streak`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
