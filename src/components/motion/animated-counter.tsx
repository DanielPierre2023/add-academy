'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}

/**
 * Animated number counter that counts up when scrolled into view.
 */
export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  className,
  duration = 1.5,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayValue, setDisplayValue] = useState(0);

  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => {
      setDisplayValue(Math.round(v));
    });
    return unsubscribe;
  }, [spring]);

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}
