// <Rating value count />  compact display:  ★ 4.8 (3)  or  "New"
// <StarInput value onChange />  five clickable stars
export function Rating({ value = 0, count = 0 }) {
  if (!count) return <span className="rating new">New</span>;
  return (
    <span className="rating" aria-label={`Rated ${Number(value).toFixed(1)} out of 5 by ${count} people`}>
      <span className="star">★</span> {Number(value).toFixed(1)} <span className="muted" style={{ fontWeight: 400 }}>({count})</span>
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <span className="stars-input" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={`star ${n <= value ? 'on' : ''}`} onClick={() => onChange(n)}>★</button>
      ))}
    </span>
  );
}

export default Rating;
