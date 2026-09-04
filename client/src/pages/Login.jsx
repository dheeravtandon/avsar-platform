import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle } from '../lib/hooks.js';
import { Button, Field, Input, Notice } from '../components/ui.jsx';
import { IconArrowLeft } from '../components/Icons.jsx';

const DEMO = [
  { role: 'Startup — JalSarthi (in contract)', email: 'founder@jalsarthi.in' },
  { role: 'Startup — SetuRoad (in pilot)', email: 'founder@seturoad.in' },
  { role: 'Nodal Officer — BWSSB', email: 'nodal.bwssb@avsar.gov.in' },
  { role: 'Department Head — BWSSB', email: 'head.bwssb@avsar.gov.in' },
  { role: 'Evaluator — Health informatics', email: 'eval.rehana@avsar.gov.in' },
  { role: 'Pilot Monitor — Smart Cities', email: 'monitor.scm@avsar.gov.in' },
  { role: 'Procurement Officer — Smart Cities', email: 'proc.scm@avsar.gov.in' },
  { role: 'Platform Administrator', email: 'admin@avsar.gov.in' },
];

const DEMO_PASSWORD = 'Avsar@2026';

export default function Login() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(location.state?.from || '/app', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const useDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div className="authwrap">
      <aside className="authwrap__aside">
        <Link to="/" style={{ color: 'var(--brand-300)', fontSize: 'var(--text-sm)' }} className="row gap-2 mb-6">
          <IconArrowLeft width={14} height={14} /> Back to the public site
        </Link>
        <div className="row gap-3 mb-6">
          <span className="masthead__mark" style={{ background: 'var(--saffron-600)' }}>अ</span>
          <span>
            <span className="masthead__name" style={{ color: '#fff' }}>AVSAR</span>
            <span className="masthead__sub" style={{ color: 'var(--brand-300)' }}>Startup Procurement Platform</span>
          </span>
        </div>
        <h2>One workspace for the department, the evaluator and the startup.</h2>
        <p className="mt-4" style={{ color: 'var(--brand-300)', maxWidth: '46ch' }}>
          Everything you can see and do is decided by your role. A nodal officer drafts problem
          statements; a department head approves them; an evaluator runs a blind evidence evaluation; a startup applies
          and runs a pilot; a procurement officer awards. Nobody sees a control they cannot use.
        </p>
        <div className="mt-8 small" style={{ color: 'var(--brand-300)' }}>
          <div className="strong" style={{ color: '#fff' }}>Demonstration environment</div>
          <div className="mt-2">
            All accounts share the password <code style={{ color: 'var(--saffron-500)' }}>{DEMO_PASSWORD}</code>.
            Data is synthetic. No real government record is involved.
          </div>
        </div>
      </aside>

      <div className="authwrap__main">
        <div className="authcard">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)' }}>Sign in</h1>
          <p className="muted small mt-2 mb-6">
            Use a demo role below, or your own credentials if you registered a startup.
          </p>

          {params.get('expired') && (
            <div className="mb-4"><Notice tone="warning">Your session expired. Please sign in again.</Notice></div>
          )}
          {error && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}

          <form onSubmit={submit}>
            <Field label="Email address" required id="email">
              <Input
                id="email" type="email" autoComplete="username" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@department.gov.in"
              />
            </Field>
            <Field label="Password" required id="password">
              <Input
                id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" variant="primary" block loading={busy}>
              {busy ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          <p className="small muted mt-4 center">
            New startup? <Link to="/register">Register with your DPIIT recognition</Link>
          </p>

          <div className="mt-8">
            <div className="capline mb-3">Demo roles — one click fills the form</div>
            <div className="stack gap-2">
              {DEMO.map((d) => (
                <button key={d.email} type="button" className="demorow" onClick={() => useDemo(d.email)}>
                  <span>
                    <span className="demorow__r">{d.role}</span>
                    <span className="demorow__e" style={{ display: 'block' }}>{d.email}</span>
                  </span>
                  <span className="btn btn--ghost btn--sm">Use</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
