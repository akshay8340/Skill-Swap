// Removes every demo account (isDemo: true) and all data attached to them. Safe on a live database:
// real users are never touched.   Usage:  npm run clear-demo
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { deleteUserData } from '../utils/cascade.js';

await mongoose.connect(process.env.MONGO_URI);
const ids = await User.find({ isDemo: true }).distinct('_id');
for (const id of ids) await deleteUserData(id);
console.log(ids.length ? `Removed ${ids.length} demo accounts and their data.` : 'No demo data found.');
await mongoose.disconnect();
