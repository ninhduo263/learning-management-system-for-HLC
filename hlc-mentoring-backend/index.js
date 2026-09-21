const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Import Model
const Submission = require('./models/Submission');

const app = express();

// Middleware
app.use(cors()); // Cho phép Frontend gọi API
app.use(express.json()); // Cho phép Backend đọc dữ liệu JSON

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Đã kết nối MongoDB thành công!');
    await MentoringPair.syncIndexes();
  })
  .catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

const User = require('./models/User'); // Thêm dòng này ở đầu file, ngay dưới các import khác

const Module = require('./models/Module'); // Thêm ở đầu file
const Cycle = require('./models/Cycle');
const Assignment = require('./models/Assignment');
const RewardRule = require('./models/RewardRule');
const ScoreEvent = require('./models/ScoreEvent');
const AllowanceSummary = require('./models/AllowanceSummary');
const MentoringPair = require('./models/MentoringPair');
const MentoringSchedule = require('./models/MentoringSchedule');
const MentoringRecap = require('./models/MentoringRecap');
const MentorPreference = require('./models/MentorPreference');
const {
  validateQuarter, quarterDates, monthlyMentoringCode, isCycleLocked, canEditSchedule,
  recapStatus, timingPoints, topThreeAwards, quarterPreferenceDeadline, pairingStartDate
} = require('./quarterlyRules');

const JWT_SECRET = process.env.JWT_SECRET || 'hlc-development-secret-change-me';
const LEGACY_DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'HLC@123456';
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const mentorUserFilter = { role: 'MENTOR', isActive: true, userId: /^HLC-MTO-\d+$/i };

function lastFiveUserDigits(userId) {
  const digits = String(userId || '').match(/\d/g)?.join('') || '';
  return digits.slice(-5).padStart(5, '0');
}

function formatMentoringPairCode(month, year, mentorId, menteeId) {
  return `${String(month).padStart(2, '0')}/${year}-${lastFiveUserDigits(mentorId)}-${lastFiveUserDigits(menteeId)}`;
}

function pairCodeForRecord(pair) {
  if (pair.pairCode) return pair.pairCode;
  const month = Number(String(pair.monthlyCode || '').slice(0, 2));
  const year = Number(String(pair.cycleId || '').slice(0, 4));
  return month >= 1 && month <= 12 && year ? formatMentoringPairCode(month, year, pair.mentorId, pair.menteeId) : pair.pairId;
}

function quarterKey(date) {
  const value = new Date(date);
  return value.getUTCFullYear() * 4 + Math.floor(value.getUTCMonth() / 3);
}

