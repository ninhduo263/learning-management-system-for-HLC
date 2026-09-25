const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true 
  },
  cycleId: { type: String, index: true },
  assignmentId: { type: String, index: true },
  moduleId: { type: String },
  moduleCode: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true
  },
  submissionType: { type: String, index: true },
  mentorId: { type: String, default: null },
  monthlyId: { type: String, default: null, index: true },
  content: {
    text: { type: String, default: '' },
    imageUrls: [{ type: String }],
    videoUrl: { type: String, default: '' },
    fileUrls: [{ type: String }]
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'LATE'],
    default: 'PENDING' // Mặc định chờ Admin duyệt
  },
  note: { type: String, default: '' },
  reviewerId: { type: String },
  reviewedAt: { type: Date },
  feedback: { type: String, default: '' }
}, { 
  timestamps: true // Tự động thêm createdAt và updatedAt
});

submissionSchema.index({ cycleId: 1, userId: 1, moduleCode: 1 });

module.exports = mongoose.model('Submission', submissionSchema);