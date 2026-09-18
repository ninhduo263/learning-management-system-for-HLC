const mongoose = require('mongoose');

const mentorPreferenceSchema = new mongoose.Schema({
  cycleId: { type: String, required: true, index: true },
  menteeId: { type: String, required: true, index: true },
  mentorIds: {
    type: [{ type: String, trim: true }],
    required: true,
    validate: [
      { validator: (value) => Array.isArray(value) && value.length >= 3, message: 'Phải chọn ít nhất 3 mentor' },
      { validator: (value) => Array.isArray(value) && value.length <= 10, message: 'Chỉ được chọn tối đa 10 mentor' },
      { validator: (value) => Array.isArray(value) && new Set(value).size === value.length, message: 'Danh sách mentor không được trùng' }
    ]
  },
  message: { type: String, default: '', maxlength: 500 },
  submittedAt: { type: Date, default: Date.now },
  deadline: { type: Date, required: true },
  lateJoiner: { type: Boolean, default: false }
}, { timestamps: true });

mentorPreferenceSchema.index({ cycleId: 1, menteeId: 1 }, { unique: true });

module.exports = mongoose.model('MentorPreference', mentorPreferenceSchema);
