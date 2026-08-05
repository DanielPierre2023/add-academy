'use client';

import { useEffect, useState, useCallback } from 'react';
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

export function XPToastContainer() {
  const [toasts, setToasts] = useState<XPToastData[]>([]);

  const addToast = useCallback((toast: XPToastData) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3000);
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
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'animate-slide-up rounded-lg px-4 py-3 shadow-lg pointer-events-auto',
            'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground',
            toast.levelUp && 'from-secondary to-secondary/90 text-secondary-foreground',
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {toast.levelUp ? '🎉' : toast.type === 'quiz_perfect' ? '🎯' : '⚡'}
            </span>
            <div>
              {toast.levelUp ? (
                <p className="font-bold text-sm">Level Up! Level {toast.levelUp}</p>
              ) : (
                <p className="font-bold text-sm">+{toast.amount} XP</p>
              )}
              {toast.achievements && toast.achievements.length > 0 && (
                <p className="text-xs opacity-80">
                  🏅 Achievement unlocked!
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
