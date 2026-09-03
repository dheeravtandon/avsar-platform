import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth, usePerms } from '../lib/auth.jsx';
import { api, endpoints } from '../lib/api.js';
import { useApi, useDismiss } from '../lib/hooks.js';
import { initials, relative } from '../lib/format.js';
import {
  IconGrid, IconTarget, IconFile, IconScale, IconFlask, IconContract, IconLayers,
  IconUsers, IconWallet, IconShield, IconBell, IconUser, IconLogout, IconMessage,
  IconBook, IconChevronDown, IconExternal,
} from './Icons.jsx';

/** Navigation is derived from the role, so a user never sees a link they cannot use. */
function navFor(perms) {
  const { isStartup, isEvaluator, isAdmin, isDeptHead, isMonitor, isProcurement, isOfficial } = perms;

  const groups = [
    {
      label: 'Overview',
      items: [{ to: '/app', end: true, label: 'Dashboard', icon: IconGrid }],
    },
  ];

  if (isStartup) {
    groups.push({
      label: 'Participate',
      items: [
        { to: '/app/challenges', label: 'Problem statements', icon: IconTarget },
        { to: '/app/applications', label: 'My applications', icon: IconFile },
        { to: '/app/pilots', label: 'My pilots', icon: IconFlask },
        { to: '/app/procurement', label: 'Contracts', icon: IconContract },
        { to: '/app/payments', label: 'Payments', icon: IconWallet },
      ],
    });
    groups.push({
      label: 'Company',
      items: [
        { to: '/app/profile', label: 'Startup profile', icon: IconUser },
        { to: '/app/catalogue', label: 'Proven solutions', icon: IconLayers },
        { to: '/app/grievances', label: 'Grievances', icon: IconMessage },
      ],
    });
  }

  if (isEvaluator) {
    groups.push({
      label: 'Evaluation',
      items: [
        { to: '/app/evaluations', label: 'My worklist', icon: IconScale },
        { to: '/app/challenges', label: 'Problem statements', icon: IconTarget },
      ],
    });
  }

  if (isOfficial && !isEvaluator) {
    groups.push({
      label: 'Pipeline',
      items: [
        { to: '/app/challenges', label: 'Problem statements', icon: IconTarget },
        { to: '/app/applications', label: 'Applications', icon: IconFile },
        { to: '/app/pilots', label: 'Pilots', icon: IconFlask },
        { to: '/app/procurement', label: 'Procurement', icon: IconContract },
      ],
    });
    groups.push({
      label: 'Market',
      items: [
        { to: '/app/registry', label: 'Startup registry', icon: IconUsers },
        { to: '/app/catalogue', label: 'Proven solutions', icon: IconLayers },
        { to: '/app/payments', label: 'Payment ledger', icon: IconWallet },
      ],
    });
  }

  const oversight = [];
  if (isDeptHead || isAdmin) oversight.push({ to: '/app/audit', label: 'Audit trail', icon: IconShield });
  if (isOfficial) oversight.push({ to: '/app/grievances', label: 'Grievances', icon: IconMessage });
  if (isAdmin) oversight.push({ to: '/app/admin', label: 'Administration', icon: IconUsers });
  if (isMonitor || isProcurement) { /* covered by pipeline group */ }
  if (oversight.length) groups.push({ label: 'Oversight', items: oversight });

  groups.push({
    label: 'Reference',
    items: [{ to: '/how-it-works', label: 'How the model works', icon: IconBook }],
  });

  return groups;
}

