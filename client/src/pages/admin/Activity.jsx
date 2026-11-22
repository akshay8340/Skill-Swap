import { useEffect, useState } from 'react';
import api, { errMsg, fmtDate } from '../../api';

// Who changed what in the admin panel (latest 100).
export default function Activity() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/logs').then((r) => setLogs(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!logs) return <div className="muted">Loading…</div>;
  if (logs.length === 0) return <div className="card empty"><strong>No activity yet</strong><span>Actions taken in the admin panel are recorded here.</span></div>;

  return (
    <div className="card">
      {logs.map((l) => (
        <div key={l._id} className="skill-row">
          <div className="grow">
            <strong>{l.action}</strong>{l.target && <span> · {l.target}</span>}
            {l.details && <div className="muted small">{l.details}</div>}
          </div>
          <div className="muted small" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            {l.adminName}<br />{fmtDate(l.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
