// End-to-end smoke test against a RUNNING server (npm run dev) - covers the full user journey, moderation and admin.
//   npm test                          (uses http://localhost:5000)
//   API=https://my-site/api npm test  (any deployed server)
// Admin tests need the server to list ADMIN_TEST_EMAIL (default admin-test@example.com) in ADMIN_EMAILS; they are skipped otherwise.
// The test removes the accounts it creates when it finishes.
const BASE = process.env.API || 'http://localhost:5000/api';
let failed = 0;

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`);
  if (!cond) failed++;
}

const stamp = Date.now();
const allDays = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: 9, end: 22 }));
const academic = { programme: 'MCA', department: 'Computer Applications (MCA)', year: 2 };
const reg = (n) => call('POST', '/auth/register', { name: `Test ${n}`, email: `${n}${stamp}@bitmesra.ac.in`, password: 'secret12', ...academic });

// ---- public settings ----
const cfg = await call('GET', '/config');
check('public config lists categories, programmes and departments (from the database)',
  cfg.status === 200 && cfg.data.categories.length > 0 && cfg.data.programmes.includes('MCA') && cfg.data.departments[0].name && 'short' in cfg.data.departments[0]);

// ---- accounts ----
const [a, b, c] = [await reg('a'), await reg('b'), await reg('c')];
check('register users', a.status === 201 && b.status === 201 && c.status === 201);
const [ta, tb, tc] = [a.data.token, b.data.token, c.data.token];
const [ida, idb, idc] = [a.data.user._id, b.data.user._id, c.data.user._id];
check('new accounts are normal, active users', a.data.user.role === 'user' && a.data.user.status === 'active' && a.data.user.isDemo === false);

const anyMail = await call('POST', '/auth/register', { name: 'Any Mail', email: `x${stamp}@gmail.com`, password: 'secret12', ...academic });
check('any email address can register', anyMail.status === 201, JSON.stringify(anyMail.data));
check('programme/department/year required', (await call('POST', '/auth/register', { name: 'X', email: `y${stamp}@bitmesra.ac.in`, password: 'secret12' })).status === 400);
check('programme must be one of the configured ones', (await call('POST', '/auth/register', { name: 'X', email: `y${stamp}@bitmesra.ac.in`, password: 'secret12', ...academic, programme: 'Wizardry' })).status === 400);
check('duplicate email rejected', (await call('POST', '/auth/register', { name: 'x', email: `a${stamp}@bitmesra.ac.in`, password: 'secret12', ...academic })).status === 409);
check('wrong password rejected', (await call('POST', '/auth/login', { email: `a${stamp}@bitmesra.ac.in`, password: 'nope' })).status === 401);
check('protected route needs token', (await call('GET', '/matches')).status === 401);

// A teaches React (free), wants C++.  B teaches C++ (paid, with topics) and Spoken English, wants React.
await call('PUT', '/users/profile', {
  offered: [{ name: 'React', category: 'Programming', topics: ['Hooks', 'Routing'] }], wanted: ['C++'], availability: allDays,
}, ta);
const pb = await call('PUT', '/users/profile', {
  offered: [
    { name: 'C++', category: 'Programming', topics: ['STL', 'OOP', 'stl', ' '], paid: true, price: '₹150/hr' },
    { name: 'Spoken English', category: 'Language & Communication', topics: ['Fluency'] },
    { name: '  ', category: 'Programming' },
  ],
  wanted: ['react'], availability: allDays, whatsapp: '+91 98765-43210',
}, tb);
check('profile saves topics (deduped), category, fee; drops blank skills',
  pb.data.offered.length === 2 && pb.data.offered[0].paid && pb.data.offered[0].price === '₹150/hr' && pb.data.offered[0].topics.join() === 'STL,OOP',
  JSON.stringify(pb.data.offered));
check('whatsapp number is normalised to digits', pb.data.whatsapp === '919876543210', pb.data.whatsapp);
check('invalid whatsapp number is rejected', (await call('PUT', '/users/profile', { whatsapp: '12345' }, ta)).status === 400);
await call('PUT', '/users/profile', { wanted: ['Spoken English'], availability: allDays }, tc);
check('unknown category falls back to Other', (await call('PUT', '/users/profile', { offered: [{ name: 'Origami', category: 'Nonsense' }] }, tc)).data.offered[0].category === 'Other');
await call('PUT', '/users/profile', { offered: [] }, tc);
check('profile department is validated against the configured list', (await call('PUT', '/users/profile', { department: 'Wizardry' }, ta)).status === 400);

// ---- smart matching ----
const m = await call('GET', '/matches', null, ta);
const hit = m.data.find?.((x) => x.user._id === idb);
check('mutual match found with high score', hit && hit.mutual && hit.score >= 75, JSON.stringify(hit));
check('fee details are not exposed in match lists', hit && hit.user.offered.every((s) => !('paid' in s) && !('price' in s)));

// ---- discover: learning without teaching ----
const dc = await call('GET', '/discover?q=english', null, tc);
const eng = dc.data.results || [];
check('learner who teaches nothing can discover skills',
  eng.length >= 1 && eng.every((r) => r.skill === 'Spoken English' && r.wantedByMe) && eng.some((r) => r.teacher._id === idb));
const dtopic = await call('GET', '/discover?q=stl', null, tc);
check('search finds a skill by its topic', dtopic.data.results.some((r) => r.skill === 'C++' && r.teacher._id === idb && r.topics.includes('STL')));
check('fee details are not exposed in discover', dtopic.data.results.every((r) => !('paid' in r) && !('price' in r)));
const dcat = await call('GET', '/discover?category=Language%20%26%20Communication', null, tc);
check('category filter works', dcat.data.results.length > 0 && dcat.data.results.every((r) => r.category === 'Language & Communication'));
const profile = await call('GET', `/users/${idb}`, null, tc);
check('free/paid and price show on the teacher profile', profile.data.user.offered[0].paid === true && profile.data.user.offered[0].price === '₹150/hr');

// ---- guests (no login) can browse, with privacy limits; acting needs a login ----
const gd = await call('GET', '/discover?q=stl');
const gHit = gd.data.results?.find((r) => r.teacher._id === idb);
check('guests can browse skills with a shortened name and no personal fit data',
  gd.status === 200 && gHit && gHit.teacher.name === 'Test B.' && gHit.wantedByMe === false && gHit.overlapHours === null, JSON.stringify(gHit));
const gp = await call('GET', `/users/${idb}`);
check('guest profile: shortened name, no bio/wishlist, fee visible for booking',
  gp.status === 200 && gp.data.guest === true && gp.data.user.name === 'Test B.' && gp.data.user.bio === '' && gp.data.user.wanted.length === 0 && gp.data.user.offered[0].price === '₹150/hr');
check('guests cannot see matches, slots or my study requests',
  (await call('GET', '/matches')).status === 401 && (await call('GET', `/matches/${idb}/slots`)).status === 401 && (await call('GET', '/study/mine')).status === 401);
check('guests cannot book', (await call('POST', '/sessions', { teacherId: idb, skill: 'C++', startsAt: new Date(Date.now() + 864e5).toISOString() })).status === 401);
check('a bad token is treated as a guest on browse routes', (await call('GET', '/discover', null, 'garbage')).status === 200);

// ---- learn session lifecycle (with a specific topic) ----
const slots = await call('GET', `/matches/${idb}/slots`, null, ta);
check('slots suggested', slots.data.length > 2);
const startsAt = slots.data[0].startsAt;

check('topic the teacher does not list is rejected', (await call('POST', '/sessions', { teacherId: idb, skill: 'C++', topic: 'Rust', startsAt }, ta)).status === 400);
const book = await call('POST', '/sessions', { teacherId: idb, skill: 'c++', topic: 'stl', startsAt }, ta);
check('session requested for a topic (teacher spelling kept)', book.status === 201 && book.data.status === 'pending' && book.data.topic === 'STL', JSON.stringify(book.data));
const sid = book.data._id;
check('contact details stay hidden while the request is pending', book.data.contactWhatsapp === '' && book.data.teacher.whatsapp === undefined);
check('chat is closed until the session is accepted',
  (await call('GET', `/sessions/${sid}/messages`, null, ta)).status === 403 && (await call('POST', `/sessions/${sid}/messages`, { text: 'hi' }, ta)).status === 403);
check('a meeting link cannot be set before approval', (await call('PATCH', `/sessions/${sid}/link`, { link: 'https://meet.google.com/abc-defg-hij' }, ta)).status === 400);
check('cannot book a skill the teacher lacks', (await call('POST', '/sessions', { teacherId: idb, skill: 'Rust', startsAt }, ta)).status === 400);
check('requester cannot accept own request', (await call('PATCH', `/sessions/${sid}`, { action: 'accept' }, ta)).status === 403);
check('accepting with a link from a disallowed service is rejected', (await call('PATCH', `/sessions/${sid}`, { action: 'accept', meetingLink: 'https://evil.example.com/room' }, tb)).status === 400);

const acc = await call('PATCH', `/sessions/${sid}`, { action: 'accept' }, tb);
check('teacher accepts; no meeting link is invented', acc.data.status === 'accepted' && acc.data.meetingLink === '', JSON.stringify(acc.data));

// ---- meeting links (Google Meet, Zoom, ...) ----
const bad = (link) => call('PATCH', `/sessions/${sid}/link`, { link }, ta);
check('http links are rejected', (await bad('http://meet.google.com/abc-defg-hij')).status === 400);
check('unknown services are rejected', (await bad('https://evil.example.com/abc')).status === 400);
check('look-alike hosts are rejected (meet.google.com.evil.com)', (await bad('https://meet.google.com.evil.com/abc')).status === 400);
check('links with embedded credentials are rejected', (await bad('https://user:pass@meet.google.com/abc')).status === 400);
check('non-links are rejected', (await bad('not a link')).status === 400);
const gm = await call('PATCH', `/sessions/${sid}/link`, { link: 'https://meet.google.com/abc-defg-hij' }, ta);
check('the learner can add a Google Meet link', gm.status === 200 && gm.data.meetingLink === 'https://meet.google.com/abc-defg-hij', JSON.stringify(gm.data));
check('the teacher sees the same link', (await call('GET', '/sessions', null, tb)).data.find((s) => s._id === sid).meetingLink === 'https://meet.google.com/abc-defg-hij');
check('a third person cannot change the link', (await call('PATCH', `/sessions/${sid}/link`, { link: 'https://zoom.us/j/123' }, tc)).status === 404);
check('Zoom links are allowed too', (await call('PATCH', `/sessions/${sid}/link`, { link: 'https://us02web.zoom.us/j/123456789' }, tb)).data.meetingLink === 'https://us02web.zoom.us/j/123456789');
check('the link can be cleared', (await call('PATCH', `/sessions/${sid}/link`, { link: '' }, ta)).data.meetingLink === '');
await call('PATCH', `/sessions/${sid}/link`, { link: 'https://meet.google.com/abc-defg-hij' }, ta);

// ---- contact after approval ----
const aList = (await call('GET', '/sessions', null, ta)).data.find((s) => s._id === sid);
check('after approval the learner sees the teacher WhatsApp number (and no raw profile numbers)',
  aList.contactWhatsapp === '919876543210' && aList.teacher.whatsapp === undefined && aList.learner.whatsapp === undefined);
check('the teacher sees no number when the learner has not shared one', acc.data.contactWhatsapp === '');
check('whatsapp number is never exposed on public profiles', (await call('GET', `/users/${idb}`)).data.user.whatsapp === undefined);
const m1 = await call('POST', `/sessions/${sid}/messages`, { text: 'Hi, ready for STL?' }, ta);
const m2 = await call('POST', `/sessions/${sid}/messages`, { text: 'Yes, see you then.' }, tb);
check('both people can chat after approval', m1.status === 201 && m2.status === 201);
const thread = await call('GET', `/sessions/${sid}/messages`, null, tb);
check('chat history is ordered', thread.data.length === 2 && thread.data[0].text === 'Hi, ready for STL?' && thread.data[1].from === idb);
check('empty message rejected', (await call('POST', `/sessions/${sid}/messages`, { text: '   ' }, ta)).status === 400);
check('a third person cannot read or write the chat',
  (await call('GET', `/sessions/${sid}/messages`, null, tc)).status === 404 && (await call('POST', `/sessions/${sid}/messages`, { text: 'hey' }, tc)).status === 404);
check('chat needs login', (await call('GET', `/sessions/${sid}/messages`)).status === 401);

check('double-booking the same slot is blocked', (await call('POST', '/sessions', { teacherId: idb, skill: 'C++', startsAt }, ta)).status === 409);
check('review before completion rejected', (await call('POST', '/reviews', { sessionId: sid, rating: 5 }, ta)).status === 400);
check('teacher cannot complete', (await call('PATCH', `/sessions/${sid}`, { action: 'complete' }, tb)).status === 403);
check('learner completes session', (await call('PATCH', `/sessions/${sid}`, { action: 'complete' }, ta)).data.status === 'completed');

check('learner reviews teacher', (await call('POST', '/reviews', { sessionId: sid, rating: 5, comment: 'great' }, ta)).status === 201);
check('duplicate review rejected', (await call('POST', '/reviews', { sessionId: sid, rating: 4 }, ta)).status === 409);
await call('POST', '/reviews', { sessionId: sid, rating: 4 }, tb);
check('teacher rating updated', (await call('GET', '/auth/me', null, tb)).data.ratingAvg === 5);

const prog = await call('GET', '/progress', null, ta);
check('progress tracker created with the booked topic', prog.data.length === 1 && prog.data[0].topics.map((t) => t.title).join() === 'STL', JSON.stringify(prog.data));
const pid = prog.data[0]._id;
const added = await call('POST', `/progress/${pid}/topics`, { title: 'Pointers' }, ta);
const pointers = added.data.topics.find((t) => t.title === 'Pointers');
const ticked = await call('PATCH', `/progress/${pid}/topics/${pointers._id}`, { done: true }, tb);
check('topic added and ticked (both users can edit)', ticked.data.topics.find((t) => t.title === 'Pointers').done === true);

// ---- study together (1-to-1, sit and learn live) ----
const sp = await call('POST', '/study', { subject: 'DSA', topics: ['Arrays', 'DP', ' '], note: 'Live problem solving' }, ta);
check('study request created, blank topics dropped', sp.status === 201 && sp.data.topics.length === 2);
check('study request needs a subject', (await call('POST', '/study', { subject: ' ' }, ta)).status === 400);
const board = await call('GET', '/study?q=arrays', null, tb);
check('other student sees it on the study board (search by topic)', board.data.some((p) => p._id === sp.data._id && p.overlapHours > 0));
const gBoard = await call('GET', '/study?q=arrays');
check('guests can see the study board with shortened names', gBoard.data.some((p) => p._id === sp.data._id && p.owner.name === 'Test A.' && p.overlapHours === null));
check('own request hidden from own board', !(await call('GET', '/study', null, ta)).data.some((p) => p._id === sp.data._id));

const s2 = slots.data[1].startsAt;
const cs = await call('POST', '/sessions', { kind: 'costudy', postId: sp.data._id, startsAt: s2, durationHours: 2 }, tb);
check('study-together requested', cs.status === 201 && cs.data.kind === 'costudy' && cs.data.skill === 'DSA', JSON.stringify(cs.data));
check('cannot request the same study plan twice', (await call('POST', '/sessions', { kind: 'costudy', postId: sp.data._id, startsAt: s2, durationHours: 2 }, tb)).status === 409);
check('cannot join own study request', (await call('POST', '/sessions', { kind: 'costudy', postId: sp.data._id, startsAt: s2 }, ta)).status === 400);
const csId = cs.data._id;
const csAccept = await call('PATCH', `/sessions/${csId}`, { action: 'accept', meetingLink: 'https://meet.google.com/xyz-wxyz-uvw' }, ta);
check('host accepts study-together and can attach a link at the same time', csAccept.data.status === 'accepted' && csAccept.data.meetingLink === 'https://meet.google.com/xyz-wxyz-uvw');
const prog2 = (await call('GET', '/progress', null, tb)).data.find((p) => p.kind === 'costudy');
check('study tracker pre-filled with the request topics', prog2 && prog2.topics.map((t) => t.title).join() === 'Arrays,DP', JSON.stringify(prog2));
check('either person can complete a study-together', (await call('PATCH', `/sessions/${csId}`, { action: 'complete' }, ta)).data.status === 'completed');

const stats = await call('GET', '/sessions/stats', null, ta);
check('stats: 1h learned, 2h studied together', stats.data.hoursLearned === 1 && stats.data.hoursStudiedTogether === 2, JSON.stringify(stats.data));
check('owner can close a study request', (await call('PATCH', `/study/${sp.data._id}`, { status: 'closed' }, ta)).data.status === 'closed');
check('closed request cannot be joined', (await call('POST', '/sessions', { kind: 'costudy', postId: sp.data._id, startsAt: slots.data[2].startsAt }, tb)).status === 404);

// ---- reports ----
const spOpen = await call('POST', '/study', { subject: 'Reportable', topics: [] }, ta);
check('invalid report reason rejected', (await call('POST', '/reports', { targetType: 'studypost', targetId: spOpen.data._id, reason: 'because' }, tb)).status === 400);
check('a student can report a study request', (await call('POST', '/reports', { targetType: 'studypost', targetId: spOpen.data._id, reason: 'spam', details: 'looks like an ad' }, tb)).status === 201);
check('the same item cannot be reported twice while open', (await call('POST', '/reports', { targetType: 'studypost', targetId: spOpen.data._id, reason: 'spam' }, tb)).status === 409);
check('you cannot report yourself', (await call('POST', '/reports', { targetType: 'user', targetId: ida, reason: 'spam' }, ta)).status === 400);
check('reporting requires a login', (await call('POST', '/reports', { targetType: 'user', targetId: idb, reason: 'spam' })).status === 401);
check('a student can report a profile', (await call('POST', '/reports', { targetType: 'user', targetId: idc, reason: 'fake' }, ta)).status === 201);

// ---- account: password change ----
check('password change needs the current password', (await call('PUT', '/auth/password', { currentPassword: 'wrong', newPassword: 'newsecret1' }, ta)).status === 400);
check('new password must be 6+ characters', (await call('PUT', '/auth/password', { currentPassword: 'secret12', newPassword: '123' }, ta)).status === 400);
check('password can be changed', (await call('PUT', '/auth/password', { currentPassword: 'secret12', newPassword: 'newsecret1' }, ta)).status === 200);
check('the old password stops working and the new one works',
  (await call('POST', '/auth/login', { email: `a${stamp}@bitmesra.ac.in`, password: 'secret12' })).status === 401 &&
  (await call('POST', '/auth/login', { email: `a${stamp}@bitmesra.ac.in`, password: 'newsecret1' })).status === 200);

// ---- admin panel ----
check('normal users cannot use admin routes', (await call('GET', '/admin/stats', null, ta)).status === 403);
check('guests cannot use admin routes', (await call('GET', '/admin/stats')).status === 401);

const adminEmail = process.env.ADMIN_TEST_EMAIL || 'admin-test@example.com';
let adm = await call('POST', '/auth/register', { name: 'Test Admin', email: adminEmail, password: 'secret12', ...academic });
if (adm.status === 409) adm = await call('POST', '/auth/login', { email: adminEmail, password: 'secret12' });
const tadm = adm.data.token;
const adminOn = adm.data.user?.role === 'admin';
if (!adminOn) console.log(`SKIP  admin tests: ${adminEmail} is not listed in the server's ADMIN_EMAILS`);

