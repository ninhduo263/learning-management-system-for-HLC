const RewardRuleModel = require('../models/RewardRule');
const ScoreEventModel = require('../models/ScoreEvent');

const DEFAULT_REWARD_RULES = [
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

function requireText(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${fieldName} phải là chuỗi không rỗng`);
  }
  return value.trim();
}

function createRewardService({
  RewardRule = RewardRuleModel,
  ScoreEvent = ScoreEventModel
} = {}) {
  async function ensureDefaultRewardRules() {
    await Promise.all(DEFAULT_REWARD_RULES.map((definition) => RewardRule.updateOne(
      { code: definition.code },
      { $setOnInsert: definition },
      { upsert: true, runValidators: true }
    )));
  }

  async function addSystemScoreEvent({
    userId,
    cycleId,
    ruleId,
    category,
    sourceType,
    sourceId,
    points,
    description = '',
    approvedBy = 'SYSTEM'
  }) {
    const normalizedUserId = requireText(userId, 'userId');
    const normalizedCycleId = requireText(cycleId, 'cycleId');
    const normalizedRuleId = requireText(ruleId, 'ruleId');
    const normalizedCategory = requireText(category, 'category');
    const normalizedSourceType = requireText(sourceType, 'sourceType');
    const normalizedSourceId = requireText(sourceId, 'sourceId');
    const normalizedApprovedBy = requireText(approvedBy, 'approvedBy');
    const normalizedPoints = Number(points);

    if (points === undefined || points === null || !Number.isFinite(normalizedPoints) || normalizedPoints === 0) {
      throw new TypeError('points phải là số hữu hạn khác 0');
    }
    if (description !== undefined && typeof description !== 'string') {
      throw new TypeError('description phải là chuỗi');
    }

    const query = {
      userId: normalizedUserId,
      cycleId: normalizedCycleId,
      ruleId: normalizedRuleId,
      sourceId: normalizedSourceId
    };
    const eventData = {
      ...query,
      category: normalizedCategory,
      sourceType: normalizedSourceType,
      points: normalizedPoints,
      description: description.trim(),
      approvedBy: normalizedApprovedBy,
      status: 'APPROVED'
    };

    await ScoreEvent.init();
    try {
      return await ScoreEvent.findOneAndUpdate(
        query,
        { $setOnInsert: eventData },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          timestamps: false
        }
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      const existing = await ScoreEvent.findOne(query);
      if (existing) return existing;
      throw error;
    }
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
    if (moduleCodes.length && !moduleCodes.includes(moduleCode)) return;

    await addSystemScoreEvent({
      userId: submission.userId,
      cycleId: submission.cycleId,
      ruleId: rule.code,
      category: rule.category,
      sourceType: 'SUBMISSION',
      sourceId: String(submission._id),
      points: Number(rule.points),
      description: `Bài nộp ${moduleCode} được duyệt`
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
      description: 'Mentoring đã hoàn tất'
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
      description: `Điểm chức vụ ${position}`
    });
  }

  return {
    ensureDefaultRewardRules,
    addSystemScoreEvent,
    awardSubmissionApprovedScore,
    awardMentoringCompletionScore,
    awardRoleScoreForUser
  };
}

module.exports = {
  ...createRewardService(),
  createRewardService
};
