const mongoose = require('mongoose');

const mentoringRecapSchema = new mongoose.Schema({
  pairId: { type: String, required: true, index: true },
  cycleId: { type: String, required: true, index: true },
  monthCode: { type: String, index: true, trim: true },
  scheduleId: { type: String, index: true },
  userId: { type: String, required: true, index: true },
  role: { type: String, enum: ['MENTOR', 'MENTEE'], required: true },
  content: { type: String, default: '' },
  mediaUrls: {
    type: [{ type: String, trim: true }],
    required: true,
    validate: { validator: (value) => Array.isArray(value) && value.length > 0, message: 'Recap phải có ít nhất một ảnh minh chứng' }
  },
  status: {
    type: String,
    enum: ['MISSING', 'PENDING', 'SUBMITTED', 'LATE', 'APPROVED', 'REJECTED'],
    default: 'SUBMITTED'
  },
  note: { type: String, default: '' },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('MentoringRecap', mentoringRecapSchema);