function isCycleVisibleToMember(cycle, now = new Date()) {
  const distance = quarterKey(cycle.startDate) - quarterKey(now);
  return distance <= 0 || (distance === 1 && new Date(now).getUTCDate() >= 25);
}
function normalizeEnvValue(value) {
  const normalized = String(value || '').trim();
  return normalized.replace(/^(['"])(.*)\1$/, '$2').trim();
}

function exactUserIdRegex(userId) {
  const escaped = String(userId || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}$`, 'i');
}

async function getPairsByUser(userId, cycleId) {
  const filter = {
    $or: [
      { menteeId: exactUserIdRegex(userId) },
      { mentorId: exactUserIdRegex(userId) }
    ]
  };
  if (cycleId) filter.cycleId = String(cycleId).trim().toUpperCase();

  console.log('[pairs:user] userId:', userId);
  console.log('[pairs:user] cycleId:', cycleId || '(all)');
  console.log('[pairs:user] Mongoose Query:', filter);

  const pairs = await MentoringPair.find(filter)
    .sort({ orderIndex: 1, createdAt: 1 })
    .lean();

  console.log('[pairs:user] result count:', pairs.length);
  console.log('[pairs:user] result cycles:', [...new Set(pairs.map((pair) => pair.cycleId))]);
  return pairs.map((pair) => ({
    ...pair,
    pairCode: pairCodeForRecord(pair)
  }));
}

const BOOTSTRAP_ADMIN_KEY = normalizeEnvValue(process.env.BOOTSTRAP_ADMIN_KEY);
const ADMIN_PATHS = [
  '/api/cycles',
  '/api/assignments',
  '/api/reward-rules',
  '/api/score-events',
  '/api/allowance-summaries',
  '/api/submissions/fund'
];

function createToken(user) {
  return jwt.sign({ userId: user.userId, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này' });
    }
    next();
  };
}

async function ensureDefaultRewardRules() {
  const definitions = [
    {
      code: 'SUBMISSION_APPROVED',
      name: 'Nộp bài được duyệt',
      category: 'ACADEMIC',
      points: 2,
      calculationType: 'ACTION',
      conditions: { moduleCodes: ['READING', 'FAVORITE_ARTICLE', 'ACADEMIC_WEEKLY'] },
      isActive: true
    },
    {
      code: 'MENTORING_COMPLETED',
      name: 'Mentoring hoàn tất',
      category: 'MENTORING',
      points: 3,
      calculationType: 'ACTION',
      conditions: { source: 'SCHEDULE_COMPLETED' },
      isActive: true
    },
    {
      code: 'ROLE_POSITION',
      name: 'Điểm chức vụ',
      category: 'ROLE',
      points: 4,
      calculationType: 'ROLE',
      conditions: { positions: ['LEADER', 'PHO_LEADER', 'TRUONG_BAN', 'PHO_BAN'] },
      isActive: true
    },
    {
      code: 'PAIR_RATING',
      name: 'Đánh giá cặp tốt',
      category: 'MENTORING',
      points: 5,
      calculationType: 'RESULT',
      conditions: { ratingMin: 4 },
      isActive: true
    }
  ];

  for (const definition of definitions) {
    await RewardRule.updateOne(
      { code: definition.code },
      { $set: { ...definition } },
      { upsert: true, new: true }
    );
  }
}

async function addSystemScoreEvent({ userId, cycleId, ruleId, category, sourceType, sourceId, points, description, approvedBy = 'SYSTEM' }) {
  if (!userId || !cycleId || !ruleId || points === undefined || Number(points) === 0) {
    return null;
  }

  const query = { userId, cycleId, ruleId, sourceId: sourceId || `${sourceType}:${userId}` };
  const existing = await ScoreEvent.findOne(query);
  if (existing) return existing;

  const event = await ScoreEvent.create({
    userId,
    cycleId,
    ruleId,
    category,
    sourceType,
    sourceId: sourceId || `${sourceType}:${userId}`,
    points: Number(points),
    description,
    approvedBy,
    status: 'APPROVED'
  });

  return event;
}

async function awardSubmissionApprovedScore(submission) {
  if (!submission || !submission.cycleId || !submission.userId) return;
  const rule = await RewardRule.findOne({
    code: 'SUBMISSION_APPROVED',
    isActive: true
  });

  if (!rule) return;

  const moduleCode = String(submission.moduleCode || '').toUpperCase();
  const moduleCodes = ((rule.conditions && rule.conditions.moduleCodes) || []).map((value) => String(value).toUpperCase());
  const shouldAward = !moduleCodes.length || moduleCodes.includes(moduleCode);

  if (!shouldAward) return;

  await addSystemScoreEvent({
    userId: submission.userId,
    cycleId: submission.cycleId,
    ruleId: rule.code,
    category: rule.category,
    sourceType: 'SUBMISSION',
    sourceId: String(submission._id),
    points: Number(rule.points),
    description: `Bài nộp ${moduleCode} được duyệt`,
    approvedBy: 'SYSTEM'
  });
}

async function awardMentoringCompletionScore(schedule) {
  if (!schedule || !schedule.cycleId) return;
  const rule = await RewardRule.findOne({ code: 'MENTORING_COMPLETED', isActive: true });
  if (!rule) return;

  await addSystemScoreEvent({
    userId: schedule.menteeId,
    cycleId: schedule.cycleId,
    ruleId: rule.code,
    category: rule.category,
    sourceType: 'MENTORING_SCHEDULE',
    sourceId: String(schedule._id),
    points: Number(rule.points),
    description: 'Mentoring đã hoàn tất',
    approvedBy: 'SYSTEM'
  });
}

async function awardRoleScoreForUser(user, cycleId) {
  if (!user || !cycleId) return;
  const position = String(user.position || '').trim().toUpperCase();
  const rule = await RewardRule.findOne({ code: 'ROLE_POSITION', isActive: true });
  if (!rule || !position) return;
  const allowedPositions = ((rule.conditions && rule.conditions.positions) || []).map((value) => String(value).toUpperCase());
  if (!allowedPositions.includes(position)) return;

  await addSystemScoreEvent({
    userId: user.userId,
    cycleId,
    ruleId: rule.code,
    category: rule.category,
    sourceType: 'ROLE_POSITION',
    sourceId: `${user.userId}:${position}`,
    points: Number(rule.points),
    description: `Điểm chức vụ ${position}`,
    approvedBy: 'SYSTEM'
  });
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'hlc-mentoring-backend', auth: true });
});

// Auth là endpoint công khai; các API còn lại phải có token.
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã thành viên và mật khẩu' });
    }
    const user = await User.findOne({ userId: userId.trim().toUpperCase() }).select('+passwordHash');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Mã thành viên hoặc mật khẩu không đúng' });
    }

    let valid = await user.comparePassword(password);
    // Tương thích user cũ chưa có passwordHash: đăng nhập một lần bằng mật khẩu mặc định,
    // sau đó lưu hash để những lần sau không còn dùng mật khẩu mặc định.
    if (!user.passwordHash && password === LEGACY_DEFAULT_PASSWORD) {
      user.passwordHash = await bcrypt.hash(password, 12);
      await user.save();
      valid = true;
    }
    if (!valid) return res.status(401).json({ success: false, message: 'Mã thành viên hoặc mật khẩu không đúng' });

    res.json({
      success: true,
      token: createToken(user),
      user: { userId: user.userId, fullName: user.fullName, role: user.role, mentorId: user.mentorId }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/auth/bootstrap-admin', async (req, res) => {
  try {
    const providedBootstrapKey = normalizeEnvValue(req.get('x-bootstrap-key'));
    if (!BOOTSTRAP_ADMIN_KEY || providedBootstrapKey !== BOOTSTRAP_ADMIN_KEY) {
      return res.status(403).json({ success: false, message: 'Bootstrap key không hợp lệ' });
    }
    const existingAdmin = await User.exists({ role: 'ADMIN' });
    if (existingAdmin) return res.status(409).json({ success: false, message: 'Admin đã tồn tại' });
    const { userId, fullName, password } = req.body;
    if (!userId || !fullName || !password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Cần userId, họ tên và mật khẩu tối thiểu 8 ký tự' });
    }
    const user = await User.create({
      userId: userId.trim().toUpperCase(),
      fullName,
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(password, 12)
    });
    res.status(201).json({ success: true, data: { userId: user.userId, fullName: user.fullName, role: user.role } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Mã thành viên đã tồn tại' });
    console.error('Lỗi tạo admin đầu tiên:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  const user = await User.findOne({ userId: req.user.userId }).select('userId fullName role mentorId team position isActive');
  if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Tài khoản không còn hoạt động' });
  res.json({ success: true, data: user });
});

app.get('/api/dashboard/personal', authenticate, async (req, res) => {
  try {
    const requestedUserId = String(req.query.userId || req.user.userId || '').toUpperCase();
    const userId = req.user.role === 'ADMIN' && req.query.userId ? requestedUserId : req.user.userId;
    const user = await User.findOne({ userId }).select('userId fullName role mentorId team position isActive');
    if (!user || !user.isActive) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const cycleCandidates = await Cycle.find().sort({ startDate: -1 });
    const memberPairFilter = {
      $or: [
        { menteeId: exactUserIdRegex(userId) },
        { mentorId: exactUserIdRegex(userId) }
      ]
    };
    const memberPairCycleIds = req.user.role === 'ADMIN'
      ? []
      : await MentoringPair.distinct('cycleId', memberPairFilter);
    const memberPairCycleSet = new Set(memberPairCycleIds.map((cycleId) => String(cycleId).toUpperCase()));
    const latestCycle = req.user.role === 'ADMIN'
      ? cycleCandidates[0]
      : cycleCandidates.find((cycle) =>
        isCycleVisibleToMember(cycle) || memberPairCycleSet.has(String(cycle.code).toUpperCase())
      );
    const visibleCycles = cycleCandidates.filter((cycle) =>
      req.user.role === 'ADMIN'
      || isCycleVisibleToMember(cycle)
      || memberPairCycleSet.has(String(cycle.code).toUpperCase())
    );
    const cycleId = req.query.cycleId || (latestCycle && latestCycle.code);
    const [scoreSummary, submissions, pairs, schedules, recapCount, allowanceSummary] = await Promise.all([
      ScoreEvent.aggregate([
        { $match: { userId, ...(cycleId ? { cycleId } : {}) } },
        { $group: { _id: '$category', total: { $sum: '$points' } } }
      ]),
      Submission.find({ userId, ...(cycleId ? { cycleId } : {}) }).sort({ createdAt: -1 }).limit(20),
      getPairsByUser(userId),
      MentoringSchedule.find({
        $or: [
          { menteeId: exactUserIdRegex(userId) },
          { mentorId: exactUserIdRegex(userId) }
        ]
      }).sort({ startTime: 1 }),
      MentoringRecap.countDocuments({ userId }),
      AllowanceSummary.findOne({ userId, ...(cycleId ? { cycleId } : {}) }).sort({ calculatedAt: -1 })
    ]);

    res.json({
      success: true,
      data: {
        user,
        cycleId,
        cycles: visibleCycles,
        allowanceSummary,
        totalPoints: scoreSummary.reduce((sum, item) => sum + item.total, 0),
        scoreByCategory: Object.fromEntries(scoreSummary.map((item) => [item._id, item.total])),
        submissionCount: submissions.length,
        approvedCount: submissions.filter((item) => item.status === 'APPROVED').length,
        pendingCount: submissions.filter((item) => item.status === 'PENDING' || item.status === 'IN_REVIEW').length,
        pairCount: pairs.length,
        scheduleCount: schedules.length,
        recapCount,
        recentSubmissions: submissions,
        pairs,
        schedules
      }
    });
  } catch (error) {
    console.error('Lỗi dashboard người dùng:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.get('/api/submissions/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const filter = { userId };
    if (req.query.cycleId) filter.cycleId = String(req.query.cycleId);
    const submissions = await Submission.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('Lỗi lấy bài nộp của người dùng:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.get('/api/monthly-reports/export.xlsx', async (req, res) => {
  try {
    const cycleId = req.query.cycleId || (await Cycle.findOne().sort({ startDate: -1 }))?.code;
    if (!cycleId) return res.status(400).json({ success: false, message: 'Không có kỳ hoạt động để xuất báo cáo' });

    const summaries = await AllowanceSummary.find({ cycleId }).sort({ totalScore: -1 });
    const users = await User.find({ userId: { $in: summaries.map((item) => item.userId) } }).select('userId fullName role position');
    const userMap = new Map(users.map((user) => [user.userId, user]));

    const detailRows = summaries.map((summary, index) => {
      const user = userMap.get(summary.userId) || {};
      const categories = summary.scoreByCategory || {};
      return {
        STT: index + 1,
        'Mã thành viên': summary.userId,
        'Họ và tên': user.fullName || '',
        'Vai trò': user.role || '',
        'Chức vụ': user.position || '',
        'Điểm mentoring': categories.MENTORING || 0,
        'Điểm đọc sách': categories.READING || 0,
        'Điểm bài viết': categories.FAVORITE_ARTICLE || 0,
        'Điểm học tập': categories.ACADEMIC || categories.ACADEMIC_WEEKLY || 0,
        'Điểm chức vụ': categories.ROLE || 0,
        'Điểm thưởng': categories.BONUS || 0,
        'Điểm phạt': categories.PENALTY || 0,
        'Tổng điểm': summary.totalScore,
        'Phụ cấp cơ bản': summary.baseAllowance,
        'Đơn giá điểm': summary.pointRate,
        'Tiền thưởng': summary.bonusAmount,
        'Tiền khấu trừ': summary.deductionAmount,
        'Tổng tiền': summary.finalAmount,
        'Trạng thái': summary.status
      };
    });

    const summaryRow = {
      'Kỳ báo cáo': cycleId,
      'Tổng thành viên': summaries.length,
      'Tổng điểm': summaries.reduce((sum, item) => sum + item.totalScore, 0),
      'Tổng tiền': summaries.reduce((sum, item) => sum + item.finalAmount, 0),
      'Điểm trung bình': summaries.length ? summaries.reduce((sum, item) => sum + item.totalScore, 0) / summaries.length : 0
    };

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet([summaryRow]);
    const detailSheet = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="hlc-monthly-report-${cycleId}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Lỗi xuất báo cáo cuối tháng:', error);
    res.status(500).json({ success: false, message: 'Không thể xuất báo cáo cuối tháng' });
  }
});

app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login' || req.path === '/auth/bootstrap-admin' || req.path === '/users/init-data') return next();
  authenticate(req, res, () => {
    const absolutePath = `/api${req.path}`;
    const isAdminPath = ADMIN_PATHS.some((path) => absolutePath === path || absolutePath.startsWith(`${path}/`));
    if (isAdminPath && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới được thực hiện thao tác này' });
    }
    next();
  });
});

function sameQuarter(a, b) {
  const first = new Date(a);
  const second = new Date(b);
  return first.getUTCFullYear() === second.getUTCFullYear()
    && Math.floor(first.getUTCMonth() / 3) === Math.floor(second.getUTCMonth() / 3);
}

// Mentee chọn mentor một lần cho cả quý. Các tháng sau kế thừa cặp của tháng đầu.
app.get(['/api/mentoring/preferences', '/api/preferences'], async (req, res) => {
  try {
    const cycleId = String(req.query.cycleId || '');
    const filter = cycleId ? { cycleId } : {};
    if (req.user.role !== 'ADMIN') filter.menteeId = req.user.userId;
    const preferences = await MentorPreference.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể lấy nguyện vọng mentor' });
  }
});

app.post(['/api/mentoring/preferences', '/api/preferences'], async (req, res) => {
  try {
    const { cycleId, mentorIds, message } = req.body;
    if (!cycleId || !Array.isArray(mentorIds)) {
      return res.status(400).json({ success: false, message: 'Cần cycleId và danh sách mentor' });
    }
    const cycle = await Cycle.findOne({ code: cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ mentoring' });
    if (req.user.role !== 'MENTEE') return res.status(403).json({ success: false, message: 'Chỉ mentee được gửi nguyện vọng' });
    const ids = [...new Set(mentorIds.map((id) => String(id).trim().toUpperCase()).filter(Boolean))];
    if (ids.length < 3 || ids.length > 10) {
      return res.status(400).json({ success: false, message: 'Nguyện vọng phải có từ 3 đến 10 mentor khác nhau' });
    }
    const mentors = await User.find({ userId: { $in: ids }, role: 'MENTOR', isActive: true }).select('userId');
    if (mentors.length !== ids.length) return res.status(400).json({ success: false, message: 'Danh sách có mentor không hợp lệ' });
    const deadline = quarterPreferenceDeadline(cycle);
    const user = await User.findOne({ userId: req.user.userId }).select('createdAt');
    const lateJoiner = new Date(user?.createdAt || 0) > deadline;
    if (new Date() > deadline && !lateJoiner) {
      return res.status(409).json({ success: false, message: 'Đã quá hạn gửi nguyện vọng (ngày 5 tháng cuối quý)', deadline });
    }
    const preference = await MentorPreference.findOneAndUpdate(
      { cycleId, menteeId: req.user.userId },
      { cycleId, menteeId: req.user.userId, mentorIds: ids, message: String(message || '').slice(0, 500), deadline, lateJoiner, submittedAt: new Date() },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: preference });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/mentoring/preferences/mentors', async (req, res) => {
  const mentors = await User.find(mentorUserFilter).select('userId fullName team position').sort({ fullName: 1 });
  res.json({ success: true, data: mentors });
});

app.post('/api/mentoring/pairs/inherit', requireRole('ADMIN'), async (req, res) => {
  try {
    const { cycleId, month } = req.body;
    const cycle = await Cycle.findOne({ code: cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ mentoring' });
    const monthNumber = Number(month);
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 3) {
      return res.status(400).json({ success: false, message: 'Tháng mentoring phải từ 1 đến 3' });
    }
    if (new Date() < pairingStartDate(cycle)) {
      return res.status(409).json({ success: false, message: 'Admin chỉ được ghép cặp từ ngày 10 tháng cuối quý' });
    }
    const targetCode = monthlyMentoringCode(cycle.code, monthNumber);
    const source = await MentoringPair.find({ cycleId, monthlyCode: { $ne: targetCode }, status: { $ne: 'CANCELLED' } })
      .sort({ createdAt: 1 }).lean();
    const firstByMentee = new Map();
    source.forEach((pair) => { if (!firstByMentee.has(pair.menteeId)) firstByMentee.set(pair.menteeId, pair); });
    const created = [];
    for (const pair of firstByMentee.values()) {
      const exists = await MentoringPair.findOne({ cycleId, menteeId: pair.menteeId, monthlyCode: targetCode });
      if (exists) { created.push(exists); continue; }
      created.push(await MentoringPair.create({
        pairId: `${cycle.code}-${targetCode}-${pair.mentorId}-${pair.menteeId}`,
        cycleId, monthlyCode: targetCode, mentorId: pair.mentorId, menteeId: pair.menteeId,
        status: 'ACTIVE', createdBy: req.user.userId
      }));
    }
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

ensureDefaultRewardRules().catch((error) => console.error('Lỗi khởi tạo rule mặc định:', error));

// ==========================================
// API: Lấy danh sách các Module đang hoạt động
// ==========================================
app.get('/api/modules', async (req, res) => {
  try {
    const modules = await Module.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ==========================================
// API: Admin tạo cấu hình Module mới
// ==========================================
app.post('/api/modules', requireRole('ADMIN'), async (req, res) => {
  try {
    const newModule = new Module(req.body);
    const savedModule = await newModule.save();
    res.status(201).json({ success: true, data: savedModule });
  } catch (error) {
    // Xử lý lỗi trùng mã code
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Mã code module đã tồn tại!' });
    }
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ==========================================
// API: Tự động tạo dữ liệu nhân sự mẫu
// ==========================================
app.get('/api/users/init-data', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      await User.insertMany([
        { userId: 'MN01', fullName: 'Dương Văn Ninh', role: 'MENTOR', passwordHash: await bcrypt.hash(LEGACY_DEFAULT_PASSWORD, 12) },
        { userId: 'MN02', fullName: 'Trần Quỳnh Trang', role: 'MENTOR', passwordHash: await bcrypt.hash(LEGACY_DEFAULT_PASSWORD, 12) },
        { userId: 'MT01', fullName: 'Trần Phú Mỹ', role: 'MENTEE', mentorId: null, passwordHash: await bcrypt.hash(LEGACY_DEFAULT_PASSWORD, 12) },
        { userId: 'MT02', fullName: 'Yến Nhi', role: 'MENTEE', mentorId: null, passwordHash: await bcrypt.hash(LEGACY_DEFAULT_PASSWORD, 12) },
        { userId: 'MT03', fullName: 'Lê Hoàng B', role: 'MENTEE', mentorId: null, passwordHash: await bcrypt.hash(LEGACY_DEFAULT_PASSWORD, 12) }
      ]);
      return res.status(201).json({ success: true, message: 'Đã khởi tạo dữ liệu mẫu thành công!' });
    }
    res.status(200).json({ success: true, message: 'Dữ liệu đã tồn tại, không tạo thêm.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ==========================================
// API: Lấy danh sách Mentor & Mentee
// ==========================================
app.get('/api/users/mentors', async (req, res) => {
  const mentors = await User.find(mentorUserFilter).select('userId fullName');
  res.json({ success: true, data: mentors });
});

app.get('/api/users/mentees', async (req, res) => {
  const mentees = await User.find({ role: 'MENTEE', isActive: true }).select('userId fullName mentorId isActive');
  res.json({ success: true, data: mentees });
});

function formatBirthDatePassword(value) {
  if (!value) return null;
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    const text = value.trim();
    const vietnameseDate = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(text);
    date = vietnameseDate
      ? new Date(Date.UTC(
        Number(vietnameseDate[3]),
        Number(vietnameseDate[2]) - 1,
        Number(vietnameseDate[1])
      ))
      : new Date(text);
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial dates can remain in legacy/imported records.
    date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return null;
  const hasTimeComponent = date.getUTCHours() !== 0
    || date.getUTCMinutes() !== 0
    || date.getUTCSeconds() !== 0;
  const calendarDate = hasTimeComponent
    ? new Date(date.getTime() + (7 * 60 * 60 * 1000))
    : date;
  if (typeof value === 'string') {
    const vietnameseDate = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(value.trim());
    if (vietnameseDate && (calendarDate.getUTCFullYear() !== Number(vietnameseDate[3])
      || calendarDate.getUTCMonth() !== Number(vietnameseDate[2]) - 1
      || calendarDate.getUTCDate() !== Number(vietnameseDate[1]))) {
      return null;
    }
  }
  const pad = (number) => String(number).padStart(2, '0');
  return `${pad(calendarDate.getUTCDate())}${pad(calendarDate.getUTCMonth() + 1)}${calendarDate.getUTCFullYear()}`;
}

function mapActivityStatusToIsActive(value) {
  const status = String(value || '').trim().toLowerCase();
  if (!status) return false;
  return ['đang hoạt động', 'hoạt động', 'active', 'đang làm', 'đang công tác', 'có'].includes(status);
}

app.post('/api/users/sync-activity-status', requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await User.find({ activityStatus: { $exists: true, $ne: '' } }).select('_id activityStatus isActive');
    let updated = 0;
    for (const user of users) {
      const isActive = mapActivityStatusToIsActive(user.activityStatus);
      if (user.isActive !== isActive) {
        await User.updateOne({ _id: user._id }, { $set: { isActive } });
        updated += 1;
      }
    }
    res.json({ success: true, data: { scanned: users.length, updated } });
  } catch (error) {
    console.error('Lỗi đồng bộ trạng thái hoạt động:', error);
    res.status(500).json({ success: false, message: 'Không thể đồng bộ trạng thái hoạt động' });
  }
});

async function generateMenteeAccounts(req, res) {
  try {
    const mentees = await User.find({
      role: 'MENTEE',
      userId: /^HLC-MTE-/i
    }).select('+passwordHash userId fullName dateOfBirth');
    const errors = [];
    let created = 0;
    let skipped = 0;

    for (const mentee of mentees) {
      if (mentee.passwordHash) {
        skipped += 1;
        continue;
      }
      const password = formatBirthDatePassword(mentee.dateOfBirth);
      if (!password) {
        errors.push({
          userId: mentee.userId,
          fullName: mentee.fullName,
          message: 'Thiếu hoặc ngày sinh không hợp lệ'
        });
        continue;
      }
      mentee.passwordHash = await bcrypt.hash(password, 10);
      await mentee.save();
      created += 1;
    }

    res.json({
      success: true,
      data: {
        total: mentees.length,
        created,
        skipped,
        failed: errors.length,
        errors
      }
    });
  } catch (error) {
    console.error('Lỗi khởi tạo tài khoản Mentee:', error);
    res.status(500).json({ success: false, message: 'Không thể khởi tạo tài khoản Mentee' });
  }
}

app.post('/api/users/generate-mentee-accounts', requireRole('ADMIN'), generateMenteeAccounts);
app.post('/api/users/generate-accounts', requireRole('ADMIN'), generateMenteeAccounts);

app.post('/api/users/generate-mentor-accounts', requireRole('ADMIN'), async (req, res) => {
  const defaultPassword = process.env.DEFAULT_MENTOR_PASSWORD || 'HLC@123456';
  try {
    const mentors = await User.find({
      userId: /^HLC-MTO-/i
    }).select('+passwordHash userId fullName role');
    const errors = [];
    let created = 0;
    let skipped = 0;

    for (const mentor of mentors) {
      if (mentor.passwordHash) {
        skipped += 1;
        continue;
      }

      try {
        mentor.role = 'MENTOR';
        mentor.passwordHash = await bcrypt.hash(defaultPassword, 10);
        await mentor.save();
        created += 1;
      } catch (error) {
        errors.push({
          userId: mentor.userId,
          fullName: mentor.fullName,
          message: error.message || 'Không thể tạo tài khoản'
        });
      }
    }

    return res.json({
      success: true,
      data: {
        total: mentors.length,
        created,
        skipped,
        failed: errors.length,
        errors
      }
    });
  } catch (error) {
    console.error('Lỗi khởi tạo tài khoản Mentor:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể khởi tạo tài khoản Mentor'
    });
  }
});

app.get('/api/users/import-template.xlsx', requireRole('ADMIN'), (req, res) => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    {
      'HLC ID (Nhập tay)': 'MT01',
      'HỌ VÀ TÊN': 'Nguyễn Văn A',
      'SĐT': '0912345678',
      EMAIL: 'a@example.com',
      'SỐ TÀI KHOẢN': '0123456789',
      'NGÂN HÀNG (Chọn list)': 'Vietcombank',
      'NGÀY SINH': '01/01/2000',
      'DIỆN HỖ TRỢ SINH HOẠT PHÍ': 'Có',
      'Trạng thái hoạt động (Chọn list)': 'Đang hoạt động',
      'THỜI GIAN GIA NHẬP HLC (Chọn ngày)': '01/09/2026',
      'THỜI GIAN BẮT ĐẦU NHẬN TRỢ CẤP (Chọn ngày)': '01/09/2026'
    }
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Users');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="hlc-users-template.xlsx"');
  res.send(buffer);
});

app.post('/api/users/import', requireRole('ADMIN'), importUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel hoặc CSV' });
    const extension = String(req.file.originalname).toLowerCase().split('.').pop();
    if (!['xlsx', 'csv'].includes(extension)) return res.status(400).json({ success: false, message: 'Chỉ hỗ trợ file .xlsx hoặc .csv' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
    const errors = [];
    let imported = 0;
    let updated = 0;
    const normalizeHeader = (header) => String(header || '')
      .replace(/^\uFEFF/, '')
      .replace(/["“”]/g, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const sheets = workbook.SheetNames
      .filter((name) => ['hlc mentee', 'hlc mentor'].includes(normalizeHeader(name)) || workbook.SheetNames.length === 1)
      .map((name) => ({ name, sheet: workbook.Sheets[name] }));
    if (!sheets.length) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy sheet HLC MENTEE hoặc HLC MENTOR trong file Excel'
      });
    }
    const rows = [];
    for (const { name, sheet } of sheets) {
      const rawSheet = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const headerRowIndex = rawSheet.findIndex((row) => {
        const headers = row.map(normalizeHeader);
        return headers.some((header) => header.includes('hlc id'))
          && headers.some((header) => header.includes('ho va ten'));
      });
      if (headerRowIndex < 0) {
        errors.push({ sheet: name, row: 1, message: 'Không tìm thấy dòng tiêu đề HLC ID và HỌ VÀ TÊN' });
        continue;
      }
      const headerValues = rawSheet[headerRowIndex];
      rawSheet.slice(headerRowIndex + 1).forEach((cells, offset) => {
        rows.push({
          sheet: name,
          sourceRow: headerRowIndex + offset + 2,
          data: Object.fromEntries(headerValues.map((header, columnIndex) => [
            header || `__EMPTY_${columnIndex}`,
            cells[columnIndex] === undefined ? '' : cells[columnIndex]
          ]))
        });
      });
    }
    const parseDate = (raw) => {
      if (raw === null || raw === undefined || raw === '') return null;
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
      if (typeof raw === 'number') {
        const parsed = XLSX.SSF.parse_date_code(raw);
        return parsed ? new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0)) : null;
      }
      const text = String(raw).trim();
      const match = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(text);
      const date = match
        ? new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
        : new Date(text);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const normalizePhone = (raw) => {
      if (raw === null || raw === undefined || raw === '') return '';
      let phone = String(raw).trim().replace(/[^\d+]/g, '');
      if (/^\d{9}$/.test(phone)) phone = `0${phone}`;
      if (/^\+84\d{9}$/.test(phone)) phone = `0${phone.slice(3)}`;
      return phone;
    };
    const normalizeBoolean = (raw) => {
      const text = String(raw || '').trim().toLowerCase();
      if (!text) return null;
      if (['có', 'co', 'yes', 'true', '1', 'đang hỗ trợ', 'được hỗ trợ'].includes(text)) return true;
      if (['không', 'khong', 'no', 'false', '0', 'không hỗ trợ'].includes(text)) return false;
      return null;
    };
    for (let index = 0; index < rows.length; index += 1) {
      const { data: row, sheet: sheetName, sourceRow } = rows[index];
      if (Object.values(row).every((item) => String(item ?? '').trim() === '')) continue;
      const normalizedRow = Object.fromEntries(
        Object.entries(row).map(([key, item]) => [normalizeHeader(key), item])
      );
      const value = (...keys) => keys
        .map((key) => normalizedRow[normalizeHeader(key)])
        .find((item) => String(item || '').trim() !== '');
      const userId = String(value(
        'HLC ID (Nhập tay)', 'HLC ID\n(Nhập tay)', 'Mã định danh', 'Mã thành viên', 'userId', 'User ID'
      ) || '').trim().replace(/\s+/g, '').toUpperCase();
      const fullName = String(value(
        'HỌ VÀ TÊN (Nhập tay)', 'HỌ VÀ TÊN\n(Nhập tay)', 'HỌ VÀ TÊN', 'Họ và tên', 'Họ tên', 'fullName', 'Full Name'
      ) || '').trim().replace(/\s+/g, ' ');
      const email = String(value('EMAIL (Nhập tay)', 'EMAIL\n(Nhập tay)', 'EMAIL', 'Email', 'email') || '')
        .replace(/\s+/g, '').toLowerCase();
      const roleValue = String(value('Vai trò', 'role', 'Role') || '').trim().toUpperCase();
      const role = ['ADMIN', 'MENTOR', 'MENTEE'].includes(roleValue)
        ? roleValue
        : (normalizeHeader(sheetName).includes('mentor') || /^MN/i.test(userId) ? 'MENTOR' : 'MENTEE');
      if (!userId || !fullName) {
        errors.push({ sheet: sheetName, row: sourceRow, message: 'Thiếu HLC ID hoặc HỌ VÀ TÊN' });
        continue;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ sheet: sheetName, row: sourceRow, message: 'Email không hợp lệ' });
        continue;
      }
      const update = {
        userId, fullName, email,
        phone: normalizePhone(value('SĐT (Nhập tay)', 'SĐT\n(Nhập tay)', 'SĐT', 'Điện thoại', 'phone')),
        bankAccount: String(value('SỐ TÀI KHOẢN (Nhập tay)', 'SỐ TÀI KHOẢN\n(Nhập tay)', 'SỐ TÀI KHOẢN', 'Số tài khoản', 'bankAccount') || '').trim(),
        bankName: String(value('NGÂN HÀNG (Chọn list)', 'NGÂN HÀNG\n(Chọn list)', 'Ngân hàng', 'bankName') || '').trim(),
        dateOfBirth: parseDate(value('NGÀY SINH', 'dob', 'Ngày sinh', 'dateOfBirth')),
        livingAllowanceType: String(value(
          'DIỆN HỖ TRỢ SINH HOẠT PHÍ (Chọn list)',
          'DIỆN HỖ TRỢ\nSINH HOẠT PHÍ\n(Chọn list)',
          'DIỆN HỖ TRỢ SINH HOẠT PHÍ',
          'Diện hỗ trợ',
          'supportType',
          'livingAllowanceType'
        ) || '').trim(),
        activityStatus: String(value(
          'Trạng thái hoạt động (Chọn list)',
          'Trạng thái\nhoạt động\n(Chọn list)',
          'Trạng thái hoạt động',
          'status',
          'activityStatus'
        ) || '').trim(),
        joinedAt: parseDate(value(
          'THỜI GIAN GIA NHẬP HLC (Chọn ngày)',
          'THỜI GIAN\nGIA NHẬP HLC\n(Chọn ngày)',
          'joinDate',
          'Thời gian gia nhập HLC',
          'joinedAt'
        )),
        allowanceStartDate: parseDate(value(
          'THỜI GIAN BẮT ĐẦU NHẬN TRỢ CẤP (Chọn ngày)',
          'THỜI GIAN\nBẮT ĐẦU NHẬN TRỢ CẤP\n(Chọn ngày)',
          'Thời gian bắt đầu nhận trợ cấp',
          'allowanceStartDate'
        )),
        role,
        isActive: (() => {
          const status = String(value('Trạng thái hoạt động (Chọn list)', 'Trạng thái hoạt động', 'isActive') || '').trim().toLowerCase();
          if (!status) return true;
          if (['đang hoạt động', 'hoạt động', 'active', 'đang làm', 'đang công tác', 'có'].includes(status)) return true;
          if (['đã nghỉ', 'nghỉ', 'dừng hoạt động', 'inactive', 'ngừng hoạt động', 'không'].includes(status)) return false;
          return normalizeBoolean(status) ?? false;
        })(),
        mentorId: String(value('Mã mentor', 'mentorId') || '').trim().toUpperCase() || null,
        team: String(value('Team', 'team', 'Nhóm') || '').trim(),
        position: String(value('Chức vụ', 'position', 'Vị trí') || '').trim()
      };
      const dateFields = [
        ['NGÀY SINH', 'Ngày sinh', 'dateOfBirth'],
        ['THỜI GIAN GIA NHẬP HLC (Chọn ngày)', 'Thời gian gia nhập HLC', 'joinedAt'],
        ['THỜI GIAN BẮT ĐẦU NHẬN TRỢ CẤP (Chọn ngày)', 'Thời gian bắt đầu nhận trợ cấp', 'allowanceStartDate']
      ];
      const invalidDateField = dateFields.find(([...keys]) => {
        const raw = value(...keys);
        return raw !== undefined && raw !== '' && !update[keys[keys.length - 1]];
      });
      if (invalidDateField) {
        errors.push({ sheet: sheetName, row: sourceRow, message: `Ngày không hợp lệ ở cột ${invalidDateField[0]}` });
        continue;
      }
      const password = String(value('Mật khẩu', 'password', 'Password') || '').trim();
      if (password) {
        if (password.length < 8) {
          errors.push({ sheet: sheetName, row: sourceRow, message: 'Mật khẩu phải có ít nhất 8 ký tự' });
          continue;
        }
        update.passwordHash = await bcrypt.hash(password, 12);
      }
      const existing = await User.findOne({ userId });
      if (existing) {
        await User.updateOne({ _id: existing._id }, update);
        updated += 1;
      } else {
        update.passwordHash = update.passwordHash || await bcrypt.hash(LEGACY_DEFAULT_PASSWORD, 12);
        await User.create(update);
        imported += 1;
      }
    }
    res.json({ success: true, data: { total: rows.length, imported, updated, failed: errors.length, errors } });
  } catch (error) {
    console.error('Lỗi import người dùng:', error);
    res.status(400).json({ success: false, message: error.message || 'Không thể import dữ liệu' });
  }
});

app.post('/api/users/import-mentor', requireRole('ADMIN'), importUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel hoặc CSV' });
    }
    const extension = String(req.file.originalname).toLowerCase().split('.').pop();
    if (!['xlsx', 'csv'].includes(extension)) {
      return res.status(400).json({ success: false, message: 'Chỉ hỗ trợ file .xlsx hoặc .csv' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const normalizeImportHeader = (header) => String(header || '')
      .replace(/^\uFEFF/, '')
      .replace(/["“”]/g, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const sheetName = workbook.SheetNames.find((name) => normalizeImportHeader(name) === 'hlc mentor');
    if (!sheetName) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy sheet HLC MENTOR trong file' });
    }
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const headerRowIndex = rawRows.findIndex((row) => {
      const headers = row.map(normalizeImportHeader);
      return headers.some((header) => header === 'hlc id')
        && headers.some((header) => header === 'ho va ten');
    });
    if (headerRowIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy dòng tiêu đề HLC ID và HỌ VÀ TÊN'
      });
    }

    const headers = rawRows[headerRowIndex];
    const rows = rawRows.slice(headerRowIndex + 1).map((cells, offset) => ({
      row: headerRowIndex + offset + 2,
      data: Object.fromEntries(headers.map((header, columnIndex) => [
        header || `__EMPTY_${columnIndex}`,
        cells[columnIndex] ?? ''
      ]))
    }));
    const valueOf = (data, ...names) => {
      const normalized = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [normalizeImportHeader(key), value])
      );
      return names
        .map((name) => normalized[normalizeImportHeader(name)])
        .find((value) => String(value ?? '').trim() !== '') ?? '';
    };
    const cleanPhone = (value) => {
      let phone = String(value ?? '').trim().replace(/[^\d+]/g, '');
      if (/^\+84\d{9}$/.test(phone)) phone = `0${phone.slice(3)}`;
      if (/^84\d{9}$/.test(phone)) phone = `0${phone.slice(2)}`;
      if (/^\d{9}$/.test(phone)) phone = `0${phone}`;
      return phone;
    };
    const defaultPassword = process.env.DEFAULT_MENTOR_PASSWORD || 'hlcmentor2024';
    const errors = [];
    let imported = 0;
    let updated = 0;

    for (const item of rows) {
      if (Object.values(item.data).every((value) => String(value ?? '').trim() === '')) continue;
      const userId = String(valueOf(item.data, 'HLC ID') || '').trim().replace(/\s+/g, '').toUpperCase();
      const fullName = String(valueOf(item.data, 'HỌ VÀ TÊN') || '').trim().replace(/\s+/g, ' ');
      const email = String(valueOf(item.data, 'EMAIL') || '').replace(/\s+/g, '').toLowerCase();
      if (!userId || !fullName) {
        errors.push({ row: item.row, message: 'Thiếu HLC ID hoặc HỌ VÀ TÊN' });
        continue;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: item.row, userId, message: 'Email không hợp lệ' });
        continue;
      }
      const update = {
        userId,
        fullName,
        phone: cleanPhone(valueOf(item.data, 'SĐT')),
        email,
        bankAccount: String(valueOf(item.data, 'SỐ TÀI KHOẢN') || '').trim(),
        bankName: String(valueOf(item.data, 'NGÂN HÀNG') || '').trim(),
        role: 'MENTOR'
      };
      const existing = await User.findOne({ userId }).select('_id passwordHash');
      if (existing) {
        await User.updateOne({ _id: existing._id }, { $set: update });
        updated += 1;
      } else {
        await User.create({
          ...update,
          passwordHash: await bcrypt.hash(defaultPassword, 10)
        });
        imported += 1;
      }
    }

    return res.json({
      success: true,
      data: { sheet: sheetName, total: rows.length, imported, updated, failed: errors.length, errors }
    });
  } catch (error) {
    console.error('Lỗi import Mentor:', error);
    return res.status(400).json({ success: false, message: error.message || 'Không thể import dữ liệu Mentor' });
  }
});

app.put('/api/mentoring/quarter-lock', requireRole('ADMIN'), async (req, res) => {
  try {
    const requestedQuarter = String(req.body.quarter || req.body.cycleId || '').trim().toUpperCase();
    const cycleId = /^\d{4}Q[1-4]$/.test(requestedQuarter)
      ? requestedQuarter
      : `2026${requestedQuarter.replace(/^2026/, '').replace(/^QUARTER/, 'Q')}`;
    const isLocked = req.body.isLocked;
    if (!/^2026Q[1-4]$/.test(cycleId) || typeof isLocked !== 'boolean') {
      return res.status(400).json({ success: false, message: 'quarter/cycleId hoặc isLocked không hợp lệ' });
    }
    const cycle = await Cycle.findOneAndUpdate(
      { code: cycleId },
      { $set: { isLocked } },
      { new: true }
    );
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ mentoring' });
    await MentoringPair.updateMany({ cycleId, isLocked: { $ne: isLocked } }, { $set: { isLocked } });
    res.json({ success: true, data: { cycleId, isLocked } });
  } catch (error) {
    console.error('Lỗi khóa dữ liệu mentoring:', error);
    res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái khóa dữ liệu' });
  }
});

app.post('/api/mentoring/import-pairs', requireRole('ADMIN'), importUpload.single('file'), async (req, res) => {
  try {
    const requestedCycleId = String(req.body.cycleId || '').trim().toUpperCase();
    if (requestedCycleId && !/^\d{4}Q[1-4]$/.test(requestedCycleId)) {
      return res.status(400).json({ success: false, message: 'cycleId import không hợp lệ' });
    }
    console.log('[pairs:import] cycleId requested:', requestedCycleId || '(derive from pair code)');
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel hoặc CSV' });
    const extension = String(req.file.originalname).toLowerCase().split('.').pop();
    if (!['xlsx', 'csv'].includes(extension)) {
      return res.status(400).json({ success: false, message: 'Chỉ hỗ trợ file .xlsx hoặc .csv' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const normalizeHeader = (value) => String(value || '')
      .replace(/^\uFEFF/, '')
      .replace(/["“”]/g, '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    const canonicalHeader = (value) => normalizeHeader(value).replace(/[^a-z0-9]/g, '');
    const headerKey = (value) => {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${String(value.getUTCMonth() + 1).padStart(2, '0')}${value.getUTCFullYear()}`;
      }
      const normalized = normalizeHeader(value);
      const monthMatch = normalized.match(/(?:^|\D)(\d{1,2})\s*[\/.-]\s*(\d{4})(?:\D|$)/);
      if (monthMatch) return `${String(Number(monthMatch[1])).padStart(2, '0')}${monthMatch[2]}`;
      const dateDisplayMatch = normalized.match(/(?:^|\D)(\d{1,2})\s*[\/.-]\s*\d{1,2}\s*[\/.-]\s*(\d{4})(?:\D|$)/);
      if (dateDisplayMatch) return `${String(Number(dateDisplayMatch[1])).padStart(2, '0')}${dateDisplayMatch[2]}`;
      return normalized.replace(/[^a-z0-9]/g, '');
    };
    const normalizeCell = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
    const cleanId = (value) => normalizeCell(value).replace(/\s+/g, '').toUpperCase();
    const cleanPairCode = (value) => normalizeCell(value).replace(/\s+/g, '');
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: ''
    });
    const headerRowIndex = rawRows.findIndex((row) => {
      const headers = row.map(headerKey);
      return headers.some((header) => header.includes('mamentoring'))
        && headers.some((header) => header.includes('chucdanh'));
    });
    if (headerRowIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy dòng header chứa MÃ MENTORING và CHỨC DANH'
      });
    }

    const headers = rawRows[headerRowIndex];
    const rows = rawRows.slice(headerRowIndex + 1).map((cells, offset) => ({
      sourceRow: headerRowIndex + offset + 2,
      cells,
      data: Object.fromEntries(headers.map((header, columnIndex) => [
        headerKey(header) || `__empty_${columnIndex}`,
        cells[columnIndex] ?? ''
      ]))
    }));
    const readValue = (data, ...aliases) => aliases
      .map((alias) => data[headerKey(alias)])
      .find((value) => normalizeCell(value) !== '') ?? '';
    const monthKeyToLabel = (key) => `${key.slice(0, 2)}/${key.slice(2)}`;
    const parsePairCode = (rawCode) => {
      const match = /^(\d{1,2})\/(\d{4})/.exec(cleanPairCode(rawCode));
      return match ? { month: Number(match[1]), year: Number(match[2]) } : null;
    };
    const extractStatus = (rawValue) => {
      if (!rawValue) return 'PENDING';

      const normalized = String(rawValue).trim().toLowerCase().normalize('NFC');
      const withoutAccents = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (
        normalized.includes('chưa')
        || withoutAccents.includes('chua')
        || normalized === 'chờ'
        || withoutAccents === 'cho'
        || normalized.includes('pending')
      ) {
        return 'PENDING';
      }

      if (
        normalized.includes('xong')
        || normalized.includes('done')
        || normalized === 'ok'
      ) {
        return 'COMPLETED';
      }

      return 'PENDING';
    };
    const cycleFromDate = (year, month) => `${year}Q${Math.floor((month - 1) / 3) + 1}`;
    const pairs = [];
    const errors = [];
    let currentMentorRow = null;
    let orderIndex = 1;
    const validRows = rows.filter((row) => normalizeCell(row.data.chucdanh));
    const lockedCycles = new Set(
      (await Cycle.find({ isLocked: true }).select('code').lean()).map((cycle) => cycle.code)
    );

    for (const row of validRows) {
      console.log('Tất cả các cột đọc được:', Object.keys(row.data));
      const role = normalizeCell(row.data.chucdanh).toLowerCase();

      if (role === 'mentor') {
        currentMentorRow = row;
      } else if (role === 'mentee' && currentMentorRow) {
        const mentorData = currentMentorRow.data;
        const menteeData = row.data;
        const mentorId = cleanId(mentorData.hlcid);
        const menteeId = cleanId(menteeData.hlcid);
        const sourcePairCode = cleanPairCode(mentorData.mamentoring);
        const requestedCycleMonth = requestedCycleId
          ? (Number(requestedCycleId.slice(-1)) - 1) * 3 + 1
          : null;
        const date = parsePairCode(sourcePairCode) || (
          requestedCycleId
            ? { month: requestedCycleMonth, year: Number(requestedCycleId.slice(0, 4)) }
            : null
        );

        if (!date || !mentorId || !menteeId) {
          errors.push({
            row: currentMentorRow.sourceRow,
            message: 'Cặp Mentor/Mentee thiếu MÃ MENTORING, Mentor ID hoặc Mentee ID hợp lệ'
          });
          currentMentorRow = null;
          continue;
        }

        const importedRecapStatus = Object.fromEntries(
          Object.keys(mentorData)
            .filter((key) => /^\d{6}$/.test(key))
            .map((key) => {
              const status = extractStatus(mentorData[key]);
              return [monthKeyToLabel(key), { mentor: status, mentee: status }];
            })
        );
        const pairCode = formatMentoringPairCode(date.month, date.year, mentorId, menteeId);
        const cycleId = cycleFromDate(date.year, date.month);
        pairs.push({
          orderIndex: orderIndex++,
          pairCode,
          sourcePairCode,
          cycleId,
          monthlyCode: `${String(date.month).padStart(2, '0')}${mentorId}${menteeId}`,
          mentorId,
          menteeId,
          importedRecapStatus,
          sourceRow: currentMentorRow.sourceRow
        });
        console.log('[pairs:import] parsed pair:', {
          sourceRow: currentMentorRow.sourceRow,
          pairCode,
          cycleId,
          mentorId,
          menteeId
        });
        currentMentorRow = null;
      }
    }
    if (currentMentorRow) {
      errors.push({ row: currentMentorRow.sourceRow, message: 'Dòng Mentor không có dòng Mentee đi kèm' });
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const skippedLocked = [];
    for (const pair of pairs) {
      if (lockedCycles.has(pair.cycleId)) {
        skipped += 1;
        skippedLocked.push({ pairCode: pair.pairCode, reason: 'Bỏ qua do dữ liệu quý đã bị khóa' });
        continue;
      }
      const update = {
        orderIndex: pair.orderIndex,
        pairCode: pair.pairCode,
        cycleId: pair.cycleId,
        monthlyCode: pair.monthlyCode,
        mentorId: pair.mentorId,
        menteeId: pair.menteeId,
        importedRecapStatus: pair.importedRecapStatus,
        status: 'ACTIVE',
        createdBy: req.user.userId
      };
      const existing = await MentoringPair.findOne({
        $or: [
          { pairCode: pair.pairCode },
          { pairCode: pair.sourcePairCode },
          { pairId: pair.pairCode },
          { pairId: pair.sourcePairCode },
          {
            cycleId: pair.cycleId,
            menteeId: pair.menteeId,
            monthlyCode: pair.monthlyCode
          }
        ]
      });
      if (existing) {
        if (existing.isLocked) {
          skipped += 1;
          skippedLocked.push({ pairCode: pair.pairCode, reason: 'Bỏ qua do dữ liệu đã bị khóa' });
          continue;
        }
        const existingStatuses = existing.importedRecapStatus && typeof existing.importedRecapStatus === 'object'
          ? existing.importedRecapStatus
          : {};
        const mergedStatuses = { ...existingStatuses, ...pair.importedRecapStatus };
        await MentoringPair.updateOne(
          { _id: existing._id },
          { $set: { ...update, importedRecapStatus: mergedStatuses } }
        );
        updated += 1;
      } else {
        await MentoringPair.create({ ...update, pairId: pair.pairCode });
        inserted += 1;
      }
    }

    console.log('[pairs:import] summary:', {
      requestedCycleId: requestedCycleId || null,
      rowsRead: rows.length,
      pairsRead: pairs.length,
      inserted,
      updated,
      skipped,
      failed: errors.length
    });
    return res.json({
      success: true,
      data: {
        sheet: sheetName,
        rowsRead: rows.length,
        pairsRead: pairs.length,
        importedCycleId: requestedCycleId || null,
        inserted,
        updated,
        skipped,
        skippedLocked,
        failed: errors.length,
        errors
      }
    });
  } catch (error) {
    console.error('Lỗi import cặp mentoring:', error);
    return res.status(400).json({ success: false, message: error.message || 'Không thể import cặp mentoring' });
  }
});

