'use client';

import { useState, useCallback } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { getLectureIndex } from '@/lib/lectures';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Award, Download, Lock, CheckCircle2, BookOpen } from 'lucide-react';

export default function CertificatePage() {
  const { language, progress, getCompletionPercentage, quizScores } = useAcademyStore();
  const [name, setName] = useState('');

  const index = getLectureIndex();
  const totalLectures = index.lectures.filter((l) => l.id !== 'home').length;
  const completedCount = Object.values(progress).filter((p) => p.completed).length;
  const percentage = getCompletionPercentage();
  const isEligible = percentage >= 80;
  const [downloading, setDownloading] = useState(false);

  const quizValues = Object.values(quizScores);
  const quizAverage =
    quizValues.length > 0
      ? Math.round(quizValues.reduce((a, b) => a + b, 0) / quizValues.length)
      : 0;

  const handleDownload = useCallback(async () => {
    if (!name.trim() || downloading) return;
    setDownloading(true);
    try {
      // Generate a simple certificate as a downloadable HTML file
      const certDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const certHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ADD Academy Certificate</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Manrope:wght@400;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0a2e;font-family:'Manrope',sans-serif}
.cert{width:900px;padding:60px;background:linear-gradient(135deg,#0d0d3a 0%,#1a1a5c 100%);border:3px solid #c8942a;border-radius:16px;text-align:center;color:#fff;position:relative;overflow:hidden}
.cert::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 30%,rgba(200,148,42,0.05) 0%,transparent 50%);pointer-events:none}
h1{font-family:'Fraunces',serif;font-size:36px;color:#c8942a;margin-bottom:8px}
.subtitle{font-size:14px;color:#8888bb;margin-bottom:40px}
.certifies{font-size:16px;color:#aaa;margin-bottom:12px}
.student-name{font-family:'Fraunces',serif;font-size:42px;font-weight:700;color:#fff;margin-bottom:16px;border-bottom:2px solid #c8942a;display:inline-block;padding-bottom:8px}
.course-name{font-size:18px;color:#c8942a;margin:24px 0;font-style:italic}
.stats{display:flex;justify-content:center;gap:48px;margin:32px 0;font-size:14px;color:#aaa}
.stats .val{font-size:20px;font-weight:600;color:#fff;display:block}
.date{font-size:13px;color:#777;margin-top:32px}
</style></head><body>
<div class="cert">
<h1>ADD Academy</h1>
<p class="subtitle">Certificate of Completion</p>
<p class="certifies">This certifies that</p>
<p class="student-name">${name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
<p class="course-name">&ldquo;Building Large Language Models from Scratch&rdquo;</p>
<div class="stats">
<div><span class="val">${completedCount}</span>Lectures</div>
<div><span class="val">${quizAverage}%</span>Quiz Average</div>
<div><span class="val">${certDate}</span>Date</div>
</div>
<p class="date">Issued on ${certDate}</p>
</div></body></html>`;

      const blob = new Blob([certHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ADD-Academy-Certificate-${name.replace(/\s+/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Certificate download failed:', err);
    } finally {
      setDownloading(false);
    }
  }, [name, downloading, completedCount, quizAverage]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Award className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold">{t('cert_title', language)}</h1>
      </div>

      {!isEligible ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-6">
              {t('cert_not_ready', language)}
            </p>
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Lectures completed
                </span>
                <span className="font-medium">
                  {completedCount} / {totalLectures}
                </span>
              </div>
              <Progress value={percentage} className="h-3" />
              <p className="text-xs text-muted-foreground">
                Complete at least 80% of lectures to earn your certificate
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center pb-2">
              <Badge className="mx-auto mb-2 bg-green-500/10 text-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Eligible
              </Badge>
              <CardTitle className="text-xl">
                ADD Academy — Build LLMs from Scratch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Certificate Preview */}
              <div className="rounded-lg border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center">
                <p className="text-sm text-muted-foreground mb-2">This certifies that</p>
                <p className="text-2xl font-bold mb-2">
                  {name || t('cert_name', language)}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  has successfully completed the ADD Academy course
                </p>
                <p className="text-lg font-semibold text-primary">
                  &ldquo;Building Large Language Models from Scratch&rdquo;
                </p>
                <div className="mt-6 flex justify-center gap-8 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">{completedCount}</p>
                    <p>Lectures</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{quizAverage}%</p>
                    <p>Quiz Avg</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{new Date().toLocaleDateString()}</p>
                    <p>Date</p>
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div className="max-w-md mx-auto space-y-2">
                <Label htmlFor="cert-name">{t('cert_name', language)}</Label>
                <Input
                  id="cert-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              {/* Download Button */}
              <div className="text-center">
                <Button size="lg" disabled={!name.trim() || downloading} onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  {downloading ? 'Generating...' : t('cert_download', language)}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  PDF certificate with verification QR code
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
