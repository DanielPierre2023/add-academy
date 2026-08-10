// src/lib/admin/format.ts
const eur = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function formatEuro(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return eur.format(Math.round(value));
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value}%`;
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IE').format(value);
}
