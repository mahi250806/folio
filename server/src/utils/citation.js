// Citation formatting: APA 7th edition (reference list) and BibTeX.
// Authors are stored as entered ("Eugene F. Fama" or "Fama, Eugene F."); both forms are handled.

const PARTICLES = new Set(['van', 'von', 'de', 'der', 'den', 'del', 'della', 'da', 'di', 'du', 'la', 'le', 'bin', 'al']);

export function splitName(raw) {
  const name = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!name) return { first: '', last: '' };
  if (name.includes(',')) {
    const [last, ...rest] = name.split(',');
    return { last: last.trim(), first: rest.join(',').trim() };
  }
  const parts = name.split(' ');
  if (parts.length === 1) return { first: '', last: parts[0] };
  // Keep particles with the surname: "Ludwig van Beethoven" -> last "van Beethoven"
  let i = parts.length - 1;
  while (i > 1 && PARTICLES.has(parts[i - 1].toLowerCase())) i -= 1;
  return { first: parts.slice(0, i).join(' '), last: parts.slice(i).join(' ') };
}

function initials(first) {
  return first
    .split(/[\s]+/)
    .filter(Boolean)
    .map((p) =>
      p
        .split('-')
        .map((h) => (h.replace('.', '')[0] ? `${h.replace('.', '')[0].toUpperCase()}.` : ''))
        .join('-')
    )
    .join(' ');
}

function apaAuthor(raw) {
  const { first, last } = splitName(raw);
  return first ? `${last}, ${initials(first)}` : last;
}

function apaAuthorList(authors) {
  const list = (authors || []).filter(Boolean).map(apaAuthor);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length <= 20) return `${list.slice(0, -1).join(', ')}, & ${list[list.length - 1]}`;
  // APA 7: first 19, ellipsis, final author
  return `${list.slice(0, 19).join(', ')}, . . . ${list[list.length - 1]}`;
}

const endWithPeriod = (s) => (/[.?!]$/.test(s) ? s : `${s}.`);

export function formatApa(p) {
  const authors = apaAuthorList(p.authors);
  const year = p.year ? `(${p.year}).` : '(n.d.).';
  const title = endWithPeriod(String(p.title || '').trim());
  let source = '';
  if (p.venue) {
    source = p.venue;
    if (p.volume) source += `, ${p.volume}`;
    if (p.issue) source += `(${p.issue})`;
    if (p.pages) source += `, ${p.pages}`;
    source = endWithPeriod(source);
  }
  const link = p.doi ? `https://doi.org/${p.doi}` : p.url || '';
  const head = authors ? `${endWithPeriod(authors)} ${year}` : `${title} ${year}`;
  const body = authors ? `${title}${source ? ` ${source}` : ''}` : source;
  return [head, body, link].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

const bibEscape = (s) => String(s).replace(/([&%$#_{}])/g, '\\$1');

export function citeKey(p) {
  const { last } = splitName((p.authors || [])[0] || 'anon');
  const surname = last.split(' ').pop().normalize('NFKD').replace(/[^A-Za-z]/g, '').toLowerCase() || 'anon';
  const word = String(p.title || '')
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ''))
    .find((w) => w.length > 3 && !['the', 'with', 'from', 'that', 'this', 'into', 'over'].includes(w)) || 'paper';
  return `${surname}${p.year || 'nd'}${word}`;
}

export function formatBibtex(p, key = citeKey(p)) {
  const typeMap = {
    'Journal article': 'article',
    'Conference paper': 'inproceedings',
    'Book chapter': 'incollection',
    Thesis: 'phdthesis',
    Report: 'techreport',
    Preprint: 'misc',
    Other: 'misc',
  };
  const type = typeMap[p.paperType] || 'article';
  const venueField = { article: 'journal', inproceedings: 'booktitle', incollection: 'booktitle', techreport: 'institution', phdthesis: 'school' }[type] || 'howpublished';
  const fields = [
    ['title', p.title ? `{${bibEscape(p.title)}}` : null],
    ['author', (p.authors || []).length ? (p.authors || []).map((a) => {
      const { first, last } = splitName(a);
      return first ? `${last}, ${first}` : last;
    }).map(bibEscape).join(' and ') : null],
    [venueField, p.venue ? bibEscape(p.venue) : null],
    ['year', p.year || null],
    ['volume', p.volume || null],
    ['number', p.issue || null],
    ['pages', p.pages ? String(p.pages).replace(/[–-]+/, '--') : null],
    ['doi', p.doi || null],
    ['url', !p.doi && p.url ? p.url : null],
  ].filter(([, v]) => v !== null && v !== '');
  const body = fields.map(([k, v]) => `  ${k} = {${v}}`).join(',\n');
  return `@${type}{${key},\n${body}\n}`;
}

/** BibTeX for many papers, with duplicate keys made unique (smith2020a, smith2020b). */
export function formatBibtexFile(papers) {
  const seen = new Map();
  return papers
    .map((p) => {
      let key = citeKey(p);
      const n = seen.get(key) || 0;
      seen.set(key, n + 1);
      if (n > 0) key += String.fromCharCode(97 + n);
      return formatBibtex(p, key);
    })
    .join('\n\n');
}
