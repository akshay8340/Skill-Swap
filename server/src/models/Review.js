import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

// One review per person per session
reviewSchema.index({ session: 1, from: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
