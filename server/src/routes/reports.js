import { Router } from 'express';
import mongoose from 'mongoose';
import Report, { REPORT_REASONS, REPORT_TARGETS } from '../models/Report.js';
import User from '../models/User.js';
import StudyPost from '../models/StudyPost.js';
import Review from '../models/Review.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Tell the administrators about a profile, a study request or a review.
router.post('/', auth, async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  const details = String(req.body.details || '').trim().slice(0, 500);
  if (!REPORT_TARGETS.includes(targetType) || !mongoose.isValidObjectId(targetId)) {
    return res.status(400).json({ message: 'Invalid report' });
  }
  if (!REPORT_REASONS.includes(reason)) return res.status(400).json({ message: 'Choose a reason' });

  const model = { user: User, studypost: StudyPost, review: Review }[targetType];
  const target = await model.findById(targetId);
  if (!target) return res.status(404).json({ message: 'That item no longer exists' });
  const ownerId = targetType === 'user' ? target._id : targetType === 'studypost' ? target.owner : target.from;
  if (String(ownerId) === String(req.user._id)) return res.status(400).json({ message: 'You cannot report yourself' });

  if (await Report.findOne({ reporter: req.user._id, targetType, targetId, status: 'open' })) {
    return res.status(409).json({ message: 'You have already reported this. The administrators will review it.' });
  }
  // Basic flood guard so the queue cannot be spammed.
  if ((await Report.countDocuments({ reporter: req.user._id, createdAt: { $gte: new Date(Date.now() - 3600000) } })) >= 10) {
    return res.status(429).json({ message: 'Too many reports in the last hour. Please try again later.' });
  }
  await Report.create({ reporter: req.user._id, targetType, targetId, reason, details });
  res.status(201).json({ message: 'Thank you. The administrators will review your report.' });
});

export default router;
