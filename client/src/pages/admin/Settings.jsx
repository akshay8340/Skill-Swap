import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api';
import { useConfig } from '../../ConfigContext.jsx';
import TopicInput from '../../components/TopicInput.jsx';

// Everything the site used to hardcode is edited here and stored in the database.
function Section({ title, hint, children }) {
  return (
    <section className="card stack">
      <div><h2>{title}</h2>{hint && <p className="muted small">{hint}</p>}</div>
      {children}
    </section>
  );
}

export default function Settings() {
  const { reload } = useConfig();
  const [c, setC] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/admin/config').then((r) => setC(r.data)).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  }, []);

  if (!c) return msg ? <div className="alert error">{msg.text}</div> : <div className="muted">Loading…</div>;

  const set = (k, v) => setC({ ...c, [k]: v });

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await api.put('/admin/config', c);
      setC(data);
      await reload();
      setMsg({ type: 'success', text: 'Settings saved. The site now uses them.' });
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };

  const setDept = (i, patch) => set('departments', c.departments.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const setTopic = (i, patch) => set('topicSuggestions', c.topicSuggestions.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  return (
    <div className="stack">
      <Section title="Announcement banner" hint="Shown at the top of every page while switched on, for example to announce maintenance.">
        <label className="inline">
          <input type="checkbox" checked={c.announcement.active} onChange={(e) => set('announcement', { ...c.announcement, active: e.target.checked })} /> Show the banner
        </label>
        <input maxLength={200} placeholder="Message" value={c.announcement.text} onChange={(e) => set('announcement', { ...c.announcement, text: e.target.value })} aria-label="Announcement text" />
      </Section>

      <Section title="Sign-up" hint="Leave empty to let anyone register. Add domains such as example.edu to accept only those email addresses.">
        <TopicInput value={c.allowedEmailDomains} onChange={(v) => set('allowedEmailDomains', v)} max={20} placeholder="Add an email domain and press Enter" />
      </Section>

      <Section title="Skill categories" hint="Used for filters, the landing page and when people add a skill. Removing one does not change existing skills.">
        <TopicInput value={c.categories} onChange={(v) => set('categories', v)} max={40} placeholder="Add a category and press Enter" />
      </Section>

      <Section title="Programmes" hint="Choices in the sign-up and profile forms.">
        <TopicInput value={c.programmes} onChange={(v) => set('programmes', v)} max={30} placeholder="Add a programme and press Enter" />
      </Section>

      <Section title="Departments" hint="The short name is what appears on cards, for example CSE.">
        <div className="stack tight">
          {c.departments.map((d, i) => (
            <div className="row nowrap" key={i}>
              <input value={d.name} placeholder="Department name" onChange={(e) => setDept(i, { name: e.target.value })} aria-label="Department name" />
              <input value={d.short} placeholder="Short" maxLength={12} style={{ maxWidth: 120 }} onChange={(e) => setDept(i, { short: e.target.value })} aria-label="Short name" />
              <button className="icon-btn" aria-label="Remove department" onClick={() => set('departments', c.departments.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <div><button className="btn small" onClick={() => set('departments', [...c.departments, { name: '', short: '' }])}>Add department</button></div>
        </div>
      </Section>

      <Section title="Allowed meeting services" hint="People can paste video-call links only from these websites. Anything else is rejected, which protects students from unsafe links.">
        <TopicInput value={c.meetingHosts} onChange={(v) => set('meetingHosts', v)} max={40} placeholder="e.g. meet.google.com" />
      </Section>

      <Section title="Topic suggestions" hint="Ideas offered while someone adds a skill. A suggestion applies when the skill name contains the keyword.">
        <div className="stack">
          {c.topicSuggestions.map((t, i) => (
            <div className="stack tight suggest-row" key={i}>
              <div className="row nowrap">
                <input value={t.keyword} placeholder="Keyword, e.g. dsa" onChange={(e) => setTopic(i, { keyword: e.target.value })} aria-label="Keyword" />
                <button className="icon-btn" aria-label="Remove suggestion" onClick={() => set('topicSuggestions', c.topicSuggestions.filter((_, j) => j !== i))}>×</button>
              </div>
              <TopicInput value={t.topics} onChange={(v) => setTopic(i, { topics: v })} max={25} placeholder="Add a topic and press Enter" />
            </div>
          ))}
          <div><button className="btn small" onClick={() => set('topicSuggestions', [...c.topicSuggestions, { keyword: '', topics: [] }])}>Add keyword</button></div>
        </div>
      </Section>

      <div className="savebar">
        {msg && <div className={`alert ${msg.type}`} role="status">{msg.text}</div>}
        <button className="btn primary block" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>
    </div>
  );
}
