const mongoose = require('mongoose');

const mentoringPairSchema = new mongoose.Schema({
  pairId: { type: String, required: true, unique: true, trim: true },
  cycleId: { type: String, required: true, index: true },
  monthlyCode: { type: String, index: true, trim: true },
  mentorId: { type: String, required: true, index: true },
  menteeId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  rating: { type: Number, min: 1, max: 5, default: null },
  ratingComment: { type: String, default: '' },
  createdBy: { type: String, default: 'ADMIN' }
}, { timestamps: true });

mentoringPairSchema.index({ cycleId: 1, menteeId: 1, monthlyCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('MentoringPair', mentoringPairSchema);
