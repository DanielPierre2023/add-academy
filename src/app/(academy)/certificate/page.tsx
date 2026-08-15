import { getCertificateStatus } from '@/lib/certificates/actions';
import { CertificateClient } from './certificate-client';

// Always render fresh — completion status changes as the learner progresses.
export const dynamic = 'force-dynamic';

export default async function CertificatePage() {
  const status = await getCertificateStatus();
  return <CertificateClient initialStatus={status} />;
}
