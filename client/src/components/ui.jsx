import { useEffect, useId, useRef } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

/* ---------- Form fields ---------- */

export function Field({ label, required, error, hint, children, id, className = '' }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="req" aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

/** Text input wired to React Hook Form: <Input label="Title" reg={register('title')} error={errors.title} /> */
export function Input({ label, required, error, hint, reg, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} required={required} error={error?.message} hint={hint} id={id} className={className}>
      <input id={id} className="input" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...reg} {...props} />
    </Field>
  );
}

export function Textarea({ label, required, error, hint, reg, rows = 4, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} required={required} error={error?.message} hint={hint} id={id} className={className}>
      <textarea id={id} rows={rows} className="input" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...reg} {...props} />
    </Field>
  );
}

export function Select({ label, required, error, hint, reg, options, placeholder, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} required={required} error={error?.message} hint={hint} id={id} className={className}>
      <select id={id} className="input select" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...reg} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </Field>
  );
}

/* ---------- Buttons ---------- */

export function Button({ variant = 'primary', loading, icon: Icon, children, className = '', size, ...props }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 size={16} className="spin" aria-hidden="true" /> : Icon && <Icon size={16} aria-hidden="true" />}
      {children && <span>{children}</span>}
    </button>
  );
}

/* ---------- Modal ---------- */

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
    >
      {open && (
        <div className="modal-inner">
          <header className="modal-head">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p className="muted">{description}</p>}
            </div>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <X size={18} />
            </button>
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer className="modal-foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onClose, loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="confirm-msg">{message}</p>
    </Modal>
  );
}

/* ---------- Display ---------- */

const STATUS_CLASS = { 'To Read': 'toread', Reading: 'reading', Read: 'read', Cited: 'cited', Dropped: 'dropped' };

export function StatusMark({ status }) {
  return <span className={`status status-${STATUS_CLASS[status] || 'toread'}`}>{status}</span>;
}

export function PriorityMark({ priority }) {
  if (priority !== 'High') return null;
  return <span className="priority-high" title="High priority">High priority</span>;
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={28} strokeWidth={1.5} aria-hidden="true" />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="page-loader" role="status">
      <Loader2 size={22} className="spin" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorPanel({ message, onRetry }) {
  return (
    <div className="error-panel" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <p>{message}</p>
      {onRetry && <Button variant="ghost" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
