import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Trash2, ExternalLink, Download, FileText, Copy, Check, Plus, Upload, Star, X, MessageSquareText,
} from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { Button, ConfirmDialog, EmptyState, ErrorPanel, PageLoader, StatusMark } from '../components/ui.jsx';
import PaperForm from '../components/PaperForm.jsx';
import NoteForm from '../components/NoteForm.jsx';
import FileDrop from '../components/FileDrop.jsx';
import ApaReference from '../components/ApaReference.jsx';
import { READING_STATUSES, STATUS_HINTS } from '../lib/constants.js';
import { api, downloadFile, errorMessage } from '../lib/api.js';
import { fmtBytes, fmtDate, plural, relativeDays } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked; the text is still selectable */
    }
  }
  return (
    <Button variant="ghost" size="sm" icon={done ? Check : Copy} onClick={copy}>{done ? 'Copied' : label}</Button>
  );
}

export default function PaperDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi(`/papers/${id}`);

  const [editOpen, setEditOpen] = useState(false);
  const [noteModal, setNoteModal] = useState(null); // 'new' or a note
  const [confirm, setConfirm] = useState(null); // { kind: 'paper' | 'note' | 'pdf', note? }
  const [busy, setBusy] = useState(false);
  const [statusSaving, setStatusSaving] = useState(null);
  const [citeTab, setCiteTab] = useState('apa');
  const [showPreview, setShowPreview] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (loading && !data) return <PageLoader label="Loading paper" />;
  if (error) {
    return (
      <div className="page">
        <Link to="/papers" className="back-link"><ArrowLeft size={16} /> Library</Link>
        <ErrorPanel message={error} onRetry={reload} />
      </div>
    );
  }

  const { paper, notes, citation } = data;
  const doiUrl = paper.doi ? `https://doi.org/${paper.doi}` : null;
  const unread = paper.status === 'To Read' || paper.status === 'Reading';

  async function changeStatus(status) {
    if (status === paper.status) return;
    setStatusSaving(status);
    try {
      const res = await api.patch(`/papers/${paper._id}/status`, { status });
      setData((d) => ({ ...d, paper: { ...d.paper, status: res.data.data.paper.status, finishedAt: res.data.data.paper.finishedAt } }));
      toast.success(res.data.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setStatusSaving(null);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      if (confirm.kind === 'paper') {
        await api.delete(`/papers/${paper._id}`);
        toast.success('Paper deleted');
        navigate('/papers', { replace: true });
        return;
      }
      if (confirm.kind === 'note') {
        await api.delete(`/notes/${confirm.note._id}`);
        toast.success('Note deleted');
      }
      if (confirm.kind === 'pdf') {
        await api.delete(`/papers/${paper._id}/file`);
        toast.success('PDF removed');
        setShowPreview(false);
      }
      setConfirm(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function uploadPdf() {
    if (!uploadFile || uploadError) return;
    setUploading(true);
    const body = new FormData();
    body.append('file', uploadFile);
    try {
      const res = await api.put(`/papers/${paper._id}/file`, body);
      toast.success(res.data.message);
      setUploadFile(null);
      reload();
    } catch (err) {
      setUploadError(err?.response?.data?.errors?.file || errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  const pdfUrl = `/api/papers/${paper._id}/file`;

  return (
    <div className="page">
      <Link to="/papers" className="back-link"><ArrowLeft size={16} /> Library</Link>

      <header className="paper-head">
        <div className="paper-head-main">
          <p className="paper-kicker">
            {paper.paperType}{paper.year ? `, ${paper.year}` : ''}
          </p>
          <h1 className="paper-title">{paper.title}</h1>
          <p className="paper-authors">{paper.authors.join(', ')}</p>
          {paper.venue && (
            <p className="paper-venue">
              <em>{paper.venue}</em>
              {paper.volume && `, ${paper.volume}`}
              {paper.issue && `(${paper.issue})`}
              {paper.pages && `, ${paper.pages}`}
            </p>
          )}
        </div>
        <div className="head-actions">
          <Button variant="ghost" icon={Trash2} onClick={() => setConfirm({ kind: 'paper' })}>Delete</Button>
          <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button>
          <Button icon={Plus} onClick={() => setNoteModal('new')}>Add note</Button>
        </div>
      </header>

      <div className="row g-4">
        <div className="col-12 col-lg-8 stack-lg">
          <section className="panel">
            <header className="panel-head">
              <h2>Cite this paper</h2>
              <div className="tabs" role="tablist" aria-label="Citation format">
                <button type="button" role="tab" aria-selected={citeTab === 'apa'} className={citeTab === 'apa' ? 'on' : ''} onClick={() => setCiteTab('apa')}>APA 7</button>
                <button type="button" role="tab" aria-selected={citeTab === 'bibtex'} className={citeTab === 'bibtex' ? 'on' : ''} onClick={() => setCiteTab('bibtex')}>BibTeX</button>
              </div>
            </header>
            {citeTab === 'apa' ? (
              <p className="citation-apa"><ApaReference paper={paper} showLink /></p>
            ) : (
              <pre className="citation-bib">{citation.bibtex}</pre>
            )}
            <div className="cite-foot">
              <span className="muted small">Cite key: <code>{citation.key}</code></span>
              <CopyButton text={citeTab === 'apa' ? citation.apa : citation.bibtex} label={citeTab === 'apa' ? 'Copy citation' : 'Copy BibTeX'} />
            </div>
          </section>

          {paper.abstract && (
            <section className="panel">
              <header className="panel-head"><h2>Abstract</h2></header>
              <p className="abstract">{paper.abstract}</p>
            </section>
          )}

          <section className="panel">
            <header className="panel-head">
              <h2>Notes <span className="count">{notes.length}</span></h2>
              <Button variant="ghost" size="sm" icon={Plus} onClick={() => setNoteModal('new')}>Add note</Button>
            </header>
            {notes.length === 0 ? (
              <EmptyState icon={MessageSquareText} title="No notes yet">
                {paper.status === 'To Read' ? 'Adding the first note moves this paper to Reading.' : 'Write down findings, quotes with page numbers, or questions.'}
              </EmptyState>
            ) : (
              <ul className="note-list">
                {notes.map((n) => (
                  <li key={n._id} className="index-card">
                    <div className="index-card-head">
                      <span className="note-kind">{n.kind}</span>
                      {n.page && <span className="muted small">p. {n.page}</span>}
                      <span className="spacer" />
                      <button type="button" className="icon-btn" aria-label="Edit note" onClick={() => setNoteModal(n)}><Pencil size={15} /></button>
                      <button type="button" className="icon-btn danger" aria-label="Delete note" onClick={() => setConfirm({ kind: 'note', note: n })}><Trash2 size={15} /></button>
                    </div>
                    <p className={n.kind === 'Quote' ? 'note-quote' : ''}>{n.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {paper.file && showPreview && (
            <section className="panel pdf-preview">
              <header className="panel-head">
                <h2>{paper.file.originalName}</h2>
                <button type="button" className="icon-btn" aria-label="Close preview" onClick={() => setShowPreview(false)}><X size={18} /></button>
              </header>
              <iframe title={`PDF of ${paper.title}`} src={pdfUrl} />
            </section>
          )}
        </div>

        <aside className="col-12 col-lg-4 stack-lg">
          <section className="panel">
            <header className="panel-head">
              <h2>Reading status</h2>
              <span className="muted small">Saves immediately</span>
            </header>
            <div className="status-picker" role="radiogroup" aria-label="Reading status">
              {READING_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={paper.status === s}
                  className={`status-option ${paper.status === s ? 'is-on' : ''}`}
                  onClick={() => changeStatus(s)}
                  disabled={Boolean(statusSaving)}
                >
                  <StatusMark status={s} />
                  <span className="muted small">{statusSaving === s ? 'Saving…' : STATUS_HINTS[s]}</span>
                </button>
              ))}
            </div>
            {paper.projectIds.length === 0 && <p className="muted small">Link a project to be able to mark it Cited.</p>}
          </section>

          <section className="panel">
            <header className="panel-head"><h2>PDF</h2></header>
            {paper.file ? (
              <>
                <div className="file-chip">
                  <FileText size={18} aria-hidden="true" />
                  <div>
                    <strong>{paper.file.originalName}</strong>
                    <span>{fmtBytes(paper.file.size)} · uploaded {fmtDate(paper.file.uploadedAt)}</span>
                  </div>
                </div>
                <div className="btn-row">
                  <Button variant="secondary" size="sm" icon={FileText} onClick={() => setShowPreview((v) => !v)}>{showPreview ? 'Hide preview' : 'Preview'}</Button>
                  <a className="btn btn-ghost btn-sm" href={pdfUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /><span>Open</span></a>
                  <Button variant="ghost" size="sm" icon={Download} onClick={() => downloadFile(`/papers/${paper._id}/file?download=1`, paper.file.originalName).catch((e) => toast.error(errorMessage(e)))}>Download</Button>
                  <Button variant="ghost" size="sm" icon={Trash2} className="danger" onClick={() => setConfirm({ kind: 'pdf' })}>Remove</Button>
                </div>
              </>
            ) : (
              <>
                <FileDrop label="Attach the PDF" file={uploadFile} error={uploadError} onChange={(f, e) => { setUploadFile(f); setUploadError(e); }} />
                {uploadFile && !uploadError && <Button icon={Upload} loading={uploading} onClick={uploadPdf} className="btn-block">Upload PDF</Button>}
              </>
            )}
          </section>

          <section className="panel">
            <header className="panel-head"><h2>Details</h2></header>
            <dl className="details">
              <div><dt>Priority</dt><dd>{paper.priority}</dd></div>
              <div>
                <dt>Rating</dt>
                <dd className="stars" aria-label={paper.rating ? `${paper.rating} out of 5` : 'Not rated'}>
                  {paper.rating ? [1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} className={i <= paper.rating ? 'on' : ''} aria-hidden="true" />) : '—'}
                </dd>
              </div>
              <div>
                <dt>Read by</dt>
                <dd>
                  {paper.readBy ? fmtDate(paper.readBy) : '—'}
                  {paper.readBy && unread && <small className="muted"> ({relativeDays(paper.readBy)})</small>}
                </dd>
              </div>
              <div><dt>Finished</dt><dd>{paper.finishedAt ? fmtDate(paper.finishedAt) : '—'}</dd></div>
              <div><dt>Added</dt><dd>{fmtDate(paper.createdAt)}</dd></div>
              {doiUrl && <div><dt>DOI</dt><dd><a href={doiUrl} target="_blank" rel="noreferrer" className="break">{paper.doi}</a></dd></div>}
              {paper.url && paper.url !== doiUrl && <div><dt>Link</dt><dd><a href={paper.url} target="_blank" rel="noreferrer" className="break">{new URL(paper.url).hostname}</a></dd></div>}
            </dl>
          </section>

          <section className="panel">
            <header className="panel-head"><h2>Projects</h2></header>
            {paper.projects.length === 0 ? (
              <p className="muted small">Not in any project. Edit the paper to add it to one.</p>
            ) : (
              <ul className="plain-list">
                {paper.projects.map((p) => (
                  <li key={p._id}><Link to={`/projects/${p._id}`}>{p.title}</Link> <span className="muted small">{p.status}</span></li>
                ))}
              </ul>
            )}
            {paper.tags.length > 0 && (
              <div className="tag-cloud">
                {paper.tags.map((t) => <Link key={t} to={`/papers?tag=${encodeURIComponent(t)}`} className="chip">#{t}</Link>)}
              </div>
            )}
          </section>
        </aside>
      </div>

      <PaperForm open={editOpen} paper={paper} onClose={() => setEditOpen(false)} onSaved={reload} />
      <NoteForm open={Boolean(noteModal)} note={noteModal === 'new' ? null : noteModal} paperId={paper._id} onClose={() => setNoteModal(null)} onSaved={reload} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'paper' ? 'Delete this paper?' : confirm?.kind === 'pdf' ? 'Remove the PDF?' : 'Delete this note?'}
        message={
          confirm?.kind === 'paper'
            ? `The paper, its PDF and ${plural(notes.length, 'note')} will be deleted. This cannot be undone.`
            : confirm?.kind === 'pdf'
              ? 'The PDF file is deleted from storage. The paper and its notes stay.'
              : 'This note will be deleted. This cannot be undone.'
        }
        confirmLabel={confirm?.kind === 'pdf' ? 'Remove PDF' : 'Delete'}
        loading={busy}
        onConfirm={doDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
