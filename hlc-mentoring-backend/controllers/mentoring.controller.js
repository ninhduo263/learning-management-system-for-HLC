const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('../models/User');
const MentoringPair = require('../models/MentoringPair');
const MentoringSchedule = require('../models/MentoringSchedule');
const MentoringRecap = require('../models/MentoringRecap');
const Cycle = require('../models/Cycle');
const MentorPreference = require('../models/MentorPreference');
const ScoreEvent = require('../models/ScoreEvent');

const { getCurrentTime } = require('../utils/time');
const { validateQuarter, quarterDates, monthlyMentoringCode, isCycleLocked, canEditSchedule,
  recapStatus, timingPoints, topThreeAwards, pairingStartDate,
  canMenteeChoose, canAdminPair, canViewPairing, timelineForCycle } = require('../utils/quarterlyRules');
const { recapSubmissionTime, recapDeadline, roleRecapStatus, pairRecapStatus } = require('../mentoringRecapRules');
const { generatePairingIds } = require('../utils/pairingIds');
const { pairsFromSelectedMonth } = require('../utils/pairDeletion');
const { ACTIVE_USER_QUERY, mentorUserFilter } = require('../utils/userConstants');
const { awardMentoringCompletionScore, addSystemScoreEvent } = require('../services/rewardService');

