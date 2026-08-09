/**
 * Client-side PDF certificate generator for ADD Academy.
 *
 * Uses the browser Canvas API to draw a branded completion certificate,
 * then converts it to a downloadable PDF-like image.
 *
 * For a true multi-page PDF we'd use jsPDF or server-side generation,
 * but for a single-page certificate a high-res canvas export works great
 * and avoids extra dependencies.
 */

export interface CertificateData {
  studentName: string;
  courseName: string;
  courseIcon: string;
  completionDate: string; // ISO date string
  completionPercentage: number;
  totalLectures: number;
  completedLectures: number;
  level: number;
  xp: number;
}

const CERT_WIDTH = 1600;
const CERT_HEIGHT = 1131; // ~A4 landscape ratio

/**
 * Generate a completion certificate as a downloadable PNG.
 * Uses Canvas API — works entirely client-side, no dependencies.
 */
export async function generateCertificate(data: CertificateData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CERT_WIDTH;
  canvas.height = CERT_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // ─── Background ──────────────────────────────────────
  // White base
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);

  // Gold accent border
  ctx.strokeStyle = '#E8A731';
  ctx.lineWidth = 12;
  ctx.strokeRect(30, 30, CERT_WIDTH - 60, CERT_HEIGHT - 60);

  // Inner subtle border
  ctx.strokeStyle = '#0504AA';
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, CERT_WIDTH - 100, CERT_HEIGHT - 100);

  // Top gold bar
  ctx.fillStyle = '#E8A731';
  ctx.fillRect(50, 50, CERT_WIDTH - 100, 8);

  // Bottom gold bar
  ctx.fillRect(50, CERT_HEIGHT - 58, CERT_WIDTH - 100, 8);

  // ─── Logo area ───────────────────────────────────────
  // Load the ADD logo
  try {
    const logo = await loadImage('/add-logo.jpg');
    const logoH = 80;
    const logoW = (logo.width / logo.height) * logoH;
    ctx.drawImage(logo, (CERT_WIDTH - logoW) / 2, 85, logoW, logoH);
  } catch {
    // Fallback: draw text logo
    ctx.fillStyle = '#E8A731';
    ctx.fillRect(CERT_WIDTH / 2 - 60, 90, 120, 50);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Fraunces", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('ADD', CERT_WIDTH / 2, 125);
  }

  // "Academy" under logo
  ctx.fillStyle = '#E8A731';
  ctx.font = 'bold 22px "Manrope", "Helvetica Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Academy', CERT_WIDTH / 2, 195);

  // ─── Title ───────────────────────────────────────────
  ctx.fillStyle = '#0504AA';
  ctx.font = 'italic bold 48px "Fraunces", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Certificate of Completion', CERT_WIDTH / 2, 280);

  // Decorative line
  ctx.strokeStyle = '#E8A731';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CERT_WIDTH / 2 - 200, 300);
  ctx.lineTo(CERT_WIDTH / 2 + 200, 300);
  ctx.stroke();

  // ─── Subtitle ────────────────────────────────────────
  ctx.fillStyle = '#555555';
  ctx.font = '18px "Manrope", "Helvetica Neue", sans-serif';
  ctx.fillText('This is to certify that', CERT_WIDTH / 2, 360);

  // ─── Student Name ────────────────────────────────────
  ctx.fillStyle = '#060A10';
  ctx.font = 'bold 44px "Fraunces", Georgia, serif';
  ctx.fillText(data.studentName, CERT_WIDTH / 2, 430);

  // Underline
  const nameWidth = ctx.measureText(data.studentName).width;
  ctx.strokeStyle = '#E8A731';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CERT_WIDTH / 2 - nameWidth / 2 - 20, 445);
  ctx.lineTo(CERT_WIDTH / 2 + nameWidth / 2 + 20, 445);
  ctx.stroke();

  // ─── Course Description ──────────────────────────────
  ctx.fillStyle = '#555555';
  ctx.font = '18px "Manrope", "Helvetica Neue", sans-serif';
  ctx.fillText('has successfully completed the course', CERT_WIDTH / 2, 495);

  // Course name with icon
  ctx.fillStyle = '#0504AA';
  ctx.font = 'bold 34px "Manrope", "Helvetica Neue", sans-serif';
  ctx.fillText(data.courseName, CERT_WIDTH / 2, 550);

  // ─── Stats ───────────────────────────────────────────
  ctx.fillStyle = '#666666';
  ctx.font = '16px "Manrope", "Helvetica Neue", sans-serif';
  const statsText = `${data.completedLectures} lectures completed  ·  Level ${data.level}  ·  ${data.xp.toLocaleString()} XP earned`;
  ctx.fillText(statsText, CERT_WIDTH / 2, 600);

  // ─── Completion badge ────────────────────────────────
  // Draw a circular badge
  const badgeX = CERT_WIDTH / 2;
  const badgeY = 700;
  const badgeR = 55;

  // Outer ring
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = '#0504AA';
  ctx.fill();

  // Inner circle
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR - 6, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Percentage
  ctx.fillStyle = '#0504AA';
  ctx.font = 'bold 32px "Manrope", "Helvetica Neue", sans-serif';
  ctx.fillText(`${data.completionPercentage}%`, badgeX, badgeY + 10);

  // ─── Date & signature area ───────────────────────────
  const bottomY = 870;

  // Date
  ctx.fillStyle = '#060A10';
  ctx.font = '18px "Manrope", "Helvetica Neue", sans-serif';
  const formattedDate = new Date(data.completionDate).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  ctx.fillText(formattedDate, CERT_WIDTH / 2 - 300, bottomY);

  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CERT_WIDTH / 2 - 440, bottomY + 10);
  ctx.lineTo(CERT_WIDTH / 2 - 160, bottomY + 10);
  ctx.stroke();

  ctx.fillStyle = '#999999';
  ctx.font = '14px "Manrope", "Helvetica Neue", sans-serif';
  ctx.fillText('Date of Completion', CERT_WIDTH / 2 - 300, bottomY + 35);

  // Issuer
  ctx.fillStyle = '#060A10';
  ctx.font = '18px "Manrope", "Helvetica Neue", sans-serif';
  ctx.fillText('ADD Individual Solutions Ltd.', CERT_WIDTH / 2 + 300, bottomY);

  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CERT_WIDTH / 2 + 160, bottomY + 10);
  ctx.lineTo(CERT_WIDTH / 2 + 440, bottomY + 10);
  ctx.stroke();

  ctx.fillStyle = '#999999';
  ctx.font = '14px "Manrope", "Helvetica Neue", sans-serif';
  ctx.fillText('Issued by', CERT_WIDTH / 2 + 300, bottomY + 35);

  // ─── Footer ──────────────────────────────────────────
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '12px "Manrope", "Helvetica Neue", sans-serif';
  ctx.fillText(
    'Verify at add-academy.com  ·  ADD Individual Solutions Ltd.  ·  Our Vision Your Way',
    CERT_WIDTH / 2,
    CERT_HEIGHT - 80,
  );

  // ─── Export ──────────────────────────────────────────
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate certificate'));
      },
      'image/png',
      1.0,
    );
  });
}

/**
 * Download a certificate to the user's device.
 */
export async function downloadCertificate(data: CertificateData): Promise<void> {
  const blob = await generateCertificate(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ADD-Academy-Certificate-${data.courseName.replace(/\s+/g, '-')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Helper to load an image from a URL */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
