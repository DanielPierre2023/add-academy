'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#D4A017', '#0504AD', '#10b981', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const SHAPES = ['square', 'circle', 'strip'] as const;

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  shape: typeof SHAPES[number];
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  drift: number;
}

export function Confetti({ active, duration = 4000 }: { active: boolean; duration?: number }) {
  const [visible, setVisible] = useState(false);

  const pieces = useMemo<ConfettiPiece[]>(() => {
    if (!active) return [];
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: 5 + (i / 80) * 90 + (((i * 7) % 10) - 5),
      color: COLORS[i % COLORS.length],
      shape: SHAPES[i % SHAPES.length],
      delay: ((i * 31) % 500) / 1000,
      duration: 2 + ((i * 13) % 200) / 100,
      size: 6 + ((i * 17) % 8),
      rotation: ((i * 47) % 360),
      drift: ((i * 23) % 80) - 40,
    }));
  }, [active]);

  useEffect(() => {
    if (!active) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [active, duration]);

  return (
    <AnimatePresence>
      {visible && pieces.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {pieces.map((piece) => {
            const shapeStyle =
              piece.shape === 'circle'
                ? { borderRadius: '50%', width: piece.size, height: piece.size }
                : piece.shape === 'strip'
                  ? { borderRadius: 2, width: piece.size * 0.4, height: piece.size * 1.2 }
                  : { borderRadius: 2, width: piece.size, height: piece.size * 0.6 };

            return (
              <motion.div
                key={piece.id}
                style={{
                  position: 'absolute',
                  left: `${piece.x}%`,
                  top: -20,
                  backgroundColor: piece.color,
                  ...shapeStyle,
                }}
                initial={{
                  y: -20,
                  rotate: 0,
                  opacity: 1,
                  scale: 0,
                }}
                animate={{
                  y: [0, window.innerHeight * 0.4, window.innerHeight + 20],
                  x: [0, piece.drift, piece.drift * 1.5],
                  rotate: [0, piece.rotation, piece.rotation * 2],
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1, 1, 0.3],
                }}
                transition={{
                  duration: piece.duration,
                  delay: piece.delay,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  times: [0, 0.3, 0.8, 1],
                }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
