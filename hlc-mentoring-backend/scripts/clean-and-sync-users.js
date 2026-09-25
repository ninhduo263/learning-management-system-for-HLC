require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('../models/User');

const SOURCE_COLUMNS = {
  userId: 'HLC ID (Nhập tay)',
  fullName: 'HỌ VÀ TÊN',
  phone: 'SĐT',
  email: 'EMAIL',
  bankAccount: 'SỐ TÀI KHOẢN',
  bankName: 'NGÂN HÀNG (Chọn list)',
  dateOfBirth: 'NGÀY SINH',
  livingAllowanceType: 'DIỆN HỖ TRỢ SINH HOẠT PHÍ',
  isActive: 'isActive',
  joinedAt: 'THỜI GIAN GIA NHẬP HLC (Chọn ngày)',
  allowanceStartDate: 'THỜI GIAN BẮT ĐẦU NHẬN TRỢ CẤP (Chọn ngày)'
};
const MERGEABLE_FIELDS = [
  'userId', 'fullName', 'phone', 'email', 'bankAccount', 'bankName',
  'dateOfBirth', 'livingAllowanceType', 'joinedAt',
  'allowanceStartDate', 'isActive', 'role'
];

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizePhone(value) {
  let phone = text(value).replace(/[^\d+]/g, '');
  if (/^\+84\d{9}$/.test(phone)) phone = `0${phone.slice(3)}`;
  if (/^84\d{9}$/.test(phone)) phone = `0${phone.slice(2)}`;
  if (/^\d{9}$/.test(phone)) phone = `0${phone}`;
  return phone;
}

function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed
      ? new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0))
      : null;
  }
  const raw = text(value);
  const vietnamese = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(raw);
  if (vietnamese) {
    const day = Number(vietnamese[1]);
    const month = Number(vietnamese[2]);
    const year = Number(vietnamese[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day
      ? date
      : null;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeIsActive(value) {
  const status = text(value).toLowerCase();
  if (status === 'yes' || status === 'no') return status;
  if (!status) return undefined;
  throw new Error('isActive chỉ chấp nhận yes hoặc no');
}

function roleFromUserId(userId) {
  if (/^HLC-MN/i.test(userId) || /^MN/i.test(userId)) return 'MENTOR';
  return 'MENTEE';
}

function normalizeRow(row) {
  const value = (field) => row[SOURCE_COLUMNS[field]];
  const userId = text(value('userId')).toUpperCase();
  const email = text(value('email')).toLowerCase();
  const phone = normalizePhone(value('phone'));
  const document = {
    userId,
    fullName: text(value('fullName')),
    phone,
    email,
    bankAccount: text(value('bankAccount')),
    bankName: text(value('bankName')),
    dateOfBirth: parseDate(value('dateOfBirth')),
    livingAllowanceType: text(value('livingAllowanceType')),
    joinedAt: parseDate(value('joinedAt')),
    allowanceStartDate: parseDate(value('allowanceStartDate'))
  };
  const active = normalizeIsActive(value('isActive'));
  if (active !== undefined) document.isActive = active;
  return document;
}

function mergeDocuments(existing, incoming) {
  const merged = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (MERGEABLE_FIELDS.includes(key) && value !== '' && value !== null && value !== undefined) {
      merged[key] = value;
    }
  }
  for (const [key, value] of Object.entries(existing.toObject())) {
    if (!MERGEABLE_FIELDS.includes(key)) continue;
    if (merged[key] === undefined && value !== null && value !== undefined) merged[key] = value;
  }
  return merged;
}

async function cleanAndSyncData({
  filePath,
  apply = false
} = {}) {
  if (!filePath) throw new Error('Thiếu đường dẫn file Excel');
  if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy file: ${filePath}`);

  const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const stats = { scanned: rows.length, updated: 0, idsUpdated: 0, merged: 0, created: 0, errors: [] };

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    try {
      const incoming = normalizeRow(rows[index]);
      if (!incoming.userId || !incoming.fullName) {
        throw new Error('Thiếu HLC ID hoặc họ tên');
      }

      const matches = await User.find({
        $or: [
          { userId: incoming.userId },
          ...(incoming.email ? [{ email: incoming.email }] : []),
          ...(incoming.phone ? [{ phone: incoming.phone }] : [])
        ]
      }).select('+passwordHash').sort({ createdAt: 1 });

      const exact = matches.find((user) => user.userId === incoming.userId);
      const target = exact || matches[0] || null;
      const duplicates = matches.filter((user) => !target || String(user._id) !== String(target._id));
      const idOwner = await User.findOne({ userId: incoming.userId }).select('_id');
      if (idOwner && (!target || String(idOwner._id) !== String(target._id))) {
        throw new Error(`HLC ID đã thuộc bản ghi khác: ${incoming.userId}`);
      }

      if (target) {
        const oldUserId = target.userId;
        const merged = mergeDocuments(target, incoming);
        if (!merged.role) merged.role = target.role || roleFromUserId(incoming.userId);
        if (apply) {
          await User.updateOne({ _id: target._id }, { $set: merged });
          if (duplicates.length) {
            await User.deleteMany({ _id: { $in: duplicates.map((user) => user._id) } });
          }
        }
        stats.updated += 1;
        if (oldUserId !== incoming.userId) stats.idsUpdated += 1;
        stats.merged += duplicates.length;
      } else {
        const document = { ...incoming, role: roleFromUserId(incoming.userId) };
        if (apply) await User.create(document);
        stats.created += 1;
      }
    } catch (error) {
      stats.errors.push({ row: rowNumber, message: error.message });
    }
  }

  console.log(`[user-migration] ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`[user-migration] Scanned: ${stats.scanned}`);
  console.log(`[user-migration] Updated: ${stats.updated}`);
  console.log(`[user-migration] HLC ID updated: ${stats.idsUpdated}`);
  console.log(`[user-migration] Duplicates merged: ${stats.merged}`);
  console.log(`[user-migration] Created: ${stats.created}`);
  console.log(`[user-migration] Errors: ${stats.errors.length}`);
  if (stats.errors.length) console.error(JSON.stringify(stats.errors, null, 2));
  return stats;
}

async function main() {
  const filePath = process.argv[2];
  const apply = process.env.APPLY === 'true';
  await mongoose.connect(process.env.MONGO_URI);
  try {
    await cleanAndSyncData({ filePath: path.resolve(filePath || ''), apply });
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[user-migration] Failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { cleanAndSyncData, parseDate, normalizePhone };
