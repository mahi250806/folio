import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search } from 'lucide-react';
import { Modal, Button, Input, Select, Textarea } from './ui.jsx';
import FileDrop from './FileDrop.jsx';
import { paperSchema } from '../lib/schemas.js';
import { PAPER_TYPES, READING_STATUSES, PRIORITIES } from '../lib/constants.js';
import { api, applyServerErrors, errorMessage } from '../lib/api.js';
import { toInputDate } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

const EMPTY = {
  doi: '', title: '', authors: '', year: '', paperType: 'Journal article', venue: '', volume: '', issue: '', pages: '',
  url: '', abstract: '', tags: '', status: 'To Read', priority: 'Medium', rating: '', readBy: '', projectIds: [],
};

function toForm(p) {
  if (!p) return EMPTY;
  return {
    doi: p.doi || '', title: p.title || '', authors: (p.authors || []).join('\n'), year: p.year ? String(p.year) : '',
    paperType: p.paperType || 'Journal article', venue: p.venue || '', volume: p.volume || '', issue: p.issue || '',
    pages: p.pages || '', url: p.url || '', abstract: p.abstract || '', tags: (p.tags || []).join(', '),
    status: p.status || 'To Read', priority: p.priority || 'Medium', rating: p.rating ? String(p.rating) : '',
    readBy: toInputDate(p.readBy), projectIds: (p.projectIds || []).map((x) => String(x?._id || x)),
  };
}

const FIELDS = Object.keys(EMPTY);

