import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, Search, Eye, Pencil, Trash2, X, Library } from 'lucide-react';
import { useApi, useDebounced } from '../hooks/useApi.js';
import { Button, ConfirmDialog, EmptyState, ErrorPanel, PageLoader } from '../components/ui.jsx';
import PaperForm from '../components/PaperForm.jsx';
import PaperRef from '../components/PaperRef.jsx';
import { READING_STATUSES, PRIORITIES } from '../lib/constants.js';
import { api, downloadFile, errorMessage } from '../lib/api.js';
import { plural } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';
import { useNavigate } from 'react-router-dom';

const SORTS = [
  { value: 'newest', label: 'Newest added' },
  { value: 'oldest', label: 'Oldest added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'year', label: 'Publication year' },
  { value: 'readBy', label: 'Read-by date' },
  { value: 'priority', label: 'Priority' },
];

export default function Papers() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const debouncedQ = useDebounced(q);

  const filters = {
    status: params.get('status') || '',
    projectId: params.get('projectId') || '',
    priority: params.get('priority') || '',
    hasPdf: params.get('hasPdf') || '',
    tag: params.get('tag') || '',
    sort: params.get('sort') || 'newest',
  };

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (debouncedQ.trim()) sp.set('q', debouncedQ.trim());
    Object.entries(filters).forEach(([k, v]) => v && sp.set(k, v));
    return sp.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, params]);

  const { data, loading, error, reload } = useApi(`/papers?${query}`);
  const projects = useApi('/projects');

  const [editing, setEditing] = useState(null); // paper object, or 'new'
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function clearAll() {
    setQ('');
    setParams({}, { replace: true });
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      const res = await api.delete(`/papers/${deleting._id}`);
      const n = res.data.data.deletedNotes;
      toast.success(n ? `Paper and ${plural(n, 'note')} deleted` : 'Paper deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    try {
      await downloadFile('/papers/export.csv', 'folio-library.csv');
    } catch (err) {
      toast.error(errorMessage(err, 'Export failed. Try again.'));
    }
  }

  const papers = data?.papers || [];
  const anyFilter = q || Object.entries(filters).some(([k, v]) => k !== 'sort' && v);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Library</h1>
          <p className="muted">Every paper you are reading or plan to read, as a reference list.</p>
        </div>
        <div className="head-actions">
          <Button variant="secondary" icon={Download} onClick={exportCsv}>Export CSV</Button>
          <Button icon={Plus} onClick={() => setEditing('new')}>Add paper</Button>
        </div>
      </header>

      <section className="panel filters" aria-label="Search and filters">
        <div className="search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            className="input"
            placeholder="Search title, author, journal, tag or DOI"
            aria-label="Search papers"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="filter-row">
          <select className="input select" aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {READING_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input select" aria-label="Project" value={filters.projectId} onChange={(e) => setFilter('projectId', e.target.value)}>
            <option value="">All projects</option>
            {(projects.data?.projects || []).map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
          <select className="input select" aria-label="Priority" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
            <option value="">Any priority</option>
            {PRIORITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input select" aria-label="PDF" value={filters.hasPdf} onChange={(e) => setFilter('hasPdf', e.target.value)}>
            <option value="">Any PDF status</option>
            <option value="yes">Has a PDF</option>
            <option value="no">No PDF yet</option>
          </select>
          <select className="input select" aria-label="Sort" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value === 'newest' ? '' : e.target.value)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="filter-foot">
          <span className="muted small" aria-live="polite">{loading ? 'Searching…' : plural(papers.length, 'paper')}</span>
          {filters.tag && (
            <button type="button" className="chip chip-active" onClick={() => setFilter('tag', '')}>
              #{filters.tag} <X size={13} aria-label="Remove tag filter" />
            </button>
          )}
          {anyFilter && <button type="button" className="link-btn" onClick={clearAll}>Clear filters</button>}
        </div>
      </section>

      {error ? (
        <ErrorPanel message={error} onRetry={reload} />
      ) : loading && !data ? (
        <PageLoader label="Loading papers" />
      ) : papers.length === 0 ? (
        anyFilter ? (
          <EmptyState icon={Search} title="No papers match" action={<Button variant="secondary" onClick={clearAll}>Clear filters</Button>}>
            Try a shorter search or fewer filters.
          </EmptyState>
        ) : (
          <EmptyState icon={Library} title="Your library is empty" action={<Button icon={Plus} onClick={() => setEditing('new')}>Add paper</Button>}>
            Paste a DOI and Folio fills in the title, authors and journal for you.
          </EmptyState>
        )
      ) : (
        <section className="panel ref-list library" aria-busy={loading}>
          {papers.map((p) => (
            <PaperRef
              key={p._id}
              paper={p}
              actions={
                <>
                  <button type="button" className="icon-btn" aria-label={`Open ${p.title}`} title="Open" onClick={() => navigate(`/papers/${p._id}`)}><Eye size={17} /></button>
                  <button type="button" className="icon-btn" aria-label={`Edit ${p.title}`} title="Edit" onClick={() => setEditing(p)}><Pencil size={17} /></button>
                  <button type="button" className="icon-btn danger" aria-label={`Delete ${p.title}`} title="Delete" onClick={() => setDeleting(p)}><Trash2 size={17} /></button>
                </>
              }
            />
          ))}
        </section>
      )}

      <PaperForm open={Boolean(editing)} paper={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this paper?"
        message={deleting ? `“${deleting.title}” will be removed with its PDF and ${plural(deleting.noteCount || 0, 'note')}. This cannot be undone.` : ''}
        confirmLabel="Delete paper"
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
