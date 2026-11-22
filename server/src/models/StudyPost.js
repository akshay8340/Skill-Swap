import mongoose from 'mongoose';

// "I want a study partner for DSA - arrays, DP, graphs. Let's solve problems together live."
const studyPostSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 60 },
    topics: { type: [String], default: [] },
    note: { type: String, default: '', maxlength: 300 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

export default mongoose.model('StudyPost', studyPostSchema);
