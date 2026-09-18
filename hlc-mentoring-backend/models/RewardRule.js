const mongoose = require('mongoose');

const rewardRuleSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  points: { type: Number, required: true },
  calculationType: {
    type: String,
    enum: ['ACTION', 'RESULT', 'ROLE', 'TIME', 'MANUAL'],
    default: 'ACTION'
  },
  conditions: { type: mongoose.Schema.Types.Mixed, default: {} },
  maxPoints: { type: Number, min: 0 },
  isActive: { type: Boolean, default: true },
  effectiveFrom: { type: Date },
  effectiveTo: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('RewardRule', rewardRuleSchema);
