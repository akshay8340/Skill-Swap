import mongoose from 'mongoose';

// kind 'learn'    : teacher teaches learner a skill
// kind 'costudy'  : two students study the same subject side by side (live, 1-to-1).
//                   `teacher` = whoever posted the study request (host), `learner` = whoever joined.
const sessionSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['learn', 'costudy'], default: 'learn' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyPost' },
    skill: { type: String, required: true, trim: true },
    topic: { type: String, default: '', maxlength: 60 }, // e.g. skill "DSA", topic "Graphs"
    startsAt: { type: Date, required: true },
    durationHours: { type: Number, default: 1, min: 1, max: 4 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'completed'],
      default: 'pending',
    },
    note: { type: String, default: '', maxlength: 300 },
    meetingLink: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Session', sessionSchema);
