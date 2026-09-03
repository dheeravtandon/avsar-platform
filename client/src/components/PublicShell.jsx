import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

const NAV = [
  { to: '/challenges', label: 'Problem statements' },
  { to: '/registry', label: 'Startup registry' },
  { to: '/solutions', label: 'Proven solutions' },
  { to: '/dashboard', label: 'Transparency board' },
  { to: '/how-it-works', label: 'How it works' },
];

export default function PublicShell({ children }) {
  const { isAuthed, user } = useAuth();

  return (
    <div className="site">
      <a className="skip-link" href="#main">Skip to content</a>

      <div className="gov-strip">
        <div className="masthead__in" style={{ padding: '0 var(--s-6)' }}>
          <span>Government of India</span>
          <span style={{ marginLeft: 'auto' }}>
            A reference implementation for the Startup Public Procurement Mechanism
          </span>
        </div>
      </div>

      <header className="masthead">
        <div className="masthead__in">
          <Link to="/" className="masthead__brand" style={{ textDecoration: 'none' }}>
            <span className="masthead__mark">अ</span>
            <span>
              <span className="masthead__name">AVSAR</span>
              <span className="masthead__sub">Startup Procurement Platform</span>
            </span>
          </Link>

          <nav className="masthead__nav" aria-label="Primary">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'on' : undefined)}>
                {n.label}
              </NavLink>
            ))}
            {isAuthed ? (
              <Link className="btn btn--primary btn--sm" to="/app" style={{ marginLeft: 'var(--s-3)' }}>
                {user?.roleLabel} workspace
              </Link>
            ) : (
              <>
                <Link className="btn btn--secondary btn--sm" to="/login" style={{ marginLeft: 'var(--s-3)' }}>Sign in</Link>
                <Link className="btn btn--primary btn--sm" to="/register">Register a startup</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="footer">
        <div className="section__in">
          <div className="grid grid--4">
            <div>
              <h4>AVSAR</h4>
              <p style={{ maxWidth: '34ch' }}>
                A startup-friendly public procurement mechanism: departments publish outcomes,
                startups pilot against them, and what works is bought and scaled.
              </p>
            </div>
            <div>
              <h4>For departments</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li><Link to="/how-it-works">Publish a problem statement</Link></li>
                <li><Link to="/registry">Search the startup registry</Link></li>
                <li><Link to="/solutions">Adopt a proven solution</Link></li>
              </ul>
            </div>
            <div>
              <h4>For startups</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li><Link to="/register">Register with DPIIT recognition</Link></li>
                <li><Link to="/challenges">Browse open problem statements</Link></li>
                <li><Link to="/how-it-works">Eligibility and relaxations</Link></li>
              </ul>
            </div>
            <div>
              <h4>Governance</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li><Link to="/dashboard">Public transparency board</Link></li>
                <li><Link to="/how-it-works">Statutory basis</Link></li>
                <li><Link to="/how-it-works">Grievance redressal</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer__bottom">
            <span>
              AVSAR is a demonstration platform built for Smart India Hackathon. Data shown is synthetic.
            </span>
            <span>DPDP Act 2023 · GFR 2017 · GIGW 3.0 / WCAG 2.1 AA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
