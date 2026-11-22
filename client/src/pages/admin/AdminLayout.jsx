import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  ['/admin', 'Overview', true],
  ['/admin/users', 'Users'],
  ['/admin/content', 'Content'],
  ['/admin/reports', 'Reports'],
  ['/admin/settings', 'Settings'],
  ['/admin/activity', 'Activity'],
];

export default function AdminLayout() {
  return (
    <div className="stack">
      <div className="page-head">
        <h1>Admin</h1>
        <p className="muted">Manage people, content and the settings that shape the site.</p>
      </div>
      <nav className="tabs" aria-label="Admin sections">
        {TABS.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
      </nav>
      <Outlet />
    </div>
  );
}
