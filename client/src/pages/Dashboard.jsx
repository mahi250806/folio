import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderPlus, NotebookPen, BookOpen, CalendarClock, FileText } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, EmptyState, ErrorPanel, PageLoader, StatusMark } from '../components/ui.jsx';
import PaperForm from '../components/PaperForm.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import NoteForm from '../components/NoteForm.jsx';
import PaperRef from '../components/PaperRef.jsx';
import { READING_STATUSES } from '../lib/constants.js';
import { fmtShort, plural } from '../lib/format.js';

const STATUS_CLASS = { 'To Read': 'toread', Reading: 'reading', Read: 'read', Cited: 'cited', Dropped: 'dropped' };

function Pipeline({ byStatus, total }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Reading pipeline</h2>
        <span className="muted">{plural(total, 'paper')} by status</span>
      </header>
      <div className="pipeline" role="img" aria-label={READING_STATUSES.map((s) => `${s}: ${byStatus[s]}`).join(', ')}>
        {READING_STATUSES.filter((s) => byStatus[s] > 0).map((s) => (
          <span key={s} className={`pipe pipe-${STATUS_CLASS[s]}`} style={{ flexGrow: byStatus[s] }} title={`${s}: ${byStatus[s]}`} />
        ))}
      </div>
      <ul className="pipeline-legend">
        {READING_STATUSES.map((s) => (
          <li key={s}>
            <Link to={`/papers?status=${encodeURIComponent(s)}`}>
              <span className={`swatch pipe-${STATUS_CLASS[s]}`} aria-hidden="true" />
              {s}
              <strong>{byStatus[s]}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MonthlyChart({ monthly }) {
  const max = Math.max(1, ...monthly.map((m) => m.count));
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Papers finished</h2>
        <span className="muted">Last six months</span>
      </header>
      <div className="bars" role="img" aria-label={monthly.map((m) => `${m.month}: ${m.count}`).join(', ')}>
        {monthly.map((m, i) => (
          <div key={`${m.month}-${m.year}`} className={`bar-col ${i === monthly.length - 1 ? 'is-current' : ''}`}>
            <span className="bar-value">{m.count}</span>
            <span className="bar" style={{ height: `${(m.count / max) * 100}%` }} />
            <span className="bar-label">{m.month}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi('/dashboard/stats');
  const [modal, setModal] = useState(null); // 'paper' | 'project' | 'note'

  if (loading && !data) return <PageLoader label="Loading your dashboard" />;
  if (error) return <ErrorPanel message={error} onRetry={reload} />;

  const { totals, byStatus, monthly, recentPapers, readingQueue, deadlines, topTags, recentNotes } = data;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const queue = [...readingQueue.overdue, ...readingQueue.dueSoon];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Hello, {firstName}</h1>
          <p className="muted">
            {totals.papers === 0
              ? 'Your library is empty. Add the first paper you plan to read.'
              : `${plural(totals.toRead + totals.reading, 'paper')} still to read, ${totals.finishedThisMonth} finished this month.`}
          </p>
        </div>
        <div className="head-actions">
          <Button variant="secondary" icon={NotebookPen} onClick={() => setModal('note')} disabled={totals.papers === 0}>Add note</Button>
          <Button icon={Plus} onClick={() => setModal('paper')}>Add paper</Button>
        </div>
      </header>

      <dl className="ledger">
        <div><dt>Papers in library</dt><dd>{totals.papers}</dd><span>{totals.pdfs} with PDFs</span></div>
        <div><dt>Still to read</dt><dd>{totals.toRead + totals.reading}</dd><span>{totals.reading} in progress</span></div>
        <div><dt>Finished</dt><dd>{totals.finished}</dd><span>{totals.cited} cited in projects</span></div>
        <div><dt>Notes written</dt><dd>{totals.notes}</dd><span>on {plural(totals.notedPapers, 'paper')}</span></div>
      </dl>

      {totals.papers === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Start your library"
          action={
            <div className="head-actions">
              <Button icon={Plus} onClick={() => setModal('paper')}>Add paper</Button>
              <Button variant="secondary" icon={FolderPlus} onClick={() => setModal('project')}>New project</Button>
            </div>
          }
        >
          Add a paper by DOI or by hand, attach its PDF, and Folio keeps track of what you have read.
        </EmptyState>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-xl-8 stack-lg">
            <Pipeline byStatus={byStatus} total={totals.papers} />

            <section className="panel">
              <header className="panel-head">
                <h2>Recently added</h2>
                <Link to="/papers" className="link-quiet">Open library</Link>
              </header>
              <div className="ref-list">
                {recentPapers.map((p) => (
                  <div key={p._id} className="recent-row">
                    <PaperRef paper={p} compact />
                    <div className="recent-meta">
                      <StatusMark status={p.status} />
                      {p.hasPdf && <FileText size={15} aria-label="PDF attached" />}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <MonthlyChart monthly={monthly} />
          </div>

          <div className="col-12 col-xl-4 stack-lg">
            <section className="panel">
              <header className="panel-head">
                <h2>Reading queue</h2>
                <span className="muted">Overdue or due in 7 days</span>
              </header>
              {queue.length === 0 ? (
                <p className="muted small">Nothing due. Set a “Read by” date on a paper to plan your week.</p>
              ) : (
                <ul className="due-list">
                  {queue.map((p) => (
                    <li key={p._id}>
                      <Link to={`/papers/${p._id}`} className="due-title">{p.title}</Link>
                      <span className={`due-when ${p.days < 0 ? 'is-overdue' : 'is-soon'}`}>
                        {p.days < 0 ? `Overdue by ${plural(-p.days, 'day')}` : p.days === 0 ? 'Due today' : `Due ${fmtShort(p.readBy)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <header className="panel-head">
                <h2>Deadlines</h2>
                <Link to="/projects" className="link-quiet">Projects</Link>
              </header>
              {deadlines.length === 0 ? (
                <p className="muted small">No project deadlines in the next 30 days.</p>
              ) : (
                <ul className="deadline-list">
                  {deadlines.map((d) => (
                    <li key={d._id}>
                      <span className="cal" aria-hidden="true">
                        <small>{fmtShort(d.deadline).split(' ')[1]}</small>
                        {fmtShort(d.deadline).split(' ')[0]}
                      </span>
                      <div>
                        <Link to={`/projects/${d._id}`}>{d.title}</Link>
                        <span className="muted small">
                          <CalendarClock size={13} aria-hidden="true" /> {d.days === 0 ? 'Due today' : `${plural(d.days, 'day')} left`} · {d.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {topTags.length > 0 && (
              <section className="panel">
                <header className="panel-head"><h2>Topics</h2></header>
                <div className="tag-cloud">
                  {topTags.map((t) => (
                    <Link key={t.tag} to={`/papers?tag=${encodeURIComponent(t.tag)}`} className="chip">
                      #{t.tag} <span className="muted">{t.count}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {recentNotes.length > 0 && (
              <section className="panel">
                <header className="panel-head">
                  <h2>Latest notes</h2>
                  <Link to="/notes" className="link-quiet">All notes</Link>
                </header>
                <ul className="mini-notes">
                  {recentNotes.map((n) => (
                    <li key={n._id}>
                      <span className="note-kind">{n.kind}</span>
                      <p>{n.content.length > 140 ? `${n.content.slice(0, 140)}…` : n.content}</p>
                      {n.paper && <Link to={`/papers/${n.paper._id}`} className="muted small">{n.paper.title}</Link>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}

      <PaperForm open={modal === 'paper'} onClose={() => setModal(null)} onSaved={(p) => navigate(`/papers/${p._id}`)} />
      <ProjectForm open={modal === 'project'} onClose={() => setModal(null)} onSaved={reload} />
      <NoteForm open={modal === 'note'} onClose={() => setModal(null)} onSaved={reload} />
    </div>
  );
}
