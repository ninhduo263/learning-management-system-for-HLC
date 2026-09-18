const mongoose = require('mongoose');

const cycleSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['OPEN', 'CALCULATING', 'REVIEWING', 'LOCKED', 'EXPORTED', 'PAID'],
    default: 'OPEN'
  },
  pointRate: { type: Number, default: 0, min: 0 },
  baseAllowance: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

cycleSchema.path('endDate').validate(function validateDateRange(value) {
  return value > this.startDate;
}, 'endDate must be after startDate');

cycleSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Cycle', cycleSchema);
