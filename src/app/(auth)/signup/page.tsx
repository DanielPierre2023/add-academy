import { redirect } from 'next/navigation';

/**
 * Consolidate signup paths — redirect /signup to /register
 * to avoid duplicate registration flows.
 */
export default function SignupRedirect() {
  redirect('/register');
}
