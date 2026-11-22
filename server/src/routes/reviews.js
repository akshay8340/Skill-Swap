import { Router } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Review the other person after a completed session.
router.post('/', auth, async (req, res) => {
  const { sessionId, comment } = req.body;
  const rating = Number(req.body.rating);
  if (!mongoose.isValidObjectId(sessionId)) return res.status(400).json({ message: 'Invalid session' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' });
  }

  const session = await Session.findById(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found' });
  const me = String(req.user._id);
  const isTeacher = String(session.teacher) === me;
  const isLearner = String(session.learner) === me;
  if (!isTeacher && !isLearner) return res.status(403).json({ message: 'Not your session' });
  if (session.status !== 'completed') return res.status(400).json({ message: 'You can review only after the session is completed' });

  const to = isTeacher ? session.learner : session.teacher;
  try {
    await Review.create({ session: session._id, from: req.user._id, to, rating, comment: String(comment || '').slice(0, 300) });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'You already reviewed this session' });
    throw e;
  }

  const [agg] = await Review.aggregate([
    { $match: { to } },
    { $group: { _id: '$to', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await User.updateOne({ _id: to }, { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.count });
  res.status(201).json({ message: 'Review submitted' });
});

export default router;
