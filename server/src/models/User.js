import mongoose from 'mongoose';
import { LEVELS } from '../constants.js';

// Anything a student can teach: DSA, React, spoken English, guitar, backflips...
// `topics` lets a teacher offer specific parts (DSA -> Dynamic Programming, Graphs).
// `paid` is only a label shown on the booking page. Money, if any, is settled directly between the two people.
// Category / programme / department are validated against the lists the admins maintain (Config), not hardcoded here.
const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'Other' },
    level: { type: String, enum: LEVELS, default: 'Intermediate' },
    topics: { type: [String], default: [] },
    paid: { type: Boolean, default: false },
    price: { type: String, default: '', maxlength: 30 }, // free text, e.g. "₹200/hr"
  },
  { _id: false }
);

// Weekly recurring availability. day: 0 = Sunday ... 6 = Saturday. Hours are 0-24 (local time).
const availabilitySchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    start: { type: Number, min: 0, max: 23, required: true },
    end: { type: Number, min: 1, max: 24, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    isDemo: { type: Boolean, default: false, index: true }, // created by the seed script; removable in one click
    lastLoginAt: Date,
    programme: { type: String, default: '' },
    department: { type: String, default: '' },
    year: { type: Number, min: 1, max: 5 },
    bio: { type: String, default: '', maxlength: 300 },
    // Optional, digits only with country code. Shown only to the other person once a session between you is accepted.
    whatsapp: { type: String, default: '' },
    offered: { type: [skillSchema], default: [] }, // may be empty: you can just learn
    wanted: { type: [String], default: [] },
    availability: { type: [availabilitySchema], default: [] },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
