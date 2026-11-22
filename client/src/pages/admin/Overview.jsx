import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api';

// Tiny bar chart: no library needed.
function Bars({ data, title }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((n, d) => n + d.count, 0);
  return (
    <div className="card stack tight">
      <div className="row between"><h3>{title}</h3><span className="muted small">{total} in 14 days</span></div>
      <div className="bars" role="img" aria-label={`${title}: ${total} in the last 14 days`}>
        {data.map((d) => (
          <div key={d.date} className="bar-col" title={`${d.date}: ${d.count}`}>
            <i style={{ height: `${(d.count / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="row between muted small"><span>{data[0].date.slice(5)}</span><span>{data[data.length - 1].date.slice(5)}</span></div>
    </div>
  );
}

export default function Overview() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => api.get('/admin/stats').then((r) => setS(r.data)).catch((e) => setError(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  const removeDemo = async () => {
    if (!window.confirm(`Remove all ${s.users.demo} demo accounts and everything attached to them? Real accounts are not affected.`)) return;
    try {
      const { data } = await api.delete('/admin/demo-data');
      setMsg(`Removed ${data.removed} demo accounts.`);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (error) return <div className="alert error">{error}</div>;
  if (!s) return <div className="muted">Loading…</div>;

  const sessionTotal = Object.values(s.sessions).reduce((n, v) => n + v, 0);
  const cards = [
    ['Users', s.users.total, `${s.users.newThisWeek} new this week`],
    ['Sessions', sessionTotal, `${s.sessions.completed || 0} completed, ${s.sessions.pending || 0} pending`],
    ['Open study requests', s.studyOpen, ''],
    ['Reviews', s.reviews, ''],
    ['Messages', s.messages, ''],
    ['Open reports', s.reportsOpen, s.reportsOpen ? 'needs attention' : 'all clear'],
  ];

  return (
    <div className="stack">
      {msg && <div className="alert success" role="status">{msg}</div>}
      {s.users.demo > 0 && (
        <div className="alert warn row between">
          <span><strong>{s.users.demo} demo accounts</strong> (sample data) are in this database.</span>
          <button className="btn small" onClick={removeDemo}>Remove demo data</button>
        </div>
      )}
      {s.reportsOpen > 0 && (
        <div className="alert info row between">
          <span>{s.reportsOpen} report{s.reportsOpen > 1 ? 's' : ''} waiting for review.</span>
          <Link className="btn small primary" to="/admin/reports">Review</Link>
        </div>
      )}

      <div className="stats admin-stats">
        {cards.map(([label, value, hint]) => (
          <div className="card stat" key={label}><strong>{value}</strong><span>{label}</span>{hint && <em>{hint}</em>}</div>
        ))}
      </div>

      <div className="grid-2">
        <Bars title="New signups" data={s.signups} />
        <Bars title="Session requests" data={s.sessionsPerDay} />
      </div>

      <div className="grid-2">
        <section className="card stack tight">
          <h3>Most taught skills</h3>
          {s.topSkills.length === 0 && <p className="muted small">No skills yet.</p>}
          {s.topSkills.map((t) => (
            <div key={t.name} className="row between"><span>{t.name}</span><span className="muted small">{t.teachers} teacher{t.teachers > 1 ? 's' : ''}</span></div>
          ))}
        </section>
        <section className="card stack tight">
          <div className="row between"><h3>Recent signups</h3><Link to="/admin/users" className="small">All users</Link></div>
          {s.recentUsers.map((u) => (
            <div key={u._id} className="row between nowrap">
              <div className="grow"><strong className="truncate" style={{ display: 'block' }}>{u.name}</strong><span className="muted small">{u.email}</span></div>
              {u.isDemo && <span className="tag study">Demo</span>}
              {u.role === 'admin' && <span className="tag paid">Admin</span>}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
