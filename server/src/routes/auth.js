import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { getConfig, departmentNames, isEnvAdmin } from '../utils/config.js';
import { canLoseAdmin } from '../utils/admins.js';
import { deleteUserData } from '../utils/cascade.js';

const router = Router();

const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (user) => {
  const obj = user.toObject();
  delete obj.password;
  return obj;
};

router.post('/register', async (req, res) => {
  const { name, password, programme, department } = req.body;
  const email = String(req.body.email || '').toLowerCase().trim();
  const year = Number(req.body.year);
  const cfg = await getConfig();

  if (!name?.trim() || !email || !password || password.length < 6) {
    return res.status(400).json({ message: 'Name, email and a password of at least 6 characters are required' });
  }
  // Empty list = anyone can sign up; admins can restrict signups to certain email domains in Settings.
  const domains = cfg.allowedEmailDomains;
  if (domains.length && !domains.some((d) => email.endsWith('@' + d))) {
    return res.status(400).json({ message: `Registration is limited to ${domains.map((d) => '@' + d).join(' or ')} email addresses.` });
  }
  if (!cfg.programmes.includes(programme) || !departmentNames(cfg).includes(department) || !Number.isInteger(year) || year < 1 || year > 5) {
    return res.status(400).json({ message: 'Please choose your programme, department and year' });
  }
  if (await User.findOne({ email })) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }
  const user = await User.create({
    name: name.trim(),
    email,
    programme,
    department,
    year,
    role: isEnvAdmin(email) ? 'admin' : 'user',
    lastLoginAt: new Date(),
    password: await bcrypt.hash(password, 10),
  });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = email && (await User.findOne({ email: String(email).toLowerCase().trim() }));
  if (!user || !password || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ code: 'suspended', message: 'Your account has been suspended. Please contact the administrators.' });
  }
  if (user.role !== 'admin' && isEnvAdmin(user.email)) user.role = 'admin';
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get('/me', auth, (req, res) => res.json(publicUser(req.user)));

router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'The new password must be at least 6 characters' });
  if (!currentPassword || !(await bcrypt.compare(currentPassword, req.user.password))) {
    return res.status(400).json({ message: 'Your current password is incorrect' });
  }
  req.user.password = await bcrypt.hash(newPassword, 10);
  await req.user.save();
  res.json({ message: 'Password updated' });
});

// Delete my account and everything attached to it.
router.delete('/me', auth, async (req, res) => {
  if (!req.body.password || !(await bcrypt.compare(req.body.password, req.user.password))) {
    return res.status(400).json({ message: 'Your password is incorrect' });
  }
  if (req.user.role === 'admin' && !(await canLoseAdmin(req.user))) {
    return res.status(400).json({ message: 'You are the only administrator. Make someone else an admin before deleting your account.' });
  }
  await deleteUserData(req.user._id);
  res.json({ message: 'Your account has been deleted' });
});

export default router;
