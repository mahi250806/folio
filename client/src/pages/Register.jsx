import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AuthShell from './AuthShell.jsx';
import { Button, Input } from '../components/ui.jsx';
import { registerSchema } from '../lib/schemas.js';
import { useAuth } from '../context/AuthContext.jsx';
import { applyServerErrors, errorMessage } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Register() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values) {
    setFormError('');
    try {
      await createAccount(values);
      toast.success('Account created. Add your first paper to get started.');
      navigate('/', { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setError, ['name', 'email', 'password', 'confirmPassword'])) setFormError(errorMessage(err));
    }
  }

  return (
    <AuthShell>
      <h2 className="auth-title">Create your account</h2>
      <p className="muted">It takes a minute. Your library is private to you.</p>
      {formError && <p className="form-alert" role="alert">{formError}</p>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="stack">
        <Input label="Full name" required autoComplete="name" reg={register('name')} error={errors.name} />
        <Input label="Email" required type="email" autoComplete="email" reg={register('email')} error={errors.email} />
        <Input label="Password" required type="password" autoComplete="new-password" hint="At least 8 characters" reg={register('password')} error={errors.password} />
        <Input label="Confirm password" required type="password" autoComplete="new-password" reg={register('confirmPassword')} error={errors.confirmPassword} />
        <Button type="submit" loading={isSubmitting} className="btn-block">Create account</Button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
