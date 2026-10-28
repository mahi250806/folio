import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderPlus, Pencil, Trash2, FolderKanban, CalendarClock } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { Button, ConfirmDialog, EmptyState, ErrorPanel, PageLoader } from '../components/ui.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import { api, errorMessage } from '../lib/api.js';
import { daysUntil, fmtDate, plural } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

export function deadlineLabel(project) {
  if (!project.deadline) return null;
  const done = ['Submitted', 'Completed'].includes(project.status);
  const d = daysUntil(project.deadline);
  if (done) return { text: `Due ${fmtDate(project.deadline)}`, tone: '' };
  if (d < 0) return { text: `Overdue by ${plural(-d, 'day')}`, tone: 'is-overdue' };
  if (d === 0) return { text: 'Due today', tone: 'is-soon' };
  return { text: `${plural(d, 'day')} left · ${fmtDate(project.deadline)}`, tone: d <= 7 ? 'is-soon' : '' };
}

export default function Projects() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/projects');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    try {
      const res = await api.delete(`/projects/${deleting._id}`);
      const n = res.data.data.unlinkedPapers;
      toast.success(n ? `Project deleted. ${plural(n, 'paper')} kept in your library.` : 'Project deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const projects = data?.projects || [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="muted">Group papers by the work they are for, and export a reference list for each.</p>
        </div>
        <Button icon={FolderPlus} onClick={() => setEditing('new')}>New project</Button>
      </header>

      {error ? (
        <ErrorPanel message={error} onRetry={reload} />
      ) : loading && !data ? (
        <PageLoader label="Loading projects" />
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" action={<Button icon={FolderPlus} onClick={() => setEditing('new')}>New project</Button>}>
          A project could be a paper you are writing, a literature review, or a course assignment.
        </EmptyState>
      ) : (
        <div className="row g-4">
          {projects.map((p) => {
            const dl = deadlineLabel(p);
            const pct = p.paperCount ? Math.round((p.finishedCount / p.paperCount) * 100) : 0;
            return (
              <div className="col-12 col-md-6 col-xl-4" key={p._id}>
                <article className="panel project-card">
                  <header>
                    <span className="project-type">{p.type}</span>
                    <span className={`project-status ps-${p.status.toLowerCase()}`}>{p.status}</span>
                  </header>
                  <h2><Link to={`/projects/${p._id}`}>{p.title}</Link></h2>
                  {p.description && <p className="muted clamp-2">{p.description}</p>}
                  <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Papers finished">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <p className="small">
                    <strong>{p.finishedCount}</strong> of {plural(p.paperCount, 'paper')} read · {p.citedCount} cited
                  </p>
                  <footer>
                    {dl ? (
                      <span className={`meta-item ${dl.tone}`}><CalendarClock size={14} aria-hidden="true" /> {dl.text}</span>
                    ) : (
                      <span className="muted small">No deadline</span>
                    )}
                    <span className="spacer" />
                    <button type="button" className="icon-btn" aria-label={`Edit ${p.title}`} onClick={() => setEditing(p)}><Pencil size={16} /></button>
                    <button type="button" className="icon-btn danger" aria-label={`Delete ${p.title}`} onClick={() => setDeleting(p)}><Trash2 size={16} /></button>
                  </footer>
                </article>
              </div>
            );
          })}
        </div>
      )}

      <ProjectForm open={Boolean(editing)} project={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this project?"
        message={deleting ? `“${deleting.title}” will be deleted. Its ${plural(deleting.paperCount, 'paper')} stay in your library and are only unlinked.` : ''}
        confirmLabel="Delete project"
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
