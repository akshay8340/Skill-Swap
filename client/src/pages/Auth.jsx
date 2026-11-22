import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext.jsx';
import { useConfig } from '../ConfigContext.jsx';
import { Brand } from '../components/Navbar.jsx';
import Icon from '../components/Icons.jsx';

const POINTS = [
  ['book', 'Book a specific topic with a teacher who knows it well'],
  ['users', 'Find a study partner for live, one-on-one sessions'],
  ['clock', 'Get slots suggested only when you are both free'],
];

// Only same-site paths are allowed as a return address.
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '');

export default function Auth({ mode }) {
  const isRegister = mode === 'register';
  const { signIn } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '', programme: '', department: '', year: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const other = `${isRegister ? '/login' : '/register'}${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = isRegister ? { ...form, year: Number(form.year) } : { email: form.email, password: form.password };
      const { data } = await api.post(isRegister ? '/auth/register' : '/auth/login', body);
      signIn(data.token, data.user);
      navigate(isRegister ? '/profile' : next || '/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-box">
        <aside className="auth-aside">
          <Brand />
          <div className="stack tight" style={{ position: 'relative', zIndex: 1 }}>
            <h1>{isRegister ? 'Join the community' : 'Welcome back'}</h1>
            <p className="lead">
              {isRegister
                ? 'Create an account to book sessions, find study partners and track your progress.'
                : 'Log in to continue where you left off.'}
            </p>
          </div>
          <ul className="auth-points">
            {POINTS.map(([icon, text]) => (
              <li key={text}><span className="ico"><Icon name={icon} size={15} /></span>{text}</li>
            ))}
          </ul>
        </aside>

        <form className="auth-panel" onSubmit={submit}>
          <h2>{isRegister ? 'Create your account' : 'Log in to SkillSwap'}</h2>
          {params.get('suspended') && <div className="alert error" role="alert">Your account has been suspended. Please contact the administrators.</div>}
          {next && !isRegister && <p className="hint">Log in to continue.</p>}
          {isRegister && <label className="field">Full name<input required autoComplete="name" value={form.name} onChange={set('name')} /></label>}
          <label className="field">
            Email
            <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
            {isRegister && config.allowedEmailDomains.length > 0 && (
              <span className="hint">Use your {config.allowedEmailDomains.map((d) => '@' + d).join(' or ')} email</span>
            )}
          </label>
          <label className="field">Password
            <input type="password" required minLength={isRegister ? 6 : undefined} autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={set('password')} />
            {isRegister && <span className="hint">At least 6 characters</span>}
          </label>
          {isRegister && (
            <>
              <div className="grid-2">
                <label className="field">Programme
                  <select required value={form.programme} onChange={set('programme')}>
                    <option value="">Select</option>
                    {config.programmes.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="field">Year
                  <select required value={form.year} onChange={set('year')}>
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </label>
              </div>
              <label className="field">Department
                <select required value={form.department} onChange={set('department')}>
                  <option value="">Select</option>
                  {config.departments.map((d) => <option key={d.name}>{d.name}</option>)}
                </select>
              </label>
            </>
          )}
          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="btn primary block lg" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}</button>
          <p className="muted small" style={{ textAlign: 'center' }}>
            {isRegister ? (<>Already have an account? <Link to={other}>Log in</Link></>) : (<>New to SkillSwap? <Link to={other}>Create an account</Link></>)}
          </p>
          <p className="small" style={{ textAlign: 'center' }}><Link to="/explore">Continue browsing without an account</Link></p>
        </form>
      </div>
    </div>
  );
}
