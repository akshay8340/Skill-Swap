import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { auth, optionalAuth, maskName } from '../middleware/auth.js';
import { LEVELS } from '../constants.js';
import { getConfig, departmentNames } from '../utils/config.js';

const router = Router();

const uniqueStrings = (list, max, len) => {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map((s) => String(s ?? '').trim().slice(0, len))
    .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .slice(0, max);
};

function cleanSkills(list, categories) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map((s) => {
      const paid = Boolean(s?.paid);
      return {
        name: String(s?.name || '').trim().slice(0, 60),
        category: categories.includes(s?.category) ? s.category : categories.includes('Other') ? 'Other' : categories[0],
        level: LEVELS.includes(s?.level) ? s.level : 'Intermediate',
        topics: uniqueStrings(s?.topics, 15, 40),
        paid,
        price: paid ? String(s?.price || '').trim().slice(0, 30) : '',
      };
    })
    .filter((s) => s.name && !seen.has(s.name.toLowerCase()) && seen.add(s.name.toLowerCase()));
}

function cleanAvailability(list) {
  return (Array.isArray(list) ? list : [])
    .map((a) => ({ day: Number(a?.day), start: Number(a?.start), end: Number(a?.end) }))
    .filter(
      (a) =>
        Number.isInteger(a.day) && a.day >= 0 && a.day <= 6 &&
        Number.isInteger(a.start) && a.start >= 0 && a.start <= 23 &&
        Number.isInteger(a.end) && a.end >= 1 && a.end <= 24 &&
        a.start < a.end
    );
}

router.put('/profile', auth, async (req, res) => {
  const { name, bio, programme, department, year, offered, wanted, availability, whatsapp } = req.body;
  const user = req.user;
  const cfg = await getConfig();
  if (whatsapp !== undefined) {
    const digits = String(whatsapp).replace(/[\s\-().+]/g, '');
    if (digits && !/^\d{11,15}$/.test(digits)) {
      return res.status(400).json({ message: 'Enter your WhatsApp number with the country code, for example +91 98765 43210' });
    }
    user.whatsapp = digits;
  }
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ message: 'Name cannot be empty' });
    user.name = String(name).trim();
  }
  if (bio !== undefined) user.bio = String(bio).slice(0, 300);
  if (programme !== undefined) {
    if (!cfg.programmes.includes(programme)) return res.status(400).json({ message: 'Invalid programme' });
    user.programme = programme;
  }
  if (department !== undefined) {
    if (!departmentNames(cfg).includes(department)) return res.status(400).json({ message: 'Invalid department' });
    user.department = department;
  }
  if (year !== undefined) {
    if (!Number.isInteger(Number(year)) || year < 1 || year > 5) return res.status(400).json({ message: 'Invalid year' });
    user.year = Number(year);
  }
  if (offered !== undefined) user.offered = cleanSkills(offered, cfg.categories);
  if (wanted !== undefined) user.wanted = uniqueStrings(wanted, 30, 60);
  if (availability !== undefined) user.availability = cleanAvailability(availability);
  await user.save();
  const obj = user.toObject();
  delete obj.password;
  res.json(obj);
});

// Public profile. This is the one place the free/paid label and price are shown.
// Open to guests. A guest sees a shortened name and no bio or wishlist; those need a login.
router.get('/:id', optionalAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
  const found = await User.findById(req.params.id).select('-password -email -availability -whatsapp');
  if (!found || (found.status === 'suspended' && req.user?.role !== 'admin')) return res.status(404).json({ message: 'User not found' });
  const reviews = await Review.find({ to: found._id }).sort({ createdAt: -1 }).limit(20).populate('from', 'name');

  const user = found.toObject();
  const guest = !req.user;
  if (guest) {
    user.name = maskName(user.name);
    user.bio = '';
    user.wanted = [];
  }
  res.json({
    user,
    guest,
    reviews: reviews.map((r) => ({
      ...r.toObject(),
      from: r.from ? { name: guest ? maskName(r.from.name) : r.from.name } : null,
    })),
  });
});

export default router;
