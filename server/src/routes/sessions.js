import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Review from '../models/Review.js';
import Progress from '../models/Progress.js';
import StudyPost from '../models/StudyPost.js';
import { auth } from '../middleware/auth.js';
import { norm } from '../utils/matching.js';
import { getConfig } from '../utils/config.js';
import { normalizeMeetingLink } from '../utils/meeting.js';

const router = Router();

const endOf = (s) => new Date(s.startsAt.getTime() + s.durationHours * 3600000);

// True if `userId` already has an accepted session overlapping [start, end).
async function hasConflict(userId, start, end, ignoreId) {
  const sessions = await Session.find({
    status: 'accepted',
    _id: { $ne: ignoreId },
    $or: [{ teacher: userId }, { learner: userId }],
  });
  return sessions.some((s) => s.startsAt < end && endOf(s) > start);
}

const PERSON = 'name programme department year ratingAvg whatsapp';
const populate = (q) => q.populate('teacher', PERSON).populate('learner', PERSON);

// Contact details unlock only after approval, and only the OTHER person's number is returned to you.
const CONTACT_OPEN = ['accepted', 'completed'];
function shape(session, meId) {
  const s = session.toObject ? session.toObject() : session;
  const other = String(s.teacher._id) === String(meId) ? s.learner : s.teacher;
  s.contactWhatsapp = CONTACT_OPEN.includes(s.status) ? other.whatsapp || '' : '';
  delete s.teacher.whatsapp;
  delete s.learner.whatsapp;
  return s;
}

// Request a session. I am always the one asking (the "learner" / the joiner).
//   kind 'learn'   -> { teacherId, skill, startsAt }   learn a skill from someone who teaches it
//   kind 'costudy' -> { postId, startsAt }             join someone's study-together request
router.post('/', auth, async (req, res) => {
  const { kind = 'learn', teacherId, postId, skill, startsAt, note } = req.body;
  const durationHours = Number(req.body.durationHours || 1);

  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 4) {
    return res.status(400).json({ message: 'Duration must be 1-4 hours' });
  }
  const start = new Date(startsAt);
  if (isNaN(start) || start <= new Date()) return res.status(400).json({ message: 'Pick a future date and time' });

  let host;
  let subject;
  let topic = '';
  let post = null;

  if (kind === 'costudy') {
    if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ message: 'Invalid study request' });
    post = await StudyPost.findById(postId);
    if (!post || post.status !== 'open') return res.status(404).json({ message: 'This study request is closed' });
    host = await User.findById(post.owner);
    subject = post.subject;
    const already = await Session.findOne({
      post: post._id, learner: req.user._id, status: { $in: ['pending', 'accepted'] },
    });
    if (already) return res.status(409).json({ message: 'You already have an active request for this study plan' });
  } else if (kind === 'learn') {
    if (!mongoose.isValidObjectId(teacherId)) return res.status(400).json({ message: 'Invalid teacher' });
    host = await User.findById(teacherId);
    if (!host) return res.status(404).json({ message: 'Teacher not found' });
    const offered = host.offered.find((s) => norm(s.name) === norm(skill || ''));
    if (!offered) return res.status(400).json({ message: `${host.name} does not teach "${skill}"` });
    subject = offered.name;
    // Optional: learn one specific topic of the skill (e.g. DSA -> Graphs).
    topic = String(req.body.topic || '').trim().slice(0, 60);
    if (topic && offered.topics.length) {
      const listed = offered.topics.find((t) => norm(t) === norm(topic));
      if (!listed) return res.status(400).json({ message: `${host.name} does not list "${topic}" under ${offered.name}` });
      topic = listed; // keep the teacher's spelling
    }
  } else {
    return res.status(400).json({ message: 'Unknown session kind' });
  }

  if (!host || host.status !== 'active') return res.status(404).json({ message: 'User not found' });
  if (String(host._id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot book yourself' });

  const end = new Date(start.getTime() + durationHours * 3600000);
  if ((await hasConflict(host._id, start, end)) || (await hasConflict(req.user._id, start, end))) {
    return res.status(409).json({ message: 'One of you already has a session at that time' });
  }

  const session = await Session.create({
    kind,
    teacher: host._id,
    learner: req.user._id,
    post: post?._id,
    skill: subject,
    topic,
    startsAt: start,
    durationHours,
    note: String(note || '').slice(0, 300),
  });
  res.status(201).json(shape(await populate(Session.findById(session._id)), req.user._id));
});

// Sessions I'm part of, plus whether I've already reviewed each one.
router.get('/', auth, async (req, res) => {
  const sessions = await populate(
    Session.find({ $or: [{ teacher: req.user._id }, { learner: req.user._id }] }).sort({ startsAt: -1 })
  );
  const reviewed = await Review.find({ from: req.user._id, session: { $in: sessions.map((s) => s._id) } }).select('session');
  const reviewedSet = new Set(reviewed.map((r) => String(r.session)));
  res.json(sessions.map((s) => ({ ...shape(s, req.user._id), reviewedByMe: reviewedSet.has(String(s._id)) })));
});

