import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errMsg, fmtDate, academic } from '../api';
import { useAuth } from '../AuthContext.jsx';
import { StarInput } from '../components/Stars.jsx';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icons.jsx';
import Chat from '../components/Chat.jsx';
import { useConfig } from '../ConfigContext.jsx';

// Add or change the video-call link. Google Meet links cannot be created automatically without a Google
// account connection, so "Create Google Meet" opens meet.google.com/new and you paste the link back here.
function LinkForm({ session, onSaved, onCancel }) {
  const { config } = useConfig();
  const [link, setLink] = useState(session.meetingLink || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.patch(`/sessions/${session._id}/link`, { link });
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="link-form stack tight" onSubmit={save}>
      <p className="small"><strong>Meeting link.</strong> Create a call, then paste its link here so you can both join.</p>
      <div className="row">
        <a className="btn small" href="https://meet.google.com/new" target="_blank" rel="noreferrer noopener"><Icon name="video" size={16} /> Create Google Meet</a>
        <span className="hint">or use Zoom, Teams, JioMeet…</span>
      </div>
      <div className="row nowrap">
        <input type="url" placeholder="https://meet.google.com/abc-defg-hij" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Meeting link" />
        <button className="btn small primary" disabled={busy || (!link.trim() && !session.meetingLink)}>{busy ? 'Saving…' : 'Save link'}</button>
        {onCancel && <button type="button" className="btn small ghost" onClick={onCancel}>Cancel</button>}
      </div>
      <p className="hint">Allowed: {config.meetingHosts.join(', ')}</p>
      {error && <div className="alert error" role="alert">{error}</div>}
    </form>
  );
}

function ReviewForm({ session, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reviews', { sessionId: session._id, rating, comment });
      onDone();
    } catch (err) {
      setError(errMsg(err));
    }
  };
  return (
    <form className="review-form" onSubmit={submit}>
      <StarInput value={rating} onChange={setRating} />
      <input placeholder="How was the session? (optional)" maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Review comment" />
      <button className="btn small primary">Submit review</button>
      {error && <span className="alert error" role="alert">{error}</span>}
    </form>
  );
}

const TABS = [['upcoming', 'Upcoming'], ['pending', 'Requests'], ['history', 'History']];

export default function Sessions() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'upcoming';
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');
  const [chatId, setChatId] = useState(null); // which session's chat is open
  const [linkEditId, setLinkEditId] = useState(null); // which session's link is being changed

  const load = useCallback(
    () => api.get('/sessions').then((r) => setSessions(r.data)).catch((e) => setError(errMsg(e))),
    []
  );
  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    setError('');
    try {
      await api.patch(`/sessions/${id}`, { action });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (!sessions) return <div className="muted">Loading…</div>;

  const groups = {
    upcoming: sessions.filter((s) => s.status === 'accepted'),
    pending: sessions.filter((s) => s.status === 'pending'),
    history: sessions.filter((s) => ['completed', 'declined', 'cancelled'].includes(s.status)),
  };
  const list = [...groups[tab]].sort((a, b) =>
    tab === 'history' ? new Date(b.startsAt) - new Date(a.startsAt) : new Date(a.startsAt) - new Date(b.startsAt)
  );

  return (
    <div className="stack">
      <div className="page-head"><h1>Sessions</h1></div>

      <div className="tabs" role="tablist" aria-label="Sessions">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setParams({ tab: k }, { replace: true })}>
            {label} <span className="count">{groups[k].length}</span>
          </button>
        ))}
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}

      {list.length === 0 && (
        <div className="card empty">
          <strong>{tab === 'upcoming' ? 'No upcoming sessions' : tab === 'pending' ? 'No pending requests' : 'No past sessions yet'}</strong>
          {tab !== 'history' && <span><Link to="/explore">Explore skills</Link> or find a study partner.</span>}
        </div>
      )}

      {list.map((s) => {
        const iTeach = s.teacher._id === user._id;
        const other = iTeach ? s.learner : s.teacher;
        const study = s.kind === 'costudy';
        const role = study ? 'Study together with' : iTeach ? 'You are teaching' : 'You are learning from';
        return (
          <article key={s._id} className="card session stack tight">
            <div className="row between nowrap">
              <div className="row nowrap grow">
                <Avatar name={other.name} />
                <div className="grow">
                  <div className="row" style={{ gap: 8 }}>
                    <strong>{s.skill}{s.topic ? `: ${s.topic}` : ''}</strong>
                    {study && <span className="tag study">Study together</span>}
                    <span className={`status ${s.status}`}>{s.status}</span>
                  </div>
                  <div className="muted small">{role} <Link to={`/u/${other._id}`}>{other.name}</Link> · {academic(other)}</div>
                  <div className="muted small">{fmtDate(s.startsAt)} · {s.durationHours}h</div>
                </div>
              </div>
            </div>
            {s.note && <p className="small">“{s.note}”</p>}

            <div className="actions">
              {s.status === 'pending' && iTeach && (
                <>
                  <button className="btn small primary" onClick={() => act(s._id, 'accept')}>Accept</button>
                  <button className="btn small" onClick={() => act(s._id, 'decline')}>Decline</button>
                </>
              )}
              {s.status === 'pending' && !iTeach && <span className="muted small">Waiting for {other.name.split(' ')[0]} to respond</span>}
              {s.status === 'accepted' && (
                <>
                  {s.meetingLink && (
                    <>
                      <a className="btn small primary" href={s.meetingLink} target="_blank" rel="noreferrer noopener"><Icon name="video" size={16} /> Join meeting</a>
                      <button className="btn small ghost" onClick={() => setLinkEditId(linkEditId === s._id ? null : s._id)}>Change link</button>
                    </>
                  )}
                  {(!iTeach || study) && <button className="btn small" onClick={() => act(s._id, 'complete')}>Mark completed</button>}
                </>
              )}
              {['accepted', 'completed'].includes(s.status) && (
                <>
                  <button className={`btn small ${chatId === s._id ? 'active' : ''}`} onClick={() => setChatId(chatId === s._id ? null : s._id)} aria-expanded={chatId === s._id}>
                    <Icon name="chat" size={16} /> Message
                  </button>
                  {s.contactWhatsapp && (
                    <a className="btn small" href={`https://wa.me/${s.contactWhatsapp}`} target="_blank" rel="noreferrer noopener">WhatsApp</a>
                  )}
                </>
              )}
              {['pending', 'accepted'].includes(s.status) && (
                <button className="btn small ghost danger" onClick={() => window.confirm('Cancel this session?') && act(s._id, 'cancel')}>Cancel</button>
              )}
            </div>

            {s.status === 'accepted' && (!s.meetingLink || linkEditId === s._id) && (
              <LinkForm session={s} onCancel={s.meetingLink ? () => setLinkEditId(null) : null} onSaved={() => { setLinkEditId(null); load(); }} />
            )}
            {chatId === s._id && <Chat sessionId={s._id} meId={user._id} otherName={other.name} />}
            {s.status === 'pending' && <p className="hint">Chat and contact options open once the request is accepted.</p>}

            {s.status === 'accepted' && iTeach && !study && <p className="hint">After the session, the learner marks it completed. Then you can both leave a review.</p>}
            {s.status === 'completed' && !s.reviewedByMe && <ReviewForm session={s} onDone={load} />}
            {s.status === 'completed' && s.reviewedByMe && <p className="hint">You've reviewed this session.</p>}
          </article>
        );
      })}
    </div>
  );
}
