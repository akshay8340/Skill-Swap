import mongoose from 'mongoose';

// A user reporting a profile, a study request or a review to the administrators.
export const REPORT_REASONS = ['spam', 'inappropriate', 'fake', 'harassment', 'other'];
export const REPORT_TARGETS = ['user', 'studypost', 'review'];

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: REPORT_TARGETS, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, default: '', maxlength: 500 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
    adminNote: { type: String, default: '', maxlength: 500 },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
