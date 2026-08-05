'use client';
 
import dynamic from 'next/dynamic';
 
const AccountView = dynamic(() => import('./account-view'), { ssr: false });
 
export default function AccountPage() {
  return <AccountView />;
}
 