if (adminOn) {
  check('an account listed in ADMIN_EMAILS is an administrator', adm.data.user.role === 'admin');
  const st = await call('GET', '/admin/stats', null, tadm);
  check('admin overview returns counts, top skills and trends',
    st.status === 200 && st.data.users.total >= 4 && Array.isArray(st.data.topSkills) && st.data.signups.length === 14 && typeof st.data.reportsOpen === 'number', JSON.stringify(st.data).slice(0, 200));
  const ul = await call('GET', `/admin/users?q=${stamp}`, null, tadm);
  check('admin can search users', ul.data.total >= 3 && ul.data.users.every((u) => u.email && u.password === undefined));
  const ud = await call('GET', `/admin/users/${idb}`, null, tadm);
  check('admin can open a user (no password hash)', ud.data.user.email === `b${stamp}@bitmesra.ac.in` && ud.data.user.password === undefined && ud.data.stats.sessions >= 1);

  // reports
  const reps = await call('GET', '/admin/reports?status=open', null, tadm);
  const rep = reps.data.find((r) => r.targetType === 'studypost' && String(r.target?._id) === spOpen.data._id);
  check('admin sees the report with a preview of what was reported', rep && rep.reporter.name === 'Test b' && rep.target.subject === 'Reportable', JSON.stringify(rep));
  check('admin can resolve a report', (await call('PATCH', `/admin/reports/${rep._id}`, { status: 'resolved', adminNote: 'removed' }, tadm)).data.status === 'resolved');
  check('admin can delete a reported study request', (await call('DELETE', `/admin/studyposts/${spOpen.data._id}`, null, tadm)).status === 200);

  // suspension
  check('admin cannot suspend or demote themselves',
    (await call('PATCH', `/admin/users/${adm.data.user._id}`, { status: 'suspended' }, tadm)).status === 400 &&
    (await call('PATCH', `/admin/users/${adm.data.user._id}`, { role: 'user' }, tadm)).status === 400);
  check('admin can suspend a user', (await call('PATCH', `/admin/users/${idc}`, { status: 'suspended' }, tadm)).data.status === 'suspended');
  const cMe = await call('GET', '/auth/me', null, tc);
  check('a suspended user is locked out immediately, even with a valid token', cMe.status === 403 && cMe.data.code === 'suspended');
  check('a suspended user cannot log in', (await call('POST', '/auth/login', { email: `c${stamp}@bitmesra.ac.in`, password: 'secret12' })).status === 403);
  check('a suspended user disappears from public profiles', (await call('GET', `/users/${idc}`)).status === 404);
  check('admin can reactivate them', (await call('PATCH', `/admin/users/${idc}`, { status: 'active' }, tadm)).data.status === 'active');
  check('the reactivated user can use the app again', (await call('GET', '/auth/me', null, tc)).status === 200);

  // password reset without email
  const reset = await call('POST', `/admin/users/${idc}/reset-password`, null, tadm);
  check('admin can issue a temporary password', typeof reset.data.temporaryPassword === 'string' && reset.data.temporaryPassword.length >= 8);
  check('the temporary password works and the old one does not',
    (await call('POST', '/auth/login', { email: `c${stamp}@bitmesra.ac.in`, password: reset.data.temporaryPassword })).status === 200 &&
    (await call('POST', '/auth/login', { email: `c${stamp}@bitmesra.ac.in`, password: 'secret12' })).status === 401);

  // skills moderation
  const sk = await call('GET', `/admin/skills?q=Spoken`, null, tadm);
  check('admin can list skills', sk.data.skills.some((s) => s.userId === idb && s.name === 'Spoken English'));
  check('admin can remove a skill', (await call('DELETE', `/admin/skills/${idb}/${encodeURIComponent('Spoken English')}`, null, tadm)).status === 200 &&
    (await call('GET', `/users/${idb}`, null, tadm)).data.user.offered.length === 1);

  // settings: everything that used to be hardcoded
  const original = (await call('GET', '/admin/config', null, tadm)).data;
  check('admin can read the settings', original.categories.length > 0 && original.meetingHosts.includes('meet.google.com'));
  check('settings reject invalid meeting hosts', (await call('PUT', '/admin/config', { meetingHosts: ['not a domain'] }, tadm)).status === 400);
  check('settings cannot be emptied', (await call('PUT', '/admin/config', { categories: [] }, tadm)).status === 400);
  check('normal users cannot change settings', (await call('PUT', '/admin/config', { categories: ['X'] }, ta)).status === 403);
  const upd = await call('PUT', '/admin/config', {
    categories: [...original.categories, `Test Category ${stamp}`],
    programmes: [...original.programmes, `TestProg ${stamp}`],
    announcement: { text: 'Scheduled maintenance tonight', active: true },
    allowedEmailDomains: ['@Example.EDU'],
  }, tadm);
  check('settings save and are cleaned (domain lowercased, @ stripped)', upd.status === 200 && upd.data.allowedEmailDomains.join() === 'example.edu', JSON.stringify(upd.data));
  const pub = (await call('GET', '/config')).data;
  check('new category, programme and announcement appear on the public config',
    pub.categories.includes(`Test Category ${stamp}`) && pub.programmes.includes(`TestProg ${stamp}`) && pub.announcement === 'Scheduled maintenance tonight');
  check('signup domain restriction from Settings is enforced',
    (await call('POST', '/auth/register', { name: 'Nope', email: `nope${stamp}@gmail.com`, password: 'secret12', ...academic })).status === 400);
  check('a newly added programme is accepted at signup',
    (await call('POST', '/auth/register', { name: 'Fresh', email: `fresh${stamp}@example.edu`, password: 'secret12', ...academic, programme: `TestProg ${stamp}` })).status === 201);
  const freshLogin = await call('POST', '/auth/login', { email: `fresh${stamp}@example.edu`, password: 'secret12' });
  check('a newly added category is accepted on skills',
    (await call('PUT', '/users/profile', { offered: [{ name: 'Testing', category: `Test Category ${stamp}` }] }, freshLogin.data.token)).data.offered[0].category === `Test Category ${stamp}`);
  // restore the original settings
  const restored = await call('PUT', '/admin/config', {
    categories: original.categories, programmes: original.programmes, allowedEmailDomains: original.allowedEmailDomains, announcement: original.announcement,
  }, tadm);
  check('settings restored', restored.status === 200 && !restored.data.categories.includes(`Test Category ${stamp}`));
  await call('DELETE', '/auth/me', { password: 'secret12' }, freshLogin.data.token);

  // reviews & ratings
  const rv = await call('GET', '/admin/reviews', null, tadm);
  const rvA = rv.data.find((r) => r.from && r.to && r.from.name === 'Test a' && r.to.name === 'Test b');
  check('admin can list reviews', !!rvA);
  await call('DELETE', `/admin/reviews/${rvA._id}`, null, tadm);
  const bAfter = await call('GET', '/auth/me', null, tb);
  check('deleting a review recalculates the rating', bAfter.data.ratingCount === 0 && bAfter.data.ratingAvg === 0, JSON.stringify(bAfter.data));

  // activity log
  const logs = await call('GET', '/admin/logs', null, tadm);
  check('admin actions are logged', logs.data.length >= 5 && logs.data.some((l) => l.action === 'Updated settings' && l.adminName === 'Test Admin'));

  // deleting a user removes everything attached
  check('admin can delete a user and their data', (await call('DELETE', `/admin/users/${idc}`, null, tadm)).status === 200);
  check('the deleted user can no longer log in', (await call('POST', '/auth/login', { email: `c${stamp}@bitmesra.ac.in`, password: reset.data.temporaryPassword })).status === 401);
  check('admin cannot delete themselves from the panel', (await call('DELETE', `/admin/users/${adm.data.user._id}`, null, tadm)).status === 400);
  check('demo-data removal is admin-only', (await call('DELETE', '/admin/demo-data', null, ta)).status === 403);
}

// ---- delete my account (also cleans up everything this test created) ----
check('deleting an account needs the password', (await call('DELETE', '/auth/me', { password: 'wrong' }, tb)).status === 400);
check('a user can delete their own account', (await call('DELETE', '/auth/me', { password: 'secret12' }, tb)).status === 200);
check('the deleted account is gone (token no longer works)', (await call('GET', '/auth/me', null, tb)).status === 401);
check("the other person's sessions with them are removed too", (await call('GET', '/sessions', null, ta)).data.every((s) => s.teacher._id !== idb && s.learner._id !== idb));
await call('DELETE', '/auth/me', { password: 'newsecret1' }, ta);
await call('DELETE', '/auth/me', { password: 'secret12' }, anyMail.data.token);
await call('DELETE', '/auth/me', { password: 'secret12' }, tc);
if (adminOn) check('an admin listed in ADMIN_EMAILS can delete their own account', (await call('DELETE', '/auth/me', { password: 'secret12' }, tadm)).status === 200);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
