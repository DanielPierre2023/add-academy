'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface XPToastData {
  id: number;
  amount: number;
  type: string;
  achievements?: string[];
  levelUp?: number;
}

let toastId = 0;
const listeners: ((toast: XPToastData) => void)[] = [];

export function showXPToast(data: Omit<XPToastData, 'id'>) {
  const toast = { ...data, id: ++toastId };
  listeners.forEach((fn) => fn(toast));
}

/** Particle burst for level-ups */
function ParticleBurst() {
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360;
    const rad = (angle * Math.PI) / 180;
    const distance = 40 + (i % 3) * 15;
    return {
      id: i,
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance,
      color: ['#D4A017', '#0504AD', '#10b981', '#ec4899'][i % 4],
      size: 4 + (i % 3) * 2,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: '50%',
            top: '50%',
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            scale: [0, 1.2, 0],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

export function XPToastContainer() {
  const [toasts, setToasts] = useState<XPToastData[]>([]);

  const addToast = useCallback((toast: XPToastData) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3500);
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      const idx = listeners.indexOf(addToast);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.6, transition: { duration: 0.3 } }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              mass: 0.8,
            }}
            className={cn(
              'relative rounded-xl px-5 py-3.5 shadow-2xl pointer-events-auto backdrop-blur-sm',
              'bg-gradient-to-r',
              toast.levelUp
                ? 'from-secondary via-secondary to-secondary/90 text-secondary-foreground ring-2 ring-secondary/50'
                : 'from-primary via-primary to-primary/90 text-primary-foreground',
            )}
          >
            {/* Shimmer overlay */}
            <motion.div
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeInOut' }}
            />

            {/* Particle burst for level-ups */}
            {toast.levelUp && <ParticleBurst />}

            <div className="relative flex items-center gap-3">
              {/* Icon with bounce */}
              <motion.span
                className="text-xl"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.4, 1] }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {toast.levelUp ? '🏆' : toast.type === 'quiz_perfect' ? '🎯' : '⭐'}
              </motion.span>
              <div>
                {toast.levelUp ? (
                  <motion.p
                    className="font-bold text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    Level Up! Level {toast.levelUp}
                  </motion.p>
                ) : (
                  <motion.p
                    className="font-bold text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    +{toast.amount} XP
                  </motion.p>
                )}
                {toast.achievements && toast.achievements.length > 0 && (
                  <motion.p
                    className="text-xs opacity-80"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    transition={{ delay: 0.3 }}
                  >
                    Achievement unlocked!
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
