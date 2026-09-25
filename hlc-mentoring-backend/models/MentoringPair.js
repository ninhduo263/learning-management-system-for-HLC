const mongoose = require('mongoose');

const mentoringPairSchema = new mongoose.Schema({
  orderIndex: { type: Number, index: true },
  isLocked: { type: Boolean, default: false, index: true },
  pairCode: { type: String, index: true, trim: true },
  cycleId: { type: String, required: true, index: true },
  monthlyCode: { type: String, index: true, trim: true },
  monthlyId: { type: String, required: true, unique: true, index: true, trim: true },
  quarterlyId: { type: String, required: true, index: true, trim: true },
  importedRecapStatus: { type: mongoose.Schema.Types.Mixed, default: {} },
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

mentoringPairSchema.index({ cycleId: 1, menteeId: 1, monthlyId: 1 }, { unique: true });
mentoringPairSchema.index({ quarterlyId: 1, orderIndex: 1, createdAt: 1 });
mentoringPairSchema.index({ cycleId: 1, menteeId: 1, status: 1 });
mentoringPairSchema.index({ cycleId: 1, mentorId: 1, status: 1 });

module.exports = mongoose.model('MentoringPair', mentoringPairSchema);
