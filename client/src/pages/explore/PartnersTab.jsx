import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import api, { errMsg, academic, suggestionsFor } from '../../api';
import Avatar from '../../components/Avatar.jsx';
import { Rating } from '../../components/Stars.jsx';
import SlotPicker from '../../components/SlotPicker.jsx';
import TopicInput from '../../components/TopicInput.jsx';
import Icon from '../../components/Icons.jsx';
import ReportButton from '../../components/ReportButton.jsx';

// Study Together: 1-to-1 live sessions where two students work through a subject side by side. Not a group feature.

function PostForm({ onCreated, onCancel }) {
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/study', { subject, topics, note });
      onCreated();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h3>New study request</h3>
      <label className="field">Subject
        <input required maxLength={60} placeholder="e.g. DSA, DBMS, Operating Systems" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.86rem', fontWeight: 600 }}>
        Topics you want to cover
        <TopicInput value={topics} onChange={setTopics} suggestions={suggestionsFor(subject)} placeholder="e.g. Graphs, Dynamic Programming" />
      </div>
      <label className="field">How would you like to study? <span className="hint">Optional</span>
        <input maxLength={300} placeholder="Solve problems together, explain concepts to each other…" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && <div className="alert error" role="alert">{error}</div>}
      <div className="row">
        <button className="btn primary" disabled={busy}>{busy ? 'Posting…' : 'Post request'}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function JoinForm({ post, onDone }) {
  const [startsAt, setStartsAt] = useState('');
  const [durationHours, setDurationHours] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/sessions', { kind: 'costudy', postId: post._id, startsAt, durationHours: Number(durationHours), note });
      onDone();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack join-form" onSubmit={submit}>
      <SlotPicker userId={post.owner._id} value={startsAt} onChange={setStartsAt} />
      <div className="grid-2">
        <label className="field">Duration
          <select value={durationHours} onChange={(e) => setDurationHours(e.target.value)}>
            {[1, 2, 3, 4].map((h) => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <label className="field">Message <span className="hint">Optional</span>
          <input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything to cover first?" />
        </label>
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}
      <div><button className="btn primary" disabled={busy || !startsAt}>{busy ? 'Sending…' : 'Send request'}</button></div>
    </form>
  );
}

export default function PartnersTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const loc = useLocation();
  const loginHref = `/login?next=${encodeURIComponent(loc.pathname + loc.search)}`;
  const [q, setQ] = useState('');
  const [board, setBoard] = useState(null);
  const [mine, setMine] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const loadMine = useCallback(() => api.get('/study/mine').then((r) => setMine(r.data)).catch((e) => setError(errMsg(e))), []);
  const loadBoard = useCallback(
    () => api.get('/study', { params: { q } }).then((r) => setBoard(r.data)).catch((e) => setError(errMsg(e))),
    [q]
  );

  useEffect(() => { if (user) loadMine(); }, [loadMine, user]);
  useEffect(() => {
    const t = setTimeout(loadBoard, 250);
    return () => clearTimeout(t);
  }, [loadBoard]);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/study/${id}`, { status });
      loadMine();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="stack">
      <div className="card flat row between">
        <div className="grow">
          <h3>One-on-one study sessions</h3>
          <p className="muted small">Work through a subject with one other student in a live session. Useful for problem solving, revision and exam preparation.</p>
        </div>
        {!showForm && (user
          ? <button className="btn primary" onClick={() => setShowForm(true)}>Post a request</button>
          : <Link className="btn primary" to={loginHref}>Log in to post a request</Link>)}
      </div>

      {error && <div className="alert error">{error}</div>}
      {showForm && <PostForm onCancel={() => setShowForm(false)} onCreated={() => { setShowForm(false); loadMine(); }} />}

      {mine.length > 0 && (
        <section className="stack tight">
          <h2>Your requests</h2>
          {mine.map((p) => (
            <div key={p._id} className="card row between">
              <div className="grow">
                <strong>{p.subject}</strong> <span className={`status ${p.status === 'open' ? 'accepted' : ''}`}>{p.status}</span>
                {p.topics.length > 0 && <div className="chips" style={{ marginTop: 6 }}>{p.topics.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
              </div>
              <button className="btn small" onClick={() => setStatus(p._id, p.status === 'open' ? 'closed' : 'open')}>
                {p.status === 'open' ? 'Close' : 'Reopen'}
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="stack">
        <div className="row between">
          <h2>Open requests</h2>
          <div style={{ width: 'min(100%, 280px)', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--muted)' }}><Icon name="search" size={20} /></span>
            <input type="search" style={{ paddingLeft: 40 }} placeholder="Subject or topic" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search study requests" />
          </div>
        </div>
        {!board && <div className="muted">Loading…</div>}
        {board && board.length === 0 && (
          <div className="card empty">
            <strong>No open requests{q ? ' for that search' : ''}</strong>
            <span>Post your own and others will find you.</span>
          </div>
        )}
        {board && board.map((p) => (
          <article key={p._id} className="card stack tight">
            <div className="row between nowrap">
              <div className="row nowrap grow">
                <Avatar name={p.owner.name} />
                <div className="grow">
                  <h3>{p.subject} {p.wantedByMe && <span className="chip teal" style={{ marginLeft: 6 }}>On your wishlist</span>}</h3>
                  <div className="muted small">{p.owner.name} · {academic(p.owner)}</div>
                </div>
              </div>
              <Rating value={p.owner.ratingAvg} count={p.owner.ratingCount} />
            </div>
            {p.topics.length > 0 && <div className="chips">{p.topics.map((t) => <span key={t} className="chip accent">{t}</span>)}</div>}
            {p.note && <p className="small">“{p.note}”</p>}
            <div className="row between">
              <span className="muted small">{user ? (p.overlapHours > 0 ? `${p.overlapHours}h/week of common free time` : 'No common free time listed yet') : ''}</span>
              {user ? (
                <button className="btn primary small" onClick={() => setOpenId(openId === p._id ? null : p._id)}>
                  {openId === p._id ? 'Cancel' : 'Study together'}
                </button>
              ) : (
                <Link className="btn primary small" to={loginHref}>Log in to join</Link>
              )}
            </div>
            <div><ReportButton targetType="studypost" targetId={p._id} /></div>
            {user && openId === p._id && <JoinForm post={p} onDone={() => navigate('/sessions')} />}
          </article>
        ))}
      </section>
    </div>
  );
}
