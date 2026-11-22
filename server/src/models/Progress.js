import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One progress tracker per (learner, teacher, skill) - created when a session is accepted.
// For study-together sessions the topics start as the ones listed in the study request.
const progressSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['learn', 'costudy'], default: 'learn' },
    learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skill: { type: String, required: true },
    topics: { type: [topicSchema], default: [] },
  },
  { timestamps: true }
);

progressSchema.index({ learner: 1, teacher: 1, skill: 1 }, { unique: true });

export default mongoose.model('Progress', progressSchema);
