import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, Button, Input, Select, Textarea } from './ui.jsx';
import { projectSchema } from '../lib/schemas.js';
import { PROJECT_TYPES, PROJECT_STATUSES } from '../lib/constants.js';
import { api, applyServerErrors, errorMessage } from '../lib/api.js';
import { toInputDate } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

const EMPTY = { title: '', description: '', type: '', status: 'Planning', deadline: '' };

export default function ProjectForm({ open, onClose, project, onSaved }) {
  const toast = useToast();
  const editing = Boolean(project);
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    setFormError('');
    reset(
      project
        ? { title: project.title, description: project.description || '', type: project.type, status: project.status, deadline: toInputDate(project.deadline) }
        : EMPTY
    );
  }, [open, project, reset]);

  async function onSubmit(values) {
    setFormError('');
    try {
      const res = editing ? await api.put(`/projects/${project._id}`, values) : await api.post('/projects', values);
      toast.success(editing ? 'Project saved' : 'Project created');
      onSaved?.(res.data.data.project);
      onClose();
    } catch (err) {
      if (!applyServerErrors(err, setError, Object.keys(EMPTY))) setFormError(errorMessage(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit project' : 'New project'}
      description="A project groups the papers you read for one piece of work."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="project-form" loading={isSubmitting}>{editing ? 'Save project' : 'Create project'}</Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit(onSubmit)} noValidate className="stack">
        {formError && <p className="form-alert" role="alert">{formError}</p>}
        <Input label="Title" required placeholder="e.g. Momentum in Indian equities" reg={register('title')} error={errors.title} />
        <div className="row g-3">
          <div className="col-12 col-sm-6"><Select label="Type" required placeholder="Choose a type" options={PROJECT_TYPES} reg={register('type')} error={errors.type} /></div>
          <div className="col-12 col-sm-6"><Select label="Status" required options={PROJECT_STATUSES} reg={register('status')} error={errors.status} /></div>
        </div>
        <Input label="Deadline" type="date" reg={register('deadline')} error={errors.deadline} hint="Optional. Shown on the dashboard when it is within 30 days." />
        <Textarea label="Description" rows={4} placeholder="What is this project about?" reg={register('description')} error={errors.description} />
      </form>
    </Modal>
  );
}