/** Add or edit a paper. Pass `paper` to edit. */
export default function PaperForm({ open, onClose, paper, onSaved, defaultProjectId }) {
  const toast = useToast();
  const editing = Boolean(paper);
  const [projects, setProjects] = useState([]);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [formError, setFormError] = useState('');
  const [lookup, setLookup] = useState({ loading: false, message: '', duplicate: null });

  const {
    register, handleSubmit, reset, setError, getValues, setValue, watch, trigger,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(paperSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    const start = toForm(paper);
    if (!paper && defaultProjectId) start.projectIds = [defaultProjectId];
    reset(start);
    setFile(null);
    setFileError(null);
    setFormError('');
    setLookup({ loading: false, message: '', duplicate: null });
    api.get('/projects').then((r) => setProjects(r.data.data.projects)).catch(() => setProjects([]));
  }, [open, paper, defaultProjectId, reset]);

  const selected = watch('projectIds');

  function toggleProject(id) {
    const cur = getValues('projectIds') || [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    setValue('projectIds', next, { shouldDirty: true });
    if (errors.status) trigger('status'); // re-check the Cited rule
  }

  async function fillFromDoi() {
    const doi = getValues('doi').trim();
    if (!doi) {
      setError('doi', { type: 'manual', message: 'Enter a DOI first' });
      return;
    }
    setLookup({ loading: true, message: '', duplicate: null });
    try {
      const res = await api.get('/papers/lookup', { params: { doi } });
      const { meta, duplicateOf } = res.data.data;
      const current = getValues();
      reset({
        ...current,
        ...toForm({ ...meta, status: current.status, priority: current.priority, tags: current.tags ? current.tags.split(',') : [], projectIds: current.projectIds }),
        rating: current.rating,
        readBy: current.readBy,
      });
      const isSelf = duplicateOf && paper && String(duplicateOf._id) === String(paper._id);
      setLookup({ loading: false, message: 'Details filled in from Crossref. Check them before saving.', duplicate: isSelf ? null : duplicateOf });
    } catch (err) {
      setLookup({ loading: false, message: '', duplicate: null });
      setError('doi', { type: 'server', message: errorMessage(err) });
    }
  }

  async function onSubmit(values) {
    if (fileError) return;
    setFormError('');
    const payload = {
      ...values,
      authors: values.authors.split('\n').map((a) => a.trim()).filter(Boolean),
      tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    const body = new FormData();
    body.append('data', JSON.stringify(payload));
    if (file) body.append('file', file);
    try {
      const res = editing ? await api.put(`/papers/${paper._id}`, body) : await api.post('/papers', body);
      toast.success(editing ? 'Paper saved' : 'Paper added to your library');
      onSaved?.(res.data.data.paper);
      onClose();
    } catch (err) {
      const errs = err?.response?.data?.errors;
      if (errs?.file) setFileError(errs.file);
      if (!applyServerErrors(err, setError, FIELDS) && !errs?.file) setFormError(errorMessage(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Edit paper' : 'Add paper'}
      description={editing ? 'Update the details, status or PDF.' : 'Paste a DOI to fill most fields automatically, or type them in.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="paper-form" loading={isSubmitting}>{editing ? 'Save paper' : 'Add paper'}</Button>
        </>
      }
    >
      <form id="paper-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <p className="form-alert" role="alert">{formError}</p>}

        <fieldset className="form-section">
          <legend>Find by DOI</legend>
          <div className="doi-row">
            <Input label="DOI" placeholder="10.1111/j.1540-6261.1993.tb04702.x" reg={register('doi')} error={errors.doi} className="grow" />
            <Button variant="secondary" icon={Search} loading={lookup.loading} onClick={fillFromDoi}>Fill details</Button>
          </div>
          {lookup.message && <p className="field-hint ok">{lookup.message}</p>}
          {lookup.duplicate && (
            <p className="form-warn">
              This DOI is already in your library as <Link to={`/papers/${lookup.duplicate._id}`} onClick={onClose}>{lookup.duplicate.title}</Link>.
            </p>
          )}
        </fieldset>

        <fieldset className="form-section">
          <legend>Reference</legend>
          <Input label="Title" required reg={register('title')} error={errors.title} />
          <Textarea label="Authors" required rows={3} hint="One author per line, e.g. Eugene F. Fama" reg={register('authors')} error={errors.authors} />
          <div className="row g-3">
            <div className="col-6 col-md-3"><Input label="Year" inputMode="numeric" placeholder="2024" reg={register('year')} error={errors.year} /></div>
            <div className="col-6 col-md-4"><Select label="Type" required options={PAPER_TYPES} reg={register('paperType')} error={errors.paperType} /></div>
            <div className="col-12 col-md-5"><Input label="Journal or venue" reg={register('venue')} error={errors.venue} /></div>
            <div className="col-4"><Input label="Volume" reg={register('volume')} error={errors.volume} /></div>
            <div className="col-4"><Input label="Issue" reg={register('issue')} error={errors.issue} /></div>
            <div className="col-4"><Input label="Pages" placeholder="65-91" reg={register('pages')} error={errors.pages} /></div>
          </div>
          <Input label="Link" type="url" placeholder="https://" reg={register('url')} error={errors.url} />
          <Textarea label="Abstract" rows={4} reg={register('abstract')} error={errors.abstract} />
        </fieldset>

        <fieldset className="form-section">
          <legend>Reading</legend>
          <div className="row g-3">
            <div className="col-6 col-md-3"><Select label="Status" required options={READING_STATUSES} reg={register('status')} error={errors.status} /></div>
            <div className="col-6 col-md-3"><Select label="Priority" required options={PRIORITIES} reg={register('priority')} error={errors.priority} /></div>
            <div className="col-6 col-md-3">
              <Select label="Rating" placeholder="Not rated" options={['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: `${v} / 5` }))} reg={register('rating')} error={errors.rating} />
            </div>
            <div className="col-6 col-md-3"><Input label="Read by" type="date" reg={register('readBy')} error={errors.readBy} /></div>
          </div>
          <Input label="Tags" placeholder="momentum, asset pricing" hint="Separate tags with commas" reg={register('tags')} error={errors.tags} />

          <div className={`field ${errors.projectIds ? 'has-error' : ''}`}>
            <span className="field-label">Projects</span>
            {projects.length === 0 ? (
              <p className="field-hint">No projects yet. <Link to="/projects" onClick={onClose}>Create one</Link> to group papers and export references.</p>
            ) : (
              <div className="check-grid">
                {projects.map((p) => (
                  <label key={p._id} className={`check ${selected?.includes(p._id) ? 'is-on' : ''}`}>
                    <input type="checkbox" checked={selected?.includes(p._id) || false} onChange={() => toggleProject(p._id)} />
                    <span>{p.title}</span>
                  </label>
                ))}
              </div>
            )}
            {errors.projectIds && <p className="field-error">{errors.projectIds.message}</p>}
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>PDF</legend>
          <FileDrop
            label="Paper PDF"
            file={file}
            current={paper?.file}
            error={fileError}
            onChange={(f, err) => { setFile(f); setFileError(err); }}
          />
        </fieldset>
      </form>
    </Modal>
  );
}
