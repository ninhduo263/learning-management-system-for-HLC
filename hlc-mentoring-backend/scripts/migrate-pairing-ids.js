'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const mongoose = require('mongoose');
const { generatePairingIds } = require('../pairingIds');

const LEGACY_PAIRING_ID_PATTERN = /^(\d{1,2})\/(\d{4})-(\d{5})-(\d{5})$/;
const dryRun = process.argv.includes('--dry-run');

function findLegacyPairingId(record) {
  return [record.pairId, record.pairCode, record.monthlyCode]
    .map((value) => String(value || '').trim())
    .find((value) => LEGACY_PAIRING_ID_PATTERN.test(value));
}

function idsForPair(record) {
  if (record.monthlyId && record.quarterlyId) {
    return { monthlyId: record.monthlyId, quarterlyId: record.quarterlyId };
  }

  const legacyId = findLegacyPairingId(record);
  if (!legacyId) return null;
  const match = LEGACY_PAIRING_ID_PATTERN.exec(legacyId);
  const month = Number(match[1]);
  const year = Number(match[2]);
  return generatePairingIds(
    month,
    year,
    record.mentorId || match[3],
    record.menteeId || match[4]
  );
}

async function migrate() {
  if (!process.env.MONGO_URI) throw new Error('Thiếu MONGO_URI trong file .env');

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const pairCollection = db.collection('mentoringpairs');
  const scheduleCollection = db.collection('mentoringschedules');
  const recapCollection = db.collection('mentoringrecaps');
  const submissionCollection = db.collection('submissions');
  const pairs = await pairCollection.find({}).toArray();
  const monthlyIdByLegacyId = new Map();
  const pairOperations = [];
  let pairUpdated = 0;
  let scheduleUpdated = 0;
  let recapUpdated = 0;
  let submissionUpdated = 0;
  let pairSkipped = 0;
  const unresolvedRelated = [];

  for (const pair of pairs) {
    const ids = idsForPair(pair);
    if (!ids) {
      pairSkipped += 1;
      continue;
    }

    const legacyId = findLegacyPairingId(pair);
    if (legacyId) monthlyIdByLegacyId.set(legacyId, ids.monthlyId);

    console.log('[pairing-id:migrate]', {
      legacyId: legacyId || null,
      monthlyId: ids.monthlyId,
      quarterlyId: ids.quarterlyId,
      dryRun
    });

    if (!dryRun) {
      pairOperations.push({
        updateOne: {
          filter: { _id: pair._id },
          update: {
            $set: {
              monthlyId: ids.monthlyId,
              quarterlyId: ids.quarterlyId,
              cycleId: pair.cycleId || `${ids.quarterlyId.slice(2, 6)}Q${ids.quarterlyId.slice(1, 2)}`
            },
            $unset: { pairId: '' }
          }
        }
      });
    }
    pairUpdated += 1;
  }

  async function migrateRelatedCollection(collection, label) {
    const records = await collection.find({}).toArray();
    const operations = [];
    let updated = 0;
    for (const record of records) {
      if (!record.pairId) continue;
      const monthlyId = record.monthlyId
        || monthlyIdByLegacyId.get(String(record.pairId || '').trim());
      if (!monthlyId) {
        const unresolved = {
          id: String(record._id),
          legacyId: record.pairId
        };
        unresolvedRelated.push({ collection: label, ...unresolved });
        console.warn(`[pairing-id:migrate] ${label} không tìm được monthlyId`, unresolved);
        continue;
      }
      if (!dryRun) {
        operations.push({
          updateOne: {
            filter: { _id: record._id },
            update: { $set: { monthlyId }, $unset: { pairId: '' } }
          }
        });
      }
      updated += 1;
    }
    if (!dryRun && operations.length > 0) {
      await collection.bulkWrite(operations, { ordered: false });
    }
    return updated;
  }

  if (!dryRun && pairOperations.length > 0) {
    const pairIndexes = await pairCollection.indexes();
    const legacyPairIndex = pairIndexes.find((index) => index.key?.pairId);
    if (legacyPairIndex) {
      await pairCollection.dropIndex(legacyPairIndex.name);
      console.log(`[pairing-id:migrate] Đã gỡ index legacy ${legacyPairIndex.name}`);
    }
    await pairCollection.bulkWrite(pairOperations, { ordered: false });
  }
  scheduleUpdated = await migrateRelatedCollection(scheduleCollection, 'schedule');
  recapUpdated = await migrateRelatedCollection(recapCollection, 'recap');
  submissionUpdated = await migrateRelatedCollection(submissionCollection, 'submission');

  if (!dryRun) {
    await pairCollection.updateMany(
      { monthlyId: { $exists: true }, quarterlyId: { $exists: true } },
      { $unset: { pairId: '' } }
    );
    const pairIndexes = await pairCollection.indexes();
    const monthlyIndex = pairIndexes.find((index) => index.name === 'monthlyId_1');
    if (monthlyIndex && !monthlyIndex.unique) {
      await pairCollection.dropIndex(monthlyIndex.name);
    }
    await pairCollection.createIndex({ monthlyId: 1 }, { unique: true, name: 'monthlyId_1' });
  }

  await mongoose.disconnect();
  console.log('[pairing-id:migrate] summary', {
    pairsScanned: pairs.length,
    pairsUpdated: pairUpdated,
    pairsSkipped: pairSkipped,
    schedulesUpdated: scheduleUpdated,
    recapsUpdated: recapUpdated,
    submissionsUpdated: submissionUpdated,
    unresolvedRelated,
    dryRun
  });
}

migrate().catch((error) => {
  console.error('[pairing-id:migrate] failed:', error);
  process.exitCode = 1;
});
