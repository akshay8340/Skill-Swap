import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { auth } from '../middleware/auth.js';
import { scoreMatch, suggestSlots } from '../utils/matching.js';

const router = Router();

// Ranked list of people I can learn from / teach.
router.get('/', auth, async (req, res) => {
  const others = await User.find({ _id: { $ne: req.user._id }, status: 'active' });
  const matches = others
    .map((o) => scoreMatch(req.user, o))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || Number(b.mutual) - Number(a.mutual));
  res.json(matches);
});

// Suggested common free slots between me and another user.
router.get('/:userId/slots', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ message: 'Invalid user id' });
  const other = await User.findById(req.params.userId);
  if (!other) return res.status(404).json({ message: 'User not found' });

  const ids = [req.user._id, other._id];
  const busy = await Session.find({
    status: { $in: ['pending', 'accepted'] },
    startsAt: { $gte: new Date() },
    $or: [{ teacher: { $in: ids } }, { learner: { $in: ids } }],
  });
  res.json(suggestSlots(req.user, other, busy));
});

export default router;
