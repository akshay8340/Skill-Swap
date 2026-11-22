import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, academic } from '../../api';
import Avatar from '../../components/Avatar.jsx';
import { Rating } from '../../components/Stars.jsx';

// People ranked by how well they fit what you want to learn and can teach. Swapping is never required.
export default function ForYouTab() {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/matches').then((r) => setMatches(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!matches) return <div className="muted">Finding people for you…</div>;

  return (
    <div className="stack">
      <details className="how">
        <summary>How are matches scored?</summary>
        <p style={{ marginTop: 6 }}>
          Out of 100: 25 if they teach something on your wishlist, 25 if you teach something they want, up to 30 for overlapping free time, and up to 20 for their rating.
        </p>
      </details>

      {matches.length === 0 ? (
        <div className="card empty">
          <strong>No suggestions yet</strong>
          <span>Add skills you want to learn (and optionally what you can teach) in your <Link to="/profile">profile</Link>, or browse the Skills tab.</span>
        </div>
      ) : (
        <div className="grid-cards">
          {matches.map((m) => (
            <article key={m.user._id} className="card match-card">
              <div className="row between nowrap">
                <div className="row nowrap grow">
                  <Avatar name={m.user.name} />
                  <div className="grow">
                    <Link to={`/u/${m.user._id}`}><strong>{m.user.name}</strong></Link>
                    <div className="muted small">{academic(m.user)}</div>
                  </div>
                </div>
                <span className="score" title="Match score out of 100">{m.score}%</span>
              </div>
              <Rating value={m.user.ratingAvg} count={m.user.ratingCount} />
              <ul className="reasons">
                {m.learn.length > 0 && <li>Teaches {m.learn.join(', ')}, which you want to learn</li>}
                {m.teach.length > 0 && <li>Wants {m.teach.join(', ')}, which you can teach</li>}
                {m.overlapHours > 0 && <li>{m.overlapHours}h/week of common free time</li>}
              </ul>
              <Link to={`/u/${m.user._id}`} className="btn primary block">View & book</Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
