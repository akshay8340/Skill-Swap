import axios from 'axios';

// Same-origin by default (the server also serves the website). Set VITE_API_URL at build time only if the
// frontend is hosted separately, e.g. VITE_API_URL=https://my-api.example.com/api
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Expired/invalid token -> back to login (but not for failed login attempts, which have no token yet).
api.interceptors.response.use(
  (r) => r,
  (e) => {
    const suspended = e.response?.status === 403 && e.response?.data?.code === 'suspended';
    if ((e.response?.status === 401 || suspended) && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.location.href = suspended ? '/login?suspended=1' : '/login';
    }
    return Promise.reject(e);
  }
);

export const errMsg = (e) => e.response?.data?.message || e.message || 'Something went wrong';

// Categories, programmes, departments and topic ideas come from the server (admins edit them in Settings).
// ConfigProvider loads them once at startup and hands the relevant pieces to these helpers.
let departmentShort = {};
let topicSuggestions = [];
export function applyConfig(c) {
  departmentShort = Object.fromEntries((c.departments || []).map((d) => [d.name, d.short]));
  topicSuggestions = c.topicSuggestions || [];
}

const ORD = ['', '1st', '2nd', '3rd', '4th', '5th'];

// "B.Tech CSE · 3rd year"
export function academic(u) {
  if (!u) return '';
  const dept = u.department in departmentShort ? departmentShort[u.department] : u.department || '';
  const dup = dept && u.programme && u.programme.toLowerCase().includes(dept.toLowerCase());
  const course = [u.programme, dup ? '' : dept].filter(Boolean).join(' ');
  return [course, u.year ? `${ORD[u.year]} year` : ''].filter(Boolean).join(' · ');
}

export const PAID_NOTE = 'Payment, if any, is settled directly between the two of you. SkillSwap does not handle money.';

// Topic ideas shown while adding a skill or a study request (managed by admins).
export function suggestionsFor(name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return [];
  const hit = topicSuggestions.find((t) => n.includes(t.keyword));
  return hit ? hit.topics : [];
}

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const fmtDate = (d) =>
  new Date(d).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;

export default api;
