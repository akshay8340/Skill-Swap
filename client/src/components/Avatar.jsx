// Initials on a colour picked from the name, so the same person always looks the same.
const COLORS = ['#2f3fbf', '#0f766e', '#b45309', '#9d174d', '#4338ca', '#0e7490', '#6d28d9', '#b91c1c'];

export default function Avatar({ name = '', size }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span className={`avatar ${size || ''}`} style={{ background: COLORS[h % COLORS.length] }} aria-hidden="true">
      {initials}
    </span>
  );
}
