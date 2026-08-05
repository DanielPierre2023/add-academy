import dynamic from 'next/dynamic';

const RegisterForm = dynamic(() => import('./register-form'), { ssr: false });

export default function RegisterPage() {
  return <RegisterForm />;
}