// Dashboard numbers.
router.get('/stats', auth, async (req, res) => {
  const me = String(req.user._id);
  const mine = { $or: [{ teacher: req.user._id }, { learner: req.user._id }] };
  const done = await Session.find({ status: 'completed', ...mine });
  const sum = (list) => list.reduce((n, s) => n + s.durationHours, 0);
  const learn = done.filter((s) => s.kind !== 'costudy');
  res.json({
    hoursTaught: sum(learn.filter((s) => String(s.teacher) === me)),
    hoursLearned: sum(learn.filter((s) => String(s.learner) === me)),
    hoursStudiedTogether: sum(done.filter((s) => s.kind === 'costudy')),
    upcoming: await Session.countDocuments({ status: 'accepted', startsAt: { $gte: new Date() }, ...mine }),
    pendingForMe: await Session.countDocuments({ status: 'pending', teacher: req.user._id }),
    ratingAvg: req.user.ratingAvg,
    ratingCount: req.user.ratingCount,
  });
});

// Add, change or clear the meeting link (Google Meet, Zoom, JioMeet...). Either person, while the session is accepted.
router.patch('/:id/link', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid session id' });
  const session = await Session.findById(req.params.id);
  const me = String(req.user._id);
  if (!session || (String(session.teacher) !== me && String(session.learner) !== me)) {
    return res.status(404).json({ message: 'Session not found' });
  }
  if (session.status !== 'accepted') return res.status(400).json({ message: 'A meeting link can be set only on an accepted session' });
  const meeting = normalizeMeetingLink(req.body.link, (await getConfig()).meetingHosts);
  if (meeting.error) return res.status(400).json({ message: meeting.error });
  session.meetingLink = meeting.link;
  await session.save();
  res.json(shape(await populate(Session.findById(session._id)), req.user._id));
});

// accept / decline (host or teacher) | cancel (either) | complete (learner; either person for study-together)
router.patch('/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid session id' });
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ message: 'Session not found' });

  const me = String(req.user._id);
  const isTeacher = String(session.teacher) === me;
  const isLearner = String(session.learner) === me;
  if (!isTeacher && !isLearner) return res.status(403).json({ message: 'Not your session' });

  const { action } = req.body;
  const bad = (message, code = 400) => res.status(code).json({ message });

  if (action === 'accept' || action === 'decline') {
    if (!isTeacher) return bad('Only the person who received the request can do this', 403);
    if (session.status !== 'pending') return bad('Only pending requests can be accepted or declined');
    if (action === 'decline') {
      session.status = 'declined';
    } else {
      if (session.startsAt <= new Date()) return bad('This slot is already in the past');
      if (await hasConflict(session.teacher, session.startsAt, endOf(session), session._id)) {
        return bad('You already have an accepted session at that time', 409);
      }
      if (await hasConflict(session.learner, session.startsAt, endOf(session), session._id)) {
        return bad('The other person already has a session at that time', 409);
      }
      // A meeting link is optional at this point; either person can add one later (see PATCH /:id/link).
      const cfg = await getConfig();
      const meeting = normalizeMeetingLink(req.body.meetingLink, cfg.meetingHosts);
      if (meeting.error) return bad(meeting.error);
      session.status = 'accepted';
      session.meetingLink = meeting.link;

      // Progress tracker; study-together starts with the topics from the study request.
      let topics = [];
      if (session.kind === 'costudy' && session.post) {
        const post = await StudyPost.findById(session.post);
        topics = (post?.topics || []).map((title) => ({ title }));
      }
      await Progress.updateOne(
        { learner: session.learner, teacher: session.teacher, skill: session.skill },
        { $setOnInsert: { topics, kind: session.kind } },
        { upsert: true }
      );
      // A booked topic becomes a checklist item (once).
      if (session.topic) {
        await Progress.updateOne(
          { learner: session.learner, teacher: session.teacher, skill: session.skill, 'topics.title': { $ne: session.topic } },
          { $push: { topics: { title: session.topic } } }
        );
      }
    }
  } else if (action === 'cancel') {
    if (!['pending', 'accepted'].includes(session.status)) return bad('This session can no longer be cancelled');
    session.status = 'cancelled';
  } else if (action === 'complete') {
    const allowed = session.kind === 'costudy' ? isTeacher || isLearner : isLearner;
    if (!allowed) return bad('The learner confirms completion', 403);
    if (session.status !== 'accepted') return bad('Only accepted sessions can be completed');
    session.status = 'completed';
  } else {
    return bad('Unknown action');
  }

  await session.save();
  res.json(shape(await populate(Session.findById(session._id)), req.user._id));
});

export default router;
