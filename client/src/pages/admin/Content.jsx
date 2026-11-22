import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, fmtDate } from '../../api';

const SUB = [['skills', 'Skills'], ['requests', 'Study requests'], ['reviews', 'Reviews']];

function useList(path, params) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const key = JSON.stringify(params || {});
  const load = useCallback(
    () => api.get(path, { params: JSON.parse(key) }).then((r) => { setRows(r.data); setError(''); }).catch((e) => setError(errMsg(e))),
    [path, key]
  );
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);
  return { rows, error, setError, reload: load };
}

function Skills() {
  const [q, setQ] = useState('');
  const { rows, error, setError, reload } = useList('/admin/skills', { q });

  const remove = async (s) => {
    if (!window.confirm(`Remove "${s.name}" from ${s.userName}'s profile?`)) return;
    try {
      await api.delete(`/admin/skills/${s.userId}/${encodeURIComponent(s.name)}`);
      reload();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="stack">
      <input type="search" placeholder="Search skills, topics or people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search skills" />
      {error && <div className="alert error">{error}</div>}
      {rows && <div className="muted small">{rows.total} skill listing{rows.total === 1 ? '' : 's'}{rows.total > 200 ? ' (showing 200)' : ''}</div>}
      {rows && rows.skills.map((s) => (
        <div key={s.userId + s.name} className="card row between">
          <div className="grow">
            <div className="row" style={{ gap: 6 }}>
              <strong>{s.name}</strong><span className="chip">{s.category}</span><span className="chip">{s.level}</span>
              <span className={`tag ${s.paid ? 'paid' : 'free'}`}>{s.paid ? `Paid${s.price ? ' · ' + s.price : ''}` : 'Free'}</span>
            </div>
            <div className="muted small">by {s.userName} ({s.email})</div>
            {s.topics.length > 0 && <div className="chips" style={{ marginTop: 6 }}>{s.topics.map((t) => <span key={t} className="chip accent">{t}</span>)}</div>}
          </div>
          <button className="btn small ghost danger" onClick={() => remove(s)}>Remove</button>
        </div>
      ))}
      {rows && rows.skills.length === 0 && <div className="card empty"><strong>No skills found</strong></div>}
    </div>
  );
}

function Requests() {
  const [status, setStatus] = useState('');
  const { rows, error, setError, reload } = useList('/admin/studyposts', { status });

  const act = async (fn) => {
    try { await fn(); reload(); } catch (e) { setError(errMsg(e)); }
  };

  return (
    <div className="stack">
      <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" style={{ maxWidth: 200 }}>
        <option value="">All requests</option><option value="open">Open</option><option value="closed">Closed</option>
      </select>
      {error && <div className="alert error">{error}</div>}
      {rows && rows.length === 0 && <div className="card empty"><strong>No study requests</strong></div>}
      {rows && rows.map((p) => (
        <div key={p._id} className="card row between">
          <div className="grow">
            <div className="row" style={{ gap: 6 }}><strong>{p.subject}</strong><span className={`status ${p.status === 'open' ? 'accepted' : ''}`}>{p.status}</span></div>
            <div className="muted small">by {p.owner?.name || 'deleted user'} · {fmtDate(p.createdAt)}</div>
            {p.topics.length > 0 && <div className="chips" style={{ marginTop: 6 }}>{p.topics.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
            {p.note && <p className="small" style={{ marginTop: 6 }}>“{p.note}”</p>}
          </div>
          <div className="row nowrap">
            <button className="btn small" onClick={() => act(() => api.patch(`/admin/studyposts/${p._id}`, { status: p.status === 'open' ? 'closed' : 'open' }))}>
              {p.status === 'open' ? 'Close' : 'Reopen'}
            </button>
            <button className="btn small ghost danger" onClick={() => window.confirm('Delete this study request?') && act(() => api.delete(`/admin/studyposts/${p._id}`))}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Reviews() {
  const { rows, error, setError, reload } = useList('/admin/reviews');
  const remove = async (r) => {
    if (!window.confirm('Delete this review? The rating of the person it was about is recalculated.')) return;
    try { await api.delete(`/admin/reviews/${r._id}`); reload(); } catch (e) { setError(errMsg(e)); }
  };
  return (
    <div className="stack">
      {error && <div className="alert error">{error}</div>}
      {rows && rows.length === 0 && <div className="card empty"><strong>No reviews yet</strong></div>}
      {rows && rows.map((r) => (
        <div key={r._id} className="card row between">
          <div className="grow">
            <strong>★ {r.rating}</strong> <span className="muted small">{r.from?.name || 'deleted user'} reviewed {r.to?.name || 'deleted user'} · {fmtDate(r.createdAt)}</span>
            {r.comment && <p className="small" style={{ marginTop: 4 }}>“{r.comment}”</p>}
          </div>
          <button className="btn small ghost danger" onClick={() => remove(r)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default function Content() {
  const [sub, setSub] = useState('skills');
  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="Content type">
        {SUB.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? 'active' : ''} onClick={() => setSub(k)}>{label}</button>
        ))}
      </div>
      {sub === 'skills' && <Skills />}
      {sub === 'requests' && <Requests />}
      {sub === 'reviews' && <Reviews />}
    </div>
  );
}
