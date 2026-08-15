'use client';

import { useState, useTransition, useCallback } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Award, Download, Lock, CheckCircle2, BookOpen, ShieldCheck } from 'lucide-react';
import {
  issueCertificate,
  type CertificateStatus,
  type IssuedCertificate,
} from '@/lib/certificates/actions';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Self-contained, print-to-PDF-ready certificate with an embedded QR + link. */
function buildCertificateHtml(cert: IssuedCertificate, qrDataUrl: string): string {
  const date = new Date(cert.completionDate).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const qrImg = qrDataUrl
    ? `<img class="qr" src="${qrDataUrl}" alt="Verification QR code" width="120" height="120" />`
    : '';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<title>ADD Academica Certificate — ${esc(cert.recipientName)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Manrope:wght@400;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0a2e;font-family:'Manrope',sans-serif;padding:24px}
.cert{width:1000px;max-width:100%;padding:56px 64px;background:#fff;border:3px solid #E8A731;border-radius:14px;color:#060A10;position:relative}
.inner{border:1px solid rgba(5,4,170,.25);border-radius:8px;padding:40px 40px 28px;text-align:center}
.brand{font-family:'Fraunces',serif;font-size:30px;color:#0504AA;font-weight:700}
.brand span{color:#E8A731}
.kicker{letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:#E8A731;font-weight:700;margin:6px 0 26px}
.title{font-family:'Fraunces',serif;font-style:italic;font-size:34px;color:#0504AA;margin-bottom:18px}
.certifies{font-size:15px;color:#555}
.name{font-family:'Fraunces',serif;font-size:44px;font-weight:700;margin:12px 0 6px;display:inline-block;border-bottom:2px solid #E8A731;padding-bottom:6px}
.course{font-size:20px;color:#0504AA;font-weight:700;margin:20px 0 6px}
.stats{display:flex;justify-content:center;gap:44px;margin:24px 0 8px;font-size:13px;color:#666}
.stats .val{display:block;font-size:22px;font-weight:700;color:#060A10}
.foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px;gap:20px}
.foot .col{text-align:left;font-size:12px;color:#666}
.foot .col .line{border-top:1px solid #bbb;margin-bottom:4px;padding-top:6px;color:#060A10;font-size:14px}
.verify{text-align:center;font-size:11px;color:#777;line-height:1.5}
.verify a{color:#0504AA;word-break:break-all}
.hash{font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#999}
@media print{body{background:#fff;padding:0}.cert{border:3px solid #E8A731}}
</style></head>
<body>
  <div class="cert"><div class="inner">
    <div class="brand">ADD <span>Academica</span></div>
    <div class="kicker">Our Vision · Your Way</div>
    <div class="title">Certificate of Completion</div>
    <div class="certifies">This is to certify that</div>
    <div class="name">${esc(cert.recipientName)}</div>
    <div class="certifies">has successfully completed the course</div>
    <div class="course">${esc(cert.courseName)}</div>
    <div class="stats">
      <div><span class="val">${cert.lecturesCompleted}/${cert.totalLectures}</span>Lectures</div>
      <div><span class="val">${cert.quizAverage}%</span>Quiz average</div>
      <div><span class="val">${date}</span>Date</div>
    </div>
    <div class="foot">
      <div class="col"><div class="line">${date}</div>Date of completion</div>
      <div>${qrImg}</div>
      <div class="col"><div class="line">ADD Individual Solutions Ltd.</div>Issued by</div>
    </div>
    <div class="verify">
      Verify the authenticity of this certificate at<br/>
      <a href="${esc(cert.verifyUrl)}">${esc(cert.verifyUrl)}</a><br/>
      <span class="hash">ID: ${esc(cert.verificationHash)}</span>
    </div>
  </div></div>
</body></html>`;
}

export function CertificateClient({ initialStatus }: { initialStatus: CertificateStatus }) {
  const { language } = useAcademyStore();
  const [status, setStatus] = useState<CertificateStatus>(initialStatus);
  const [name, setName] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleIssue = useCallback(() => {
    startTransition(async () => {
      const next = await issueCertificate(name.trim() || undefined);
      setStatus(next);
    });
  }, [name]);

  const handleDownload = useCallback(async () => {
    const cert = status.certificate;
    if (!cert || downloading) return;
    setDownloading(true);
    try {
      let qr = '';
      try {
        const QR = (await import('qrcode')).default;
        qr = await QR.toDataURL(cert.verifyUrl, { margin: 1, width: 240 });
      } catch {
        // QR is a nice-to-have; the printed link still verifies.
      }
      const html = buildCertificateHtml(cert, qr);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ADD-Academica-Certificate-${cert.recipientName.replace(/\s+/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, [status.certificate, downloading]);

  const header = (
    <div className="text-center">
      <Award className="mx-auto h-16 w-16 text-primary mb-4" />
      <h1 className="text-3xl font-bold">{t('cert_title', language)}</h1>
    </div>
  );

  // ── Not eligible ─────────────────────────────────────────────
  if (!status.eligible && !status.certificate) {
    return (
      <div className="space-y-8">
        {header}
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-6">{t('cert_not_ready', language)}</p>
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {t('cert_lectures_completed', language)}
                </span>
                <span className="font-medium">
                  {status.completedLectures} / {status.totalLectures}
                </span>
              </div>
              <Progress value={status.percentage} className="h-3" />
              <p className="text-xs text-muted-foreground">{t('cert_threshold_hint', language)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cert = status.certificate;

  return (
    <div className="space-y-8">
      {header}
      <Card className="border-2 border-primary/20">
        <CardHeader className="text-center pb-2">
          <Badge className="mx-auto mb-2 bg-green-500/10 text-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {cert ? t('cert_issued_badge', language) : t('cert_eligible_badge', language)}
          </Badge>
          <CardTitle className="text-xl">ADD Academica — {t('cert_course_short', language)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">{t('cert_certifies', language)}</p>
            <p className="text-2xl font-bold mb-2">{cert?.recipientName || name || t('cert_name', language)}</p>
            <p className="text-sm text-muted-foreground mb-4">{t('cert_completed_the', language)}</p>
            <p className="text-lg font-semibold text-primary">
              &ldquo;Building Large Language Models from Scratch&rdquo;
            </p>
            <div className="mt-6 flex justify-center gap-8 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">
                  {(cert?.lecturesCompleted ?? status.completedLectures)}/{status.totalLectures}
                </p>
                <p>{t('cert_stat_lectures', language)}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{cert?.quizAverage ?? 0}%</p>
                <p>{t('cert_stat_quiz', language)}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {cert ? new Date(cert.completionDate).toLocaleDateString() : '—'}
                </p>
                <p>{t('cert_stat_date', language)}</p>
              </div>
            </div>
          </div>

          {!cert ? (
            <div className="max-w-md mx-auto space-y-3">
              {status.needsName && (
                <>
                  <Label htmlFor="cert-name">{t('cert_name', language)}</Label>
                  <Input
                    id="cert-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                  />
                  <p className="text-xs text-muted-foreground">{t('cert_name_permanent', language)}</p>
                </>
              )}
              {status.error === 'not_eligible' && (
                <p className="text-sm text-destructive">{t('cert_not_ready', language)}</p>
              )}
              <div className="text-center pt-2">
                <Button
                  size="lg"
                  disabled={pending || (status.needsName && name.trim().length < 2)}
                  onClick={handleIssue}
                  className="gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {pending ? t('cert_issuing', language) : t('cert_issue', language)}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <Button size="lg" disabled={downloading} onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                {downloading ? t('cert_generating', language) : t('cert_download', language)}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('cert_verifiable_at', language)}{' '}
                <a href={cert.verifyUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {cert.verifyUrl}
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
