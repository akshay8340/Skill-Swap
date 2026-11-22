import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext.jsx';

function Tracker({ p, onChange, meId }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const iLearn = p.learner._id === meId;
  const done = p.topics.filter((t) => t.done).length;
  const pct = p.topics.length ? Math.round((done / p.topics.length) * 100) : 0;

  const run = async (fn) => {
    setError('');
    try {
      const { data } = await fn();
      onChange(data);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const who = p.kind === 'costudy'
    ? `Studying together with ${iLearn ? p.teacher.name : p.learner.name}`
    : iLearn ? `Learning from ${p.teacher.name}` : `Teaching ${p.learner.name}`;

  return (
    <article className="card stack tight">
      <div className="row between nowrap">
        <div>
          <h3>{p.skill}</h3>
          <div className="muted small">{who}</div>
        </div>
        <div className="pct" aria-label={`${pct} percent complete`}>{pct}%</div>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>

      <ul className="topics">
        {p.topics.length === 0 && <li className="muted small">No topics yet. Add what you plan to cover.</li>}
        {p.topics.map((t) => (
          <li key={t._id}>
            <label className="inline">
              <input type="checkbox" checked={t.done} onChange={(e) => run(() => api.patch(`/progress/${p._id}/topics/${t._id}`, { done: e.target.checked }))} />
              <span className={t.done ? 'done-text' : ''}>{t.title}</span>
            </label>
            <button className="icon-btn" aria-label={`Delete ${t.title}`} onClick={() => run(() => api.delete(`/progress/${p._id}/topics/${t._id}`))}>×</button>
          </li>
        ))}
      </ul>

      <form className="row nowrap" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { run(() => api.post(`/progress/${p._id}/topics`, { title })); setTitle(''); } }}>
        <input placeholder="Add a topic" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="New topic" />
        <button className="btn">Add</button>
      </form>
      {error && <div className="alert error" role="alert">{error}</div>}
    </article>
  );
}

export default function Progress() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/progress').then((r) => setList(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!list) return <div className="muted">Loading…</div>;

  const replace = (updated) => setList(list.map((p) => (p._id === updated._id ? updated : p)));

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Progress</h1>
        <p className="muted">A checklist appears when a session is accepted. Both of you can add and tick topics.</p>
      </div>
      {list.length === 0 ? (
        <div className="card empty">
          <strong>No progress to track yet</strong>
          <span>Once a session is accepted, it shows up here. <Link to="/explore">Explore skills</Link></span>
        </div>
      ) : (
        <div className="grid-cards">{list.map((p) => <Tracker key={p._id} p={p} meId={user._id} onChange={replace} />)}</div>
      )}
    </div>
  );
}