function exactUserIdRegex(userId) {
  const escaped = String(userId || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}$`, 'i');
}

async function findPairByMonthlyId(monthlyId) {
  const normalized = String(monthlyId || '').trim().toUpperCase();
  if (!normalized) return null;
  const exact = await MentoringPair.findOne({ monthlyId: normalized });
  if (exact) return exact;
  return MentoringPair.findOne({ monthlyId: new RegExp(`^${escapeRegExp(normalized)}$`, 'i') });
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

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function quarterlyIdPrefix(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/[-/]/g, '');
  const fullMatch = /^Q([1-4])(\d{4})$/.exec(normalized);
  if (fullMatch) return `Q${fullMatch[1]}${fullMatch[2]}`;
  const cycleMatch = /^(\d{4})Q([1-4])$/.exec(normalized);
  return cycleMatch ? `Q${cycleMatch[2]}${cycleMatch[1]}` : '';
}

function lastFiveUserDigits(userId) {
  const digits = String(userId || '').match(/\d/g)?.join('') || '';
  return digits.slice(-5).padStart(5, '0');
}

function formatMentoringPairCode(month, year, mentorId, menteeId) {
  return String(month).padStart(2, '0') + '/' + year + '-' + lastFiveUserDigits(mentorId) + '-' + lastFiveUserDigits(menteeId);
}

function quarterKey(date) {
  const value = new Date(date);
  return value.getUTCFullYear() * 4 + Math.floor(value.getUTCMonth() / 3);
}

function isCycleVisibleToMember(cycle, now = getCurrentTime()) {
  const distance = quarterKey(cycle.startDate) - quarterKey(now);
  return distance <= 0 || (distance === 1 && canViewPairing(cycle, now));
}

async function reviewMentoringRecap(req, res, status) {
  try {
    const recap = await MentoringRecap.findById(req.params.id);
    if (!recap) return res.status(404).json({ success: false, message: 'Không tìm thấy recap mentoring' });
    if (recap.status === 'APPROVED') {
      return res.status(409).json({ success: false, message: 'Recap đã được duyệt trước đó' });
    }
    recap.status = status;
    recap.reviewedBy = req.user.userId;
    recap.reviewedAt = getCurrentTime();
    if (req.body.note !== undefined) recap.note = req.body.note;
    await recap.save();
    res.json({ success: true, data: recap });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

const getMemberQuarterlyReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const now = getCurrentTime();
    const pairs = await getPairsByUser(userId, null, now, role);
    if (!pairs.length) return res.json({ success: true, data: [] });

    const monthlyIds = pairs.map((pair) => pair.monthlyId);
    const cycleIds = [...new Set(pairs.map((pair) => pair.cycleId))];
    const [schedules, recaps] = await Promise.all([
      MentoringSchedule.find({ cycleId: { $in: cycleIds }, monthlyId: { $in: monthlyIds } })
        .sort({ startTime: -1 })
        .lean(),
      MentoringRecap.find({
        cycleId: { $in: cycleIds },
        monthlyId: { $in: monthlyIds },
        userId,
        role
      }).sort({ createdAt: -1 }).lean()
    ]);
    const schedulesByMonthlyId = new Map();
    const recapsByMonthlyId = new Map();
    schedules.forEach((schedule) => {
      const list = schedulesByMonthlyId.get(schedule.monthlyId) || [];
      list.push(schedule);
      schedulesByMonthlyId.set(schedule.monthlyId, list);
    });
    recaps.forEach((recap) => {
      const list = recapsByMonthlyId.get(recap.monthlyId) || [];
      list.push(recap);
      recapsByMonthlyId.set(recap.monthlyId, list);
    });

    const reportsByQuarterlyId = new Map();
    for (const pair of pairs) {
      const quarterMatch = /^Q([1-4])(\d{4})O\d{5}E\d{5}$/i.exec(String(pair.quarterlyId || ''));
      const monthMatch = /^T(1[0-2]|[1-9])Q[1-4](\d{4})O\d{5}E\d{5}$/i.exec(String(pair.monthlyId || ''));
      if (!quarterMatch || !monthMatch) continue;

      const quarter = Number(quarterMatch[1]);
      const year = Number(quarterMatch[2]);
      const key = String(pair.quarterlyId).toUpperCase();
      const report = reportsByQuarterlyId.get(key) || {
        key,
        cycleId: pair.cycleId,
        quarterlyId: pair.quarterlyId,
        quarter,
        year,
        role,
        user: {
          userId,
          fullName: role === 'MENTOR' ? pair.mentor?.fullName : pair.mentee?.fullName
        },
        mentor: pair.mentor,
        mentee: pair.mentee,
        months: [],
        hasRecap: false,
        hasImportedStatus: Object.keys(pair.importedRecapStatus || {}).length > 0
      };

      const monthlySchedules = schedulesByMonthlyId.get(pair.monthlyId) || [];
      const schedule = monthlySchedules.find((item) => item.status !== 'CANCELLED') || monthlySchedules[0] || null;
      const monthlyRecaps = recapsByMonthlyId.get(pair.monthlyId) || [];
      const matchingRecaps = schedule
        ? monthlyRecaps.filter((item) => String(item.scheduleId || '') === String(schedule._id))
          .concat(monthlySchedules.length === 1 ? monthlyRecaps.filter((item) => !item.scheduleId) : [])
        : monthlyRecaps;
      const recap = matchingRecaps[0] || null;
      const month = Number(monthMatch[1]);
      const monthKey = `${String(month).padStart(2, '0')}/${year}`;
      const importedStatus = pair.importedRecapStatus?.[monthKey]
        || pair.importedRecapStatus?.[`${String(month).padStart(2, '0')}${year}`]
        || pair.importedRecapStatus?.[`${String(month).padStart(2, '0')}-${year}`];
      const importedRoleStatus = importedStatus?.[role.toLowerCase()] ?? importedStatus?.[role];
      const normalizedImportedStatus = String(importedRoleStatus || '').trim().toLowerCase();
      const importedCompletionStatus = ['nộp muộn', 'late'].includes(normalizedImportedStatus)
        ? 'LATE'
        : ['chưa xong', 'missing'].includes(normalizedImportedStatus)
          ? 'MISSING'
          : ['đã xong', 'da xong', 'đã nộp/đã xong', 'completed', 'approved'].includes(normalizedImportedStatus)
            ? 'SUBMITTED'
            : null;
      const completionStatus = recap
        ? roleRecapStatus(schedule, recap, role, now)
        : importedCompletionStatus || (schedule ? roleRecapStatus(schedule, null, role, now) : null);
      const statusLabel = completionStatus ? ({
        PENDING: 'Chờ',
        SUBMITTED: 'Đã nộp',
        MISSING: 'Chưa xong',
        LATE: 'Nộp muộn'
      }[completionStatus]) : '';

      report.months.push({
        month,
        monthKey,
        monthlyId: pair.monthlyId,
        status: statusLabel,
        schedule: schedule ? {
          id: String(schedule._id),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          status: schedule.status,
          meetingLink: schedule.meetingLink,
          location: schedule.location,
          note: schedule.note
        } : null,
        recap: recap ? {
          status: recap.status,
          completionStatus,
          content: recap.content,
          note: recap.note,
          mediaUrls: recap.mediaUrls,
          createdAt: recap.createdAt
        } : importedRoleStatus !== undefined ? {
          status: importedCompletionStatus || completionStatus || 'PENDING',
          completionStatus,
          content: '',
          note: '',
          mediaUrls: []
        } : null
      });
      report.hasRecap ||= Boolean(recap);
      report.hasImportedStatus ||= importedRoleStatus !== undefined;
      reportsByQuarterlyId.set(key, report);
    }

    const reports = [...reportsByQuarterlyId.values()]
      .map((report) => ({
        ...report,
        months: report.months.sort((left, right) => left.month - right.month),
        visible: report.hasRecap || report.hasImportedStatus
          || now.getTime() >= Date.UTC(report.year, report.quarter * 3, 1)
      }))
      .filter((report) => report.visible)
      .sort((left, right) => left.year - right.year || left.quarter - right.quarter);

    return res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Lỗi lấy báo cáo mentoring thành viên:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách mentoring theo quý' });
  }
};

const getPreferences = async (req, res) => {
  try {
    const cycleId = String(req.query.cycleId || '');
    const filter = cycleId ? { cycleId } : {};
    if (req.user.role !== 'ADMIN') filter.menteeId = req.user.userId;
    const preferences = await MentorPreference.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể lấy nguyện vọng mentor' });
  }
};

const savePreferences = async (req, res) => {
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
};

const getTimeline = async (req, res) => {
  try {
    const cycleId = String(req.query.cycleId || '').trim().toUpperCase();
    if (!cycleId) return res.status(400).json({ success: false, message: 'Cần cycleId' });
    const cycle = await Cycle.findOne({ code: cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ mentoring' });
    const timeline = timelineForCycle(cycle);
    res.json({
      success: true,
      data: {
        ...timeline,
        canMenteeChoose: req.user.role === 'MENTEE' && timeline.canMenteeChoose,
        canAdminPair: req.user.role === 'ADMIN' && timeline.canAdminPair,
        canViewPairing: req.user.role === 'ADMIN' || timeline.canViewPairing,
        readOnly: req.user.role === 'MENTOR' && timeline.canViewPairing
      }
    });
  } catch (error) {
    console.error('Lỗi lấy timeline mentoring:', error);
    res.status(500).json({ success: false, message: 'Không thể lấy timeline mentoring' });
  }
};

const getMentorPreferences = async (req, res) => {
  const mentors = await User.find(mentorUserFilter).select('userId fullName team position').sort({ fullName: 1 });
  res.json({ success: true, data: mentors });
};

const inheritPairs = async (req, res) => {
  try {
    const { cycleId, month } = req.body;
    const cycle = await Cycle.findOne({ code: cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ mentoring' });
    const monthNumber = Number(month);
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 3) {
      return res.status(400).json({ success: false, message: 'Tháng mentoring phải từ 1 đến 3' });
    }
    if (getCurrentTime() < pairingStartDate(cycle)) {
      return res.status(409).json({ success: false, message: 'Admin chỉ được ghép cặp từ ngày 10 tháng cuối quý' });
    }
    const targetCode = monthlyMentoringCode(cycle.code, monthNumber);
    const source = await MentoringPair.find({ cycleId, status: { $ne: 'CANCELLED' }, monthlyId: { $exists: true } })
      .sort({ createdAt: 1 }).lean();
    const firstByMentee = new Map();
    source.forEach((pair) => { if (!firstByMentee.has(pair.menteeId)) firstByMentee.set(pair.menteeId, pair); });
    const created = [];
    for (const pair of firstByMentee.values()) {
      const targetMonth = (new Date(cycle.startDate).getUTCMonth() + 1) + monthNumber - 1;
      const targetIds = generatePairingIds(
        targetMonth,
        new Date(cycle.startDate).getUTCFullYear(),
        pair.mentorId,
        pair.menteeId
      );
      const exists = await MentoringPair.findOne({ monthlyId: targetIds.monthlyId });
      if (exists) { created.push(exists); continue; }
      created.push(await MentoringPair.create({
        cycleId, monthlyCode: targetCode, mentorId: pair.mentorId, menteeId: pair.menteeId,
        ...targetIds,
        status: 'ACTIVE', createdBy: req.user.userId
      }));
    }
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const quarterLock = async (req, res) => {
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
};

const importPairs = async (req, res) => {
  try {
    const requestedCycleId = String(req.body.cycleId || '').trim().toUpperCase();
    if (requestedCycleId && !/^\d{4}Q[1-4]$/.test(requestedCycleId)) {
      return res.status(400).json({ success: false, message: 'cycleId import không hợp lệ' });
    }
    if (requestedCycleId) {
      const requestedCycle = await Cycle.findOne({ code: requestedCycleId });
      if (!requestedCycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ mentoring để import' });
      if (!canAdminPair(requestedCycle)) {
        return res.status(409).json({
          success: false,
          code: 'PAIRING_WINDOW_NOT_OPEN',
          message: 'Admin chỉ được import ghép cặp từ ngày 10 tháng cuối quý',
          timeline: timelineForCycle(requestedCycle)
        });
      }
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
        const pairingIds = generatePairingIds(date.month, date.year, mentorId, menteeId);
        const cycleId = cycleFromDate(date.year, date.month);
        pairs.push({
          orderIndex: orderIndex++,
          pairCode,
          sourcePairCode,
          cycleId,
          monthlyCode: `${String(date.month).padStart(2, '0')}${mentorId}${menteeId}`,
          ...pairingIds,
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
        monthlyId: pair.monthlyId,
        quarterlyId: pair.quarterlyId,
        mentorId: pair.mentorId,
        menteeId: pair.menteeId,
        importedRecapStatus: pair.importedRecapStatus,
        status: 'ACTIVE',
        createdBy: req.user.userId
      };
      const existing = await MentoringPair.findOne({
        monthlyId: pair.monthlyId
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
        await MentoringPair.create(update);
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
};

const getPairs = async (req, res) => {
  try {
    const query = {};
    const requestedCycleId = req.query.cycleId
      ? String(req.query.cycleId).trim().toUpperCase()
      : '';
    const requestedMonthlyId = req.query.monthlyId
      ? String(req.query.monthlyId).trim().toUpperCase()
      : '';
    const requestedQuarterlyId = req.query.quarterlyId
      ? String(req.query.quarterlyId).trim().toUpperCase()
      : '';
    if (req.user.role !== 'ADMIN') {
      const cycles = await Cycle.find().select('code startDate endDate status isLocked').lean();
      const visibleCycleIds = cycles
        .filter((cycle) => isCycleVisibleToMember(cycle))
        .map((cycle) => String(cycle.code).toUpperCase());
      if (requestedCycleId && !visibleCycleIds.includes(requestedCycleId)) {
        return res.json({ success: true, data: [] });
      }
      query.cycleId = requestedCycleId || { $in: visibleCycleIds };
      if (requestedMonthlyId) query.monthlyId = requestedMonthlyId;
      query.$or = [
        { mentorId: exactUserIdRegex(req.user.userId) },
        { menteeId: exactUserIdRegex(req.user.userId) }
      ];
    } else if (requestedMonthlyId) {
      query.monthlyId = requestedMonthlyId;
    } else if (requestedQuarterlyId) {
      const quarterlyFilter = quarterlyIdQuery(requestedQuarterlyId);
      if (!quarterlyFilter) return res.status(400).json({ success: false, message: 'quarterlyId không hợp lệ' });
      query.quarterlyId = quarterlyFilter;
    } else if (requestedCycleId) {
      query.cycleId = requestedCycleId;
    }
    const pairs = await MentoringPair.find(query)
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();
    res.json({ success: true, data: pairs });
  } catch (error) {
    console.error('Lỗi lấy cặp mentoring:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createPairs = async (req, res) => {
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
    const now = getCurrentTime();
    const pairingOpensAt = pairingStartDate(cycle);
    console.log('[pairs:create] pairing window:', {
      now: now.toISOString(),
      pairingOpensAt: pairingOpensAt.toISOString(),
      isOpen: now >= pairingOpensAt,
      cycleStart: new Date(cycle.startDate).toISOString()
    });
    if (!canAdminPair(cycle, now)) {
      return res.status(409).json({
        success: false,
        code: 'PAIRING_WINDOW_NOT_OPEN',
        message: `Admin chỉ được ghép cặp từ ${pairingOpensAt.toISOString()}`
      });
    }
    const mentor = await User.findOne({
      userId: exactUserIdRegex(mentorId),
      role: 'MENTOR',
      isActive: ACTIVE_USER_QUERY
    }).lean();
    const mentee = await User.findOne({
      userId: exactUserIdRegex(menteeId),
      role: 'MENTEE',
      isActive: ACTIVE_USER_QUERY
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

    const quarter = Math.floor((firstMonth - 1) / 3) + 1;
    const menteeSuffix = String(menteeId).replace(/\D/g, '').slice(-5).padStart(5, '0');
    const existingPairs = await MentoringPair.find({
      cycleId: exactUserIdRegex(cycleId),
      status: { $not: /^CANCELLED$/i },
      $or: [
        { menteeId: exactUserIdRegex(menteeId) },
        { quarterlyId: new RegExp(`^Q${quarter}${cycleStart.getUTCFullYear()}O\\d{5}E${menteeSuffix}$`, 'i') }
      ]
    }).select('monthlyId quarterlyId mentorId menteeId isLocked').lean();
    if (existingPairs.some((pair) => pair.isLocked)) {
      return res.status(409).json({ success: false, code: 'PAIR_LOCKED', message: 'Cặp mentoring đã bị khóa' });
    }
    const conflictingPair = existingPairs.find(
      (pair) => lastFiveUserDigits(pair.mentorId) !== lastFiveUserDigits(mentorId)
    );
    if (conflictingPair) {
      return res.status(409).json({
        success: false,
        code: 'MENTEE_ALREADY_PAIRED',
        message: 'Mentee này đã được ghép với mentor khác trong quý đã chọn.',
        details: { monthlyId: conflictingPair.monthlyId }
      });
    }
    if (existingPairs.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'MENTEE_ALREADY_PAIRED',
        message: 'Mentee này đã có cặp trong quý đã chọn. Hãy tải lại danh sách hoặc chỉnh sửa cặp hiện tại.',
        details: { monthlyIds: existingPairs.map((pair) => pair.monthlyId) }
      });
    }

    const monthsToSync = months.filter((month) => month >= selectedMonth);
    const targetIds = monthsToSync.map((month) => generatePairingIds(
      month,
      cycleStart.getUTCFullYear(),
      mentorId,
      menteeId
    ));
    const existingTargetPairs = await MentoringPair.find({
      monthlyId: { $in: targetIds.map((ids) => ids.monthlyId) }
    }).select('monthlyId isLocked').lean();
    if (existingTargetPairs.some((pair) => pair.isLocked)) {
      return res.status(409).json({ success: false, message: 'Một trong các tháng cần đồng bộ đã bị khóa' });
    }

    const operations = monthsToSync.map((month, index) => {
      const code = `${String(month).padStart(2, '0')}${mentorId}${menteeId}`;
      const pairingIds = targetIds[index];
      return {
        updateOne: {
          filter: { monthlyId: pairingIds.monthlyId },
          update: {
            $set: {
              ...pairingIds,
              cycleId,
              monthlyCode: code,
              mentorId,
              menteeId,
              status: status || 'ACTIVE',
              createdBy: req.user.userId
            },
            $setOnInsert: { orderIndex: index, isLocked: false, importedRecapStatus: {} }
          },
          upsert: true
        }
      };
    });
    await MentoringPair.bulkWrite(operations, { ordered: true, runValidators: true });
    const syncedPairs = await MentoringPair.find({
      monthlyId: { $in: targetIds.map((ids) => ids.monthlyId) }
    }).sort({ monthlyId: 1 }).lean();

    res.status(201).json({
      success: true,
      data: syncedPairs.find((pair) => pair.monthlyId === targetIds[0]?.monthlyId) || syncedPairs[0],
      syncedMonths: monthsToSync,
      syncedPairs
    });
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
        details: { name: error.name, message: error.message }
      });
    }
    if (error && error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 'PAIRING_ID_CONFLICT',
        message: 'Mã ghép cặp bị trùng. Danh sách đã có thể được cập nhật ở một phiên khác; hãy tải lại rồi thử lại.',
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
};

const updatePair = async (req, res) => {
  try {
    const { status, rating, ratingComment, mentorId, menteeId } = req.body;
    const requestedMonthlyId = String(req.params.monthlyId || '').trim().toUpperCase();
    console.log('[pairs:update] monthlyId:', requestedMonthlyId);
    const currentPair = await findPairByMonthlyId(requestedMonthlyId);
    if (!currentPair) return res.status(404).json({ success: false, message: 'Không tìm thấy cặp mentoring' });
    const currentCycle = await Cycle.findOne({ code: currentPair.cycleId });
    if (currentPair.isLocked || currentCycle?.isLocked || ['LOCKED', 'EXPORTED', 'PAID'].includes(currentCycle?.status)) {
      return res.status(409).json({ success: false, message: 'Quý đã bị khóa, không thể sửa cặp mentoring' });
    }

    const targetMentorId = mentorId || currentPair.mentorId;
    const targetMenteeId = menteeId || currentPair.menteeId;
    const cycle = currentCycle;
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ mentoring' });
    if (!canAdminPair(cycle)) {
      return res.status(409).json({ success: false, message: 'Chỉ có thể sửa cặp của quý hiện tại hoặc quý kế tiếp đang mở ghép cặp' });
    }
    const [targetMentor, targetMentee] = await Promise.all([
      targetMentorId !== currentPair.mentorId
        ? User.findOne({ userId: exactUserIdRegex(targetMentorId), role: 'MENTOR', isActive: ACTIVE_USER_QUERY }).select('userId')
        : null,
      targetMenteeId !== currentPair.menteeId
        ? User.findOne({ userId: exactUserIdRegex(targetMenteeId), role: 'MENTEE', isActive: ACTIVE_USER_QUERY }).select('userId')
        : null
    ]);
    if (targetMentorId !== currentPair.mentorId && !targetMentor) {
      return res.status(400).json({ success: false, code: 'INVALID_MENTOR', message: 'Mentor mới không hợp lệ hoặc đã ngừng hoạt động' });
    }
    if (targetMenteeId !== currentPair.menteeId && !targetMentee) {
      return res.status(400).json({ success: false, code: 'INVALID_MENTEE', message: 'Mentee mới không hợp lệ hoặc đã ngừng hoạt động' });
    }
    const firstMonth = new Date(cycle.startDate).getUTCMonth() + 1;
    const quarterMonths = [firstMonth, firstMonth + 1, firstMonth + 2];
    const monthlyIdMatch = /^T(1[0-2]|[1-9])Q[1-4]\d{4}O\d{5}E\d{5}$/i.exec(currentPair.monthlyId || '');
    const legacyCodeMatch = /^(0?[1-9]|1[0-2])(?:\/\d{4}|[A-Z-])/i.exec(
      currentPair.monthlyCode || currentPair.pairCode || ''
    );
    const selectedMonth = Number(monthlyIdMatch?.[1] || legacyCodeMatch?.[1] || firstMonth);
    if (!quarterMonths.includes(selectedMonth)) {
      return res.status(400).json({ success: false, message: 'Tháng của mã mentoring không thuộc quý đã chọn' });
    }
    const monthsToSync = quarterMonths.filter((month) => month >= selectedMonth);
    const updates = { status, rating, ratingComment, mentorId: targetMentorId, menteeId: targetMenteeId };
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);
    const year = new Date(cycle.startDate).getUTCFullYear();
    const targetPairIds = monthsToSync.map((month) => generatePairingIds(month, year, targetMentorId, targetMenteeId));
    const targetQuarterlyId = targetPairIds[0].quarterlyId;
    const identityChanged = targetQuarterlyId !== currentPair.quarterlyId;
    if (identityChanged) {
      const existingTarget = await MentoringPair.findOne({
        cycleId: currentPair.cycleId,
        quarterlyId: targetQuarterlyId,
        status: { $ne: 'CANCELLED' }
      }).select('monthlyId').lean();
      if (existingTarget) {
        return res.status(409).json({
          success: false,
          code: 'PAIRING_TARGET_EXISTS',
          message: 'Mentee hoặc Mentor đã có cặp khác trong quý. Tải lại danh sách trước khi sửa.'
        });
      }
    }
    const syncedPairs = [];
    for (const [index, month] of monthsToSync.entries()) {
      const code = `${String(month).padStart(2, '0')}${targetMentorId}${targetMenteeId}`;
      const pairCode = formatMentoringPairCode(month, year, targetMentorId, targetMenteeId);
      const pairingIds = targetPairIds[index];
      const pair = await MentoringPair.findOneAndUpdate(
        { monthlyId: pairingIds.monthlyId },
        {
          $set: { ...updates, pairCode, monthlyCode: code, ...pairingIds },
          $setOnInsert: {
            cycleId: currentPair.cycleId,
            createdBy: req.user.userId
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      );
      syncedPairs.push(pair);
    }
    if (identityChanged) {
      const oldMonthlyIds = monthsToSync.map((month) => generatePairingIds(
        month,
        year,
        currentPair.mentorId,
        currentPair.menteeId
      ).monthlyId);
      await MentoringPair.deleteMany({
        cycleId: currentPair.cycleId,
        $or: [{ monthlyId: { $in: oldMonthlyIds } }, { _id: currentPair._id }]
      });
    }
    const pair = syncedPairs.find((item) => item.monthlyId === requestedMonthlyId) || syncedPairs[0];

    if (Number(rating) >= 4) {
      const rule = await RewardRule.findOne({ code: 'PAIR_RATING', isActive: true });
      if (rule) {
        await addSystemScoreEvent({
          userId: targetMenteeId,
          cycleId: pair.cycleId,
          ruleId: rule.code,
          category: rule.category,
          sourceType: 'PAIR_RATING',
          sourceId: pair.monthlyId,
          points: Number(rule.points),
          description: `Đánh giá cặp ${pair.monthlyId} đạt ${rating}/5`,
          approvedBy: 'SYSTEM'
        });
      }
    }

    res.json({ success: true, data: pair, syncedMonths: monthsToSync });
  } catch (error) {
    console.error('Lỗi cập nhật cặp mentoring:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deletePair = async (req, res) => {
  try {
    const requestedMonthlyId = String(req.params.monthlyId || '').trim().toUpperCase();
    const pair = await findPairByMonthlyId(requestedMonthlyId);
    if (!pair) return res.status(404).json({ success: false, message: 'Không tìm thấy cặp mentoring' });
    const cycle = await Cycle.findOne({ code: pair.cycleId });
    if (!cycle || !canAdminPair(cycle)) {
      return res.status(409).json({ success: false, message: 'Không thể xóa cặp thuộc quý đã qua hoặc chưa mở ghép cặp' });
    }
    if (cycle?.isLocked || ['LOCKED', 'EXPORTED', 'PAID'].includes(cycle?.status)) {
      return res.status(409).json({ success: false, message: 'Quý đã bị khóa, không thể xóa cặp mentoring' });
    }
    const quarterFilter = pair.quarterlyId
      ? { cycleId: pair.cycleId, quarterlyId: pair.quarterlyId }
      : { cycleId: pair.cycleId };
    const quarterPairs = await MentoringPair.find(quarterFilter).lean();
    const pairsToDelete = pairsFromSelectedMonth(quarterPairs, pair);
    if (!pairsToDelete.length) return res.status(404).json({ success: false, message: 'Không tìm thấy cặp mentoring' });
    if (pairsToDelete.some((item) => item.isLocked)) {
      return res.status(409).json({ success: false, message: 'Một hoặc nhiều cặp từ tháng đã chọn trở đi bị khóa, không thể xóa' });
    }

    const monthlyIds = pairsToDelete.map((item) => item.monthlyId);
    const relatedFilter = { cycleId: pair.cycleId, monthlyId: { $in: monthlyIds } };
    const schedules = await MentoringSchedule.find(relatedFilter).select('_id').lean();
    const scheduleIds = schedules.map((schedule) => String(schedule._id));
    const recapFilter = relatedFilter;

    const [deletedRecaps, deletedSchedules, deletedScoreEvents] = await Promise.all([
      MentoringRecap.deleteMany(recapFilter),
      MentoringSchedule.deleteMany(relatedFilter),
      ScoreEvent.deleteMany({
        cycleId: pair.cycleId,
        $or: [
          { sourceType: 'MENTORING_SCHEDULE', sourceId: { $in: scheduleIds } },
          { sourceType: 'PAIR_RATING', sourceId: { $in: monthlyIds } },
          { sourceType: 'TOP_THREE_AWARD', sourceId: { $in: monthlyIds.map((monthlyId) => `${pair.cycleId}:${monthlyId}`) } }
        ]
      })
    ]);
    const deletedPairs = await MentoringPair.deleteMany(relatedFilter);

    return res.json({
      success: true,
      data: {
        monthlyId: pair.monthlyId,
        deletedMonthlyIds: monthlyIds,
        deleted: {
          pairs: deletedPairs.deletedCount,
          schedules: deletedSchedules.deletedCount,
          recaps: deletedRecaps.deletedCount,
          scoreEvents: deletedScoreEvents.deletedCount
        }
      }
    });
  } catch (error) {
    console.error('Lỗi xóa cặp mentoring:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa cặp mentoring' });
  }
};

const getSchedules = async (req, res) => {
  try {
    const filter = req.query.cycleId ? { cycleId: String(req.query.cycleId) } : {};
    if (req.query.monthlyId) filter.monthlyId = String(req.query.monthlyId).trim().toUpperCase();
    if (req.user.role === 'MENTOR') filter.mentorId = req.user.userId;
    if (req.user.role === 'MENTEE') filter.menteeId = req.user.userId;
    const schedules = await MentoringSchedule.find(filter).sort({ startTime: 1 }).lean();
    const schedulesWithParticipants = await attachScheduleParticipants(schedules);
    res.json({ success: true, data: schedulesWithParticipants });
  } catch (error) {
    console.error('Lỗi lấy lịch mentoring:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createSchedule = async (req, res) => {
  try {
    const {
      monthlyId, cycleId, mentorId, menteeId, startTime, endTime,
      startTimeZoneOffsetMinutes = 0, endTimeZoneOffsetMinutes = 0,
      location, meetingLink, note
    } = req.body;
    if (!monthlyId || !cycleId || !mentorId || !menteeId || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin lịch mentoring' });
    }
    const cycle = await Cycle.findOne({ code: cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ hoạt động' });
    if (isCycleLocked(cycle)) return res.status(409).json({ success: false, message: 'Kỳ đã khóa, không thể sửa lịch' });
    const pair = await MentoringPair.findOne({
      cycleId,
      monthlyId: String(monthlyId).trim().toUpperCase()
    });
    if (!pair) return res.status(404).json({ success: false, message: 'Không tìm thấy cặp mentoring' });
    const resolvedMonthlyId = pair.monthlyId;
    if (req.user.role === 'MENTEE' && !canViewPairing(cycle)) {
      return res.status(409).json({
        success: false,
        code: 'PAIRING_NOT_VISIBLE',
        message: 'Mentee chỉ được lên lịch từ ngày 25 tháng cuối quý',
        timeline: timelineForCycle(cycle)
      });
    }
    if (req.user.role !== 'MENTEE' || req.user.userId !== pair.menteeId || menteeId !== pair.menteeId || mentorId !== pair.mentorId) {
      return res.status(403).json({ success: false, message: 'Chỉ Mentee thuộc cặp mới được đề xuất lịch' });
    }
    const pairMonth = getPairScheduleMonth(pair, cycle);
    const startMonth = getScheduleLocalMonth(startTime, startTimeZoneOffsetMinutes);
    const endMonth = getScheduleLocalMonth(endTime, endTimeZoneOffsetMinutes);
    if (!pairMonth || startMonth !== pairMonth.key || endMonth !== pairMonth.key) {
      return res.status(400).json({
        success: false,
        message: `Lịch mentoring phải nằm trong tháng ${pairMonth?.month || ''}/${pairMonth?.year || ''} của cặp đã chọn`
      });
    }
    if (new Date(startTime) >= new Date(endTime)) return res.status(400).json({ success: false, message: 'Thời gian lịch không hợp lệ' });
    if (new Date(startTime) <= getCurrentTime()) return res.status(400).json({ success: false, message: 'Thời gian mentoring phải ở tương lai' });
    const existingSchedule = await MentoringSchedule.findOne({
      monthlyId: resolvedMonthlyId,
      cycleId,
      status: { $ne: 'CANCELLED' }
    });
    if (existingSchedule) return res.status(409).json({ success: false, message: 'Cặp mentoring tháng này đã có lịch, hãy dùng nút Sửa để cập nhật' });
    const schedule = await MentoringSchedule.create({
      monthlyId: resolvedMonthlyId, cycleId, monthCode: pairMonth.code, scheduleCode: `${pairMonth.code}-${resolvedMonthlyId}`, mentorId, menteeId,
      proposedBy: req.user.userId, startTime, endTime, location, meetingLink, note
    });
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    console.error('Lỗi tạo lịch mentoring:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateSchedule = async (req, res) => {
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
    if (req.user.role !== 'ADMIN' && (req.body.startTime !== undefined || req.body.endTime !== undefined)) {
      const pair = await MentoringPair.findOne({ cycleId: schedule.cycleId, monthlyId: schedule.monthlyId });
      const pairMonth = pair && getPairScheduleMonth(pair, cycle);
      const startOffset = req.body.startTimeZoneOffsetMinutes ?? 0;
      const endOffset = req.body.endTimeZoneOffsetMinutes ?? 0;
      if (!pairMonth
        || getScheduleLocalMonth(schedule.startTime, startOffset) !== pairMonth.key
        || getScheduleLocalMonth(schedule.endTime, endOffset) !== pairMonth.key) {
        return res.status(400).json({
          success: false,
          message: `Lịch mentoring phải nằm trong tháng ${pairMonth?.month || ''}/${pairMonth?.year || ''} của cặp đã chọn`
        });
      }
    }
    if (new Date(schedule.startTime) >= new Date(schedule.endTime)) {
      return res.status(400).json({ success: false, message: 'Thời gian lịch không hợp lệ' });
    }
    await schedule.save();
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateScheduleStatus = async (req, res) => {
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
    if (status === 'CONFIRMED' && !current.confirmedAt) update.confirmedAt = getCurrentTime();
    const schedule = await MentoringSchedule.findByIdAndUpdate(req.params.id, update, { new: true });
    if (status === 'COMPLETED') {
      await awardMentoringCompletionScore(schedule);
    }
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Lỗi cập nhật lịch mentoring:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const overrideScheduleStatus = async (req, res) => {
  try {
    const schedule = await MentoringSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch mentoring' });
    const allowed = ['startTime', 'endTime', 'location', 'meetingLink', 'note'];
    for (const key of allowed) if (req.body[key] !== undefined) schedule[key] = req.body[key];
    if (new Date(schedule.startTime) >= new Date(schedule.endTime)) {
      return res.status(400).json({ success: false, message: 'Thời gian lịch không hợp lệ' });
    }
    schedule.status = 'CONFIRMED';
    schedule.confirmedAt = getCurrentTime();
    schedule.proposedBy = req.user.userId;
    await schedule.save();
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Lỗi ghi đè lịch mentoring:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const getRecaps = async (req, res) => {
  try {
    const filter = req.query.cycleId ? { cycleId: String(req.query.cycleId) } : {};
    const recaps = await MentoringRecap.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: recaps });
  } catch (error) {
    console.error('Lỗi lấy recap mentoring:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createRecap = async (req, res) => {
  try {
    const { monthlyId, cycleId, scheduleId, role, content, mediaUrls, note } = req.body;
    const userId = req.user.userId;
    const normalizedContent = String(content || '').trim();
    const normalizedMediaUrls = Array.isArray(mediaUrls) ? mediaUrls.map((url) => String(url || '').trim()).filter(Boolean) : [];
    if (!monthlyId || !cycleId || !role || !normalizedContent || normalizedMediaUrls.length === 0) {
      return res.status(400).json({ success: false, message: 'Recap cần nội dung và ít nhất một ảnh minh chứng' });
    }
    if (!['MENTOR', 'MENTEE'].includes(role) || (role === 'MENTOR' && req.user.role !== 'MENTOR') || (role === 'MENTEE' && req.user.role !== 'MENTEE')) {
      return res.status(403).json({ success: false, message: 'Vai trò recap không hợp lệ' });
    }
    const pair = await MentoringPair.findOne({
      cycleId,
      monthlyId: String(monthlyId).trim().toUpperCase(),
      ...(role === 'MENTOR' ? { mentorId: userId } : { menteeId: userId })
    });
    if (!pair) return res.status(403).json({ success: false, message: 'Bạn không thuộc cặp mentoring này' });
    const cycle = await Cycle.findOne({ code: cycleId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Không tìm thấy kỳ mentoring' });
    if (isCycleLocked(cycle)) return res.status(409).json({ success: false, message: 'Kỳ đã khóa, không thể gửi recap' });
    const schedule = scheduleId
      ? await MentoringSchedule.findOne({
        _id: scheduleId,
        cycleId,
        monthlyId: pair.monthlyId
      })
      : await MentoringSchedule.findOne({
        cycleId,
        monthlyId: pair.monthlyId
      }).sort({ startTime: -1 });
    const scheduleHasEnded = schedule && new Date(schedule.endTime) <= getCurrentTime();
    if (!schedule || !scheduleHasEnded || !['COMPLETED', 'CONFIRMED'].includes(schedule.status)) {
      return res.status(409).json({ success: false, message: 'Chỉ được gửi recap sau khi lịch mentoring hoàn tất' });
    }
    if ((role === 'MENTOR' && schedule.mentorId !== userId) || (role === 'MENTEE' && schedule.menteeId !== userId)) {
      return res.status(403).json({ success: false, message: 'Bạn không thuộc lịch mentoring này' });
    }
    const recapFilter = {
      monthlyId: pair.monthlyId,
      cycleId,
      userId,
      role,
      ...(scheduleId
        ? { $or: [{ scheduleId: String(schedule._id) }, { scheduleId: { $exists: false } }, { scheduleId: null }, { scheduleId: '' }] }
        : {})
    };
    const approvedRecap = await MentoringRecap.findOne({ ...recapFilter, status: 'APPROVED' });
    if (approvedRecap) {
      return res.status(409).json({ success: false, code: 'RECAP_ALREADY_APPROVED', message: 'Recap đã được Admin duyệt và không thể sửa hoặc nộp lại' });
    }
    const existingRecap = await MentoringRecap.findOne(recapFilter).sort({ updatedAt: -1 });
    const recapData = {
      monthlyId: pair.monthlyId,
      cycleId,
      userId,
      role,
      content: normalizedContent,
      mediaUrls: normalizedMediaUrls,
      note: String(note || ''),
      monthCode: schedule.monthCode,
      scheduleId: String(schedule._id),
      submittedAt: getCurrentTime(),
      status: getCurrentTime().getTime() > recapDeadline(schedule, role) ? 'LATE' : 'SUBMITTED',
      reviewedBy: null,
      reviewedAt: null
    };
    const recap = existingRecap
      ? await MentoringRecap.findOneAndUpdate(
        { _id: existingRecap._id, status: { $ne: 'APPROVED' } },
        { $set: recapData },
        { returnDocument: 'after', runValidators: true }
      )
      : await MentoringRecap.create(recapData);
    if (!recap) {
      return res.status(409).json({ success: false, code: 'RECAP_ALREADY_APPROVED', message: 'Recap đã được Admin duyệt và không thể sửa hoặc nộp lại' });
    }
    return res.status(existingRecap ? 200 : 201).json({ success: true, data: recap });
  } catch (error) {
    console.error('Lỗi lưu recap mentoring:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateRecapStatus = async (req, res) => {
  if (!['APPROVED', 'REJECTED'].includes(req.body.status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái duyệt recap không hợp lệ' });
  }
  return reviewMentoringRecap(req, res, req.body.status);
};

const getPairsStatus = async (req, res) => {
  try {
    const now = getCurrentTime();
    const filter = {};
    if (req.query.quarterlyId) {
      const quarterlyFilter = quarterlyIdQuery(req.query.quarterlyId);
      if (!quarterlyFilter) return res.status(400).json({ success: false, message: 'quarterlyId không hợp lệ' });
      filter.quarterlyId = quarterlyFilter;
    } else if (req.query.cycleId) {
      filter.cycleId = String(req.query.cycleId).trim().toUpperCase();
    }
    const pairs = await MentoringPair.find(filter).sort({ orderIndex: 1, createdAt: 1 }).lean();
    const monthlyIds = pairs.map((pair) => pair.monthlyId).filter(Boolean);
    const cycleIds = [...new Set(pairs.map((pair) => pair.cycleId).filter(Boolean))];
    const [allSchedules, allRecaps] = await Promise.all([
      monthlyIds.length
        ? MentoringSchedule.find({ cycleId: { $in: cycleIds }, monthlyId: { $in: monthlyIds } }).lean()
        : [],
      monthlyIds.length
        ? MentoringRecap.find({ cycleId: { $in: cycleIds }, monthlyId: { $in: monthlyIds } }).lean()
        : []
    ]);
    const schedulesByMonthlyId = new Map();
    const recapsByMonthlyId = new Map();
    allSchedules.forEach((schedule) => {
      const list = schedulesByMonthlyId.get(schedule.monthlyId) || [];
      list.push(schedule);
      schedulesByMonthlyId.set(schedule.monthlyId, list);
    });
    allRecaps.forEach((recap) => {
      const list = recapsByMonthlyId.get(recap.monthlyId) || [];
      list.push(recap);
      recapsByMonthlyId.set(recap.monthlyId, list);
    });
    const data = pairs.map((pair) => {
      const schedules = schedulesByMonthlyId.get(pair.monthlyId) || [];
      const recaps = recapsByMonthlyId.get(pair.monthlyId) || [];
      const schedule = schedules.filter((item) => item.status === 'COMPLETED' || item.status === 'CONFIRMED').sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
      const matchingScheduleRecaps = schedule
        ? recaps.filter((item) => String(item.scheduleId || '') === String(schedule._id))
        : [];
      const legacyRecaps = recaps.filter((item) => !item.scheduleId);
      const related = schedule
        ? matchingScheduleRecaps.concat(
          schedules.filter((item) => item.status !== 'CANCELLED').length === 1
            ? legacyRecaps.filter((legacy) => !matchingScheduleRecaps.some((matched) => matched.role === legacy.role))
            : []
        )
        : recaps;
      const monthMatch = /^T(\d{1,2})Q[1-4](\d{4})/i.exec(pair.monthlyId || '');
      const monthKey = monthMatch
        ? `${monthMatch[1].padStart(2, '0')}/${monthMatch[2]}`
        : '';
      const importedMonthStatus = pair.importedRecapStatus?.[monthKey]
        || (monthMatch && pair.importedRecapStatus?.[`${monthMatch[1].padStart(2, '0')}${monthMatch[2]}`])
        || (monthMatch && pair.importedRecapStatus?.[`${monthMatch[1].padStart(2, '0')}-${monthMatch[2]}`]);
      const recapStatusByRole = Object.fromEntries(['MENTOR', 'MENTEE'].map((role) => {
        const roleKey = role.toLowerCase();
        const importedStatus = importedMonthStatus?.[roleKey] ?? importedMonthStatus?.[role];
        const normalizedStatus = String(importedStatus || '').trim().toLowerCase();
        const importedValue = ['đã xong', 'da xong', 'đã nộp/đã xong', 'completed', 'approved'].includes(normalizedStatus)
          ? 'COMPLETED'
          : ['nộp muộn', 'late'].includes(normalizedStatus)
            ? 'LATE'
            : ['chưa xong', 'missing'].includes(normalizedStatus)
              ? 'MISSING'
              : importedStatus !== undefined
            ? 'PENDING'
            : null;
        const roleRecap = related
          .filter((item) => item.role === role)
          .sort((left, right) => (recapSubmissionTime(right) || 0) - (recapSubmissionTime(left) || 0))[0];
        return [roleKey, importedValue || roleRecapStatus(schedule, roleRecap, role, now)];
      }));
      const importedCompleted = Object.values(pair.importedRecapStatus || {}).some((monthStatus) => {
        const values = [monthStatus?.mentor, monthStatus?.mentee]
          .map((value) => String(value || '').trim().toLowerCase());
        return values.length === 2 && values.every((value) => ['đã xong', 'da xong', 'completed', 'approved'].includes(value));
      });
      const status = !schedule && importedCompleted
        ? 'ĐÃ NỘP/ĐÃ XONG'
        : !schedule
          ? 'CHƯA CÓ LỊCH'
          : pairRecapStatus(schedule, related, now);
      return {
        ...pair,
        monthlyId: pair.monthlyId,
        quarterlyId: pair.quarterlyId,
        monthlyCode: pair.monthlyCode || `${String(new Date(schedule?.startTime || getCurrentTime()).getUTCMonth() + 1).padStart(2, '0')}${pair.mentorId}${pair.menteeId}`,
        scheduleCount: schedules.length,
        completedScheduleCount: schedules.filter((s) => s.status === 'COMPLETED').length,
        recapStatus: status,
        recapStatusByRole,
        importedRecapStatus: pair.importedRecapStatus || {}
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy trạng thái cặp mentoring' });
  }
};

const exportQuarterlyReport = async (req, res) => {
  try {
    const now = getCurrentTime();
    const year = Number(req.params.year);
    const quarter = Number(req.params.quarter);
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
      return res.status(400).json({ success: false, message: 'Năm hoặc quý không hợp lệ' });
    }
    const quarterEnd = Date.UTC(year, quarter * 3, 1);
    if (getCurrentTime().getTime() < quarterEnd) {
      return res.status(409).json({ success: false, message: 'Chỉ có thể xuất file sau khi quý hoàn thành' });
    }

    const cycleId = `${year}Q${quarter}`;
    const quarterlyPattern = new RegExp(`^Q${quarter}${year}O\\d{5}E\\d{5}$`, 'i');
    const pairs = await MentoringPair.find({ cycleId, quarterlyId: quarterlyPattern })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();
    if (!pairs.length) return res.status(404).json({ success: false, message: 'Quý này chưa có dữ liệu mentoring để xuất' });

    const monthlyIds = pairs.map((pair) => pair.monthlyId);
    const [schedules, recaps, users] = await Promise.all([
      MentoringSchedule.find({ cycleId, monthlyId: { $in: monthlyIds } }).lean(),
      MentoringRecap.find({ cycleId, monthlyId: { $in: monthlyIds } }).lean(),
      User.find({ userId: { $in: [...new Set(pairs.flatMap((pair) => [pair.mentorId, pair.menteeId]))] } })
        .select('userId fullName profileUrl')
        .lean()
    ]);
    const usersById = new Map(users.map((user) => [user.userId, user]));
    const schedulesByMonthlyId = new Map();
    const recapsByMonthlyId = new Map();
    schedules.forEach((schedule) => {
      const monthSchedules = schedulesByMonthlyId.get(schedule.monthlyId) || [];
      monthSchedules.push(schedule);
      schedulesByMonthlyId.set(schedule.monthlyId, monthSchedules);
    });
    recaps.forEach((recap) => {
      const monthRecaps = recapsByMonthlyId.get(recap.monthlyId) || [];
      monthRecaps.push(recap);
      recapsByMonthlyId.set(recap.monthlyId, monthRecaps);
    });

    const pairsByQuarterlyId = new Map();
    pairs.forEach((pair) => {
      const quarterPairs = pairsByQuarterlyId.get(pair.quarterlyId) || [];
      quarterPairs.push(pair);
      pairsByQuarterlyId.set(pair.quarterlyId, quarterPairs);
    });
    const months = [1, 2, 3].map((offset) => (quarter - 1) * 3 + offset);
    const rows = [];
    for (const quarterPairs of pairsByQuarterlyId.values()) {
      const firstPair = quarterPairs[0];
      const pairsByMonth = new Map(quarterPairs.map((pair) => {
        const match = /^T(1[0-2]|[1-9])Q[1-4]\d{4}/i.exec(pair.monthlyId || '');
        return [match ? Number(match[1]) : 0, pair];
      }));
      for (const role of ['MENTOR', 'MENTEE']) {
        const userId = role === 'MENTOR' ? firstPair.mentorId : firstPair.menteeId;
        const user = usersById.get(userId);
        const row = {
          STT: role === 'MENTOR' ? rows.length / 2 + 1 : '',
          'Quý': `Q${quarter}/${year}`,
          'Vai trò': role === 'MENTOR' ? 'Mentor' : 'Mentee',
          'Họ và tên': user?.fullName || '',
          'HLC ID': userId,
          'Profile': user?.profileUrl || ''
        };
        for (const month of months) {
          const pair = pairsByMonth.get(month);
          const prefix = `Tháng ${String(month).padStart(2, '0')}`;
          row[`${prefix} - Mã mentoring`] = pair?.monthlyId || '';
          let status = '';
          if (pair) {
            const monthKey = `${String(month).padStart(2, '0')}/${year}`;
            const importedMonthStatus = pair.importedRecapStatus?.[monthKey]
              || pair.importedRecapStatus?.[`${String(month).padStart(2, '0')}${year}`]
              || pair.importedRecapStatus?.[`${String(month).padStart(2, '0')}-${year}`];
            const importedRoleStatus = importedMonthStatus?.[role.toLowerCase()] ?? importedMonthStatus?.[role];
            if (importedRoleStatus !== undefined) {
              const normalized = String(importedRoleStatus).trim().toLowerCase();
              status = ['nộp muộn', 'late'].includes(normalized)
                ? 'Nộp muộn'
                : ['chưa xong', 'missing'].includes(normalized)
                  ? 'Chưa xong'
                  : ['chờ', 'pending'].includes(normalized)
                    ? 'Chờ'
                    : ['đã xong', 'da xong', 'đã nộp/đã xong', 'completed', 'approved'].includes(normalized)
                      ? 'Đã nộp'
                      : 'Chưa xong';
            } else {
              const monthSchedules = schedulesByMonthlyId.get(pair.monthlyId) || [];
              const schedule = monthSchedules
                .filter((item) => item.status === 'COMPLETED' || item.status === 'CONFIRMED')
                .sort((left, right) => new Date(right.startTime) - new Date(left.startTime))[0];
              const monthRecaps = recapsByMonthlyId.get(pair.monthlyId) || [];
              const relatedRecaps = schedule
                ? monthRecaps.filter((item) => String(item.scheduleId) === String(schedule._id))
                : monthRecaps;
              const recap = relatedRecaps
                .filter((item) => item.role === role)
                .sort((left, right) => (recapSubmissionTime(right) || 0) - (recapSubmissionTime(left) || 0))[0];
              const progressStatus = roleRecapStatus(schedule, recap, role, now);
              status = {
                PENDING: 'Chờ',
                SUBMITTED: 'Đã nộp',
                MISSING: 'Chưa xong',
                LATE: 'Nộp muộn'
              }[progressStatus];
            }
          }
          row[`${prefix} - Trạng thái recap`] = status;
        }
        rows.push(row);
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), `Q${quarter} ${year}`);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="hlc-mentoring-Q${quarter}-${year}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Lỗi xuất báo cáo mentoring theo quý:', error);
    return res.status(500).json({ success: false, message: 'Không thể xuất file báo cáo quý' });
  }
};

const approveRecap = (req, res) => reviewMentoringRecap(req, res, 'APPROVED');
const rejectRecap = (req, res) => reviewMentoringRecap(req, res, 'REJECTED');

module.exports = {
  getMemberQuarterlyReport,
  getPreferences,
  savePreferences,
  getTimeline,
  getMentorPreferences,
  inheritPairs,
  quarterLock,
  importPairs,
  getPairs,
  createPairs,
  updatePair,
  deletePair,
  getSchedules,
  createSchedule,
  updateSchedule,
  updateScheduleStatus,
  overrideScheduleStatus,
  getRecaps,
  createRecap,
  updateRecapStatus,
  getPairsStatus,
  exportQuarterlyReport,
  approveRecap,
  rejectRecap
};
