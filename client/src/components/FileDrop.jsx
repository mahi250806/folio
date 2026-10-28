import { useId, useRef, useState } from 'react';
import { FileText, UploadCloud, X, AlertCircle } from 'lucide-react';
import { MAX_PDF_MB } from '../lib/constants.js';
import { fmtBytes } from '../lib/format.js';

/** Checks a chosen file in the browser; the server checks it again (including the PDF signature). */
export function checkPdf(file) {
  if (!file) return null;
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) return 'Choose a PDF file';
  if (file.size > MAX_PDF_MB * 1024 * 1024) return `PDF must be ${MAX_PDF_MB} MB or smaller`;
  if (file.size === 0) return 'That file is empty';
  return null;
}

export default function FileDrop({ file, onChange, error, current, label = 'PDF file' }) {
  const inputRef = useRef(null);
  const id = useId();
  const [dragging, setDragging] = useState(false);

  function pick(f) {
    onChange(f || null, checkPdf(f));
  }

  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label" id={`${id}-label`}>{label}</span>
      {file ? (
        <div className="file-chip">
          <FileText size={18} aria-hidden="true" />
          <div>
            <strong>{file.name}</strong>
            <span>{fmtBytes(file.size)}{current ? ' · replaces the current PDF when you save' : ''}</span>
          </div>
          <button type="button" className="icon-btn" aria-label="Remove chosen file" onClick={() => { pick(null); if (inputRef.current) inputRef.current.value = ''; }}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={`dropzone ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
        >
          <UploadCloud size={20} aria-hidden="true" />
          <span>
            <strong>{current ? 'Replace the PDF' : 'Choose a PDF'}</strong> or drag it here
            <small>PDF only, up to {MAX_PDF_MB} MB{current ? ` · current: ${current.originalName}` : ''}</small>
          </span>
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        aria-labelledby={`${id}-label`}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error && (
        <p className="field-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
