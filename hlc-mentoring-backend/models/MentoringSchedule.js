const mongoose = require('mongoose');

const mentoringScheduleSchema = new mongoose.Schema({
  pairId: { type: String, required: true, index: true },
  cycleId: { type: String, required: true, index: true },
  monthCode: { type: String, index: true, trim: true },
  scheduleCode: { type: String, index: true, trim: true },
  mentorId: { type: String, required: true, index: true },
  menteeId: { type: String, required: true, index: true },
  proposedBy: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  location: { type: String, default: '' },
  meetingLink: { type: String, default: '' },
  status: {
    type: String,
    enum: ['PROPOSED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
    default: 'PROPOSED'
  },
  confirmedAt: { type: Date, default: null },
  note: { type: String, default: '' }
}, { timestamps: true });

mentoringScheduleSchema.index({ cycleId: 1, monthCode: 1, pairId: 1 });

module.exports = mongoose.model('MentoringSchedule', mentoringScheduleSchema);
