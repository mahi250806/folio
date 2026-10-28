import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Library, FolderKanban, NotebookPen, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/papers', label: 'Library', icon: Library },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Wordmark() {
  return (
    <span className="wordmark" aria-label="Folio">
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="var(--pen)" />
        <path d="M10 7h13v3h-9.5v4.5H21v3h-7.5V25H10z" fill="#fff" />
        <rect x="17" y="21" width="7" height="4" rx="1" fill="var(--highlight)" />
      </svg>
      Folio
    </span>
  );
}

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]); // close the drawer after navigating

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell">
      <a href="#main" className="skip-link">Skip to content</a>

      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu size={22} />
        </button>
        <Wordmark />
        <span style={{ width: 36 }} />
      </header>

      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-head">
          <Wordmark />
          <button type="button" className="icon-btn only-mobile" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">{initials(user?.name)}</span>
          <div className="who">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <button type="button" className="icon-btn" aria-label="Log out" title="Log out" onClick={handleLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
