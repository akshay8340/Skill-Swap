import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api';

const time = (d) => new Date(d).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Simple in-app chat for the two people of an accepted session. Refreshes every few seconds while open.
export default function Chat({ sessionId, meId, otherName }) {
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const log = useRef(null);

  const load = useCallback(
    () => api.get(`/sessions/${sessionId}/messages`).then((r) => setMessages(r.data)).catch((e) => setError(errMsg(e))),
    [sessionId]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`/sessions/${sessionId}/messages`, { text: body });
      setMessages((m) => [...(m || []), data]);
      setText('');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat">
      <div className="chat-log" ref={log} role="log" aria-live="polite" aria-label={`Chat with ${otherName}`}>
        {messages === null && <p className="muted small">Loading…</p>}
        {messages && messages.length === 0 && <p className="muted small">No messages yet. Say hello to {otherName.split(' ')[0]}.</p>}
        {messages && messages.map((m) => (
          <div key={m._id} className={`msg ${m.from === meId ? 'me' : 'them'}`}>
            <div className="bubble">{m.text}</div>
            <span className="when">{time(m.createdAt)}</span>
          </div>
        ))}
      </div>
      {error && <div className="alert error" role="alert" style={{ margin: '0 10px 8px' }}>{error}</div>}
      <form className="chat-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Write a message" aria-label="Message" />
        <button className="btn primary small" disabled={!text.trim() || sending}>Send</button>
      </form>
    </div>
  );
}
