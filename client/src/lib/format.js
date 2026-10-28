// Dates are stored as UTC midnight, so they are formatted in UTC to avoid
// showing the previous day in time zones west of Greenwich.
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const fmtDate = (d) => (d ? dateFmt.format(new Date(d)) : '—');
export const fmtShort = (d) => (d ? shortFmt.format(new Date(d)) : '—');

/** "2026-10-28" for <input type="date"> */
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export function todayUtc() {
  const n = new Date();
  return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Whole days from today to the date (negative = past). */
export function daysUntil(d) {
  if (!d) return null;
  const x = new Date(d);
  return Math.round((Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) - todayUtc()) / 86400000);
}

export function relativeDays(d) {
  const n = daysUntil(d);
  if (n === null) return '';
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function fmtBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** "Fama, E. F., & French, K. R." style author line for list entries. */
export function authorLine(authors = [], max = 3) {
  const fmt = (raw) => {
    const name = String(raw).trim();
    if (name.includes(',')) {
      const [last, first = ''] = name.split(',');
      return `${last.trim()}, ${initials(first)}`.trim().replace(/,$/, '');
    }
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0];
    const last = parts.pop();
    return `${last}, ${initials(parts.join(' '))}`;
  };
  const list = authors.filter(Boolean).map(fmt);
  if (list.length === 0) return 'Unknown author';
  if (list.length > max) return `${list.slice(0, max).join(', ')}, et al.`;
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')}, & ${list[list.length - 1]}`;
}

/** Full APA 7 author list: up to 20 names, then "…" and the last author. */
export function apaAuthors(authors = []) {
  const list = authors.filter(Boolean).map((a) => authorLine([a], 1));
  if (list.length === 0) return 'Unknown author';
  if (list.length === 1) return list[0];
  if (list.length <= 20) return `${list.slice(0, -1).join(', ')}, & ${list[list.length - 1]}`;
  return `${list.slice(0, 19).join(', ')}, . . . ${list[list.length - 1]}`;
}

function initials(first) {
  return first
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => `${p.replace('.', '')[0]?.toUpperCase() || ''}.`)
    .join(' ');
}

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
