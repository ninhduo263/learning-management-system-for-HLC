const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
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

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/mentoring', require('./routes/mentoring.routes'));

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
  recapStatus, timingPoints, topThreeAwards, pairingStartDate,
  canMenteeChoose, canAdminPair, canViewPairing, timelineForCycle
} = require('./utils/quarterlyRules');
const { getCurrentTime, getMockDateState, setRuntimeMockDate } = require('./utils/time');
const { generatePairingIds } = require('./utils/pairingIds');
const { pairsFromSelectedMonth } = require('./utils/pairDeletion');
const {
  recapSubmissionTime,
  recapDeadline,
  roleRecapStatus,
  pairRecapStatus
} = require('./mentoringRecapRules');

const JWT_SECRET = process.env.JWT_SECRET || 'hlc-development-secret-change-me';
const LEGACY_DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'HLC@123456';
const { importUpload } = require('./middlewares/upload.middleware');
const { ACTIVE_USER_QUERY, mentorUserFilter } = require('./utils/userConstants');

function isActiveUser(user) {
  const normalized = String(user?.isActive || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ['yes', 'co', 'active', 'true'].includes(normalized);
}





function quarterKey(date) {
  const value = new Date(date);
  return value.getUTCFullYear() * 4 + Math.floor(value.getUTCMonth() / 3);
}

function isCycleVisibleToMember(cycle, now = getCurrentTime()) {
  const distance = quarterKey(cycle.startDate) - quarterKey(now);
  return distance <= 0 || (distance === 1 && canViewPairing(cycle, now));
}

function cycleIdQuarterKey(cycleId) {
  const normalized = String(cycleId || '').trim().toUpperCase();
  const match =
    /^(\d{4})-?Q([1-4])$/.exec(normalized) ||
    /^Q([1-4])[-/]?(\d{4})$/.exec(normalized);
  if (!match) return null;

  const year = match[1].length === 4 ? Number(match[1]) : Number(match[2]);
  const quarter = match[1].length === 4 ? Number(match[2]) : Number(match[1]);
  return year * 4 + quarter - 1;
}

function isPairVisibleToMember(pair, visibleCycleIds, now) {
  const normalizedCycleId = String(pair.cycleId || '').trim().toUpperCase();
  if (visibleCycleIds.has(normalizedCycleId)) return true;

  const pairQuarterKey = cycleIdQuarterKey(normalizedCycleId);
  return pairQuarterKey !== null && pairQuarterKey <= quarterKey(now);
}

function normalizeEnvValue(value) {
  const normalized = String(value || '').trim();
  return normalized.replace(/^(['"])(.*)\1$/, '$2').trim();
}

function exactUserIdRegex(userId) {
  const escaped = String(userId || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}$`, 'i');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findPairByMonthlyId(monthlyId) {
  const normalized = String(monthlyId || '').trim().toUpperCase();
  if (!normalized) return null;
  const exact = await MentoringPair.findOne({ monthlyId: normalized });
  if (exact) return exact;
  return MentoringPair.findOne({ monthlyId: new RegExp(`^${escapeRegExp(normalized)}$`, 'i') });
}

function quarterlyIdPrefix(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/[-/]/g, '');
  const fullMatch = /^Q([1-4])(\d{4})$/.exec(normalized);
  if (fullMatch) return `Q${fullMatch[1]}${fullMatch[2]}`;
  const cycleMatch = /^(\d{4})Q([1-4])$/.exec(normalized);
  return cycleMatch ? `Q${cycleMatch[2]}${cycleMatch[1]}` : '';
}

function quarterlyIdQuery(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return null;
  if (/^Q[1-4]\d{4}O\d{5}E\d{5}$/.test(normalized)) return normalized;
  const prefix = quarterlyIdPrefix(normalized);
  return prefix ? new RegExp(`^${prefix}O\\d{5}E\\d{5}$`) : null;
}

async function getPairsByUser(userId, visibleCycleIds, now = getCurrentTime(), role) {
  const filter = {
    $or: [
      { menteeId: exactUserIdRegex(userId) },
      { mentorId: exactUserIdRegex(userId) }
    ]
  };
  filter.monthlyId = { $exists: true, $ne: '' };

  const pairs = await MentoringPair.find(filter)
    .sort({ orderIndex: 1, createdAt: 1 })
    .lean();

  const visibleIds = Array.isArray(visibleCycleIds)
    ? new Set(visibleCycleIds.map((cycleId) => String(cycleId).trim().toUpperCase()))
    : null;
  const visiblePairs = visibleIds
    ? pairs.filter((pair) => isPairVisibleToMember(pair, visibleIds, now))
    : pairs;

  if (visiblePairs.length === 0) return visiblePairs;

  const participantIds = [...new Set(visiblePairs.flatMap((pair) => [pair.mentorId, pair.menteeId]))];
  const participantUsers = await User.find({ userId: { $in: participantIds } })
    .select('userId fullName phone profileUrl')
    .lean();
  const usersById = new Map(participantUsers.map((user) => [
    String(user.userId).trim().toUpperCase(),
    user
  ]));

  return visiblePairs.map((pair) => {
    const mentor = usersById.get(String(pair.mentorId).trim().toUpperCase());
    const mentee = usersById.get(String(pair.menteeId).trim().toUpperCase());
    const counterpartId = role === 'MENTOR' ? pair.menteeId : pair.mentorId;
    const counterpart = usersById.get(String(counterpartId).trim().toUpperCase());
    const participantSummary = (id, user) => ({
      userId: id,
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      profileUrl: user?.profileUrl || ''
    });
    return {
      ...pair,
      mentor: participantSummary(pair.mentorId, mentor),
      mentee: participantSummary(pair.menteeId, mentee),
      counterpart: participantSummary(counterpartId, counterpart)
    };
  });
}

async function attachScheduleParticipants(schedules) {
  if (!schedules.length) return schedules;
  const participantIds = [...new Set(schedules.flatMap((schedule) => [schedule.mentorId, schedule.menteeId]))];
  const users = await User.find({ userId: { $in: participantIds } })
    .select('userId fullName profileUrl')
    .lean();
  const usersById = new Map(users.map((user) => [
    String(user.userId).trim().toUpperCase(),
    user
  ]));
  return schedules.map((schedule) => ({
    ...schedule,
    mentor: {
      userId: schedule.mentorId,
      fullName: usersById.get(String(schedule.mentorId).trim().toUpperCase())?.fullName || '',
      profileUrl: usersById.get(String(schedule.mentorId).trim().toUpperCase())?.profileUrl || ''
    },
    mentee: {
      userId: schedule.menteeId,
      fullName: usersById.get(String(schedule.menteeId).trim().toUpperCase())?.fullName || '',
      profileUrl: usersById.get(String(schedule.menteeId).trim().toUpperCase())?.profileUrl || ''
    }
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

app.get('/api/time/mock', authenticate, (req, res) => {
  res.json({ success: true, data: getMockDateState() });
});

app.put('/api/time/mock', authenticate, requireRole('ADMIN'), (req, res) => {
  try {
    const { date } = req.body || {};
    setRuntimeMockDate(date === null ? null : date);
    return res.json({ success: true, data: getMockDateState() });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Auth là endpoint công khai; các API còn lại phải có token.






app.get('/api/dashboard/personal', authenticate, async (req, res) => {
  try {
    const requestedUserId = String(req.query.userId || req.user.userId || '').toUpperCase();
    const userId = req.user.role === 'ADMIN' && req.query.userId ? requestedUserId : req.user.userId;
    const user = await User.findOne({ userId }).select('userId fullName role mentorId team position isActive');
    if (!user || user.isActive !== 'yes') return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const cycleCandidates = await Cycle.find().sort({ startDate: -1 });
    const now = getCurrentTime();
    const latestCycle = req.user.role === 'ADMIN'
      ? cycleCandidates[0]
      : cycleCandidates.find((cycle) => isCycleVisibleToMember(cycle, now));
    const visibleCycles = cycleCandidates.filter((cycle) =>
      req.user.role === 'ADMIN'
      || isCycleVisibleToMember(cycle, now)
    );
    const preferenceCycle = req.user.role === 'MENTEE'
      ? cycleCandidates.find((cycle) =>
        new Date(cycle.startDate) > now && canMenteeChoose(cycle, now)
      )
      : null;
    const visibleCycleIds = req.user.role === 'ADMIN'
      ? undefined
      : visibleCycles.map((cycle) => String(cycle.code).toUpperCase());
    const cycleId = req.query.cycleId || (latestCycle && latestCycle.code);
    const [scoreSummary, submissions, pairs, schedules, recaps, allowanceSummary] = await Promise.all([
      ScoreEvent.aggregate([
        { $match: { userId, ...(cycleId ? { cycleId } : {}) } },
        { $group: { _id: '$category', total: { $sum: '$points' } } }
      ]),
      Submission.find({ userId, ...(cycleId ? { cycleId } : {}) }).sort({ createdAt: -1 }).limit(20),
      getPairsByUser(userId, visibleCycleIds, now, req.user.role),
      MentoringSchedule.find({
        $or: [
          { menteeId: exactUserIdRegex(userId) },
          { mentorId: exactUserIdRegex(userId) }
        ]
      }).sort({ startTime: 1 }).lean(),
      MentoringRecap.find({ userId }).sort({ createdAt: -1 }).lean(),
      AllowanceSummary.findOne({ userId, ...(cycleId ? { cycleId } : {}) }).sort({ calculatedAt: -1 })
    ]);

    const schedulesWithParticipants = await attachScheduleParticipants(schedules);
    res.json({
      success: true,
      data: {
        user,
        cycleId,
        cycles: visibleCycles,
        preferenceCycle,
        preferenceTimeline: preferenceCycle ? timelineForCycle(preferenceCycle, now) : null,
        allowanceSummary,
        totalPoints: scoreSummary.reduce((sum, item) => sum + item.total, 0),
        scoreByCategory: Object.fromEntries(scoreSummary.map((item) => [item._id, item.total])),
        submissionCount: submissions.length,
        approvedCount: submissions.filter((item) => item.status === 'APPROVED').length,
        pendingCount: submissions.filter((item) => item.status === 'PENDING' || item.status === 'IN_REVIEW').length,
        pairCount: pairs.length,
        scheduleCount: schedules.length,
        recapCount: recaps.length,
        recentSubmissions: submissions,
        pairs,
        schedules: schedulesWithParticipants,
        recaps
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
    const now = getCurrentTime();
    if (!canMenteeChoose(cycle, now)) {
      return res.status(409).json({
        success: false,
        code: 'MENTEE_PREFERENCE_WINDOW_CLOSED',
        message: 'Mentee chỉ được gửi nguyện vọng từ ngày 5 tháng cuối quý',
        timeline: timelineForCycle(cycle, now)
      });
    }
    const ids = [...new Set(mentorIds.map((id) => String(id).trim().toUpperCase()).filter(Boolean))];
    if (ids.length < 3 || ids.length > 10) {
      return res.status(400).json({ success: false, message: 'Nguyện vọng phải có từ 3 đến 10 mentor khác nhau' });
    }
    const mentors = await User.find({ userId: { $in: ids }, role: 'MENTOR', isActive: 'yes' }).select('userId');
    if (mentors.length !== ids.length) return res.status(400).json({ success: false, message: 'Danh sách có mentor không hợp lệ' });
    const deadline = pairingStartDate(cycle);
    const user = await User.findOne({ userId: req.user.userId }).select('createdAt');
    const lateJoiner = new Date(user?.createdAt || 0) > deadline;
    const preference = await MentorPreference.findOneAndUpdate(
      { cycleId, menteeId: req.user.userId },
      { cycleId, menteeId: req.user.userId, mentorIds: ids, message: String(message || '').slice(0, 500), deadline, lateJoiner, submittedAt: getCurrentTime() },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: preference });
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


// ==========================================
// API: Lấy danh sách Mentor & Mentee
// ==========================================




















// ==========================================
// API: Cập nhật Mentor phụ trách
// ==========================================


// ==========================================
// API: Admin tạo tài khoản hoặc đặt lại mật khẩu
// ==========================================




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
      monthlyId,
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
      monthlyId,
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
    const users = await User.find({ userId: { $in: submissions.map((submission) => submission.userId) } })
      .select('userId profileUrl')
      .lean();
    const profileByUserId = new Map(users.map((user) => [user.userId, user.profileUrl]));
    const submissionsWithProfiles = submissions.map((submission) => ({
      ...submission.toObject(),
      profileUrl: profileByUserId.get(submission.userId) || ''
    }));
    res.status(200).json({ success: true, data: submissionsWithProfiles });
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
    submission.reviewedAt = getCurrentTime();
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
      User.countDocuments({ role: 'MENTEE', isActive: 'yes' }),
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

app.post('/api/cycles', requireRole('ADMIN'), async (req, res) => {
  try {
    const { code, name, year, quarter: quarterNumber, startDate, endDate, pointRate, baseAllowance } = req.body;
    const requestedDates = year && quarterNumber
      ? quarterDates(year, quarterNumber)
      : { startDate, endDate };
    if (!name || !requestedDates.startDate || !requestedDates.endDate) {
      return res.status(400).json({ success: false, message: 'Thông tin kỳ hoạt động không hợp lệ' });
    }
    const quarter = validateQuarter(requestedDates.startDate, requestedDates.endDate);
    const now = getCurrentTime();
    const currentQuarter = Math.floor(now.getUTCMonth() / 3) + 1;
    const requestedQuarter = { year: quarter.startDate.getUTCFullYear(), quarter: Math.floor(quarter.startDate.getUTCMonth() / 3) + 1 };
    const isCurrentQuarter = requestedQuarter.year === now.getUTCFullYear()
      && requestedQuarter.quarter === currentQuarter;
    const currentQuarterEndMonth = currentQuarter * 3 - 1;
    const canOpenNextQuarter = now.getUTCMonth() === currentQuarterEndMonth && now.getUTCDate() >= 10;
    const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1;
    const nextYear = currentQuarter === 4 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
    const isNextQuarter = requestedQuarter.year === nextYear
      && requestedQuarter.quarter === nextQuarter
      && canOpenNextQuarter;
    if (!isCurrentQuarter && !isNextQuarter) {
      return res.status(400).json({ success: false, message: 'Chỉ được tạo quý hiện tại hoặc quý kế tiếp từ ngày 10 của tháng cuối quý hiện tại' });
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











function getScheduleLocalMonth(value, offsetMinutes = 0) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const offset = Number(offsetMinutes);
  if (!Number.isInteger(offset) || Math.abs(offset) > 840) return null;
  const localDate = new Date(date.getTime() - offset * 60_000);
  return `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getPairScheduleMonth(pair, cycle) {
  const monthFromCode = /^(\d{1,2})/.exec(String(pair.monthlyCode || ''));
  const monthFromId = /^T(0?[1-9]|1[0-2])Q[1-4](\d{4})/i.exec(String(pair.monthlyId || ''));
  const cycleYear = /^(\d{4})Q[1-4]$/i.exec(String(pair.cycleId || ''));
  const cycleStart = cycle?.startDate ? new Date(cycle.startDate) : null;
  const month = Number(monthFromCode?.[1] || monthFromId?.[1]);
  const year = Number(monthFromId?.[2] || cycleYear?.[1] || cycleStart?.getUTCFullYear());
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) return null;
  return {
    month,
    year,
    key: `${year}-${String(month).padStart(2, '0')}`,
    code: pair.monthlyCode || `${String(month).padStart(2, '0')}${pair.mentorId}${pair.menteeId}`
  };
}





















app.post('/api/cycles/:cycleId/top-three-awards', requireRole('ADMIN'), async (req, res) => {
  try {
    const cycle = await Cycle.findOne({ code: req.params.cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ hoạt động' });
    if (isCycleLocked(cycle)) return res.status(409).json({ success: false, message: 'Kỳ đã khóa' });
    const pairs = await MentoringPair.find({ cycleId: cycle.code }).lean();
    const ranked = [];
    for (const pair of pairs) {
      const schedules = await MentoringSchedule.find({ monthlyId: pair.monthlyId, cycleId: cycle.code, status: 'COMPLETED' }).sort({ startTime: 1 }).lean();
      if (!schedules.length) continue;
      const schedule = schedules[0];
      const recaps = await MentoringRecap.find({ monthlyId: pair.monthlyId, cycleId: cycle.code, scheduleId: String(schedule._id) }).lean();
      const roles = new Set(recaps.filter((item) => ['SUBMITTED', 'APPROVED', 'LATE'].includes(item.status)).map((item) => item.role));
      if (roles.size === 2 && !recaps.some((item) => item.status === 'LATE')) ranked.push({ pair, score: new Date(schedule.startTime).getTime(), schedule });
    }
    ranked.sort((a, b) => a.score - b.score);
    const awards = topThreeAwards(ranked.slice(0, 3).map((row) => ({ userId: row.pair.monthlyId, score: row.score })), [5, 3, 2]);
    for (const award of awards) {
      const pair = ranked[award.rank - 1].pair;
      for (const userId of [pair.menteeId, pair.mentorId]) await addSystemScoreEvent({ userId, cycleId: cycle.code, ruleId: `TOP3_${award.rank}`, category: 'BONUS', sourceType: 'TOP_THREE_AWARD', sourceId: `${cycle.code}:${pair.monthlyId}`, points: award.points, description: `Giải ${award.rank} mentoring`, approvedBy: req.user.userId });
      award.monthlyId = pair.monthlyId;
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
    const mentees = await User.find({ role: 'MENTEE', isActive: 'yes' }).select('userId position');
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
        calculatedAt: getCurrentTime()
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