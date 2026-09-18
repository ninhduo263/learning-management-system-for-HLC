const mongoose = require('mongoose');

const allowanceSummarySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  cycleId: { type: String, required: true },
  scoreByCategory: { type: mongoose.Schema.Types.Mixed, default: {} },
  totalScore: { type: Number, default: 0 },
  pointRate: { type: Number, default: 0 },
  baseAllowance: { type: Number, default: 0 },
  bonusAmount: { type: Number, default: 0 },
  deductionAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['DRAFT', 'REVIEWING', 'LOCKED', 'PAID'], default: 'DRAFT' },
  calculatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

allowanceSummarySchema.index({ userId: 1, cycleId: 1 }, { unique: true });

module.exports = mongoose.model('AllowanceSummary', allowanceSummarySchema);
