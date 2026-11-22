import mongoose from 'mongoose';

// Who changed what in the admin panel.
const adminLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminName: { type: String, default: '' },
    action: { type: String, required: true },
    target: { type: String, default: '' },
    details: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('AdminLog', adminLogSchema);
