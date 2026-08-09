'use client';

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  /** Glow color — CSS color string */
  glowColor?: string;
  /** Whether to scale on hover */
  hover?: boolean;
}

/**
 * Premium card with mouse-tracking glow border and hover lift.
 * Drop-in replacement for plain divs or Card wrappers.
 */
export function GlowCard({
  children,
  className,
  glowColor = 'rgba(212, 160, 23, 0.4)',
  hover = true,
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlowPosition({ x, y });
  }, []);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn('relative rounded-xl overflow-hidden', className)}
      style={{
        background: isHovered
          ? `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, ${glowColor}, transparent 60%)`
          : 'transparent',
      }}
    >
      {/* Inner content with slight padding for glow border */}
      <div className="relative rounded-[10px] bg-card border border-border/50 h-full transition-shadow duration-300"
        style={{
          boxShadow: isHovered
            ? `0 8px 32px -8px ${glowColor}, 0 4px 16px -4px rgba(0,0,0,0.1)`
            : '0 1px 3px 0 rgba(0,0,0,0.05)',
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}
