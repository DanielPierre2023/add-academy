'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Wraps page content in a smooth fade + slide entrance animation.
 * Use in page.tsx files: <PageTransition>...content...</PageTransition>
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.4, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
