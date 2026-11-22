import { Router } from 'express';
import mongoose from 'mongoose';
import StudyPost from '../models/StudyPost.js';
import User from '../models/User.js';
import { auth, optionalAuth, maskName } from '../middleware/auth.js';
import { norm, overlapHours } from '../utils/matching.js';

const router = Router();

// Open study-together requests from other people, best schedule fit first.  ?q=dsa
// Open to guests (names are shortened for them).
router.get('/', optionalAuth, async (req, res) => {
  const me = req.user;
  const q = norm(req.query.q || '');
  const posts = await StudyPost.find({ status: 'open', ...(me ? { owner: { $ne: me._id } } : {}) })
    .sort({ createdAt: -1 })
    .populate('owner', 'name programme department year ratingAvg ratingCount availability status');
  const wanted = new Set((me?.wanted || []).map(norm));

  const list = posts
    .filter((p) => p.owner && p.owner.status === 'active' && (!q || norm(p.subject).includes(q) || p.topics.some((t) => norm(t).includes(q))))
    .map((p) => {
      const { availability, status, ...owner } = p.owner.toObject();
      if (!me) owner.name = maskName(owner.name);
      return {
        ...p.toObject(),
        owner,
        overlapHours: me ? overlapHours(me, p.owner) : null,
        wantedByMe: wanted.has(norm(p.subject)),
      };
    })
    .sort((a, b) => Number(b.wantedByMe) - Number(a.wantedByMe) || (b.overlapHours || 0) - (a.overlapHours || 0));
  res.json(list);
});

router.get('/mine', auth, async (req, res) => {
  res.json(await StudyPost.find({ owner: req.user._id }).sort({ createdAt: -1 }));
});

router.post('/', auth, async (req, res) => {
  const subject = String(req.body.subject || '').trim().slice(0, 60);
  if (!subject) return res.status(400).json({ message: 'Tell us what you want to study' });
  const topics = (Array.isArray(req.body.topics) ? req.body.topics : [])
    .map((t) => String(t).trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 12);
  if ((await StudyPost.countDocuments({ owner: req.user._id, status: 'open' })) >= 5) {
    return res.status(400).json({ message: 'You can have at most 5 open study requests. Close one first.' });
  }
  const post = await StudyPost.create({
    owner: req.user._id,
    subject,
    topics,
    note: String(req.body.note || '').slice(0, 300),
  });
  res.status(201).json(post);
});

// open <-> closed, only by the owner
router.patch('/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  const post = await StudyPost.findOne({ _id: req.params.id, owner: req.user._id });
  if (!post) return res.status(404).json({ message: 'Study request not found' });
  post.status = req.body.status === 'open' ? 'open' : 'closed';
  await post.save();
  res.json(post);
});

export default router;
