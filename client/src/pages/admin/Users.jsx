import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, academic } from '../../api';
import Avatar from '../../components/Avatar.jsx';

const day = (d) => (d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'never');

export default function Users() {
  const [filters, setFilters] = useState({ q: '', role: '', status: '', demo: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => {
    const params = { ...filters, page };
    return api.get('/admin/users', { params }).then((r) => { setData(r.data); setError(''); }).catch((e) => setError(errMsg(e)));
  }, [filters, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const set = (k) => (e) => { setFilters({ ...filters, [k]: e.target.value }); setPage(1); };

  const run = async (fn, okMessage) => {
    setError('');
    try {
      const res = await fn();
      if (okMessage) setNotice({ type: 'success', text: okMessage });
      await load();
      return res;
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const toggleStatus = (u) =>
    run(() => api.patch(`/admin/users/${u._id}`, { status: u.status === 'active' ? 'suspended' : 'active' }),
      `${u.name} ${u.status === 'active' ? 'suspended' : 'reactivated'}.`);
  const toggleRole = (u) => {
    if (window.confirm(u.role === 'admin' ? `Remove admin access from ${u.name}?` : `Make ${u.name} an administrator? They will be able to manage every user and all content.`)) {
      run(() => api.patch(`/admin/users/${u._id}`, { role: u.role === 'admin' ? 'user' : 'admin' }), `${u.name} is now ${u.role === 'admin' ? 'a regular user' : 'an administrator'}.`);
    }
  };
  const resetPassword = async (u) => {
    if (!window.confirm(`Generate a temporary password for ${u.name}? Their current password stops working.`)) return;
    const res = await run(() => api.post(`/admin/users/${u._id}/reset-password`));
    if (res) setNotice({ type: 'info', text: `Temporary password for ${u.name}: ${res.data.temporaryPassword}  (share it privately and ask them to change it in Profile)` });
  };
  const remove = (u) => {
    if (window.confirm(`Permanently delete ${u.name} and all their sessions, messages, reviews and requests? This cannot be undone.`)) {
      run(() => api.delete(`/admin/users/${u._id}`), `${u.name} deleted.`);
    }
  };

  return (
    <div className="stack">
      <div className="card stack tight">
        <div className="row">
          <input type="search" placeholder="Search by name or email" value={filters.q} onChange={set('q')} aria-label="Search users" style={{ flex: '2 1 220px' }} />
          <select value={filters.role} onChange={set('role')} aria-label="Role" style={{ flex: '1 1 120px' }}>
            <option value="">All roles</option><option value="user">Users</option><option value="admin">Admins</option>
          </select>
          <select value={filters.status} onChange={set('status')} aria-label="Status" style={{ flex: '1 1 120px' }}>
            <option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option>
          </select>
          <label className="inline"><input type="checkbox" checked={filters.demo === '1'} onChange={(e) => { setFilters({ ...filters, demo: e.target.checked ? '1' : '' }); setPage(1); }} /> Demo only</label>
        </div>
      </div>

      {notice && <div className={`alert ${notice.type} selectable`} role="status">{notice.text}</div>}
      {error && <div className="alert error" role="alert">{error}</div>}
      {!data && !error && <div className="muted">Loading…</div>}
      {data && (
        <>
          <div className="muted small">{data.total} user{data.total === 1 ? '' : 's'}</div>
          {data.users.length === 0 && <div className="card empty"><strong>No users match</strong></div>}
          {data.users.map((u) => (
            <article key={u._id} className="card stack tight">
              <div className="row between nowrap">
                <div className="row nowrap grow">
                  <Avatar name={u.name} />
                  <div className="grow">
                    <div className="row" style={{ gap: 6 }}>
                      <strong>{u.name}</strong>
                      {u.role === 'admin' && <span className="tag paid">Admin</span>}
                      {u.status === 'suspended' && <span className="status declined">Suspended</span>}
                      {u.isDemo && <span className="tag study">Demo</span>}
                    </div>
                    <div className="muted small">{u.email}</div>
                    <div className="muted small">{academic(u)} · {u.skillCount} skill{u.skillCount === 1 ? '' : 's'} · joined {day(u.createdAt)} · last login {day(u.lastLoginAt)}</div>
                  </div>
                </div>
              </div>
              <div className="actions">
                <button className="btn small" onClick={() => toggleStatus(u)}>{u.status === 'active' ? 'Suspend' : 'Reactivate'}</button>
                <button className="btn small" onClick={() => toggleRole(u)}>{u.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>
                <button className="btn small" onClick={() => resetPassword(u)}>Reset password</button>
                <button className="btn small ghost danger" onClick={() => remove(u)}>Delete</button>
              </div>
            </article>
          ))}
          {data.pages > 1 && (
            <div className="row between">
              <button className="btn small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="muted small">Page {data.page} of {data.pages}</span>
              <button className="btn small" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
