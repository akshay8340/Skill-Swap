import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { useConfig } from './ConfigContext.jsx';
import Navbar from './components/Navbar.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Explore from './pages/Explore.jsx';
import UserProfile from './pages/UserProfile.jsx';
import Sessions from './pages/Sessions.jsx';
import Progress from './pages/Progress.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Overview from './pages/admin/Overview.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import Content from './pages/admin/Content.jsx';
import Reports from './pages/admin/Reports.jsx';
import Settings from './pages/admin/Settings.jsx';
import Activity from './pages/admin/Activity.jsx';

// Browsing (landing, explore, teacher profiles) is open to everyone. Booking and personal pages need a login.
function Shell() {
  const { user } = useAuth();
  const { config } = useConfig();
  return (
    <div className={user ? 'has-tabbar' : ''}>
      {config.announcement && <div className="announce" role="status">{config.announcement}</div>}
      <Navbar />
      <Outlet />
    </div>
  );
}

const Page = ({ children }) => <main className="container">{children}</main>;

function RequireAuth({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <Page>{children}</Page>;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <Page>{children}</Page>;
}

function Home() {
  const { user } = useAuth();
  return user ? <Page><Dashboard /></Page> : <Landing />;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Auth mode="login" />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Auth mode="register" />} />
      <Route element={<Shell />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Page><Explore /></Page>} />
        <Route path="/u/:id" element={<Page><UserProfile /></Page>} />
        <Route path="/sessions" element={<RequireAuth><Sessions /></RequireAuth>} />
        <Route path="/progress" element={<RequireAuth><Progress /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Overview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="content" element={<Content />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="activity" element={<Activity />} />
        </Route>
        {/* old links */}
        <Route path="/discover" element={<Navigate to="/explore?tab=skills" replace />} />
        <Route path="/study" element={<Navigate to="/explore?tab=partners" replace />} />
        <Route path="/matches" element={<Navigate to="/explore?tab=foryou" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
