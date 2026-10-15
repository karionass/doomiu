import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../AppContext';

const NAV = [
  { to: '/', icon: '🌿', key: 'nav.habits' },
  { to: '/mood', icon: '🐱', key: 'nav.mood' },
  { to: '/stats', icon: '📊', key: 'nav.stats' },
  { to: '/exercises', icon: '🫧', key: 'nav.exercises' },
  { to: '/settings', icon: '⚙️', key: 'nav.settings' },
];

export default function Layout() {
  const { settings, user, online, t } = useApp();
  const name = settings.name || user?.name;
  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="logo">
          <span>🌸</span> Mindful
        </div>
        {name && <div className="hello">{t('hello', { name })}</div>}
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className="navlink">
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{t(n.key)}</span>
          </NavLink>
        ))}
      </nav>
      <main className="content">
        {!online && <div className="card warn no-print">📡 {t('app.offline')}</div>}
        <Outlet />
      </main>
    </div>
  );
}
