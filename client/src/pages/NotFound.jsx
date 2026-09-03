import { Link } from 'react-router-dom';
import PublicShell from '../components/PublicShell.jsx';
import { useDocumentTitle } from '../lib/hooks.js';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <PublicShell>
      <div className="page" style={{ paddingTop: 'var(--s-20)', paddingBottom: 'var(--s-20)' }}>
        <div className="center reading" style={{ margin: '0 auto' }}>
          <div className="capline mb-3">Error 404</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)' }}>
            That page is not on this platform.
          </h1>
          <p className="muted mt-4">
            The address may be mistyped, or the record may have been archived. Every problem statement,
            pilot and contract keeps its file number permanently, so searching for the file number is
            usually the fastest way back.
          </p>
          <div className="row gap-3 mt-6" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--primary" to="/">Public site</Link>
            <Link className="btn btn--secondary" to="/challenges">Problem statements</Link>
            <Link className="btn btn--ghost" to="/app">My workspace</Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
