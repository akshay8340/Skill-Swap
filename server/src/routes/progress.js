import { Router } from 'express';
import mongoose from 'mongoose';
import Progress from '../models/Progress.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Both teacher and learner of a tracker can add topics and tick them off.
async function loadMine(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid id' });
    return null;
  }
  const p = await Progress.findById(req.params.id);
  const me = String(req.user._id);
  if (!p || (String(p.learner) !== me && String(p.teacher) !== me)) {
    res.status(404).json({ message: 'Progress tracker not found' });
    return null;
  }
  return p;
}

const withNames = (q) => q.populate('teacher', 'name').populate('learner', 'name');

router.get('/', auth, async (req, res) => {
  const list = await withNames(
    Progress.find({ $or: [{ learner: req.user._id }, { teacher: req.user._id }] }).sort({ updatedAt: -1 })
  );
  res.json(list);
});

router.post('/:id/topics', auth, async (req, res) => {
  const p = await loadMine(req, res);
  if (!p) return;
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ message: 'Topic title is required' });
  p.topics.push({ title: title.slice(0, 120) });
  await p.save();
  res.status(201).json(await withNames(Progress.findById(p._id)));
});

router.patch('/:id/topics/:topicId', auth, async (req, res) => {
  const p = await loadMine(req, res);
  if (!p) return;
  const topic = p.topics.id(req.params.topicId);
  if (!topic) return res.status(404).json({ message: 'Topic not found' });
  topic.done = Boolean(req.body.done);
  await p.save();
  res.json(await withNames(Progress.findById(p._id)));
});

router.delete('/:id/topics/:topicId', auth, async (req, res) => {
  const p = await loadMine(req, res);
  if (!p) return;
  const topic = p.topics.id(req.params.topicId);
  if (!topic) return res.status(404).json({ message: 'Topic not found' });
  topic.deleteOne();
  await p.save();
  res.json(await withNames(Progress.findById(p._id)));
});

export default router;
