import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import SkillsTab from './explore/SkillsTab.jsx';
import PartnersTab from './explore/PartnersTab.jsx';
import ForYouTab from './explore/ForYouTab.jsx';

// Open to guests: Skills and Study partners can be browsed without an account.
export default function Explore() {
  const { user } = useAuth();
  const loc = useLocation();
  const [params, setParams] = useSearchParams();

  const tabs = [['skills', 'Skills'], ['partners', 'Study partners'], ...(user ? [['foryou', 'For you']] : [])];
  const tab = tabs.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'skills';

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Explore</h1>
        <p className="muted">Find a teacher for a specific topic, or a partner to study with. You don't need to teach in order to learn.</p>
      </div>

      {!user && (
        <div className="alert info row between">
          <span>You are browsing as a guest. Log in to book sessions and get suggestions based on your schedule.</span>
          <Link className="btn small primary" to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`}>Log in</Link>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Explore">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''}
            onClick={() => setParams({ tab: key }, { replace: true })}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'skills' && <SkillsTab />}
      {tab === 'partners' && <PartnersTab />}
      {tab === 'foryou' && <ForYouTab />}
    </div>
  );
}
