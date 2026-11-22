import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, fmtDate, academic } from '../api';
import { useAuth } from '../AuthContext.jsx';
import Icon from '../components/Icons.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/sessions/stats'), api.get('/sessions')])
      .then(([s, ss]) => { setStats(s.data); setSessions(ss.data); })
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!stats) return <div className="muted">Loading…</div>;

  // Teaching is optional. To get suggestions you need something you want to learn and some free time.
  const needsSetup = !user.wanted.length || !user.availability.length;
  const upcoming = sessions
    .filter((s) => s.status === 'accepted' && new Date(s.startsAt) >= new Date())
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .slice(0, 3);

  return (
    <div className="stack loose">
      <div className="page-head">
        <h1>Welcome, {user.name.split(' ')[0]}</h1>
        <p className="muted">{academic(user)}</p>
      </div>

      {(needsSetup || stats.pendingForMe > 0) && (
        <div className="stack tight">
          {needsSetup && (
            <div className="alert warn">
              Add what you want to learn and when you are free to get suggestions. <Link to="/profile">Update profile</Link>
            </div>
          )}
          {stats.pendingForMe > 0 && (
            <div className="alert info">
              {stats.pendingForMe} request{stats.pendingForMe > 1 ? 's' : ''} waiting for your reply. <Link to="/sessions?tab=pending">Review</Link>
            </div>
          )}
        </div>
      )}

      <div className="stats">
        <div className="card stat"><strong>{stats.upcoming}</strong><span>Upcoming sessions</span></div>
        <div className="card stat"><strong>{stats.hoursLearned + stats.hoursStudiedTogether}h</strong><span>Hours learning</span></div>
        <div className="card stat"><strong>{stats.hoursTaught}h</strong><span>Hours teaching</span></div>
        <div className="card stat"><strong>{stats.ratingCount ? stats.ratingAvg.toFixed(1) : '–'}</strong><span>Your rating</span></div>
      </div>

      <div className="grid-2">
        <Link to="/explore?tab=skills" className="card link action-card">
          <span className="ico"><Icon name="search" /></span>
          <div><h3>Browse skills</h3><p>Find a teacher for a specific topic.</p></div>
        </Link>
        <Link to="/explore?tab=partners" className="card link action-card">
          <span className="ico"><Icon name="users" /></span>
          <div><h3>Find a study partner</h3><p>Join a live one-on-one study session.</p></div>
        </Link>
      </div>

      <section className="stack tight">
        <div className="row between"><h2>Next sessions</h2><Link to="/sessions" className="small">View all</Link></div>
        {upcoming.length === 0 ? (
          <div className="card empty">
            <strong>Nothing scheduled</strong>
            <span>Book a session or join a study partner to get started.</span>
          </div>
        ) : (
          upcoming.map((s) => {
            const iTeach = s.teacher._id === user._id;
            const other = iTeach ? s.learner : s.teacher;
            const text = s.kind === 'costudy' ? `Study together with ${other.name}` : iTeach ? `Teaching ${other.name}` : `Learning from ${other.name}`;
            return (
              <div key={s._id} className="card row between">
                <div className="row nowrap grow">
                  <Avatar name={other.name} />
                  <div className="grow">
                    <strong>{s.skill}{s.topic ? `: ${s.topic}` : ''}</strong>
                    <div className="muted small">{text}</div>
                    <div className="muted small">{fmtDate(s.startsAt)}</div>
                  </div>
                </div>
                {s.meetingLink
                  ? <a className="btn small" href={s.meetingLink} target="_blank" rel="noreferrer noopener"><Icon name="video" size={16} /> Join meeting</a>
                  : <Link className="btn small" to="/sessions">Add meeting link</Link>}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
