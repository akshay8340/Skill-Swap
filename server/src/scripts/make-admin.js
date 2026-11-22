// Makes an existing account an administrator.   Usage:  npm run make-admin -- someone@example.com
// (Alternative: list emails in the ADMIN_EMAILS environment variable.)
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const email = (process.argv[2] || '').toLowerCase().trim();
if (!email) {
  console.error('Usage: npm run make-admin -- someone@example.com');
  process.exit(1);
}
await mongoose.connect(process.env.MONGO_URI);
const user = await User.findOne({ email });
if (!user) {
  console.error(`No account with the email ${email}. Register it on the website first.`);
  process.exitCode = 1;
} else {
  user.role = 'admin';
  user.status = 'active';
  await user.save();
  console.log(`${user.name} <${user.email}> is now an administrator.`);
}
await mongoose.disconnect();
