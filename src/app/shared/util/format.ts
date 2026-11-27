const SUFFIXES = [
  '',
  'Tsd.',
  'Mio.',
  'Mrd.',
  'Bio.',
  'Brd.',
  'Trio.',
  'Trd.',
  'Quad.',
  'Qrd.',
  'Quint.',
] as const;

function decimal(n: number, digits: number): string {
  return n.toFixed(digits).replace('.', ',').replace(/,0+$/, '');
}

function groupThousands(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '−' + formatNumber(-n);
  if (n < 100) return decimal(Math.floor(n * 10) / 10, 1);
  if (n < 10000) return groupThousands(Math.floor(n));
  const e = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3));
  if (Math.log10(n) / 3 >= SUFFIXES.length) {
    return decimal(n / 10 ** Math.floor(Math.log10(n)), 2) + 'e' + Math.floor(Math.log10(n));
  }
  const v = n / 10 ** (e * 3);
  return (
    (v < 100 ? decimal(Math.floor(v * 10) / 10, 1) : groupThousands(Math.floor(v))) +
    ' ' +
    SUFFIXES[e]
  );
}

export function formatInteger(n: number): string {
  return formatNumber(Math.floor(n + 1e-9));
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return '–';
  const total = Math.max(0, Math.ceil(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDuration(sec: number): string {
  const total = Math.round(sec);
  if (total < 60) return `${total} s`;
  if (total < 3600) return `${Math.floor(total / 60)} min ${total % 60} s`;
  return `${Math.floor(total / 3600)} h ${Math.floor((total % 3600) / 60)} min`;
}
