import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Message from '../models/Message.js';
import Review from '../models/Review.js';
import StudyPost from '../models/StudyPost.js';
import Report from '../models/Report.js';
import AdminLog from '../models/AdminLog.js';
import { auth, requireAdmin } from '../middleware/auth.js';
import { getConfig, updateConfig } from '../utils/config.js';
import { canLoseAdmin, logAdmin } from '../utils/admins.js';
import { deleteUserData, recomputeRating } from '../utils/cascade.js';

const router = Router();
router.use(auth, requireAdmin);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const paging = (req, def = 20) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || def);
  return { page, limit, skip: (page - 1) * limit };
};
const badId = (res) => res.status(400).json({ message: 'Invalid id' });
const lastNDays = (n) => Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - 1 - i) * 864e5).toISOString().slice(0, 10));

async function perDay(Model, days) {
  const since = new Date(Date.now() - days * 864e5);
  const rows = await Model.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.n]));
  return lastNDays(days).map((date) => ({ date, count: map[date] || 0 }));
}

// ---------- overview ----------
router.get('/stats', async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const [users, suspended, admins, demo, newUsers, studyOpen, reviews, messages, reportsOpen, sessionsByStatus, topSkills, recentUsers, signups, sessions14] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isDemo: true }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      StudyPost.countDocuments({ status: 'open' }),
      Review.countDocuments(),
      Message.countDocuments(),
      Report.countDocuments({ status: 'open' }),
      Session.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      User.aggregate([
        { $unwind: '$offered' },
        { $group: { _id: { $toLower: '$offered.name' }, name: { $first: '$offered.name' }, teachers: { $sum: 1 } } },
        { $sort: { teachers: -1 } },
        { $limit: 8 },
      ]),
      User.find().sort({ createdAt: -1 }).limit(6).select('name email createdAt isDemo status role'),
      perDay(User, 14),
      perDay(Session, 14),
    ]);
  res.json({
    users: { total: users, suspended, admins, demo, newThisWeek: newUsers },
    sessions: Object.fromEntries(sessionsByStatus.map((s) => [s._id, s.n])),
    studyOpen, reviews, messages, reportsOpen,
    topSkills: topSkills.map((s) => ({ name: s.name, teachers: s.teachers })),
    recentUsers, signups, sessionsPerDay: sessions14,
  });
});

// ---------- users ----------
router.get('/users', async (req, res) => {
  const { q = '', role = '', status = '', demo = '' } = req.query;
  const filter = {};
  if (q.trim()) filter.$or = [{ name: new RegExp(esc(q.trim()), 'i') }, { email: new RegExp(esc(q.trim()), 'i') }];
  if (['user', 'admin'].includes(role)) filter.role = role;
  if (['active', 'suspended'].includes(status)) filter.status = status;
  if (demo === '1') filter.isDemo = true;
  const { page, limit, skip } = paging(req);
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .select('name email role status isDemo programme department year createdAt lastLoginAt ratingAvg ratingCount offered'),
  ]);
  res.json({
    total, page, pages: Math.max(1, Math.ceil(total / limit)),
    users: users.map((u) => ({ ...u.toObject(), skillCount: u.offered.length, offered: undefined })),
  });
});

async function loadUser(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { badId(res); return null; }
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return null; }
  return user;
}

router.get('/users/:id', async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  const id = user._id;
  const [sessions, reviewsReceived, studyPosts, reportsAgainst] = await Promise.all([
    Session.countDocuments({ $or: [{ teacher: id }, { learner: id }] }),
    Review.countDocuments({ to: id }),
    StudyPost.countDocuments({ owner: id }),
    Report.countDocuments({ targetType: 'user', targetId: id }),
  ]);
  const obj = user.toObject();
  delete obj.password;
  res.json({ user: obj, stats: { sessions, reviewsReceived, studyPosts, reportsAgainst } });
});

router.patch('/users/:id', async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  const self = String(user._id) === String(req.user._id);
  const { role, status } = req.body;
  const changes = [];

  if (role !== undefined && role !== user.role) {
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (self) return res.status(400).json({ message: 'You cannot change your own role' });
    if (user.role === 'admin' && !(await canLoseAdmin(user))) return res.status(400).json({ message: 'At least one administrator must remain' });
    user.role = role;
    changes.push(`role=${role}`);
  }
  if (status !== undefined && status !== user.status) {
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    if (self) return res.status(400).json({ message: 'You cannot suspend yourself' });
    if (status === 'suspended' && user.role === 'admin' && !(await canLoseAdmin(user))) return res.status(400).json({ message: 'At least one administrator must remain' });
    user.status = status;
    changes.push(`status=${status}`);
  }
  if (changes.length) {
    await user.save();
    await logAdmin(req, 'Updated user', `${user.name} <${user.email}>`, changes.join(', '));
  }
  const obj = user.toObject();
  delete obj.password;
  res.json(obj);
});

