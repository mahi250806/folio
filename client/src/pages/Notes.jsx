import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, NotebookPen } from 'lucide-react';
import { useApi, useDebounced } from '../hooks/useApi.js';
import { Button, ConfirmDialog, EmptyState, ErrorPanel, PageLoader } from '../components/ui.jsx';
import NoteForm from '../components/NoteForm.jsx';
import { NOTE_KINDS } from '../lib/constants.js';
import { api, errorMessage } from '../lib/api.js';
import { fmtDate, plural } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Notes() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const debounced = useDebounced(q);
  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (debounced.trim()) sp.set('q', debounced.trim());
    if (kind) sp.set('kind', kind);
    return sp.toString();
  }, [debounced, kind]);

  const { data, loading, error, reload } = useApi(`/notes?${query}`);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/notes/${deleting._id}`);
      toast.success('Note deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const notes = data?.notes || [];
  const filtered = Boolean(q || kind);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Notes</h1>
          <p className="muted">Everything you have written while reading, across all papers.</p>
        </div>
        <Button icon={Plus} onClick={() => setEditing('new')}>Add note</Button>
      </header>

      <section className="panel filters">
        <div className="filter-row notes-filters">
          <div className="search">
            <Search size={17} aria-hidden="true" />
            <input type="search" className="input" placeholder="Search inside notes" aria-label="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input select" aria-label="Note type" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All types</option>
            {NOTE_KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div className="filter-foot">
          <span className="muted small" aria-live="polite">{loading ? 'Searching…' : plural(notes.length, 'note')}</span>
          {filtered && <button type="button" className="link-btn" onClick={() => { setQ(''); setKind(''); }}>Clear filters</button>}
        </div>
      </section>

      {error ? (
        <ErrorPanel message={error} onRetry={reload} />
      ) : loading && !data ? (
        <PageLoader label="Loading notes" />
      ) : notes.length === 0 ? (
        <EmptyState icon={NotebookPen} title={filtered ? 'No notes match' : 'No notes yet'} action={!filtered && <Button icon={Plus} onClick={() => setEditing('new')}>Add note</Button>}>
          {filtered ? 'Try another word or note type.' : 'Notes you add on a paper page also appear here.'}
        </EmptyState>
      ) : (
        <div className="row g-3">
          {notes.map((n) => (
            <div className="col-12 col-md-6" key={n._id}>
              <article className="index-card">
                <div className="index-card-head">
                  <span className="note-kind">{n.kind}</span>
                  {n.page && <span className="muted small">p. {n.page}</span>}
                  <span className="spacer" />
                  <button type="button" className="icon-btn" aria-label="Edit note" onClick={() => setEditing(n)}><Pencil size={15} /></button>
                  <button type="button" className="icon-btn danger" aria-label="Delete note" onClick={() => setDeleting(n)}><Trash2 size={15} /></button>
                </div>
                <p className={n.kind === 'Quote' ? 'note-quote' : ''}>{n.content}</p>
                <footer className="index-card-foot">
                  {n.paper ? <Link to={`/papers/${n.paper._id}`}>{n.paper.title}</Link> : <span className="muted">Paper deleted</span>}
                  <span className="muted small">{fmtDate(n.updatedAt)}</span>
                </footer>
              </article>
            </div>
          ))}
        </div>
      )}

      <NoteForm open={Boolean(editing)} note={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this note?"
        message="This cannot be undone."
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
