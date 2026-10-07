const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

function extractBlock(prefix) {
  let idx = code.indexOf(prefix);
  if (idx === -1) return null;
  let braceCount = 0;
  let foundFirstBrace = false;
  let endIndex = -1;
  for (let j = idx; j < code.length; j++) {
    if (code[j] === '{') {
      braceCount++;
      foundFirstBrace = true;
    } else if (code[j] === '}') {
      braceCount--;
      if (foundFirstBrace && braceCount === 0) {
        endIndex = j + 1;
        if (code.slice(j + 1, j + 3) === ');') endIndex = j + 3;
        break;
      }
    }
  }
  if (endIndex !== -1) return code.slice(idx, endIndex);
  return null;
}

const routes = [
  { p: "app.get('/api/mentoring/member-quarterly-report'", n: "getMemberQuarterlyReport" },
  { p: "app.get(['/api/mentoring/preferences', '/api/preferences']", n: "getPreferences" },
  { p: "app.post(['/api/mentoring/preferences', '/api/preferences']", n: "savePreferences" },
  { p: "app.get('/api/mentoring/timeline'", n: "getTimeline" },
  { p: "app.get('/api/mentoring/preferences/mentors'", n: "getMentorPreferences" },
  { p: "app.post('/api/mentoring/pairs/inherit'", n: "inheritPairs" },
  { p: "app.put('/api/mentoring/quarter-lock'", n: "quarterLock" },
  { p: "app.post('/api/mentoring/import-pairs'", n: "importPairs" },
  { p: "app.get('/api/mentoring/pairs'", n: "getPairs" },
  { p: "app.post('/api/mentoring/pairs'", n: "createPairs" },
  { p: "app.patch('/api/mentoring/pairs/:monthlyId'", n: "updatePair" },
  { p: "app.delete('/api/mentoring/pairs/:monthlyId'", n: "deletePair" },
  { p: "app.get('/api/mentoring/schedules'", n: "getSchedules" },
  { p: "app.post('/api/mentoring/schedules'", n: "createSchedule" },
  { p: "app.patch('/api/mentoring/schedules/:id'", n: "updateSchedule" },
  { p: "app.patch('/api/mentoring/schedules/:id/status'", n: "updateScheduleStatus" },
  { p: "app.patch('/api/mentoring/schedules/:id/override'", n: "overrideScheduleStatus" },
  { p: "app.get('/api/mentoring/recaps'", n: "getRecaps" },
  { p: "app.post('/api/mentoring/recaps'", n: "createRecap" },
  { p: "app.patch('/api/mentoring/recaps/:id/status'", n: "updateRecapStatus" },
  { p: "app.get('/api/mentoring/pairs/status'", n: "getPairsStatus" },
  { p: "app.get('/api/mentoring/quarterly-report/:year/:quarter/export.xlsx'", n: "exportQuarterlyReport" }
];

let ctrl = `const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('../models/User');
const MentoringPair = require('../models/MentoringPair');
const MentoringSchedule = require('../models/MentoringSchedule');
const MentoringRecap = require('../models/MentoringRecap');
const Cycle = require('../models/Cycle');
const MentorPreference = require('../models/MentorPreference');

const { getCurrentTime } = require('../utils/time');
const { validateQuarter, quarterDates, monthlyMentoringCode, isCycleLocked, canEditSchedule,
  recapStatus, timingPoints, topThreeAwards, pairingStartDate,
  canMenteeChoose, canAdminPair, canViewPairing, timelineForCycle } = require('../utils/quarterlyRules');
const { recapSubmissionTime, recapDeadline, roleRecapStatus, pairRecapStatus } = require('../mentoringRecapRules');
const { generatePairingIds } = require('../utils/pairingIds');
const { pairsFromSelectedMonth } = require('../utils/pairDeletion');
const { ACTIVE_USER_QUERY, mentorUserFilter } = require('../utils/userConstants');
const { awardMentoringCompletionScore } = require('../services/rewardService');

function lastFiveUserDigits(userId) {
  const digits = String(userId || '').match(/\\d/g)?.join('') || '';
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

`;

let reviewBlock = extractBlock('async function reviewMentoringRecap');
if (reviewBlock) ctrl += reviewBlock + "\n\n";

let names = [];
routes.forEach(r => {
  let block = extractBlock(r.p);
  if (!block) {
    console.error('Could not find block for', r.p);
    return;
  }
  // Replace the first line to const funcName = async (req, res) => {
  block = block.replace(/app\.(get|post|patch|put|delete)\(.*?,\s*(?:requireRole\([^)]+\),\s*)?(?:importUpload\.single\([^)]+\),\s*)?(?:authenticate,\s*)?(?:async\s*\(req,\s*res\)|\(req,\s*res\))\s*=>\s*\{/, "const " + r.n + " = async (req, res) => {");
  block = block.replace(/^}\);?\s*$/gm, '};');
  ctrl += block + "\n\n";
  names.push(r.n);
});

ctrl += "const approveRecap = (req, res) => reviewMentoringRecap(req, res, 'APPROVED');\n";
ctrl += "const rejectRecap = (req, res) => reviewMentoringRecap(req, res, 'REJECTED');\n";
names.push('approveRecap', 'rejectRecap');

ctrl += "\nmodule.exports = {\n  " + names.join(',\n  ') + "\n};\n";

fs.writeFileSync('controllers/mentoring.controller.js', ctrl);
console.log('Mentoring controller done');

