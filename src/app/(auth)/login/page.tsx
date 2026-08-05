import dynamic from 'next/dynamic';

// Dynamically import the client form with SSR disabled to prevent prerender errors
const LoginForm = dynamic(() => import('./login-form'), { ssr: false });

export default function LoginPage() {
  return <LoginForm />;
}
