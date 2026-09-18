const mongoose = require('mongoose');

const scoreEventSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  cycleId: { type: String, required: true, index: true },
  ruleId: { type: String, required: true },
  category: { type: String, required: true, trim: true },
  sourceType: { type: String, required: true, trim: true },
  sourceId: { type: String },
  points: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'VOID'], default: 'APPROVED' },
  description: { type: String, default: '' },
  approvedBy: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

scoreEventSchema.index({ userId: 1, cycleId: 1, ruleId: 1, sourceId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ScoreEvent', scoreEventSchema);
