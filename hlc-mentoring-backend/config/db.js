const mongoose = require('mongoose');
const MentoringPair = require('../models/MentoringPair');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB thành công!');
    await MentoringPair.syncIndexes();
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;

