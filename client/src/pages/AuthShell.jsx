import { Wordmark } from '../components/Layout.jsx';

// The left panel shows a sample reference entry, the way a paper appears in the library.
export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <section className="auth-aside" aria-hidden="true">
        <Wordmark />
        <div className="auth-pitch">
          <h1>Every paper you read, with its notes and citation, in one place.</h1>
          <div className="auth-sample">
            <p className="ref">
              <span className="ref-authors">Jegadeesh, N., &amp; Titman, S. (1993).</span>{' '}
              <span className="ref-title">Returns to buying winners and selling losers.</span>{' '}
              <em>The Journal of Finance, 48</em>(1), 65–91.
            </p>
            <div className="auth-sample-meta">
              <span className="status status-reading">Reading</span>
              <span>3 notes</span>
              <span>PDF attached</span>
            </div>
          </div>
          <ul className="auth-points">
            <li>Upload the PDF and keep it next to your notes.</li>
            <li>Track what you still have to read, and by when.</li>
            <li>Export a ready-made reference list for each project.</li>
          </ul>
        </div>
        <p className="auth-foot">Research paper and literature manager</p>
      </section>
      <section className="auth-main">
        <div className="auth-card">{children}</div>
      </section>
    </div>
  );
}
