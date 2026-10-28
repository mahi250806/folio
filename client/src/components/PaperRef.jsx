import { Link } from 'react-router-dom';
import { FileText, MessageSquareText, CalendarClock } from 'lucide-react';
import { StatusMark, PriorityMark } from './ui.jsx';
import ApaReference from './ApaReference.jsx';
import { daysUntil, fmtShort, relativeDays, plural } from '../lib/format.js';

/**
 * One library entry, laid out like a line in a reference list
 * (hanging indent, APA order), with the reading details underneath.
 */
export default function PaperRef({ paper, actions, compact = false }) {
  const unread = paper.status === 'To Read' || paper.status === 'Reading';
  const due = paper.readBy && unread ? daysUntil(paper.readBy) : null;

  return (
    <article className={`ref-entry ${paper.status === 'Dropped' ? 'is-dropped' : ''}`}>
      <p className="ref">
        <ApaReference paper={paper} short to={`/papers/${paper._id}`} />
      </p>

      {!compact && (
        <div className="ref-meta">
          <StatusMark status={paper.status} />
          <PriorityMark priority={paper.priority} />
          {due !== null && (
            <span className={`meta-item ${due < 0 ? 'is-overdue' : due <= 7 ? 'is-soon' : ''}`} title={`Read by ${fmtShort(paper.readBy)}`}>
              <CalendarClock size={14} aria-hidden="true" />
              {due < 0 ? `Overdue by ${plural(-due, 'day')}` : `Read by ${fmtShort(paper.readBy)} (${relativeDays(paper.readBy)})`}
            </span>
          )}
          {paper.noteCount > 0 && (
            <span className="meta-item"><MessageSquareText size={14} aria-hidden="true" /> {plural(paper.noteCount, 'note')}</span>
          )}
          {paper.file && <span className="meta-item"><FileText size={14} aria-hidden="true" /> PDF</span>}
          {(paper.projects || []).map((p) => (
            <Link key={p._id} to={`/projects/${p._id}`} className="chip chip-project">{p.title}</Link>
          ))}
          {(paper.tags || []).map((t) => (
            <Link key={t} to={`/papers?tag=${encodeURIComponent(t)}`} className="chip">#{t}</Link>
          ))}
        </div>
      )}
      {actions && <div className="ref-actions">{actions}</div>}
    </article>
  );
}
