/** Indian-numbering currency, short form. 4100000 -> "41.00 L". */
export function inr(value, { compact = true, symbol = '₹' } = {}) {
  const n = Number(value || 0);
  if (!compact) return `${symbol}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  if (Math.abs(n) >= 1e7) return `${symbol}${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `${symbol}${(n / 1e5).toFixed(2)} L`;
  if (Math.abs(n) >= 1e3) return `${symbol}${(n / 1e3).toFixed(1)} K`;
  return `${symbol}${n.toLocaleString('en-IN')}`;
}

export const num = (v) => Number(v || 0).toLocaleString('en-IN');

export function date(value, { withTime = false } = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const base = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return withTime ? `${base}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : base;
}

export function relative(value) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return 'just now';
  if (Math.abs(mins) < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (Math.abs(days) < 31) return `${days}d ago`;
  return date(value);
}

export function daysBetween(a, b = new Date()) {
  if (!a) return null;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export const titleCase = (s = '') =>
  String(s).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const pct = (v) => `${Math.round(Number(v || 0))}%`;

export const truncate = (s = '', n = 120) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
