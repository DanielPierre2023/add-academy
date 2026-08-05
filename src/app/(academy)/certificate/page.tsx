'use client';

import { useState } from 'react';
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

  const quizValues = Object.values(quizScores);
  const quizAverage =
    quizValues.length > 0
      ? Math.round(quizValues.reduce((a, b) => a + b, 0) / quizValues.length)
      : 0;

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
                <Button size="lg" disabled={!name.trim()} className="gap-2">
                  <Download className="h-4 w-4" />
                  {t('cert_download', language)}
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
