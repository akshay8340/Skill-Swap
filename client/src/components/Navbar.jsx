import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import Avatar from './Avatar.jsx';
import Icon from './Icons.jsx';

const MEMBER_ITEMS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/explore', label: 'Explore', icon: 'compass' },
  { to: '/sessions', label: 'Sessions', icon: 'calendar' },
  { to: '/progress', label: 'Progress', icon: 'chart' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];
const GUEST_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
];

export function Brand() {
  return (
    <NavLink to="/" className="brand" aria-label="SkillSwap home">
      <span className="brand-mark"><Icon name="swap" size={17} /></span>
      <span>SkillSwap</span>
    </NavLink>
  );
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const next = encodeURIComponent(loc.pathname + loc.search);
  const memberItems = user?.role === 'admin' ? [...MEMBER_ITEMS, { to: '/admin', label: 'Admin', icon: 'shield' }] : MEMBER_ITEMS;

  const logout = () => {
    signOut();
    navigate('/');
  };

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Brand />

          <nav className="nav-links" aria-label="Main">
            {(user ? memberItems : GUEST_ITEMS).map((i) => <NavLink key={i.to} to={i.to} end={i.end}>{i.label}</NavLink>)}
          </nav>

          {user ? (
            <div className="nav-user">
              <span className="row who" style={{ gap: 8 }}>
                <Avatar name={user.name} size="sm" />
                <span className="small" style={{ fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
              </span>
              <button className="btn ghost small" onClick={logout} aria-label="Log out">
                <Icon name="logout" size={16} /> <span className="who">Log out</span>
              </button>
            </div>
          ) : (
            <div className="nav-user">
              <Link className="btn ghost small" to={`/login?next=${next}`}>Log in</Link>
              <Link className="btn primary small" to="/register">Get started</Link>
            </div>
          )}
        </div>
      </header>

      {user && (
        <nav className="tabbar" aria-label="Main">
          {memberItems.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end}>
              <Icon name={i.icon} size={22} />
              {i.label}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}
