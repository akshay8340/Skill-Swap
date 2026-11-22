import { Router } from 'express';
import { getConfig } from '../utils/config.js';

const router = Router();

// Public: the lists the website needs (categories, programmes, ...). Edited by admins in Settings.
router.get('/', async (req, res) => {
  const c = await getConfig();
  res.setHeader('Cache-Control', 'no-cache');
  res.json({
    categories: c.categories,
    programmes: c.programmes,
    departments: c.departments,
    topicSuggestions: c.topicSuggestions,
    meetingHosts: c.meetingHosts,
    allowedEmailDomains: c.allowedEmailDomains,
    announcement: c.announcement?.active ? c.announcement.text : '',
  });
});

export default router;
