import Config from '../models/Config.js';
import { DEFAULT_CONFIG } from '../constants.js';

let cache = null;
let cachedAt = 0;
const TTL = 15000; // other server instances pick up admin changes within this time

const envDomains = () =>
  (process.env.ALLOWED_EMAIL_DOMAIN || '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);

export async function getConfig() {
  if (cache && Date.now() - cachedAt < TTL) return cache;
  let doc = await Config.findById('main').lean();
  if (!doc) {
    // First start: copy the defaults into the database.
    try {
      const initial = { ...structuredClone(DEFAULT_CONFIG), allowedEmailDomains: envDomains() };
      doc = (await Config.create({ _id: 'main', ...initial })).toObject();
    } catch (e) {
      if (e.code !== 11000) throw e;
      doc = await Config.findById('main').lean(); // another instance created it first
    }
  }
  cache = doc;
  cachedAt = Date.now();
  return doc;
}

export async function updateConfig(patch) {
  await Config.updateOne({ _id: 'main' }, { $set: patch }, { upsert: true });
  cache = null;
  return getConfig();
}

export const departmentNames = (cfg) => cfg.departments.map((d) => d.name);

// Emails listed in ADMIN_EMAILS are administrators (set it in the host's environment).
export const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
export const isEnvAdmin = (email) => adminEmails().includes(String(email).toLowerCase());