// No email service needed: the admin gets a temporary password to hand over personally.
router.post('/users/:id/reset-password', async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  const temp = crypto.randomBytes(9).toString('base64url');
  user.password = await bcrypt.hash(temp, 10);
  await user.save();
  await logAdmin(req, 'Reset password', `${user.name} <${user.email}>`);
  res.json({ temporaryPassword: temp });
});

router.delete('/users/:id', async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  if (String(user._id) === String(req.user._id)) return res.status(400).json({ message: 'Use "Delete my account" in your profile to remove yourself' });
  if (user.role === 'admin' && !(await canLoseAdmin(user))) return res.status(400).json({ message: 'At least one administrator must remain' });
  await deleteUserData(user._id);
  await logAdmin(req, 'Deleted user', `${user.name} <${user.email}>`, 'with all their sessions, chats, reviews and requests');
  res.json({ message: 'User deleted' });
});

// ---------- content moderation ----------
router.get('/skills', async (req, res) => {
  const q = (req.query.q || '').trim();
  const users = await User.find({ 'offered.0': { $exists: true } }).select('name email offered');
  const rows = [];
  for (const u of users) {
    for (const s of u.offered) {
      if (q && !new RegExp(esc(q), 'i').test(`${s.name} ${u.name} ${s.topics.join(' ')}`)) continue;
      rows.push({ userId: u._id, userName: u.name, email: u.email, name: s.name, category: s.category, level: s.level, topics: s.topics, paid: s.paid, price: s.price });
    }
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ total: rows.length, skills: rows.slice(0, 200) });
});

router.delete('/skills/:userId/:name', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return badId(res);
  const result = await User.updateOne({ _id: req.params.userId }, { $pull: { offered: { name: req.params.name } } });
  if (!result.modifiedCount) return res.status(404).json({ message: 'Skill not found' });
  await logAdmin(req, 'Removed skill', req.params.name, `from user ${req.params.userId}`);
  res.json({ message: 'Skill removed' });
});

router.get('/studyposts', async (req, res) => {
  const filter = {};
  if (['open', 'closed'].includes(req.query.status)) filter.status = req.query.status;
  const q = (req.query.q || '').trim();
  if (q) filter.subject = new RegExp(esc(q), 'i');
  const posts = await StudyPost.find(filter).sort({ createdAt: -1 }).limit(100).populate('owner', 'name email');
  res.json(posts);
});

router.patch('/studyposts/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
  const post = await StudyPost.findByIdAndUpdate(req.params.id, { status: req.body.status === 'open' ? 'open' : 'closed' }, { new: true });
  if (!post) return res.status(404).json({ message: 'Not found' });
  await logAdmin(req, `${post.status === 'open' ? 'Reopened' : 'Closed'} study request`, post.subject);
  res.json(post);
});

router.delete('/studyposts/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
  const post = await StudyPost.findByIdAndDelete(req.params.id);
  if (!post) return res.status(404).json({ message: 'Not found' });
  await Report.deleteMany({ targetType: 'studypost', targetId: post._id });
  await logAdmin(req, 'Deleted study request', post.subject);
  res.json({ message: 'Deleted' });
});

router.get('/reviews', async (req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 }).limit(100).populate('from', 'name').populate('to', 'name');
  res.json(reviews);
});

router.delete('/reviews/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) return res.status(404).json({ message: 'Not found' });
  await recomputeRating(review.to);
  await Report.deleteMany({ targetType: 'review', targetId: review._id });
  await logAdmin(req, 'Deleted review', `${review.rating} stars`, review.comment);
  res.json({ message: 'Deleted' });
});

// ---------- reports ----------
router.get('/reports', async (req, res) => {
  const filter = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? { status: req.query.status } : {};
  const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(100).populate('reporter', 'name email');
  const withTarget = await Promise.all(
    reports.map(async (r) => {
      let target = null;
      if (r.targetType === 'user') target = await User.findById(r.targetId).select('name email status');
      if (r.targetType === 'studypost') target = await StudyPost.findById(r.targetId).populate('owner', 'name email');
      if (r.targetType === 'review') target = await Review.findById(r.targetId).populate('from', 'name email');
      return { ...r.toObject(), target };
    })
  );
  res.json(withTarget);
});

