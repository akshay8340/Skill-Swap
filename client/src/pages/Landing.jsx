import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { academic } from '../api';
import { useConfig } from '../ConfigContext.jsx';
import Icon, { CATEGORY_ICON } from '../components/Icons.jsx';
import Avatar from '../components/Avatar.jsx';
import { Rating } from '../components/Stars.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const { config } = useConfig();
  const [q, setQ] = useState('');
  const [skills, setSkills] = useState(null);
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    api.get('/discover').then((r) => setSkills(r.data.results)).catch(() => setSkills([]));
    api.get('/study').then((r) => setPartners(r.data.slice(0, 3))).catch(() => {});
  }, []);

  const search = (e) => {
    e.preventDefault();
    navigate(`/explore?tab=skills${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  return (
    <>
      <section className="hero compact">
        <div className="hero-inner single">
          <h1>Learn from the students <span className="grad-text">around you.</span></h1>
          <p className="lead">Book a one-on-one session on a specific topic, or find a partner to study with.</p>

          <form className="hero-search" onSubmit={search} role="search">
            <Icon name="search" size={20} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a skill, topic or person" aria-label="Search skills, topics or people" />
            <button className="btn primary">Search</button>
          </form>

          <div className="cat-chips" aria-label="Browse by category">
            {config.categories.filter((c) => c !== 'Other').map((c) => (
              <Link key={c} to={`/explore?tab=skills&category=${encodeURIComponent(c)}`} className="cat-chip">
                <Icon name={CATEGORY_ICON[c] || 'grid'} size={16} /> {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="section-inner">
          <div className="row between" style={{ marginBottom: 18 }}>
            <h2 className="display" style={{ fontSize: '1.4rem' }}>Skills you can learn</h2>
            <Link to="/explore" className="small" style={{ fontWeight: 600 }}>View all <Icon name="arrow" size={14} /></Link>
          </div>

          {skills === null && <p className="muted">Loading…</p>}
          {skills && skills.length === 0 && <div className="card empty"><strong>No skills listed yet</strong></div>}
          {skills && skills.length > 0 && (
            <div className="grid-cards">
              {skills.slice(0, 9).map((s) => (
                <Link key={s.teacher._id + s.skill} to={`/u/${s.teacher._id}?skill=${encodeURIComponent(s.skill)}`} className="card link skill-card">
                  <div className="row between nowrap">
                    <h3>{s.skill}</h3>
                    <span className="chip">{s.category}</span>
                  </div>
                  {s.topics.length > 0 && (
                    <div className="chips">
                      {s.topics.slice(0, 4).map((t) => <span key={t} className="chip accent">{t}</span>)}
                      {s.topics.length > 4 && <span className="chip outline">+{s.topics.length - 4}</span>}
                    </div>
                  )}
                  <hr className="divider" />
                  <div className="row nowrap">
                    <Avatar name={s.teacher.name} size="sm" />
                    <div className="grow small"><strong>{s.teacher.name}</strong><div className="muted">{academic(s.teacher)}</div></div>
                    <Rating value={s.teacher.ratingAvg} count={s.teacher.ratingCount} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {partners.length > 0 && (
        <section className="section tight alt">
          <div className="section-inner">
            <div className="row between" style={{ marginBottom: 18 }}>
              <h2 className="display" style={{ fontSize: '1.4rem' }}>Looking for a study partner</h2>
              <Link to="/explore?tab=partners" className="small" style={{ fontWeight: 600 }}>View all <Icon name="arrow" size={14} /></Link>
            </div>
            <div className="grid-cards">
              {partners.map((p) => (
                <Link key={p._id} to="/explore?tab=partners" className="card link skill-card">
                  <h3>{p.subject}</h3>
                  {p.topics.length > 0 && <div className="chips">{p.topics.slice(0, 4).map((t) => <span key={t} className="chip accent">{t}</span>)}</div>}
                  <div className="row nowrap">
                    <Avatar name={p.owner.name} size="sm" />
                    <div className="grow small"><strong>{p.owner.name}</strong><div className="muted">{academic(p.owner)}</div></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section tight">
        <div className="section-inner">
          <div className="cta-strip">
            <div>
              <strong>Ready to book a session?</strong>
              <span>Create a free account to book, post study requests and track your progress.</span>
            </div>
            <div className="row">
              <Link to="/register" className="btn primary">Get started</Link>
              <Link to="/login" className="btn">Log in</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="section-inner row between">
          <span className="row" style={{ gap: 8 }}>
            <span className="brand-mark" style={{ width: 24, height: 24, borderRadius: 7 }}><Icon name="swap" size={13} /></span>
            <strong>SkillSwap</strong>
          </span>
          <span className="row small" style={{ gap: 18 }}>
            <Link to="/explore">Explore</Link>
            <Link to="/login">Log in</Link>
            <Link to="/register">Sign up</Link>
          </span>
        </div>
      </footer>
    </>
  );
}
