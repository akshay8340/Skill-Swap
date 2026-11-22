import jwt from 'jsonwebtoken';
import User from '../models/User.js';

async function userFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  return User.findById(id);
}

// Required login. Suspended accounts are locked out immediately, even with a valid token.
export async function auth(req, res, next) {
  if (!(req.headers.authorization || '').startsWith('Bearer ')) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const user = await userFromRequest(req);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    if (user.status === 'suspended') {
      return res.status(403).json({ code: 'suspended', message: 'Your account has been suspended. Please contact the administrators.' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Login optional: browsing endpoints work for guests too. A bad token or suspended account is treated as a guest.
export async function optionalAuth(req, res, next) {
  try {
    const user = await userFromRequest(req);
    req.user = user && user.status === 'active' ? user : null;
  } catch {
    req.user = null;
  }
  next();
}

// Must be used after `auth`.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Administrators only' });
  next();
}

// Guests see "Riya S." instead of a full name.
export function maskName(name = '') {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0] || '';
}
