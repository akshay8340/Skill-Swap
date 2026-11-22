import { Router } from 'express';
import User from '../models/User.js';
import { optionalAuth, maskName } from '../middleware/auth.js';
import { norm, overlapHours } from '../utils/matching.js';
import { getConfig } from '../utils/config.js';

const router = Router();

// "What can I learn here?" - every skill other students offer. Open to guests (names are shortened for them);
// logged-in users also get their wishlist and schedule fit, which decide the order.
//   ?q=graphs   searches skill name, topics and teacher name      ?category=Programming
// Free/paid is intentionally not part of the list; it appears on the teacher's booking page.
router.get('/', optionalAuth, async (req, res) => {
  const me = req.user;
  const q = norm(req.query.q || '');
  const { category = '' } = req.query;
  const wanted = new Set((me?.wanted || []).map(norm));

  // Suspended accounts are not listed.
  const others = await User.find({ status: 'active', ...(me ? { _id: { $ne: me._id } } : {}) });
  const results = [];
  for (const u of others) {
    const overlap = me ? overlapHours(me, u) : null;
    for (const s of u.offered) {
      if (category && s.category !== category) continue;
      if (q && !norm(s.name).includes(q) && !norm(u.name).includes(q) && !s.topics.some((t) => norm(t).includes(q))) continue;
      results.push({
        skill: s.name,
        category: s.category,
        level: s.level,
        topics: s.topics,
        wantedByMe: wanted.has(norm(s.name)),
        overlapHours: overlap,
        teacher: {
          _id: u._id, name: me ? u.name : maskName(u.name), programme: u.programme, department: u.department, year: u.year,
          ratingAvg: u.ratingAvg, ratingCount: u.ratingCount,
        },
      });
    }
  }

  // Skills I asked for first, then people whose schedule fits mine, then better rated.
  results.sort(
    (a, b) =>
      Number(b.wantedByMe) - Number(a.wantedByMe) ||
      (b.overlapHours || 0) - (a.overlapHours || 0) ||
      b.teacher.ratingCount - a.teacher.ratingCount ||
      b.teacher.ratingAvg - a.teacher.ratingAvg
  );
  res.json({ results, categories: (await getConfig()).categories });
});

export default router;
