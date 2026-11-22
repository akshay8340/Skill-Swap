import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext.jsx';

// Change password and delete account, shown at the bottom of the profile page.
export default function AccountSettings() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [delErr, setDelErr] = useState('');
  const [delBusy, setDelBusy] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    setPwBusy(true);
    try {
      await api.put('/auth/password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      setPwMsg({ type: 'success', text: 'Password updated.' });
    } catch (err) {
      setPwMsg({ type: 'error', text: errMsg(err) });
    } finally {
      setPwBusy(false);
    }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    setDelErr('');
    setDelBusy(true);
    try {
      await api.delete('/auth/me', { data: { password: delPw } });
      signOut();
      navigate('/');
    } catch (err) {
      setDelErr(errMsg(err));
      setDelBusy(false);
    }
  };

  return (
    <>
      <section className="card stack">
        <h2>Password</h2>
        <form className="stack tight" onSubmit={changePassword}>
          <div className="grid-2">
            <label className="field">Current password
              <input type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </label>
            <label className="field">New password
              <input type="password" autoComplete="new-password" required minLength={6} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </label>
          </div>
          {pwMsg && <div className={`alert ${pwMsg.type}`} role="status">{pwMsg.text}</div>}
          <div><button className="btn" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</button></div>
        </form>
      </section>

      <section className="card stack danger-zone">
        <div>
          <h2>Delete account</h2>
          <p className="muted small">Permanently removes your profile, sessions, messages, reviews and study requests. This cannot be undone.</p>
        </div>
        {!confirming ? (
          <div><button className="btn danger" onClick={() => setConfirming(true)}>Delete my account</button></div>
        ) : (
          <form className="stack tight" onSubmit={deleteAccount}>
            <label className="field">Enter your password to confirm
              <input type="password" autoComplete="current-password" required value={delPw} onChange={(e) => setDelPw(e.target.value)} />
            </label>
            {delErr && <div className="alert error" role="alert">{delErr}</div>}
            <div className="row">
              <button className="btn danger" disabled={delBusy}>{delBusy ? 'Deleting…' : 'Yes, delete everything'}</button>
              <button type="button" className="btn ghost" onClick={() => { setConfirming(false); setDelPw(''); setDelErr(''); }}>Cancel</button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
