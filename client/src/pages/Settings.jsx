import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut } from 'lucide-react';
import { Button, Input } from '../components/ui.jsx';
import { profileSchema, passwordSchema } from '../lib/schemas.js';
import { api, applyServerErrors, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { fmtDate } from '../lib/format.js';

function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, email: user.email, institution: user.institution || '' },
  });

  async function onSubmit(values) {
    setFormError('');
    try {
      const res = await api.put('/auth/me', values);
      const u = res.data.data.user;
      setUser(u);
      reset({ name: u.name, email: u.email, institution: u.institution || '' });
      toast.success('Profile saved');
    } catch (err) {
      if (!applyServerErrors(err, setError, ['name', 'email', 'institution'])) setFormError(errorMessage(err));
    }
  }

  return (
    <section className="panel">
      <header className="panel-head"><h2>Profile</h2></header>
      {formError && <p className="form-alert" role="alert">{formError}</p>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="stack">
        <div className="row g-3">
          <div className="col-12 col-md-6"><Input label="Name" required reg={register('name')} error={errors.name} /></div>
          <div className="col-12 col-md-6"><Input label="Email" required type="email" reg={register('email')} error={errors.email} /></div>
        </div>
        <Input label="Institution" placeholder="College or university" reg={register('institution')} error={errors.institution} />
        <div><Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button></div>
      </form>
    </section>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values) {
    setFormError('');
    try {
      await api.put('/auth/password', values);
      reset();
      toast.success('Password changed');
    } catch (err) {
      if (!applyServerErrors(err, setError, ['currentPassword', 'newPassword', 'confirmPassword'])) setFormError(errorMessage(err));
    }
  }

  return (
    <section className="panel">
      <header className="panel-head"><h2>Change password</h2></header>
      {formError && <p className="form-alert" role="alert">{formError}</p>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="stack">
        <Input label="Current password" required type="password" autoComplete="current-password" reg={register('currentPassword')} error={errors.currentPassword} />
        <div className="row g-3">
          <div className="col-12 col-md-6"><Input label="New password" required type="password" autoComplete="new-password" hint="At least 8 characters" reg={register('newPassword')} error={errors.newPassword} /></div>
          <div className="col-12 col-md-6"><Input label="Confirm new password" required type="password" autoComplete="new-password" reg={register('confirmPassword')} error={errors.confirmPassword} /></div>
        </div>
        <div><Button type="submit" variant="secondary" loading={isSubmitting}>Change password</Button></div>
      </form>
    </section>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data } = useApi('/dashboard/stats');
  const t = data?.totals;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Your profile, password and account.</p>
        </div>
      </header>
      <div className="row g-4">
        <div className="col-12 col-lg-8 stack-lg">
          <ProfileForm />
          <PasswordForm />
        </div>
        <div className="col-12 col-lg-4 stack-lg">
          <section className="panel">
            <header className="panel-head"><h2>Your library</h2></header>
            <dl className="details">
              <div><dt>Papers</dt><dd>{t ? t.papers : '…'}</dd></div>
              <div><dt>PDFs stored</dt><dd>{t ? t.pdfs : '…'}</dd></div>
              <div><dt>Notes</dt><dd>{t ? t.notes : '…'}</dd></div>
              <div><dt>Active projects</dt><dd>{t ? t.activeProjects : '…'}</dd></div>
            </dl>
          </section>
          <section className="panel">
            <header className="panel-head"><h2>Account</h2></header>
            <dl className="details">
              <div><dt>Member since</dt><dd>{fmtDate(user.createdAt)}</dd></div>
              <div><dt>Sign-in method</dt><dd>Email and password</dd></div>
            </dl>
            <Button variant="secondary" icon={LogOut} className="btn-block" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}>
              Log out
            </Button>
          </section>
          <section className="panel">
            <header className="panel-head"><h2>About Folio</h2></header>
            <p className="small muted">
              Folio is a research paper and literature manager: store papers and their PDFs, track reading,
              keep notes, and export references for each project. Version 1.0.0, built with MongoDB, Express, React and Node.js.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