router.patch('/reports/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
  const { status } = req.body;
  if (!['open', 'resolved', 'dismissed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status, adminNote: String(req.body.adminNote || '').slice(0, 500), handledBy: req.user._id },
    { new: true }
  );
  if (!report) return res.status(404).json({ message: 'Not found' });
  await logAdmin(req, `Report ${status}`, `${report.targetType} ${report.targetId}`, report.adminNote);
  res.json(report);
});

// ---------- settings (everything that used to be hardcoded) ----------
const cleanList = (v, max, len) => {
  const seen = new Set();
  return (Array.isArray(v) ? v : [])
    .map((x) => String(x ?? '').trim().slice(0, len))
    .filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()))
    .slice(0, max);
};
const cleanHost = (h) => String(h || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^@/, '').replace(/\/.*$/, '');
const HOST_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

router.get('/config', async (req, res) => {
  const { _id, createdAt, updatedAt, __v, ...config } = await getConfig();
  res.json(config);
});

router.put('/config', async (req, res) => {
  const b = req.body;
  const patch = {};
  const fail = (message) => res.status(400).json({ message });

  if (b.categories !== undefined) {
    patch.categories = cleanList(b.categories, 40, 40);
    if (!patch.categories.length) return fail('Keep at least one category');
  }
  if (b.programmes !== undefined) {
    patch.programmes = cleanList(b.programmes, 30, 30);
    if (!patch.programmes.length) return fail('Keep at least one programme');
  }
  if (b.departments !== undefined) {
    const seen = new Set();
    patch.departments = (Array.isArray(b.departments) ? b.departments : [])
      .map((d) => ({ name: String(d?.name || '').trim().slice(0, 60), short: String(d?.short || '').trim().slice(0, 12) }))
      .filter((d) => d.name && !seen.has(d.name.toLowerCase()) && seen.add(d.name.toLowerCase()))
      .slice(0, 60);
    if (!patch.departments.length) return fail('Keep at least one department');
  }
  if (b.topicSuggestions !== undefined) {
    patch.topicSuggestions = (Array.isArray(b.topicSuggestions) ? b.topicSuggestions : [])
      .map((t) => ({ keyword: String(t?.keyword || '').trim().toLowerCase().slice(0, 40), topics: cleanList(t?.topics, 25, 40) }))
      .filter((t) => t.keyword && t.topics.length)
      .slice(0, 80);
  }
  if (b.meetingHosts !== undefined) {
    patch.meetingHosts = cleanList((Array.isArray(b.meetingHosts) ? b.meetingHosts : []).map(cleanHost), 40, 80);
    if (patch.meetingHosts.some((h) => !HOST_RE.test(h))) return fail('Meeting hosts must be domain names, like meet.google.com');
    if (!patch.meetingHosts.length) return fail('Allow at least one meeting service');
  }
  if (b.allowedEmailDomains !== undefined) {
    patch.allowedEmailDomains = cleanList((Array.isArray(b.allowedEmailDomains) ? b.allowedEmailDomains : []).map(cleanHost), 20, 80);
    if (patch.allowedEmailDomains.some((h) => !HOST_RE.test(h))) return fail('Email domains must look like example.edu');
  }
  if (b.announcement !== undefined) {
    patch.announcement = { text: String(b.announcement?.text || '').trim().slice(0, 200), active: Boolean(b.announcement?.active) };
  }
  if (!Object.keys(patch).length) return fail('Nothing to update');

  const saved = await updateConfig(patch);
  await logAdmin(req, 'Updated settings', Object.keys(patch).join(', '));
  const { _id, createdAt, updatedAt, __v, ...config } = saved;
  res.json(config);
});

// ---------- activity & demo data ----------
router.get('/logs', async (req, res) => {
  res.json(await AdminLog.find().sort({ createdAt: -1 }).limit(100));
});

// Removes only users created by the seed script (isDemo) and everything attached to them. Real accounts are untouched.
router.delete('/demo-data', async (req, res) => {
  const ids = await User.find({ isDemo: true }).distinct('_id');
  for (const id of ids) await deleteUserData(id);
  await logAdmin(req, 'Removed demo data', `${ids.length} demo users`);
  res.json({ removed: ids.length });
});

export default router;
