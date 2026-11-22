import { useEffect, useState } from 'react';
import api, { fmtDate } from '../api';

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm"
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Shows the next free slots shared with `userId`, or lets you type a custom time.
// `value` and `onChange` use ISO strings.
export default function SlotPicker({ userId, value, onChange }) {
  const [slots, setSlots] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/matches/${userId}/slots`)
      .then((r) => {
        if (cancelled) return;
        setSlots(r.data);
        if (r.data[0]) onChange(r.data[0].startsAt);
      })
      .catch(() => !cancelled && setSlots([]));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="stack tight">
      <div className="stack tight">
        <div style={{ fontSize: '.86rem', fontWeight: 600 }}>When are you both free?</div>
        {slots === null ? (
          <p className="muted small">Finding common slots…</p>
        ) : slots.length === 0 ? (
          <p className="muted small">No common free slots yet. Add your availability in Profile, or pick a time below.</p>
        ) : (
          <div className="scroll-row">
            {slots.map((s) => (
              <button type="button" key={s.startsAt}
                className={`chip filter ${value === s.startsAt ? 'active' : ''}`}
                onClick={() => onChange(s.startsAt)}>
                {fmtDate(s.startsAt)}
              </button>
            ))}
          </div>
        )}
      </div>
      <label className="field">Or pick another time
        <input type="datetime-local" required value={toLocalInput(value)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')} />
      </label>
    </div>
  );
}
