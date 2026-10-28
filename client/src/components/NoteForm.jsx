import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, Button, Input, Select, Textarea } from './ui.jsx';
import { noteSchema } from '../lib/schemas.js';
import { NOTE_KINDS } from '../lib/constants.js';
import { api, applyServerErrors, errorMessage } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

const EMPTY = { paperId: '', kind: 'Summary', content: '', page: '' };

/**
 * Add or edit a note. With `paperId` the paper is fixed (paper page);
 * without it the user chooses one of their papers (notes page).
 */
export default function NoteForm({ open, onClose, note, paperId, onSaved }) {
  const toast = useToast();
  const editing = Boolean(note);
  const [papers, setPapers] = useState([]);
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(noteSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    setFormError('');
    reset(
      note
        ? { paperId: String(note.paperId?._id || note.paperId), kind: note.kind, content: note.content, page: note.page ? String(note.page) : '' }
        : { ...EMPTY, paperId: paperId || '' }
    );
    if (!paperId) {
      api.get('/papers', { params: { sort: 'title' } }).then((r) => setPapers(r.data.data.papers)).catch(() => setPapers([]));
    }
  }, [open, note, paperId, reset]);

  async function onSubmit(values) {
    setFormError('');
    try {
      const res = editing ? await api.put(`/notes/${note._id}`, values) : await api.post('/notes', values);
      toast.success(res.data.message);
      onSaved?.(res.data.data);
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError, Object.keys(EMPTY))) setFormError(errorMessage(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit note' : 'Add note'}
      description={editing ? undefined : 'Capture a finding, a quote with its page, or a question to follow up.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="note-form" loading={isSubmitting}>{editing ? 'Save note' : 'Add note'}</Button>
        </>
      }
    >
      <form id="note-form" onSubmit={handleSubmit(onSubmit)} noValidate className="stack">
        {formError && <p className="form-alert" role="alert">{formError}</p>}
        {!paperId && (
          <Select
            label="Paper"
            required
            placeholder={papers.length ? 'Choose a paper' : 'Add a paper to your library first'}
            options={papers.map((p) => ({ value: p._id, label: p.title.length > 80 ? `${p.title.slice(0, 80)}…` : p.title }))}
            reg={register('paperId')}
            error={errors.paperId}
          />
        )}
        <div className="row g-3">
          <div className="col-8"><Select label="Type" required options={NOTE_KINDS} reg={register('kind')} error={errors.kind} /></div>
          <div className="col-4"><Input label="Page" inputMode="numeric" placeholder="12" reg={register('page')} error={errors.page} /></div>
        </div>
        <Textarea label="Note" required rows={6} reg={register('content')} error={errors.content} />
      </form>
    </Modal>
  );
}
