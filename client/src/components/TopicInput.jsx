import { useState } from 'react';

// Chip input for topics: type + Enter/comma to add, click a suggestion to add it.
export default function TopicInput({ value, onChange, suggestions = [], placeholder = 'Add a topic and press Enter', max = 15, id }) {
  const [text, setText] = useState('');

  const addMany = (items) => {
    const next = [...value];
    for (const raw of items) {
      const t = raw.trim().slice(0, 40);
      if (t && next.length < max && !next.some((v) => v.toLowerCase() === t.toLowerCase())) next.push(t);
    }
    if (next.length !== value.length) onChange(next);
  };
  const commit = () => { addMany(text.split(',')); setText(''); };
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 12);

  return (
    <div className="stack tight">
      <div className="topic-input">
        {value.map((t) => (
          <span key={t} className="chip accent">
            {t}
            <button type="button" className="x" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((v) => v !== t))}>×</button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
            else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={commit}
        />
      </div>
      {remaining.length > 0 && (
        <div className="chips" aria-label="Suggestions">
          <span className="hint" style={{ alignSelf: 'center' }}>Suggestions:</span>
          {remaining.map((s) => (
            <button type="button" key={s} className="chip outline" onClick={() => addMany([s])}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
