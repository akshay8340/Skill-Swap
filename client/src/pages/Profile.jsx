import { useState } from 'react';
import api, { errMsg, DAYS, hourLabel, PAID_NOTE, suggestionsFor } from '../api';
import { useAuth } from '../AuthContext.jsx';
import { useConfig } from '../ConfigContext.jsx';
import AccountSettings from '../components/AccountSettings.jsx';
import TopicInput from '../components/TopicInput.jsx';
import Avatar from '../components/Avatar.jsx';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const EMPTY_SKILL = { name: '', category: '', level: 'Intermediate', topics: [], paid: false, price: '' };

const PRESETS = [
  { label: 'Weekday evenings, 6 to 9 PM', slots: [1, 2, 3, 4, 5].map((day) => ({ day, start: 18, end: 21 })) },
  { label: 'Weekends, 10 AM to 4 PM', slots: [0, 6].map((day) => ({ day, start: 10, end: 16 })) },
  { label: 'Late evenings, 9 to 11 PM', slots: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: 21, end: 23 })) },
];

const sameSlot = (a, b) => a.day === b.day && a.start === b.start && a.end === b.end;

export default function Profile() {
  const { user, setUser } = useAuth();
  const { config } = useConfig();
  const [name, setName] = useState(user.name);
  const [programme, setProgramme] = useState(user.programme || '');
  const [department, setDepartment] = useState(user.department || '');
  const [year, setYear] = useState(user.year || '');
  const [bio, setBio] = useState(user.bio || '');
  const [whatsapp, setWhatsapp] = useState(user.whatsapp ? `+${user.whatsapp}` : '');
  const [offered, setOffered] = useState(user.offered || []);
  const [wanted, setWanted] = useState(user.wanted || []);
  const [availability, setAvailability] = useState(user.availability || []);

  const [draft, setDraft] = useState(null); // skill being added/edited
  const [editIndex, setEditIndex] = useState(null);
  const [skillError, setSkillError] = useState('');
  const [newWant, setNewWant] = useState('');
  const [newSlot, setNewSlot] = useState({ day: 1, start: 18, end: 21 });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // ---- skills I teach ----
  const saveSkill = () => {
    const n = draft.name.trim();
    if (!n) return setSkillError('Give the skill a name');
    if (offered.some((s, i) => i !== editIndex && s.name.toLowerCase() === n.toLowerCase())) return setSkillError('You already listed this skill');
    const skill = { ...draft, name: n };
    setOffered(editIndex === null ? [...offered, skill] : offered.map((s, i) => (i === editIndex ? skill : s)));
    setDraft(null); setEditIndex(null); setSkillError('');
  };
  const editSkill = (i) => { setDraft({ ...offered[i] }); setEditIndex(i); setSkillError(''); };

  // ---- wishlist ----
  const addWant = () => {
    const n = newWant.trim();
    if (n && !wanted.some((s) => s.toLowerCase() === n.toLowerCase())) setWanted([...wanted, n]);
    setNewWant('');
  };

  // ---- availability ----
  const addSlots = (slots) => setAvailability([...availability, ...slots.filter((s) => !availability.some((a) => sameSlot(a, s)))]);
  const addCustom = () => {
    if (newSlot.start >= newSlot.end) return setMsg({ type: 'error', text: 'The end time must be after the start time' });
    setMsg(null);
    addSlots([{ ...newSlot }]);
  };
  const sortedSlots = availability.map((a, i) => ({ ...a, i })).sort((a, b) => a.day - b.day || a.start - b.start);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await api.put('/users/profile', { name, programme, department, year: Number(year), bio, whatsapp, offered, wanted, availability });
      setUser(data);
      setMsg({ type: 'success', text: 'Saved. Your suggestions are updated.' });
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="row nowrap">
        <Avatar name={name || user.name} size="lg" />
        <div className="page-head">
          <h1>Your profile</h1>
          <p className="muted">This is what other students see when they find you.</p>
        </div>
      </div>

      <section className="card stack">
        <h2>About you</h2>
        <label className="field">Full name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="grid-3">
          <label className="field">Programme
            <select value={programme} onChange={(e) => setProgramme(e.target.value)}>
              <option value="">Select</option>
              {config.programmes.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="field">Department
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Select</option>
              {config.departments.map((d) => <option key={d.name}>{d.name}</option>)}
            </select>
          </label>
          <label className="field">Year
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Select</option>
              {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </label>
        </div>
        <label className="field">WhatsApp number <span className="hint">Optional</span>
          <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          <span className="hint">Include the country code. It is shown only to the other person once a session between you is accepted, never on your public profile.</span>
        </label>
        <label className="field">Short bio <span className="hint">{bio.length}/300</span>
          <textarea rows={3} maxLength={300} placeholder="What are you into? What would you like to learn?" value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
      </section>

      <section className="card stack">
        <div className="row between">
          <div>
            <h2>What I can teach</h2>
            <p className="muted small">Optional. Add any skill you can teach, academic or not. Listing specific topics helps people find exactly what they need.</p>
          </div>
          {!draft && <button className="btn small" onClick={() => { setDraft({ ...EMPTY_SKILL, category: config.categories[0] || 'Other' }); setEditIndex(null); }}>Add a skill</button>}
        </div>

        {offered.length === 0 && !draft && <p className="muted">Nothing added. You can still learn without teaching.</p>}
        <div>
          {offered.map((s, i) => (
            <div className="skill-row" key={s.name}>
              <div className="stack tight grow">
                <div className="row">
                  <strong>{s.name}</strong>
                  <span className="chip">{s.level}</span>
                  <span className="chip">{s.category}</span>
                  <span className={`tag ${s.paid ? 'paid' : 'free'}`}>{s.paid ? `Paid${s.price ? ' · ' + s.price : ''}` : 'Free'}</span>
                </div>
                {s.topics.length > 0 && <div className="chips">{s.topics.map((t) => <span key={t} className="chip accent">{t}</span>)}</div>}
              </div>
              <div className="row nowrap" style={{ alignSelf: 'flex-start' }}>
                <button className="btn ghost small" onClick={() => editSkill(i)}>Edit</button>
                <button className="btn ghost small danger" onClick={() => setOffered(offered.filter((_, j) => j !== i))}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        {draft && (
          <div className="editor stack">
            <h3>{editIndex === null ? 'New skill' : `Edit ${offered[editIndex].name}`}</h3>
            <label className="field">Skill
              <input autoFocus placeholder="e.g. DSA, Spoken English, Gymnastics" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <div className="grid-2">
              <label className="field">Category
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {config.categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="field">Your level
                <select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })}>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
            </div>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.86rem', fontWeight: 600 }}>
              Topics you can teach <span className="hint" style={{ fontWeight: 400 }}>People can book a specific topic, like Graphs or Backflip</span>
              <TopicInput value={draft.topics} onChange={(topics) => setDraft({ ...draft, topics })} suggestions={suggestionsFor(draft.name)} />
            </div>
            <div className="stack tight">
              <label className="inline">
                <input type="checkbox" checked={draft.paid} onChange={(e) => setDraft({ ...draft, paid: e.target.checked })} /> I charge a small fee
              </label>
              {draft.paid && (
                <>
                  <input placeholder="e.g. ₹200/hr (optional)" maxLength={30} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} aria-label="Fee" />
                  <p className="hint">{PAID_NOTE} This is shown only when someone opens your profile to book.</p>
                </>
              )}
            </div>
            {skillError && <div className="alert error" role="alert">{skillError}</div>}
            <div className="row">
              <button className="btn primary" onClick={saveSkill}>{editIndex === null ? 'Add skill' : 'Update skill'}</button>
              <button className="btn ghost" onClick={() => { setDraft(null); setEditIndex(null); setSkillError(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="card stack">
        <div>
          <h2>What I want to learn</h2>
          <p className="muted small">We use this to suggest people. Use plain names like DSA, C++, Spoken English.</p>
        </div>
        <div className="chips">
          {wanted.length === 0 && <span className="muted">Nothing added yet</span>}
          {wanted.map((s) => (
            <span key={s} className="chip teal">{s}
              <button className="x" aria-label={`Remove ${s}`} onClick={() => setWanted(wanted.filter((x) => x !== s))}>×</button>
            </span>
          ))}
        </div>
        <div className="row nowrap">
          <input placeholder="Add a skill and press Enter" value={newWant} onChange={(e) => setNewWant(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWant())} aria-label="Skill you want to learn" />
          <button className="btn" onClick={addWant}>Add</button>
        </div>
      </section>

      <section className="card stack">
        <div>
          <h2>When I'm free</h2>
          <p className="muted small">Weekly. Sessions are suggested only in slots where both people are free.</p>
        </div>
        <div className="scroll-row" role="group" aria-label="Quick add">
          {PRESETS.map((p) => <button key={p.label} className="chip filter" onClick={() => addSlots(p.slots)}>+ {p.label}</button>)}
        </div>
        <div className="chips">
          {sortedSlots.length === 0 && <span className="muted">No slots yet</span>}
          {sortedSlots.map((s) => (
            <span key={s.i} className="chip outline">{DAYS[s.day]} {hourLabel(s.start)}-{hourLabel(s.end)}
              <button className="x" aria-label="Remove slot" onClick={() => setAvailability(availability.filter((_, i) => i !== s.i))}>×</button>
            </span>
          ))}
        </div>
        <div className="row">
          <select style={{ width: 'auto' }} aria-label="Day" value={newSlot.day} onChange={(e) => setNewSlot({ ...newSlot, day: +e.target.value })}>
            {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
          <select style={{ width: 'auto' }} aria-label="From" value={newSlot.start} onChange={(e) => setNewSlot({ ...newSlot, start: +e.target.value })}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
          <span className="muted">to</span>
          <select style={{ width: 'auto' }} aria-label="To" value={newSlot.end} onChange={(e) => setNewSlot({ ...newSlot, end: +e.target.value })}>
            {Array.from({ length: 24 }, (_, h) => <option key={h + 1} value={h + 1}>{hourLabel(h + 1)}</option>)}
          </select>
          <button className="btn small" onClick={addCustom}>Add slot</button>
        </div>
      </section>

      <AccountSettings />

      <div className="savebar">
        {msg && <div className={`alert ${msg.type}`} role="status">{msg.text}</div>}
        <button className="btn primary block" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </div>
  );
}
