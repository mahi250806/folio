import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page not-found">
      <p className="ref">
        <span className="ref-authors">Folio (n.d.).</span>{' '}
        <span className="ref-title">This page is not in the library.</span>{' '}
        <em>Error 404.</em>
      </p>
      <p className="muted">The link may be mistyped, or the paper or project was deleted.</p>
      <div className="head-actions">
        <Link to="/" className="btn btn-primary">Go to dashboard</Link>
        <Link to="/papers" className="btn btn-secondary">Open library</Link>
      </div>
    </div>
  );
}
