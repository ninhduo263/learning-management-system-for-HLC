const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  cycleId: { type: String, required: true, index: true },
  moduleCode: { type: String, required: true, uppercase: true, trim: true, index: true },
  title: { type: String, required: true, trim: true },
  week: { type: Number, min: 1, max: 6 },
  deadline: { type: Date },
  targetRoles: [{ type: String, enum: ['MENTEE', 'MENTOR'] }],
  requiredSubmission: {
    allowText: { type: Boolean, default: false },
    allowImage: { type: Boolean, default: false },
    allowVideoLink: { type: Boolean, default: false },
    allowFile: { type: Boolean, default: false }
  },
  maxScore: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

assignmentSchema.index({ cycleId: 1, moduleCode: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
