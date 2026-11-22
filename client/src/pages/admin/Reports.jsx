import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, fmtDate } from '../../api';

const REASON = { spam: 'Spam or advertising', inappropriate: 'Inappropriate content', fake: 'Fake or misleading', harassment: 'Harassment', other: 'Something else' };
const TARGET = { user: 'Profile', studypost: 'Study request', review: 'Review' };

function Preview({ r }) {
  const t = r.target;
  if (!t) return <p className="muted small">The reported item no longer exists.</p>;
  if (r.targetType === 'user') return <p className="small"><strong>{t.name}</strong> ({t.email}) {t.status === 'suspended' && <span className="status declined">Suspended</span>}</p>;
  if (r.targetType === 'studypost') return <p className="small"><strong>{t.subject}</strong> by {t.owner?.name || 'deleted user'}{t.note ? ` · “${t.note}”` : ''}</p>;
  return <p className="small"><strong>★ {t.rating}</strong> by {t.from?.name || 'deleted user'}{t.comment ? ` · “${t.comment}”` : ''}</p>;
};

function ReportCard({ r, onDone, onError }) {
  const [note, setNote] = useState(r.adminNote || '');
  const open = r.status === 'open';

  const attempt = async (fn) => { try { await fn(); onDone(); } catch (e) { onError(errMsg(e)); } };
  const setStatus = (status) => attempt(() => api.patch(`/admin/reports/${r._id}`, { status, adminNote: note }));

  // One-click action on the reported item, then close the report.
  const actOnTarget = async (label, fn) => {
    if (!window.confirm(label + '?')) return;
    await attempt(async () => { await fn(); await api.patch(`/admin/reports/${r._id}`, { status: 'resolved', adminNote: note || label }); });
  };

  return (
    <article className="card stack tight">
      <div className="row between">
        <div className="row" style={{ gap: 6 }}>
          <span className="tag study">{TARGET[r.targetType]}</span>
          <strong>{REASON[r.reason]}</strong>
          <span className={`status ${r.status === 'open' ? 'pending' : r.status === 'resolved' ? 'completed' : ''}`}>{r.status}</span>
        </div>
        <span className="muted small">{fmtDate(r.createdAt)}</span>
      </div>
      <Preview r={r} />
      <p className="muted small">Reported by {r.reporter?.name || 'deleted user'}{r.details ? `: “${r.details}”` : ''}</p>

      {open && (
        <>
          <input value={note} maxLength={500} placeholder="Note for the record (optional)" onChange={(e) => setNote(e.target.value)} aria-label="Admin note" />
          <div className="actions">
            {r.target && r.targetType === 'user' && (
              <>
                <Link className="btn small" to="/admin/users">Open users</Link>
                <button className="btn small danger" onClick={() => actOnTarget('Suspend this user', () => api.patch(`/admin/users/${r.target._id}`, { status: 'suspended' }))}>Suspend user</button>
              </>
            )}
            {r.target && r.targetType === 'studypost' && (
              <button className="btn small danger" onClick={() => actOnTarget('Delete this study request', () => api.delete(`/admin/studyposts/${r.target._id}`))}>Delete request</button>
            )}
            {r.target && r.targetType === 'review' && (
              <button className="btn small danger" onClick={() => actOnTarget('Delete this review', () => api.delete(`/admin/reviews/${r.target._id}`))}>Delete review</button>
            )}
            <button className="btn small" onClick={() => setStatus('resolved')}>Mark resolved</button>
            <button className="btn small ghost" onClick={() => setStatus('dismissed')}>Dismiss</button>
          </div>
        </>
      )}
      {!open && r.adminNote && <p className="small">Note: {r.adminNote}</p>}
    </article>
  );
}

export default function Reports() {
  const [status, setStatus] = useState('open');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(
    () => api.get('/admin/reports', { params: { status } }).then((r) => { setRows(r.data); setError(''); }).catch((e) => setError(errMsg(e))),
    [status]
  );
  useEffect(() => { setRows(null); load(); }, [load]);

  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="Report status">
        {[['open', 'Open'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={status === k} className={status === k ? 'active' : ''} onClick={() => setStatus(k)}>{label}</button>
        ))}
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}
      {!rows && !error && <div className="muted">Loading…</div>}
      {rows && rows.length === 0 && <div className="card empty"><strong>{status === 'open' ? 'No open reports' : 'Nothing here'}</strong><span>Reports from students appear here.</span></div>}
      {rows && rows.map((r) => <ReportCard key={r._id} r={r} onDone={load} onError={setError} />)}
    </div>
  );
}
