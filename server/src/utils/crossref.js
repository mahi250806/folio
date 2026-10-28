import { ApiError } from './http.js';

/** Normalises "https://doi.org/10.x/y", "doi:10.x/y" or "10.x/y" to "10.x/y". */
export function normalizeDoi(input) {
  const doi = String(input || '')
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
  return /^10\.\d{4,9}\/\S+$/.test(doi) ? doi : null;
}

const TYPE_MAP = {
  'journal-article': 'Journal article',
  'proceedings-article': 'Conference paper',
  'posted-content': 'Preprint',
  'book-chapter': 'Book chapter',
  dissertation: 'Thesis',
  report: 'Report',
};

const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Looks up paper metadata from Crossref's public API (no key needed). */
export async function lookupDoi(rawDoi) {
  const doi = normalizeDoi(rawDoi);
  if (!doi) throw new ApiError(400, 'Enter a DOI like 10.1111/j.1540-6261.1970.tb00518.x');

  let res;
  try {
    res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'FOLIO/1.0 (student project; mailto:folio@example.com)' },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ApiError(502, 'Could not reach Crossref. Fill in the details by hand or try again.');
  }
  if (res.status === 404) throw new ApiError(404, 'No paper found for that DOI');
  if (!res.ok) throw new ApiError(502, 'Crossref did not answer. Fill in the details by hand or try again.');

  const { message: m } = await res.json();
  const year =
    m?.issued?.['date-parts']?.[0]?.[0] ??
    m?.published?.['date-parts']?.[0]?.[0] ??
    m?.['published-print']?.['date-parts']?.[0]?.[0];

  return {
    title: stripTags(m?.title?.[0]),
    authors: (m?.author || [])
      .map((a) => [a.given, a.family].filter(Boolean).join(' ') || a.name)
      .filter(Boolean),
    year: year || undefined,
    venue: stripTags(m?.['container-title']?.[0]),
    paperType: TYPE_MAP[m?.type] || 'Other',
    volume: m?.volume || '',
    issue: m?.issue || '',
    pages: m?.page || '',
    doi,
    url: m?.URL || `https://doi.org/${doi}`,
    abstract: stripTags(m?.abstract).replace(/^Abstract\s*/i, '').slice(0, 5000),
  };
}
