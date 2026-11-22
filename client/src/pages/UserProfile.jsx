import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { errMsg, academic, PAID_NOTE } from '../api';
import { useAuth } from '../AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import { Rating } from '../components/Stars.jsx';
import PriceTag from '../components/PriceTag.jsx';
import SlotPicker from '../components/SlotPicker.jsx';
import ReportButton from '../components/ReportButton.jsx';

// The teacher's public page and the booking form. This is where Free / Paid is shown.
export default function UserProfile() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ skill: '', topic: '', startsAt: '', durationHours: 1, note: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setData(null);
    api
      .get(`/users/${id}`)
      .then((u) => {
        setData(u.data);
        const wantedSet = new Set((me?.wanted || []).map((w) => w.toLowerCase()));
        const offered = u.data.user.offered;
        const chosen = offered.find((o) => o.name === search.get('skill')) || offered.find((o) => wantedSet.has(o.name.toLowerCase())) || offered[0];
        setForm((f) => ({ ...f, skill: chosen?.name || '', topic: '' }));
      })
      .catch((e) => setError(errMsg(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="muted">Loading…</div>;

  const { user, reviews } = data;
  const first = user.name.split(' ')[0];
  const isMe = me && user._id === me._id;
  const myWanted = new Set((me?.wanted || []).map((w) => w.toLowerCase()));
  const loginHref = `/login?next=${encodeURIComponent(loc.pathname + loc.search)}`;
  const chosen = user.offered.find((s) => s.name === form.skill);

  const book = async (e) => {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    try {
      await api.post('/sessions', {
        kind: 'learn', teacherId: user._id, skill: form.skill, topic: form.topic,
        startsAt: form.startsAt, durationHours: Number(form.durationHours), note: form.note,
      });
      navigate('/sessions?tab=pending');
    } catch (err) {
      setMsg(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-layout">
      <div className="stack">
        <section className="card stack">
          <div className="row nowrap">
            <Avatar name={user.name} size="lg" />
            <div className="grow">
              <h1>{user.name}</h1>
              <div className="muted">{academic(user)}</div>
              <div style={{ marginTop: 4 }}><Rating value={user.ratingAvg} count={user.ratingCount} /></div>
            </div>
          </div>
          {user.bio && <p>{user.bio}</p>}
          {!isMe && <div><ReportButton targetType="user" targetId={user._id} label="Report this profile" /></div>}
        </section>

        <section className="card">
          <h4>Can teach</h4>
          {user.offered.length === 0 ? (
            <p className="muted">{first} isn't teaching anything right now and is here to learn.</p>
          ) : (
            user.offered.map((s) => (
              <div key={s.name} className="skill-block">
                <div className="row between nowrap">
                  <div className="row">
                    <strong>{s.name}</strong>
                    <span className="chip">{s.level}</span>
                    <span className="chip">{s.category}</span>
                    {myWanted.has(s.name.toLowerCase()) && <span className="chip teal">On your wishlist</span>}
                  </div>
                  <PriceTag paid={s.paid} price={s.price} />
                </div>
                {s.topics.length > 0 && <div className="chips">{s.topics.map((t) => <span key={t} className="chip accent">{t}</span>)}</div>}
              </div>
            ))
          )}
        </section>

        {user.wanted.length > 0 && me && (
          <section className="card">
            <h4>Wants to learn</h4>
            <div className="chips">{user.wanted.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          </section>
        )}

        <section className="card stack tight">
          <h4>Reviews</h4>
          {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
          {reviews.map((r) => (
            <div key={r._id} className="stack tight" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <div className="row"><Rating value={r.rating} count={1} /> <strong className="small">{r.from?.name || 'A student'}</strong></div>
              {r.comment && <p className="small">{r.comment}</p>}
              {me && r.from && <div><ReportButton targetType="review" targetId={r._id} /></div>}
            </div>
          ))}
        </section>
      </div>

      {!isMe && (
        <aside className="sticky">
          {!me ? (
            <section className="card stack">
              <h2>Book a session</h2>
              {user.offered.length > 0 && (
                <p className="muted small">
                  Log in to choose a topic and a time. Slots are suggested only when you and {first} are both free.
                </p>
              )}
              <Link className="btn primary block lg" to={loginHref}>Log in to book</Link>
              <p className="muted small" style={{ textAlign: 'center' }}>
                New here? <Link to={`/register`}>Create an account</Link>
              </p>
            </section>
          ) : user.offered.length === 0 ? (
            <section className="card stack tight">
              <h3>Study together instead</h3>
              <p className="muted small">{first} isn't teaching, but you can study with them if they have posted a request.</p>
              <Link className="btn block" to="/explore?tab=partners">Browse study partners</Link>
            </section>
          ) : (
            <form className="card stack" onSubmit={book}>
              <h2>Book a session</h2>

              <label className="field">Skill
                <select value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value, topic: '' })}>
                  {user.offered.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </label>

              {chosen && (
                <div className="row between">
                  <span className="muted small">Fee</span>
                  <PriceTag paid={chosen.paid} price={chosen.price} />
                </div>
              )}
              {chosen?.paid && <div className="alert warn small">{PAID_NOTE} Agree the fee with {first} in your message.</div>}

              {chosen?.topics.length > 0 && (
                <label className="field">Topic <span className="hint">Optional</span>
                  <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                    <option value="">Any, or I'll discuss it</option>
                    {chosen.topics.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
              )}

              <label className="field">Duration
                <select value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })}>
                  {[1, 2, 3, 4].map((h) => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
                </select>
              </label>

              <SlotPicker userId={user._id} value={form.startsAt} onChange={(v) => setForm((f) => ({ ...f, startsAt: v }))} />

              <label className="field">Message <span className="hint">Optional</span>
                <textarea rows={2} maxLength={300} placeholder="What do you already know? What do you want to cover?" value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </label>
              {msg && <div className="alert error" role="alert">{msg}</div>}
              <button className="btn primary block" disabled={busy || !form.startsAt}>{busy ? 'Sending…' : 'Request session'}</button>
              <p className="hint" style={{ textAlign: 'center' }}>{first} will confirm. You'll get a video link once accepted.</p>
            </form>
          )}
        </aside>
      )}
    </div>
  );
}
