import mongoose from 'mongoose';

// A single document (_id "main") holding everything the administrators can change without a redeploy.
const configSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'main' },
    categories: [String],
    programmes: [String],
    departments: [{ _id: false, name: String, short: { type: String, default: '' } }],
    topicSuggestions: [{ _id: false, keyword: String, topics: [String] }],
    meetingHosts: [String],
    allowedEmailDomains: [String],
    announcement: { text: { type: String, default: '' }, active: { type: Boolean, default: false } },
  },
  { timestamps: true }
);

export default mongoose.model('Config', configSchema);