// ==========================================
// API: Cập nhật Mentor phụ trách
// ==========================================
app.patch('/api/users/mentees/:id/assign', requireRole('ADMIN'), async (req, res) => {
  try {
    const { mentorId } = req.body;
    // Tìm Mentee theo userId (VD: MT01) và cập nhật
    const updatedMentee = await User.findOneAndUpdate(
      { userId: req.params.id }, 
      { mentorId }, 
      { new: true }
    );
    res.json({ success: true, data: updatedMentee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ==========================================
// API: Admin tạo tài khoản hoặc đặt lại mật khẩu
// ==========================================
app.post('/api/users', requireRole('ADMIN'), async (req, res) => {
  try {
    const { userId, fullName, role, password, mentorId, team, position } = req.body;
    if (!userId || !fullName || !password || !['ADMIN', 'MENTOR', 'MENTEE'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin tài khoản hợp lệ' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' });
    }
    const user = await User.create({
      userId: userId.trim().toUpperCase(),
      fullName,
      role,
      mentorId: mentorId || null,
      team: team || '',
      position: position || '',
      passwordHash: await bcrypt.hash(password, 12)
    });
    res.status(201).json({
      success: true,
      data: { userId: user.userId, fullName: user.fullName, role: user.role, mentorId: user.mentorId }
    });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Mã thành viên đã tồn tại' });
    console.error('Lỗi tạo tài khoản:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.patch('/api/users/:id/password', requireRole('ADMIN'), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' });
    }
    const user = await User.findOneAndUpdate(
      { userId: req.params.id.toUpperCase() },
      { passwordHash: await bcrypt.hash(password, 12) },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    res.json({ success: true, message: 'Đã cập nhật mật khẩu' });
  } catch (error) {
    console.error('Lỗi cập nhật mật khẩu:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ==========================================
// API: Lưu minh chứng (Submission) mới
// ==========================================
app.post('/api/submissions', async (req, res) => {
  try {
    const {
      userId: requestedUserId,
      submissionType,
      moduleCode,
      cycleId,
      assignmentId,
      moduleId,
      mentorId,
      pairId,
      content,
      note
    } = req.body;
    const userId = req.user.role === 'ADMIN' && requestedUserId ? requestedUserId : req.user.userId;
    const activeCycle = cycleId ? null : await Cycle.findOne({ status: { $in: ['OPEN', 'CALCULATING', 'REVIEWING'] } }).sort({ startDate: -1 });
    if (!(moduleCode || submissionType)) {
      return res.status(400).json({ success: false, message: 'Thiếu userId hoặc moduleCode' });
    }

    // Tạo bản ghi mới dựa trên dữ liệu Frontend gửi lên
    const newSubmission = new Submission({
      userId,
      cycleId: cycleId || activeCycle?.code,
      assignmentId,
      moduleId,
      moduleCode: moduleCode || submissionType,
      submissionType,
      mentorId,
      pairId,
      content,
      note
    });

    // Lưu vào MongoDB
    const savedSubmission = await newSubmission.save();
    
    res.status(201).json({
      success: true,
      message: 'Lưu báo cáo thành công!',
      data: savedSubmission
    });
  } catch (error) {
    console.error('Lỗi API lưu submission:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Server đang chạy tại http://localhost:${PORT}`);
});
// ==========================================
// API: Lấy danh sách tất cả minh chứng HLC Fund
// ==========================================
app.get('/api/submissions/fund', async (req, res) => {
  try {
    // Lấy tất cả bài nộp loại HLC_FUND, sắp xếp mới nhất lên đầu
    const submissions = await Submission.find({ submissionType: 'HLC_FUND' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    console.error('Lỗi lấy danh sách:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ==========================================
// API: Cập nhật trạng thái (Duyệt / Từ chối)
// ==========================================
app.patch('/api/submissions/:id/status', requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;
    const submission = await Submission.findById(id);
    if (!submission) return res.status(404).json({ success: false, message: 'Không tìm thấy bài nộp' });

    submission.status = status;
    submission.feedback = feedback || submission.feedback || '';
    submission.reviewerId = req.user.userId;
    submission.reviewedAt = new Date();
    await submission.save();

    if (status === 'APPROVED') {
      await awardSubmissionApprovedScore(submission);
    }

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.get('/api/fund/summary', async (req, res) => {
  try {
    const result = await Submission.aggregate([
      { $match: { submissionType: 'HLC_FUND' } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const payload = {
      total: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      SUBMITTED: 0,
      MISSING: 0
    };
    for (const item of result) {
      payload.total += item.count;
      if (payload[item._id] !== undefined) payload[item._id] = item.count;
    }
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Lỗi thống kê quỹ HLC:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.get('/api/dashboard/overview', async (req, res) => {
  try {
    const cycleId = req.query.cycleId || (await Cycle.findOne().sort({ startDate: -1 }))?.code;
    const[menteeCount, mentorCount, pairCount, submittedCount, approvedCount, fundSummary] = await Promise.all([
      User.countDocuments({ role: 'MENTEE', isActive: true }),
      User.countDocuments(mentorUserFilter),
      MentoringPair.countDocuments(cycleId ? { cycleId } : {}),
      Submission.countDocuments(cycleId ? { cycleId, status: { $in: ['SUBMITTED', 'APPROVED', 'IN_REVIEW'] } } : { status: { $in: ['SUBMITTED', 'APPROVED', 'IN_REVIEW'] } }),
      Submission.countDocuments(cycleId ? { cycleId, status: 'APPROVED' } : { status: 'APPROVED' }),
      Submission.aggregate([
        { $match: { submissionType: 'HLC_FUND' } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const summaries = await AllowanceSummary.find(cycleId ? { cycleId } : {}).sort({ totalScore: -1 }).limit(5);
    const topMentees = await Promise.all(
      summaries.map(async (summary) => {
        const user = await User.findOne({ userId: summary.userId }).select('userId fullName position');
        return {
          userId: summary.userId,
          fullName: user ? user.fullName : 'Unknown',
          totalScore: summary.totalScore,
          finalAmount: summary.finalAmount,
          position: user ? user.position : ''
        };
      })
    );

    const weakMentees = await AllowanceSummary.find(cycleId ? { cycleId } : {}).sort({ totalScore: 1 }).limit(5);
    const topPairs = await MentoringPair.find(cycleId ? { cycleId } : {}).sort({ rating: -1, updatedAt: -1 }).limit(5).lean();

    const fundMap = { total: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, SUBMITTED: 0, MISSING: 0 };
    for (const item of fundSummary) {
      fundMap.total += item.count;
      if (fundMap[item._id] !== undefined) fundMap[item._id] = item.count;
    }

    res.json({
      success: true,
      data: {
        cycleId,
        metrics: {
          totalMentees: menteeCount,
          totalMentors: mentorCount,
          totalPairs: pairCount,
          submittedItems: submittedCount,
          approvedItems: approvedCount,
          fundStatus: fundMap
        },
        topMentees,
        needsImprovement: weakMentees,
        topPairs
      }
    });
  } catch (error) {
    console.error('Lỗi lấy dashboard overview:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ==========================================
// API: Kỳ hoạt động theo tháng
// ==========================================
app.get('/api/cycles', async (req, res) => {
  try {
    const allCycles = await Cycle.find().sort({ startDate: -1 });
    const cycles = req.user?.role === 'ADMIN' ? allCycles : allCycles.filter((cycle) => isCycleVisibleToMember(cycle));
    res.json({ success: true, data: cycles });
  } catch (error) {
    console.error('Lỗi lấy kỳ hoạt động:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/cycles', async (req, res) => {
  try {
    const { code, name, year, quarter: quarterNumber, startDate, endDate, pointRate, baseAllowance } = req.body;
    const requestedDates = year && quarterNumber
      ? quarterDates(year, quarterNumber)
      : { startDate, endDate };
    if (!name || !requestedDates.startDate || !requestedDates.endDate) {
      return res.status(400).json({ success: false, message: 'Thông tin kỳ hoạt động không hợp lệ' });
    }
    const quarter = validateQuarter(requestedDates.startDate, requestedDates.endDate);
    const now = new Date();
    const currentQuarter = Math.floor(now.getUTCMonth() / 3) + 1;
    const currentQuarterEndMonth = currentQuarter * 3 - 1;
    const canOpenNextQuarter = now.getUTCMonth() === currentQuarterEndMonth && now.getUTCDate() >= 10;
    const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1;
    const nextYear = currentQuarter === 4 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
    const requestedQuarter = { year: quarter.startDate.getUTCFullYear(), quarter: Math.floor(quarter.startDate.getUTCMonth() / 3) + 1 };
    if (!canOpenNextQuarter || requestedQuarter.year !== nextYear || requestedQuarter.quarter !== nextQuarter) {
      return res.status(400).json({ success: false, message: 'Chỉ được tạo quý kế tiếp từ ngày 10 của tháng cuối quý hiện tại' });
    }
    const cycle = await Cycle.create({ code: code || quarter.code, name, ...quarter, pointRate, baseAllowance });
    res.status(201).json({ success: true, data: cycle });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Mã kỳ hoạt động đã tồn tại' });
    }
    if (error instanceof Error && (
      error.message.includes('Khoảng thời gian') ||
      error.message.includes('Kỳ mentoring') ||
      error.message.includes('Chỉ được tạo quý')
    )) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Lỗi tạo kỳ hoạt động:', error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Lỗi server' });
  }
});

app.get('/api/mentoring/pairs', async (req, res) => {
  try {
    const query = {};
    console.log('[pairs:request] role:', req.user?.role);
    console.log('[pairs:request] UserID đang gọi:', req.user?._id);
    console.log('[pairs:request] userId from token:', req.user?.userId);
    console.log('[pairs:request] Query Params:', req.query);
    const requestedCycleId = req.query.cycleId
      ? String(req.query.cycleId).trim().toUpperCase()
      : '';
    if (requestedCycleId) query.cycleId = requestedCycleId;
    if (req.user.role !== 'ADMIN') {
      query.$or = [
        { mentorId: exactUserIdRegex(req.user.userId) },
        { menteeId: exactUserIdRegex(req.user.userId) }
      ];
    }
    console.log('[pairs:request] Query tìm kiếm:', query);
    const pairs = await MentoringPair.find(query)
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();
    console.log('[pairs:request] result count:', pairs.length);
    console.log('[pairs:request] result cycles:', [...new Set(pairs.map((pair) => pair.cycleId))]);
    if (req.user.role === 'ADMIN') {
      return res.json({ success: true, data: pairs.map((pair) => ({ ...pair, pairCode: pairCodeForRecord(pair) })) });
    }
    res.json({ success: true, data: pairs });
  } catch (error) {
    console.error('Lỗi lấy cặp mentoring:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/mentoring/pairs', requireRole('ADMIN'), async (req, res) => {
  try {
    console.log('[pairs:create] Payload nhận được:', req.body);
    const { cycleId: rawCycleId, mentorId: rawMentorId, menteeId: rawMenteeId, status, monthCode } = req.body;
    const cycleId = String(rawCycleId || '').trim().toUpperCase();
    const mentorId = String(rawMentorId || '').trim().toUpperCase();
    const menteeId = String(rawMenteeId || '').trim().toUpperCase();
    if (!cycleId || !mentorId || !menteeId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin ghép cặp' });
    }

    const cycle = await Cycle.findOne({ code: cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ mentoring' });
    if (cycle.isLocked || ['LOCKED', 'EXPORTED', 'PAID'].includes(cycle.status)) {
      return res.status(409).json({ success: false, message: 'Quý đã bị khóa, không thể tạo hoặc sửa cặp mentoring' });
    }
    const now = new Date();
    const pairingOpensAt = pairingStartDate(cycle);
    console.log('[pairs:create] pairing window:', {
      now: now.toISOString(),
      pairingOpensAt: pairingOpensAt.toISOString(),
      isOpen: now >= pairingOpensAt,
      cycleStart: new Date(cycle.startDate).toISOString()
    });
    if (now < pairingOpensAt) {
      return res.status(409).json({
        success: false,
        code: 'PAIRING_WINDOW_NOT_OPEN',
        message: `Admin chỉ được ghép cặp từ ${pairingOpensAt.toISOString()}`
      });
    }
    const activeUserFilter = {
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    };
    const mentor = await User.findOne({
      userId: exactUserIdRegex(mentorId),
      role: 'MENTOR',
      ...activeUserFilter
    }).lean();
    const mentee = await User.findOne({
      userId: exactUserIdRegex(menteeId),
      role: 'MENTEE',
      ...activeUserFilter
    }).lean();
    console.log('[pairs:create] participant lookup:', {
      mentor: mentor ? { userId: mentor.userId, role: mentor.role, isActive: mentor.isActive } : null,
      mentee: mentee ? { userId: mentee.userId, role: mentee.role, isActive: mentee.isActive } : null
    });
    if (!mentor || !mentee) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PARTICIPANT',
        message: 'Mentor hoặc mentee không hợp lệ hoặc đã ngừng hoạt động',
        details: {
          mentorId,
          menteeId,
          mentorFound: Boolean(mentor),
          menteeFound: Boolean(mentee)
        }
      });
    }
    const cycleStart = new Date(cycle.startDate);
    const firstMonth = cycleStart.getUTCMonth() + 1;
    const monthText = String(monthCode ?? '').trim();
    const requestedMonth = /^(?:tháng\s*)?(0?[1-9]|1[0-2])(?:\s*\/\s*\d{4})?$/i.exec(monthText);
    const selectedMonth = requestedMonth ? Number(requestedMonth[1]) : firstMonth;
    const months = [firstMonth, firstMonth + 1, firstMonth + 2];
    console.log('[pairs:create] normalized:', {
      cycleId,
      mentorId,
      menteeId,
      monthCode,
      firstMonth,
      selectedMonth,
      months
    });
    if (monthText && !requestedMonth) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_MONTH',
        message: 'monthCode phải là số từ 1 đến 12, ví dụ 10 hoặc Tháng 10',
        details: { received: monthCode, cycleId, allowedMonths: months }
      });
    }
    if (!months.includes(selectedMonth)) {
      return res.status(400).json({ success: false, message: 'Tháng ghép cặp không thuộc quý đã chọn' });
    }

    const existing = await MentoringPair.findOne({
      cycleId,
      menteeId: exactUserIdRegex(menteeId),
      status: { $ne: 'CANCELLED' }
    });
    console.log('[pairs:create] duplicate query:', {
      cycleId,
      menteeId,
      status: { $ne: 'CANCELLED' }
    });
    console.log('[pairs:create] existing pair:', existing ? {
      pairId: existing.pairId,
      cycleId: existing.cycleId,
      monthlyCode: existing.monthlyCode,
      mentorId: existing.mentorId,
      menteeId: existing.menteeId,
      status: existing.status
    } : null);
    if (existing && !exactUserIdRegex(mentorId).test(existing.mentorId)) {
      return res.status(409).json({ success: false, message: 'Mentee này đã được ghép với mentor khác trong quý đã chọn' });
    }
    if (existing?.isLocked) {
      return res.status(409).json({ success: false, message: 'Cặp mentoring đã bị khóa' });
    }

    const syncedPairs = [];
    for (const month of months) {
      const code = `${String(month).padStart(2, '0')}${mentorId}${menteeId}`;
      const pairCode = formatMentoringPairCode(month, cycleStart.getUTCFullYear(), mentorId, menteeId);
      console.log('[pairs:create] month upsert:', {
        month,
        monthlyCode: code,
        pairCode
      });
      const syncedPair = await MentoringPair.findOneAndUpdate(
        { cycleId, menteeId, monthlyCode: `${String(month).padStart(2, '0')}${mentorId}${menteeId}` },
        {
          $set: { pairCode, mentorId, menteeId, status: status || 'ACTIVE', createdBy: req.user.userId },
          $setOnInsert: {
            pairId: pairCode,
            cycleId,
            monthlyCode: code
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      );
      syncedPairs.push(syncedPair);
    }

    res.status(201).json({ success: true, data: syncedPairs[0], syncedMonths: months });
  } catch (error) {
    console.error('[pairs:create] Lỗi ghép cặp:', error);
    console.error('[pairs:create] error.message:', error?.message);
    console.error('[pairs:create] error.errors:', error?.errors);
    console.error('[pairs:create] error.name/code/keyValue:', {
      name: error?.name,
      code: error?.code,
      keyValue: error?.keyValue
    });
    if (error && error.name === 'ValidationError') {
      console.error('[pairs:create] Mongoose validation errors:', error.errors);
      const validationErrors = Object.fromEntries(
        Object.entries(error.errors || {}).map(([field, detail]) => [field, {
          message: detail.message,
          kind: detail.kind,
          value: detail.value,
          path: detail.path
        }])
      );
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu ghép cặp không hợp lệ',
        errors: validationErrors,
        details: {
          name: error.name,
          message: error.message
        }
      });
    }
    if (error && error.code === 11000) {
      console.error('[pairs:create] Duplicate key:', error.keyValue);
      return res.status(409).json({
        success: false,
        message: 'Cặp mentoring đã tồn tại',
        keyValue: error.keyValue
      });
    }
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Dữ liệu không hợp lệ',
      details: error && typeof error === 'object' ? {
        name: error.name,
        code: error.code,
        keyValue: error.keyValue,
        errors: error.errors,
        message: error.message
      } : undefined
    });
  }
});

app.patch('/api/mentoring/pairs/:pairId', requireRole('ADMIN'), async (req, res) => {
  try {
    const { status, rating, ratingComment, mentorId, menteeId, monthlyCode } = req.body;
    const requestedPairId = decodeURIComponent(String(req.params.pairId || ''));
    console.log('[pairs:update] pairId:', requestedPairId);
    const currentPair = await MentoringPair.findOne({ pairId: requestedPairId });
    if (!currentPair) return res.status(404).json({ success: false, message: 'Không tìm thấy cặp mentoring' });
    const currentCycle = await Cycle.findOne({ code: currentPair.cycleId });
    if (currentPair.isLocked || currentCycle?.isLocked || ['LOCKED', 'EXPORTED', 'PAID'].includes(currentCycle?.status)) {
      return res.status(409).json({ success: false, message: 'Quý đã bị khóa, không thể sửa cặp mentoring' });
    }

    const targetMentorId = mentorId || currentPair.mentorId;
    const targetMenteeId = menteeId || currentPair.menteeId;
    const cycle = currentCycle;
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ mentoring' });
    const firstMonth = new Date(cycle.startDate).getUTCMonth() + 1;
    const months = [firstMonth, firstMonth + 1, firstMonth + 2];
    const updates = { status, rating, ratingComment, mentorId: targetMentorId, menteeId: targetMenteeId };
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);
    if (targetMenteeId !== currentPair.menteeId) {
      await MentoringPair.deleteMany({
        cycleId: currentPair.cycleId,
        menteeId: currentPair.menteeId,
        monthlyCode: { $regex: '^(0?[1-9]|1[0-2])' }
      });

    }
    const syncedPairs = [];
    for (const month of months) {
      const code = `${String(month).padStart(2, '0')}${targetMentorId}${targetMenteeId}`;
      const pairCode = formatMentoringPairCode(month, new Date(cycle.startDate).getUTCFullYear(), targetMentorId, targetMenteeId);
      const pair = await MentoringPair.findOneAndUpdate(
        { cycleId: currentPair.cycleId, menteeId: targetMenteeId, monthlyCode: new RegExp(`^${String(month).padStart(2, '0')}`) },
        {
          $set: { ...updates, pairCode, monthlyCode: code },
          $setOnInsert: {
            pairId: pairCode,
            cycleId: currentPair.cycleId,
            createdBy: req.user.userId
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      );
      syncedPairs.push(pair);
    }
    const pair = syncedPairs.find((item) => item.pairId === requestedPairId) || syncedPairs[0];

    if (Number(rating) >= 4) {
      const rule = await RewardRule.findOne({ code: 'PAIR_RATING', isActive: true });
      if (rule) {
        await addSystemScoreEvent({
          userId: targetMenteeId,
          cycleId: pair.cycleId,
          ruleId: rule.code,
          category: rule.category,
          sourceType: 'PAIR_RATING',
          sourceId: pair.pairId,
          points: Number(rule.points),
          description: `Đánh giá cặp ${pair.pairId} đạt ${rating}/5`,
          approvedBy: 'SYSTEM'
        });
      }
    }

    res.json({ success: true, data: pair, syncedMonths: months });
  } catch (error) {
    console.error('Lỗi cập nhật cặp mentoring:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.delete('/api/mentoring/pairs/:pairId', requireRole('ADMIN'), async (req, res) => {
  try {
    const requestedPairId = decodeURIComponent(String(req.params.pairId || ''));
    const pair = await MentoringPair.findOne({ pairId: requestedPairId });
    if (!pair) return res.status(404).json({ success: false, message: 'Không tìm thấy cặp mentoring' });
    const cycle = await Cycle.findOne({ code: pair.cycleId });
    if (pair.isLocked || cycle?.isLocked || ['LOCKED', 'EXPORTED', 'PAID'].includes(cycle?.status)) {
      return res.status(409).json({ success: false, message: 'Quý đã bị khóa, không thể xóa cặp mentoring' });
    }
    await MentoringPair.deleteMany({
      cycleId: pair.cycleId,
      menteeId: pair.menteeId,
      mentorId: pair.mentorId
    });
    return res.json({ success: true, data: { pairId: requestedPairId } });
  } catch (error) {
    console.error('Lỗi xóa cặp mentoring:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa cặp mentoring' });
  }
});

app.get('/api/mentoring/schedules', async (req, res) => {
  try {
    const filter = req.query.cycleId ? { cycleId: String(req.query.cycleId) } : {};
    if (req.user.role === 'MENTOR') filter.mentorId = req.user.userId;
    if (req.user.role === 'MENTEE') filter.menteeId = req.user.userId;
    const schedules = await MentoringSchedule.find(filter).sort({ startTime: 1 });
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('Lỗi lấy lịch mentoring:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/mentoring/schedules', async (req, res) => {
  try {
    const { pairId, cycleId, mentorId, menteeId, proposedBy, startTime, endTime, location, meetingLink, note, monthCode } = req.body;
    if (!pairId || !cycleId || !mentorId || !menteeId || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin lịch mentoring' });
    }
    const cycle = await Cycle.findOne({ code: cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ hoạt động' });
    if (isCycleLocked(cycle)) return res.status(409).json({ success: false, message: 'Kỳ đã khóa, không thể sửa lịch' });
    const pair = await MentoringPair.findOne({ pairId, cycleId });
    if (!pair) return res.status(404).json({ success: false, message: 'Không tìm thấy cặp mentoring' });
    if (req.user.role !== 'MENTEE' || req.user.userId !== pair.menteeId || menteeId !== pair.menteeId || mentorId !== pair.mentorId) {
      return res.status(403).json({ success: false, message: 'Chỉ Mentee thuộc cặp mới được đề xuất lịch' });
    }
    if (new Date(startTime) >= new Date(endTime)) return res.status(400).json({ success: false, message: 'Thời gian lịch không hợp lệ' });
    if (new Date(startTime) <= new Date()) return res.status(400).json({ success: false, message: 'Thời gian mentoring phải ở tương lai' });
    const existingSchedule = await MentoringSchedule.findOne({ pairId, status: { $in: ['PROPOSED', 'CONFIRMED'] } });
    if (existingSchedule) return res.status(409).json({ success: false, message: 'Cặp đã có lịch đề xuất, hãy dùng nút Sửa để cập nhật' });
    const month = monthCode || `${String(new Date(startTime).getUTCMonth() + 1).padStart(2, '0')}${mentorId}${menteeId}`;
    const schedule = await MentoringSchedule.create({
      pairId, cycleId, monthCode: month, scheduleCode: `${month}-${pairId}`, mentorId, menteeId,
      proposedBy: req.user.userId, startTime, endTime, location, meetingLink, note
    });
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    console.error('Lỗi tạo lịch mentoring:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.patch('/api/mentoring/schedules/:id', async (req, res) => {
  try {
    const schedule = await MentoringSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch mentoring' });
    if (req.user.role !== 'ADMIN' && (req.user.role !== 'MENTEE' || req.user.userId !== schedule.menteeId)) {
      return res.status(403).json({ success: false, message: 'Chỉ Mentee của lịch mới được sửa lịch đề xuất' });
    }
    if (req.user.role !== 'ADMIN' && schedule.status !== 'PROPOSED') {
      return res.status(409).json({ success: false, message: 'Chỉ lịch đang đề xuất mới được sửa' });
    }
    const cycle = await Cycle.findOne({ code: schedule.cycleId });
    if (req.user.role !== 'ADMIN' && (isCycleLocked(cycle) || !canEditSchedule(schedule, req.user))) {
      return res.status(409).json({ success: false, message: 'Lịch đã khóa hoặc không thể chỉnh sửa' });
    }
    const allowed = ['startTime', 'endTime', 'location', 'meetingLink', 'note'];
    for (const key of allowed) if (req.body[key] !== undefined) schedule[key] = req.body[key];
    if (new Date(schedule.startTime) >= new Date(schedule.endTime)) {
      return res.status(400).json({ success: false, message: 'Thời gian lịch không hợp lệ' });
    }
    await schedule.save();
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.patch('/api/mentoring/schedules/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (status === 'CONFIRMED' && !['ADMIN', 'MENTEE'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Chỉ Mentee thuộc cặp hoặc Admin được chốt lịch mentoring' });
    }
    if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái lịch không hợp lệ' });
    }
    const current = await MentoringSchedule.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch mentoring' });
    if (status === 'CONFIRMED' && !['PROPOSED', 'CONFIRMED'].includes(current.status)) {
      return res.status(409).json({ success: false, message: 'Chỉ lịch đề xuất mới được chốt' });
    }
    const cycle = await Cycle.findOne({ code: current.cycleId });
    const isParticipant = [current.mentorId, current.menteeId].includes(req.user.userId);
    if (req.user.role !== 'ADMIN' && (isCycleLocked(cycle) || !isParticipant || (status === 'CONFIRMED' && (req.user.role !== 'MENTEE' || current.menteeId !== req.user.userId)))) {
      return res.status(409).json({ success: false, message: 'Lịch đã khóa hoặc không thể chỉnh sửa' });
    }
    const update = { status };
    if (status === 'CONFIRMED' && !current.confirmedAt) update.confirmedAt = new Date();
    const schedule = await MentoringSchedule.findByIdAndUpdate(req.params.id, update, { new: true });
    if (status === 'COMPLETED') {
      await awardMentoringCompletionScore(schedule);
    }
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Lỗi cập nhật lịch mentoring:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.patch('/api/mentoring/schedules/:id/override', requireRole('ADMIN'), async (req, res) => {
  try {
    const schedule = await MentoringSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch mentoring' });
    const allowed = ['startTime', 'endTime', 'location', 'meetingLink', 'note'];
    for (const key of allowed) if (req.body[key] !== undefined) schedule[key] = req.body[key];
    if (new Date(schedule.startTime) >= new Date(schedule.endTime)) {
      return res.status(400).json({ success: false, message: 'Thời gian lịch không hợp lệ' });
    }
    schedule.status = 'CONFIRMED';
    schedule.confirmedAt = new Date();
    schedule.proposedBy = req.user.userId;
    await schedule.save();
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Lỗi ghi đè lịch mentoring:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/mentoring/recaps', async (req, res) => {
  try {
    const filter = req.query.cycleId ? { cycleId: String(req.query.cycleId) } : {};
    const recaps = await MentoringRecap.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: recaps });
  } catch (error) {
    console.error('Lỗi lấy recap mentoring:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/mentoring/recaps', async (req, res) => {
  try {
    const { pairId, cycleId, scheduleId, role, content, mediaUrls, note } = req.body;
    const userId = req.user.userId;
    if (!pairId || !cycleId || !role || !Array.isArray(mediaUrls) || mediaUrls.filter(Boolean).length === 0) {
      return res.status(400).json({ success: false, message: 'Recap cần nội dung và ít nhất một ảnh minh chứng' });
    }
    if (!['MENTOR', 'MENTEE'].includes(role) || (role === 'MENTOR' && req.user.role !== 'MENTOR') || (role === 'MENTEE' && req.user.role !== 'MENTEE')) {
      return res.status(403).json({ success: false, message: 'Vai trò recap không hợp lệ' });
    }
    const pair = await MentoringPair.findOne({ pairId, cycleId, $or: [{ mentorId: userId }, { menteeId: userId }] });
    if (!pair) return res.status(403).json({ success: false, message: 'Bạn không thuộc cặp mentoring này' });
    const cycle = await Cycle.findOne({ code: cycleId });
    if (isCycleLocked(cycle)) return res.status(409).json({ success: false, message: 'Kỳ đã khóa, không thể gửi recap' });
    const schedule = scheduleId
      ? await MentoringSchedule.findOne({ _id: scheduleId, pairId, cycleId })
      : await MentoringSchedule.findOne({ pairId, cycleId }).sort({ startTime: -1 });
    if (!schedule || schedule.status !== 'COMPLETED') {
      return res.status(409).json({ success: false, message: 'Chỉ được gửi recap sau khi buổi mentoring hoàn tất' });
    }
    const recap = await MentoringRecap.create({
      pairId, cycleId, userId, role, content, mediaUrls: mediaUrls.filter(Boolean), note,
      monthCode: schedule?.monthCode, scheduleId: schedule ? String(schedule._id) : undefined,
      status: schedule?.confirmedAt && Date.now() - new Date(schedule.confirmedAt).getTime() > 24 * 3600000 ? 'LATE' : 'SUBMITTED'
    });
    res.status(201).json({ success: true, data: recap });
  } catch (error) {
    console.error('Lỗi lưu recap mentoring:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

async function reviewMentoringRecap(req, res, status) {
  try {
    const recap = await MentoringRecap.findById(req.params.id);
    if (!recap) return res.status(404).json({ success: false, message: 'Không tìm thấy recap mentoring' });
    recap.status = status;
    recap.reviewedBy = req.user.userId;
    recap.reviewedAt = new Date();
    if (req.body.note !== undefined) recap.note = req.body.note;
    await recap.save();
    res.json({ success: true, data: recap });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

app.patch('/api/mentoring/recaps/:id/approve', requireRole('ADMIN'), (req, res) => reviewMentoringRecap(req, res, 'APPROVED'));
app.patch('/api/mentoring/recaps/:id/reject', requireRole('ADMIN'), (req, res) => reviewMentoringRecap(req, res, 'REJECTED'));
app.patch('/api/mentoring/recaps/:id/status', requireRole('ADMIN'), async (req, res) => {
  if (!['APPROVED', 'REJECTED'].includes(req.body.status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái duyệt recap không hợp lệ' });
  }
  return reviewMentoringRecap(req, res, req.body.status);
});

app.get('/api/mentoring/pairs/status', requireRole('ADMIN'), async (req, res) => {
  try {
    const filter = req.query.cycleId ? { cycleId: String(req.query.cycleId) } : {};
    const pairs = await MentoringPair.find(filter).sort({ orderIndex: 1, createdAt: 1 }).lean();
    const data = await Promise.all(pairs.map(async (pair) => {
      const [schedules, recaps] = await Promise.all([
        MentoringSchedule.find({ pairId: pair.pairId, cycleId: pair.cycleId }).lean(),
        MentoringRecap.find({ pairId: pair.pairId, cycleId: pair.cycleId }).lean()
      ]);
      const schedule = schedules.filter((item) => item.status === 'COMPLETED' || item.status === 'CONFIRMED').sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
      const related = schedule ? recaps.filter((item) => String(item.scheduleId) === String(schedule._id)) : recaps;
      const deadline = schedule?.confirmedAt ? new Date(schedule.confirmedAt).getTime() + 24 * 3600000 : null;
      const submittedRoles = new Set(related.filter((item) => ['SUBMITTED', 'APPROVED', 'LATE'].includes(item.status)).map((item) => item.role));
      const late = related.some((item) => item.status === 'LATE') || Boolean(deadline && Date.now() > deadline);
      const importedCompleted = Object.values(pair.importedRecapStatus || {}).some((monthStatus) => {
        const values = [monthStatus?.mentor, monthStatus?.mentee]
          .map((value) => String(value || '').trim().toLowerCase());
        return values.length === 2 && values.every((value) => ['đã xong', 'da xong', 'completed', 'approved'].includes(value));
      });
      const status = !schedule && importedCompleted ? 'ĐÃ NỘP/ĐÃ XONG' : !schedule ? 'CHƯA CÓ LỊCH' : submittedRoles.size < 2
        ? (late ? 'CHƯA XONG' : 'CHỜ')
        : (related.some((item) => item.status === 'LATE') ? 'NỘP MUỘN' : 'ĐÃ NỘP/ĐÃ XONG');
      return { ...pair, pairCode: pairCodeForRecord(pair), monthlyCode: pair.monthlyCode || `${String(new Date(schedule?.startTime || Date.now()).getUTCMonth() + 1).padStart(2, '0')}${pair.mentorId}${pair.menteeId}`, scheduleCount: schedules.length, completedScheduleCount: schedules.filter((s) => s.status === 'COMPLETED').length, recapStatus: status, importedRecapStatus: pair.importedRecapStatus || {} };
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy trạng thái cặp mentoring' });
  }
});

app.post('/api/cycles/:cycleId/top-three-awards', requireRole('ADMIN'), async (req, res) => {
  try {
    const cycle = await Cycle.findOne({ code: req.params.cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ hoạt động' });
    if (isCycleLocked(cycle)) return res.status(409).json({ success: false, message: 'Kỳ đã khóa' });
    const pairs = await MentoringPair.find({ cycleId: cycle.code }).lean();
    const ranked = [];
    for (const pair of pairs) {
      const schedules = await MentoringSchedule.find({ pairId: pair.pairId, cycleId: cycle.code, status: 'COMPLETED' }).sort({ startTime: 1 }).lean();
      if (!schedules.length) continue;
      const schedule = schedules[0];
      const recaps = await MentoringRecap.find({ pairId: pair.pairId, cycleId: cycle.code, scheduleId: String(schedule._id) }).lean();
      const roles = new Set(recaps.filter((item) => ['SUBMITTED', 'APPROVED', 'LATE'].includes(item.status)).map((item) => item.role));
      if (roles.size === 2 && !recaps.some((item) => item.status === 'LATE')) ranked.push({ pair, score: new Date(schedule.startTime).getTime(), schedule });
    }
    ranked.sort((a, b) => a.score - b.score);
    const awards = topThreeAwards(ranked.slice(0, 3).map((row) => ({ userId: row.pair.pairId, score: row.score })), [5, 3, 2]);
    for (const award of awards) {
      const pair = ranked[award.rank - 1].pair;
      for (const userId of [pair.menteeId, pair.mentorId]) await addSystemScoreEvent({ userId, cycleId: cycle.code, ruleId: `TOP3_${award.rank}`, category: 'BONUS', sourceType: 'TOP_THREE_AWARD', sourceId: `${cycle.code}:${pair.pairId}`, points: award.points, description: `Giải ${award.rank} mentoring`, approvedBy: req.user.userId });
      award.pairId = pair.pairId;
    }
    res.json({ success: true, data: awards });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/cycles/:cycleId/role-points', requireRole('ADMIN'), async (req, res) => {
  try {
    const cycle = await Cycle.findOne({ code: req.params.cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ hoạt động' });
    const mentees = await User.find({ role: 'MENTEE', isActive: true }).select('userId position');
    const awardCount = [];
    for (const user of mentees) {
      await awardRoleScoreForUser(user, cycle.code);
      awardCount.push(user.userId);
    }
    res.json({ success: true, data: { cycleId: cycle.code, count: awardCount.length } });
  } catch (error) {
    console.error('Lỗi tính điểm theo vị trí:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ==========================================
// API: Assignment dùng chung cho LMS
// ==========================================
app.get('/api/assignments', async (req, res) => {
  try {
    const filter = req.query.cycleId ? { cycleId: req.query.cycleId } : {};
    const assignments = await Assignment.find(filter).sort({ deadline: 1, createdAt: -1 });
    res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Lỗi lấy assignment:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/assignments', async (req, res) => {
  try {
    const assignment = await Assignment.create(req.body);
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    console.error('Lỗi tạo assignment:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// API: Cấu hình và ghi nhận điểm
// ==========================================
app.get('/api/reward-rules', async (req, res) => {
  try {
    const rules = await RewardRule.find().sort({ category: 1, name: 1 });
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Lỗi lấy rule điểm:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/reward-rules', async (req, res) => {
  try {
    const rule = await RewardRule.create(req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Mã rule đã tồn tại' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/score-events', async (req, res) => {
  try {
    const { userId, cycleId, ruleId, category, sourceType, sourceId, points, description, approvedBy } = req.body;
    if (!userId || !cycleId || !ruleId || !category || !sourceType || points === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu sự kiện điểm' });
    }
    const cycle = await Cycle.findOne({ code: cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ hoạt động' });
    if (['LOCKED', 'EXPORTED', 'PAID'].includes(cycle.status)) {
      return res.status(409).json({ success: false, message: 'Kỳ đã khóa, không thể thêm điểm' });
    }
    const event = await ScoreEvent.create({
      userId, cycleId, ruleId, category, sourceType, sourceId, points, description, approvedBy
    });
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Sự kiện điểm này đã tồn tại' });
    }
    console.error('Lỗi tạo sự kiện điểm:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/score-events', async (req, res) => {
  try {
    const filter = {};
    if (req.query.cycleId) filter.cycleId = req.query.cycleId;
    if (req.query.userId) filter.userId = req.query.userId;
    const events = await ScoreEvent.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Lỗi lấy sự kiện điểm:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

async function calculateAllowanceSummaries(cycleId, options = {}) {
  const cycle = await Cycle.findOne({ code: cycleId });
  if (!cycle) throw new Error('Không tìm thấy kỳ hoạt động');
  const pointRate = Number(options.pointRate ?? cycle.pointRate ?? 0);
  const baseAllowance = Number(options.baseAllowance ?? cycle.baseAllowance ?? 0);
  const users = await User.find({ role: 'MENTEE' }).select('userId');
  const events = await ScoreEvent.find({ cycleId, status: { $ne: 'VOID' } });
  const byUser = new Map();

  for (const event of events) {
    if (!byUser.has(event.userId)) byUser.set(event.userId, { totalScore: 0, scoreByCategory: {} });
    const row = byUser.get(event.userId);
    row.totalScore += event.points;
    row.scoreByCategory[event.category] = (row.scoreByCategory[event.category] || 0) + event.points;
  }

  const summaries = [];
  for (const user of users) {
    const score = byUser.get(user.userId) || { totalScore: 0, scoreByCategory: {} };
    const deductionAmount = score.totalScore < 0 ? Math.abs(score.totalScore * pointRate) : 0;
    const bonusAmount = score.totalScore > 0 ? score.totalScore * pointRate : 0;
    const summary = await AllowanceSummary.findOneAndUpdate(
      { userId: user.userId, cycleId },
      {
        userId: user.userId,
        cycleId,
        scoreByCategory: score.scoreByCategory,
        totalScore: score.totalScore,
        pointRate,
        baseAllowance,
        bonusAmount,
        deductionAmount,
        finalAmount: baseAllowance + bonusAmount - deductionAmount,
        status: 'DRAFT',
        calculatedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    summaries.push(summary);
  }
  return summaries;
}

app.post('/api/cycles/:cycleId/calculate', async (req, res) => {
  try {
    const summaries = await calculateAllowanceSummaries(req.params.cycleId, req.body);
    await Cycle.updateOne({ code: req.params.cycleId }, { status: 'REVIEWING' });
    res.json({ success: true, data: summaries, count: summaries.length });
  } catch (error) {
    console.error('Lỗi tính phụ cấp:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/allowance-summaries', async (req, res) => {
  try {
    if (!req.query.cycleId) return res.status(400).json({ success: false, message: 'Thiếu cycleId' });
    const summaries = await AllowanceSummary.find({ cycleId: req.query.cycleId }).sort({ totalScore: -1 });
    const userIds = summaries.map((summary) => summary.userId);
    const users = await User.find({ userId: { $in: userIds } }).select('userId fullName role mentorId');
    const userMap = new Map(users.map((user) => [user.userId, user]));
    res.json({
      success: true,
      data: summaries.map((summary) => ({
        ...summary.toObject(),
        user: userMap.get(summary.userId) || null
      }))
    });
  } catch (error) {
    console.error('Lỗi lấy bảng phụ cấp:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.patch('/api/cycles/:cycleId/lock', async (req, res) => {
  try {
    const cycle = await Cycle.findOne({ code: req.params.cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ hoạt động' });
    await calculateAllowanceSummaries(req.params.cycleId, req.body);
    cycle.status = 'LOCKED';
    await cycle.save();
    await AllowanceSummary.updateMany({ cycleId: req.params.cycleId }, { status: 'LOCKED' });
    res.json({ success: true, data: cycle });
  } catch (error) {
    console.error('Lỗi khóa kỳ:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.patch('/api/cycles/:cycleId/unlock', requireRole('ADMIN'), async (req, res) => {
  try {
    const cycleKey = String(req.params.cycleId || '').trim();
    const cycleQuery = mongoose.isValidObjectId(cycleKey)
      ? { $or: [{ code: cycleKey.toUpperCase() }, { _id: cycleKey }] }
      : { code: cycleKey.toUpperCase() };
    const cycle = await Cycle.findOne(cycleQuery);
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy quý hoạt động' });
    if (['EXPORTED', 'PAID'].includes(cycle.status)) {
      return res.status(409).json({ success: false, message: 'Quý đã xuất báo cáo hoặc thanh toán, không thể mở khóa' });
    }
    if (cycle.status !== 'LOCKED') {
      return res.status(400).json({ success: false, message: `Quý đang ở trạng thái ${cycle.status}, không cần mở khóa` });
    }
    cycle.status = 'OPEN';
    await cycle.save();
    await AllowanceSummary.updateMany(
      { cycleId: { $in: [cycle.code, cycle._id.toString(), cycleKey] }, status: 'LOCKED' },
      { status: 'PENDING' }
    );
    res.json({ success: true, data: cycle });
  } catch (error) {
    console.error('Lỗi mở khóa quý:', error);
    res.status(500).json({ success: false, message: 'Không thể mở khóa quý' });
  }
});

// ==========================================
// API: Xuất Excel bảng phụ cấp
// ==========================================
app.get('/api/allowance-summaries/export.xlsx', async (req, res) => {
  try {
    const { cycleId } = req.query;
    if (!cycleId) return res.status(400).json({ success: false, message: 'Thiếu cycleId' });
    const summaries = await AllowanceSummary.find({ cycleId }).sort({ totalScore: -1 });
    const users = await User.find({ userId: { $in: summaries.map((item) => item.userId) } })
      .select('userId fullName role mentorId');
    const userMap = new Map(users.map((user) => [user.userId, user]));
    const rows = summaries.map((summary, index) => {
      const user = userMap.get(summary.userId);
      const categories = summary.scoreByCategory || {};
      return {
        STT: index + 1,
        'Mã thành viên': summary.userId,
        'Họ và tên': user ? user.fullName : '',
        'Vai trò': user ? user.role : '',
        'Điểm mentoring': categories.MENTORING || 0,
        'Điểm đọc sách': categories.READING || 0,
        'Điểm bài viết': categories.FAVORITE_ARTICLE || 0,
        'Điểm học tập': categories.ACADEMIC || categories.ACADEMIC_WEEKLY || 0,
        'Điểm chức vụ': categories.ROLE || 0,
        'Điểm thưởng khác': categories.BONUS || 0,
        'Điểm phạt': categories.PENALTY || 0,
        'Tổng điểm': summary.totalScore,
        'Đơn giá điểm': summary.pointRate,
        'Phụ cấp cơ bản': summary.baseAllowance,
        'Tiền thưởng': summary.bonusAmount,
        'Tiền khấu trừ': summary.deductionAmount,
        'Tổng tiền': summary.finalAmount,
        'Trạng thái': summary.status
      };
    });
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Phụ cấp');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="hlc-allowance-${cycleId}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Lỗi xuất Excel:', error);
    res.status(500).json({ success: false, message: 'Không thể xuất file Excel' });
  }
});