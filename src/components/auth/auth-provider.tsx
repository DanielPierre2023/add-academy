'use client';

/**
 * CONSOLIDATED: This file re-exports from the primary auth context.
 * All auth logic lives in @/lib/auth/auth-context.tsx.
 *
 * Components that import from here will get the same AuthProvider and useAuth
 * as the rest of the app.
 */
export { AuthProvider, useAuth } from '@/lib/auth/auth-context';
export type { AppUser as AcademyUser } from '@/lib/auth/auth-context';
