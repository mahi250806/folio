import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Download, Plus, Link2, Unlink, BookOpen, FileText } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { Button, ConfirmDialog, EmptyState, ErrorPanel, Modal, PageLoader, StatusMark } from '../components/ui.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import PaperForm from '../components/PaperForm.jsx';
import ApaReference from '../components/ApaReference.jsx';
import { api, downloadFile, errorMessage } from '../lib/api.js';
import { authorLine, plural } from '../lib/format.js';
import { READING_STATUSES } from '../lib/constants.js';
import { useToast } from '../context/ToastContext.jsx';
import { deadlineLabel } from './Projects.jsx';

function LinkPapersDialog({ open, onClose, project, linkedIds, onDone }) {
  const toast = useToast();
  const { data } = useApi(open ? '/papers?sort=title' : null);
  const [picked, setPicked] = useState([]);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(
    () => (data?.papers || []).filter((p) => !linkedIds.includes(p._id) && p.title.toLowerCase().includes(filter.toLowerCase())),
    [data, linkedIds, filter]
  );

  async function save() {
    setSaving(true);
    try {
      const res = await api.post(`/projects/${project._id}/papers`, { paperIds: picked });
      toast.success(res.data.message);
      setPicked([]);
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add papers from your library"
      description={`Choose the papers you are using for “${project.title}”.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={picked.length === 0}>
            {picked.length ? `Add ${plural(picked.length, 'paper')}` : 'Add papers'}
          </Button>
        </>
      }
    >
      <input className="input" type="search" placeholder="Filter by title" aria-label="Filter papers" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="pick-list">
        {!data ? (
          <p className="muted small">Loading…</p>
        ) : candidates.length === 0 ? (
          <p className="muted small">Every paper in your library is already in this project.</p>
        ) : (
          candidates.map((p) => (
            <label key={p._id} className={`pick ${picked.includes(p._id) ? 'is-on' : ''}`}>
              <input
                type="checkbox"
                checked={picked.includes(p._id)}
                onChange={() => setPicked((cur) => (cur.includes(p._id) ? cur.filter((x) => x !== p._id) : [...cur, p._id]))}
              />
              <span>
                <strong>{p.title}</strong>
                <small className="muted">{authorLine(p.authors, 2)} ({p.year || 'n.d.'})</small>
              </span>
            </label>
          ))
        )}
      </div>
    </Modal>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(`/projects/${id}`);
  const [modal, setModal] = useState(null); // 'edit' | 'link' | 'paper'
  const [confirm, setConfirm] = useState(null); // { kind: 'project' } | { kind: 'unlink', paper }
  const [busy, setBusy] = useState(false);
  const [onlyCited, setOnlyCited] = useState(false);

  if (loading && !data) return <PageLoader label="Loading project" />;
  if (error) {
    return (
      <div className="page">
        <Link to="/projects" className="back-link"><ArrowLeft size={16} /> Projects</Link>
        <ErrorPanel message={error} onRetry={reload} />
      </div>
    );
  }

  const { project, papers } = data;
  const dl = deadlineLabel(project);
  const counts = Object.fromEntries(READING_STATUSES.map((s) => [s, papers.filter((p) => p.status === s).length]));
  const shown = onlyCited ? papers.filter((p) => p.status === 'Cited') : papers;

  async function doConfirm() {
    setBusy(true);
    try {
      if (confirm.kind === 'project') {
        await api.delete(`/projects/${project._id}`);
        toast.success('Project deleted. Its papers are still in your library.');
        navigate('/projects', { replace: true });
        return;
      }
      await api.delete(`/projects/${project._id}/papers/${confirm.paper._id}`);
      toast.success('Paper removed from the project');
      setConfirm(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function exportRefs(format) {
    try {
      const qs = `format=${format}${onlyCited ? '&cited=1' : ''}`;
      await downloadFile(`/projects/${project._id}/bibliography?${qs}`, format === 'apa' ? 'references.txt' : 'references.bib');
    } catch (err) {
      toast.error(errorMessage(err, 'Export failed. Try again.'));
    }
  }

  return (
    <div className="page">
      <Link to="/projects" className="back-link"><ArrowLeft size={16} /> Projects</Link>

      <header className="page-head">
        <div>
          <p className="paper-kicker">{project.type}, {project.status.toLowerCase()}</p>
          <h1>{project.title}</h1>
          {project.description && <p className="muted measure">{project.description}</p>}
          {dl && <p className={`meta-item ${dl.tone}`}>{dl.text}</p>}
        </div>
        <div className="head-actions">
          <Button variant="ghost" icon={Trash2} onClick={() => setConfirm({ kind: 'project' })}>Delete</Button>
          <Button variant="secondary" icon={Pencil} onClick={() => setModal('edit')}>Edit</Button>
        </div>
      </header>

      <dl className="ledger ledger-5">
        {READING_STATUSES.map((s) => (
          <div key={s}><dt>{s}</dt><dd>{counts[s]}</dd></div>
        ))}
      </dl>

      <section className="panel">
        <header className="panel-head wrap">
          <h2>References <span className="count">{shown.length}</span></h2>
          <div className="btn-row">
            <label className="toggle">
              <input type="checkbox" checked={onlyCited} onChange={(e) => setOnlyCited(e.target.checked)} />
              <span>Only papers marked Cited</span>
            </label>
            <Button variant="ghost" size="sm" icon={Download} onClick={() => exportRefs('bibtex')} disabled={shown.length === 0}>.bib</Button>
            <Button variant="ghost" size="sm" icon={Download} onClick={() => exportRefs('apa')} disabled={shown.length === 0}>APA list</Button>
            <Button variant="secondary" size="sm" icon={Link2} onClick={() => setModal('link')}>Add from library</Button>
            <Button size="sm" icon={Plus} onClick={() => setModal('paper')}>New paper</Button>
          </div>
        </header>

        {shown.length === 0 ? (
          <EmptyState icon={BookOpen} title={onlyCited ? 'No cited papers yet' : 'No papers in this project'}>
            {onlyCited ? 'Mark a paper as Cited on its page once you use it in your writing.' : 'Add papers you already have, or add a new one straight into this project.'}
          </EmptyState>
        ) : (
          <ul className="biblio">
            {shown.map((p) => (
              <li key={p._id}>
                <p className="ref">
                  <ApaReference paper={p} to={`/papers/${p._id}`} showLink />
                </p>
                <div className="ref-meta">
                  <StatusMark status={p.status} />
                  {p.hasPdf && <span className="meta-item"><FileText size={14} aria-hidden="true" /> PDF</span>}
                  <span className="spacer" />
                  <button type="button" className="link-btn small" onClick={() => setConfirm({ kind: 'unlink', paper: p })}>
                    <Unlink size={13} aria-hidden="true" /> Remove from project
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProjectForm open={modal === 'edit'} project={project} onClose={() => setModal(null)} onSaved={reload} />
      <PaperForm open={modal === 'paper'} defaultProjectId={project._id} onClose={() => setModal(null)} onSaved={reload} />
      <LinkPapersDialog open={modal === 'link'} project={project} linkedIds={papers.map((p) => p._id)} onClose={() => setModal(null)} onDone={reload} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'project' ? 'Delete this project?' : 'Remove from project?'}
        message={
          confirm?.kind === 'project'
            ? `The project is deleted. Its ${plural(papers.length, 'paper')} stay in your library.`
            : `“${confirm?.paper?.title}” stays in your library.${confirm?.paper?.status === 'Cited' ? ' If it is in no other project, its status changes from Cited to Read.' : ''}`
        }
        confirmLabel={confirm?.kind === 'project' ? 'Delete project' : 'Remove'}
        loading={busy}
        onConfirm={doConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
