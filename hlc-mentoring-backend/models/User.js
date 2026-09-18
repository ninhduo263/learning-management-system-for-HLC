const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, 
  fullName: { type: String, required: true },
  phone: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  bankAccount: { type: String, default: '', trim: true },
  bankName: { type: String, default: '', trim: true },
  dateOfBirth: { type: Date, default: null },
  livingAllowanceType: { type: String, default: '', trim: true },
  activityStatus: { type: String, default: '', trim: true },
  joinedAt: { type: Date, default: null },
  allowanceStartDate: { type: Date, default: null },
  role: { 
    type: String, 
    enum: ['ADMIN', 'MENTOR', 'MENTEE'], 
    default: 'MENTEE' 
  },
  mentorId: { type: String, default: null },
  passwordHash: { type: String, select: false },
  isActive: { type: Boolean, default: true },
  team: { type: String, default: '' },
  position: { type: String, default: '' }
}, { timestamps: true });

userSchema.methods.comparePassword = function comparePassword(password) {
  return this.passwordHash ? bcrypt.compare(password, this.passwordHash) : false;
};

module.exports = mongoose.model('User', userSchema);