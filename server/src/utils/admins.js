import User from '../models/User.js';
import AdminLog from '../models/AdminLog.js';
import { isEnvAdmin } from './config.js';

// An administrator can be removed/demoted/suspended only if someone else can still administer,
// or they are listed in ADMIN_EMAILS (which re-grants access on their next login).
export async function canLoseAdmin(user) {
  if (isEnvAdmin(user.email)) return true;
  const others = await User.countDocuments({ role: 'admin', status: 'active', _id: { $ne: user._id } });
  return others > 0;
}

export function logAdmin(req, action, target = '', details = '') {
  return AdminLog.create({ admin: req.user._id, adminName: req.user.name, action, target: String(target).slice(0, 200), details: String(details).slice(0, 500) });
}
