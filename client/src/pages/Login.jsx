import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AuthShell from './AuthShell.jsx';
import { Button, Input } from '../components/ui.jsx';
import { loginSchema } from '../lib/schemas.js';
import { useAuth } from '../context/AuthContext.jsx';
import { applyServerErrors, errorMessage } from '../lib/api.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  async function onSubmit(values) {
    setFormError('');
    try {
      await login(values);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setError, ['email', 'password'])) setFormError(errorMessage(err));
    }
  }

  function fillDemo() {
    setValue('email', 'demo@folio.test', { shouldValidate: true });
    setValue('password', 'demo1234', { shouldValidate: true });
  }

  return (
    <AuthShell>
      <h2 className="auth-title">Log in</h2>
      <p className="muted">Pick up your reading where you left off.</p>
      {formError && <p className="form-alert" role="alert">{formError}</p>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="stack">
        <Input label="Email" type="email" autoComplete="email" placeholder="you@college.edu" reg={register('email')} error={errors.email} />
        <Input label="Password" type="password" autoComplete="current-password" placeholder="Your password" reg={register('password')} error={errors.password} />
        <Button type="submit" loading={isSubmitting} className="btn-block">Log in</Button>
      </form>
      <button type="button" className="link-btn demo-link" onClick={fillDemo}>
        Fill in the demo account
      </button>
      <p className="auth-switch">
        New to Folio? <Link to="/register">Create an account</Link>
      </p>
    </AuthShell>
  );
}
