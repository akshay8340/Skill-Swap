import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import api, { errMsg, academic } from '../../api';
import { useConfig } from '../../ConfigContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import { Rating } from '../../components/Stars.jsx';
import Icon from '../../components/Icons.jsx';

export default function SkillsTab() {
  const { user } = useAuth();
  const { config } = useConfig();
  const CATEGORIES = config.categories;
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [category, setCategory] = useState(CATEGORIES.includes(params.get('category')) ? params.get('category') : '');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get('/discover', { params: { q, category } })
        .then((r) => { setResults(r.data.results); setError(''); })
        .catch((e) => setError(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, category]);

  return (
    <div className="stack">
      <div className="stack tight">
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--muted)' }}><Icon name="search" size={20} /></span>
          <input type="search" style={{ paddingLeft: 40 }} placeholder="Search skills, topics or people"
            value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search skills and topics" />
        </div>
        <div className="scroll-row" role="group" aria-label="Category">
          {['', ...CATEGORIES].map((c) => (
            <button key={c || 'all'} type="button" className={`chip filter ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
              {c || 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {!results && !error && <div className="muted">Loading…</div>}
      {results && results.length === 0 && (
        <div className="card empty">
          <strong>Nothing found</strong>
          <span>Try a different word, or clear the category.</span>
        </div>
      )}
      {results && results.length > 0 && (
        <>
          <div className="muted small">{results.length} result{results.length > 1 ? 's' : ''}</div>
          <div className="grid-cards">
            {results.map((r) => (
              <article key={r.teacher._id + r.skill} className="card skill-card">
                <div className="row between nowrap">
                  <h3>{r.skill}</h3>
                  {r.wantedByMe && <span className="chip teal">On your wishlist</span>}
                </div>
                <div className="chips">
                  <span className="chip">{r.category}</span>
                  <span className="chip">{r.level}</span>
                </div>
                {r.topics.length > 0 && (
                  <div className="chips" aria-label="Topics taught">
                    {r.topics.slice(0, 5).map((t) => (
                      <button type="button" key={t} className="chip accent" onClick={() => setQ(t)} title={`Search ${t}`}>{t}</button>
                    ))}
                    {r.topics.length > 5 && <span className="chip outline">+{r.topics.length - 5}</span>}
                  </div>
                )}
                <hr className="divider" />
                <div className="row nowrap">
                  <Avatar name={r.teacher.name} />
                  <div className="grow">
                    <strong className="truncate" style={{ display: 'block' }}>{r.teacher.name}</strong>
                    <div className="muted small">{academic(r.teacher)}</div>
                  </div>
                  <Rating value={r.teacher.ratingAvg} count={r.teacher.ratingCount} />
                </div>
                {user && <div className="muted small">{r.overlapHours > 0 ? `${r.overlapHours}h/week of common free time` : 'No common free time listed yet'}</div>}
                <Link className="btn primary block" to={`/u/${r.teacher._id}?skill=${encodeURIComponent(r.skill)}`}>View & book</Link>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
