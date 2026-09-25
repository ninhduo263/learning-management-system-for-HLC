'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const MentoringPair = require('../models/MentoringPair');
const { generatePairingIds } = require('../pairingIds');

function getQuarter(quarterlyId) {
  const match = /^Q([1-4])(\d{4})O\d{5}E\d{5}$/i.exec(String(quarterlyId || ''));
  if (!match) return null;
  return { quarter: Number(match[1]), year: Number(match[2]) };
}

function importedStatusForMonth(statuses, month, year) {
  const paddedMonth = String(month).padStart(2, '0');
  const keys = [
    `${paddedMonth}/${year}`,
    `${paddedMonth}${year}`,
    `${paddedMonth}-${year}`
  ];
  const status = keys.map((key) => statuses?.[key]).find((value) => value && typeof value === 'object');
  return status ? { [`${paddedMonth}/${year}`]: status } : {};
}

async function migrate() {
  if (!process.env.MONGO_URI) throw new Error('Thiếu MONGO_URI trong file .env');
  await mongoose.connect(process.env.MONGO_URI);

  const records = await MentoringPair.find({
    quarterlyId: /^Q[1-4]\d{4}O\d{5}E\d{5}$/i
  }).sort({ createdAt: 1 }).lean();
  const byQuarterlyId = new Map();
  const byMonthlyId = new Map(records.map((record) => [record.monthlyId, record]));

  for (const record of records) {
    const quarter = getQuarter(record.quarterlyId);
    if (!quarter) continue;
    const group = byQuarterlyId.get(record.quarterlyId) || [];
    group.push(record);
    byQuarterlyId.set(record.quarterlyId, group);
  }

  const inserts = [];
  const conflicts = [];
  for (const [quarterlyId, group] of byQuarterlyId) {
    if (!group.some((record) => Object.keys(record.importedRecapStatus || {}).length > 0)) {
      continue;
    }
    const quarter = getQuarter(quarterlyId);
    const firstMonth = (quarter.quarter - 1) * 3 + 1;
    const existingByMonth = new Map();

    for (const record of group) {
      const monthMatch = /^T(1[0-2]|[1-9])Q[1-4]\d{4}/i.exec(record.monthlyId || '');
      if (monthMatch) existingByMonth.set(Number(monthMatch[1]), record);
    }

    const source = group.find((record) => Object.keys(record.importedRecapStatus || {}).length > 0)
      || existingByMonth.get(firstMonth)
      || group[0];

    for (let month = firstMonth; month < firstMonth + 3; month += 1) {
      const ids = generatePairingIds(month, quarter.year, source.mentorId, source.menteeId);
      if (ids.quarterlyId !== quarterlyId) {
        conflicts.push({ quarterlyId, monthlyId: ids.monthlyId, reason: 'Generated quarterlyId mismatch' });
        continue;
      }

      const existing = byMonthlyId.get(ids.monthlyId);
      if (existing) {
        if (existing.quarterlyId !== quarterlyId
          || existing.mentorId !== source.mentorId
          || existing.menteeId !== source.menteeId) {
          conflicts.push({ quarterlyId, monthlyId: ids.monthlyId, reason: 'Monthly ID belongs to another pair' });
        }
        continue;
      }

      const monthStatuses = importedStatusForMonth(
        source.importedRecapStatus,
        month,
        quarter.year
      );
      const monthlyCode = `${String(month).padStart(2, '0')}${source.mentorId}${source.menteeId}`;
      inserts.push({
        orderIndex: source.orderIndex,
        isLocked: source.isLocked,
        cycleId: source.cycleId,
        monthlyCode,
        ...ids,
        importedRecapStatus: monthStatuses,
        mentorId: source.mentorId,
        menteeId: source.menteeId,
        status: source.status,
        createdBy: source.createdBy || 'MONTHLY_ID_MIGRATION',
        createdAt: source.createdAt,
        updatedAt: source.updatedAt
      });
    }
  }

  if (conflicts.length) {
    console.error(JSON.stringify({ success: false, conflicts }, null, 2));
    throw new Error('Migration stopped because existing monthly IDs conflict with their quarterly pair.');
  }

  const preview = {
    quarterlyGroups: byQuarterlyId.size,
    existingMonthlyPairs: records.length,
    monthlyPairsToCreate: inserts.length,
    dryRun: !process.argv.includes('--apply')
  };
  console.log(JSON.stringify(preview, null, 2));

  if (process.argv.includes('--apply') && inserts.length) {
    await MentoringPair.insertMany(inserts, { ordered: true });
    console.log(JSON.stringify({
      success: true,
      created: inserts.length,
      verified: await MentoringPair.countDocuments({
        monthlyId: { $in: inserts.map((record) => record.monthlyId) }
      })
    }, null, 2));
  }
}

migrate()
  .catch((error) => {
    console.error(`Quarterly monthly-ID migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
