import { Link } from 'react-router-dom';
import { apaAuthors, authorLine } from '../lib/format.js';

const endsWithPunct = (s) => /[.?!]$/.test(String(s || '').trim());

/**
 * An APA 7 reference rendered with the right typography:
 * Authors. (Year). Title. *Journal, Volume*(Issue), pages. https://doi.org/...
 * `short` uses "et al." after three authors, for dense lists.
 * `to` makes the title a link.
 */
export default function ApaReference({ paper, short = false, to, showLink = false }) {
  const authors = short ? authorLine(paper.authors) : apaAuthors(paper.authors);
  const title = paper.title?.trim() || 'Untitled';
  const titleEl = to ? <Link to={to} className="ref-title">{title}</Link> : <span className="ref-title">{title}</span>;
  const link = paper.doi ? `https://doi.org/${paper.doi}` : paper.url;

  return (
    <>
      <span className="ref-authors">
        {authors}
        {endsWithPunct(authors) ? '' : '.'} ({paper.year || 'n.d.'}).
      </span>{' '}
      {titleEl}
      {endsWithPunct(title) ? '' : '.'}
      {paper.venue && (
        <>
          {' '}
          <em className="ref-venue">
            {paper.venue}
            {paper.volume ? `, ${paper.volume}` : ''}
          </em>
          {paper.issue ? `(${paper.issue})` : ''}
          {paper.pages ? `, ${paper.pages}` : ''}.
        </>
      )}
      {showLink && link && (
        <>
          {' '}
          <a href={link} target="_blank" rel="noreferrer" className="ref-link">{link}</a>
        </>
      )}
    </>
  );
}
