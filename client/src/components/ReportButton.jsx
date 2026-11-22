import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext.jsx';

const REASONS = [
  ['spam', 'Spam or advertising'],
  ['inappropriate', 'Inappropriate content'],
  ['fake', 'Fake or misleading'],
  ['harassment', 'Harassment'],
  ['other', 'Something else'],
];

// "Report" link that expands into a tiny form. targetType: 'user' | 'studypost' | 'review'
export default function ReportButton({ targetType, targetId, label = 'Report' }) {
  const { user } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!user) return <Link className="report-link" to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`}>{label}</Link>;
  if (msg?.type === 'success') return <span className="hint">{msg.text}</span>;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await api.post('/reports', { targetType, targetId, reason, details });
      setMsg({ type: 'success', text: data.message });
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  };

  if (!open) return <button type="button" className="report-link" onClick={() => setOpen(true)}>{label}</button>;
  return (
    <form className="report-form" onSubmit={submit}>
      <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
        {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <input value={details} maxLength={500} placeholder="Add details (optional)" onChange={(e) => setDetails(e.target.value)} aria-label="Details" />
      <div className="row">
        <button className="btn small primary" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
        <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {msg?.type === 'error' && <div className="alert error small" role="alert">{msg.text}</div>}
    </form>
  );
}