export default function AppShell({ children, crumbs = [] }) {
  const { user, logout } = useAuth();
  const perms = usePerms();
  const navigate = useNavigate();
  const groups = navFor(perms);

  const { data: notif, reload } = useApi(endpoints.notifications(), []);
  const [panel, setPanel] = useState(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);
  useDismiss(notifRef, () => setPanel((p) => (p === 'notif' ? null : p)), panel === 'notif');
  useDismiss(userRef, () => setPanel((p) => (p === 'user' ? null : p)), panel === 'user');

  useEffect(() => {
    const t = setInterval(reload, 60000);
    return () => clearInterval(t);
  }, [reload]);

  const unread = notif?.unread ?? 0;

  const markAll = async () => {
    await api.post(endpoints.readAllNotifications());
    reload();
  };

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>

      <aside className="sidebar">
        <Link to="/app" className="sidebar__brand" style={{ textDecoration: 'none' }}>
          <span className="sidebar__mark">अ</span>
          <span>
            <span className="sidebar__name">AVSAR</span>
            <span className="sidebar__tag">Procurement Platform</span>
          </span>
        </Link>

        <nav className="sidebar__nav" aria-label="Main">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="sidebar__section">{g.label}</div>
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) => `navlink${isActive ? ' navlink--active' : ''}`}
                >
                  <it.icon className="navlink__icon" width={17} height={17} />
                  <span>{it.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="strong" style={{ color: '#fff' }}>{user?.department?.name || 'Independent'}</div>
          <div>{user?.roleLabel}</div>
          <div className="mt-2">
            <Link to="/" style={{ color: 'inherit' }}>
              Public site <IconExternal width={11} height={11} style={{ verticalAlign: -1 }} />
            </Link>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <nav className="topbar__crumbs grow" aria-label="Breadcrumb">
            <Link to="/app">Home</Link>
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="row gap-2">
                <span aria-hidden>/</span>
                {c.to && i < crumbs.length - 1
                  ? <Link to={c.to}>{c.label}</Link>
                  : <b>{c.label}</b>}
              </span>
            ))}
          </nav>

          <div className="row gap-3" style={{ position: 'relative' }}>
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                className="iconbtn"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                onClick={() => setPanel(panel === 'notif' ? null : 'notif')}
              >
                <IconBell width={16} height={16} />
                {unread > 0 && <span className="iconbtn__dot">{unread}</span>}
              </button>
              {panel === 'notif' && (
                <div className="card" style={{ position: 'absolute', right: 0, top: 42, width: 360, zIndex: 50, boxShadow: 'var(--shadow-lg)' }}>
                  <div className="card__head" style={{ padding: '12px 16px' }}>
                    <h3 style={{ fontSize: 'var(--text-base)' }}>Notifications</h3>
                    {unread > 0 && <button className="btn btn--ghost btn--sm" onClick={markAll}>Mark all read</button>}
                  </div>
                  <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {(notif?.items ?? []).length === 0 && <div className="empty" style={{ padding: 28 }}><p>Nothing to read.</p></div>}
                    {(notif?.items ?? []).map((n) => (
                      <button
                        key={n.id}
                        className="stack gap-1"
                        style={{
                          width: '100%', textAlign: 'left', padding: '11px 16px',
                          borderBottom: 'var(--line)', background: n.read_at ? 'transparent' : 'var(--brand-050)',
                          border: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--ink-200)', cursor: 'pointer',
                        }}
                        onClick={async () => {
                          await api.post(endpoints.readNotification(n.id));
                          reload();
                          setPanel(null);
                          if (n.link) navigate(n.link);
                        }}
                      >
                        <span className="small strong">{n.title}</span>
                        <span className="xs muted">{n.body}</span>
                        <span className="xs muted">{relative(n.created_at)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div ref={userRef} className="usertag" style={{ position: 'relative' }}>
              <button
                className="row gap-2"
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                onClick={() => setPanel(panel === 'user' ? null : 'user')}
                aria-label="Account menu"
              >
                <span className="avatar">{initials(user?.name)}</span>
                <span className="stack" style={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
                  <span className="small strong">{user?.name}</span>
                  <span className="xs muted">{user?.roleLabel}</span>
                </span>
                <IconChevronDown width={14} height={14} className="muted" />
              </button>
              {panel === 'user' && (
                <div className="card" style={{ position: 'absolute', right: 0, top: 44, width: 220, zIndex: 50, boxShadow: 'var(--shadow-lg)' }}>
                  <div className="card__body" style={{ padding: 8 }}>
                    <div className="xs muted" style={{ padding: '6px 10px' }}>{user?.email}</div>
                    {perms.isStartup && (
                      <Link className="navlink" style={{ color: 'var(--ink-700)' }} to="/app/profile" onClick={() => setPanel(null)}>
                        <IconUser width={16} height={16} /> Startup profile
                      </Link>
                    )}
                    <button
                      className="navlink"
                      style={{ color: 'var(--red-700)', width: '100%', background: 'none', border: 0, cursor: 'pointer' }}
                      onClick={() => { logout(); navigate('/'); }}
                    >
                      <IconLogout width={16} height={16} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main" className="page">{children}</main>
      </div>
    </div>
  );
}
