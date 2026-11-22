import { Router } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Session from '../models/Session.js';
import { auth } from '../middleware/auth.js';

// Mounted at /api/sessions/:id/messages
const router = Router({ mergeParams: true });

// Only the two people in a session, and only once it has been accepted (or completed, for follow-ups).
async function loadSession(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid session id' });
    return null;
  }
  const session = await Session.findById(req.params.id);
  const me = String(req.user._id);
  if (!session || (String(session.teacher) !== me && String(session.learner) !== me)) {
    res.status(404).json({ message: 'Session not found' });
    return null;
  }
  if (!['accepted', 'completed'].includes(session.status)) {
    res.status(403).json({ message: 'Chat opens once the session is accepted' });
    return null;
  }
  return session;
}

router.get('/', auth, async (req, res) => {
  const session = await loadSession(req, res);
  if (!session) return;
  const messages = await Message.find({ session: session._id }).sort({ createdAt: 1 }).limit(300);
  res.json(messages.map((m) => ({ _id: m._id, from: String(m.from), text: m.text, createdAt: m.createdAt })));
});

router.post('/', auth, async (req, res) => {
  const session = await loadSession(req, res);
  if (!session) return;
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ message: 'Write a message first' });
  if (text.length > 1000) return res.status(400).json({ message: 'Messages can be up to 1000 characters' });

  // Simple per-user flood limit (works behind shared campus IPs, unlike an IP-based limit).
  const recent = await Message.countDocuments({ from: req.user._id, createdAt: { $gte: new Date(Date.now() - 60000) } });
  if (recent >= 20) return res.status(429).json({ message: 'You are sending messages too quickly. Please wait a moment.' });

  const m = await Message.create({ session: session._id, from: req.user._id, text });
  res.status(201).json({ _id: m._id, from: String(m.from), text: m.text, createdAt: m.createdAt });
});

export default router;
