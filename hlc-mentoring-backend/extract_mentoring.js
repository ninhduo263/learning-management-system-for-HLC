const fs = require('fs');
const lines = fs.readFileSync('index.js', 'utf8').split('\n');

const getLines = (start, end) => lines.slice(start - 1, end).join('\n');

// Find all mentoring routes and their bodies
const routes = [
  { start: 327, end: 468, name: 'getMemberQuarterlyReport' },
  { start: 613, end: 634, name: 'getTimeline' },
  { start: 636, end: 639, name: 'getMentorPreferences' },
  { start: 641, end: 683, name: 'inheritPairs' },
  { start: 716, end: 738, name: 'quarterLock' },
  { start: 740, end: 1252, name: 'importPairs' },
  { start: 1254, end: 1297, name: 'getPairs' },
  { start: 1299, end: 1509, name: 'createPairs' },
  { start: 1511, end: 1629, name: 'updatePair' },
  { start: 1631, end: 1690, name: 'deletePair' },
  { start: 1692, end: 1730, name: 'getSchedules' },
  { start: 1732, end: 1788, name: 'createSchedule' },
  { start: 1790, end: 1828, name: 'updateSchedule' },
  { start: 1830, end: 1860, name: 'updateScheduleStatus' },
  { start: 1862, end: 1880, name: 'overrideScheduleStatus' },
  { start: 1882, end: 1891, name: 'getRecaps' },
  { start: 1893, end: 1975, name: 'createRecap' },
  { start: 1977, end: 1993, name: 'reviewMentoringRecap', isHelper: true },
  { start: 1997, end: 2002, name: 'updateRecapStatus' },
  { start: 2004, end: 2104, name: 'getPairsStatus' },
  { start: 2106, end: 2232, name: 'exportQuarterlyReport' }
];

let controllerContent = `const mongoose = require('mongoose');
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
  return \`\${String(month).padStart(2, '0')}/\${year}-\${lastFiveUserDigits(mentorId)}-\${lastFiveUserDigits(menteeId)}\`;
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

const extractedNames = [];

for (const route of routes) {
  let block = getLines(route.start, route.end);
  if (route.isHelper) {
    controllerContent += `\n${block}\n\n`;
    continue;
  }
  
  // Transform app.get('/...', async (req, res) => { -> const name = async (req, res) => {
  // Need a regex that handles app.(get|post|put|patch|delete)('/api/mentoring/...', middleware..., async (req, res) => {
  const firstLine = block.split('\n')[0];
  const replaceRegex = /^app\.(get|post|put|patch|delete)\(['`][^'`]+['`],\s*(?:.*?(?:async\s*)?\(req,\s*res\)\s*=>\s*\{)/;
  
  // Actually, string replacement is tricky because of middlewares.
  // We can just find the "(req, res) => {" or "async (req, res) => {"
  const arrowFuncMatch = firstLine.match(/(?:async\s*)?\(req,\s*res\)\s*=>\s*\{/);
  if (arrowFuncMatch) {
    block = block.replace(firstLine, `const ${route.name} = ${arrowFuncMatch[0]}`);
  }
  
  // Strip trailing "});" which we matched
  block = block.replace(/^}\);\s*$/gm, '};');
  
  controllerContent += `${block}\n\n`;
  extractedNames.push(route.name);
}

// Add the 2 single-line endpoints manually
controllerContent += `
const approveRecap = (req, res) => reviewMentoringRecap(req, res, 'APPROVED');
const rejectRecap = (req, res) => reviewMentoringRecap(req, res, 'REJECTED');
`;
extractedNames.push('approveRecap', 'rejectRecap');

controllerContent += `module.exports = {\n  ${extractedNames.join(',\n  ')}\n};\n`;

fs.writeFileSync('controllers/mentoring.controller.js', controllerContent);

const routesContent = `const express = require('express');
const router = express.Router();
const mentoringController = require('../controllers/mentoring.controller');
const { requireRole, authenticate } = require('../middlewares/auth.middleware');
const { importUpload } = require('../middlewares/upload.middleware');

router.use(authenticate);

router.get('/member-quarterly-report', requireRole('MENTOR', 'MENTEE'), mentoringController.getMemberQuarterlyReport);
router.get('/timeline', mentoringController.getTimeline);
router.get('/preferences/mentors', mentoringController.getMentorPreferences);
router.post('/pairs/inherit', requireRole('ADMIN'), mentoringController.inheritPairs);
router.put('/quarter-lock', requireRole('ADMIN'), mentoringController.quarterLock);
router.post('/import-pairs', requireRole('ADMIN'), importUpload.single('file'), mentoringController.importPairs);
router.get('/pairs', mentoringController.getPairs);
router.post('/pairs', requireRole('ADMIN'), mentoringController.createPairs);
router.patch('/pairs/:monthlyId', requireRole('ADMIN'), mentoringController.updatePair);
router.delete('/pairs/:monthlyId', requireRole('ADMIN'), mentoringController.deletePair);
router.get('/schedules', mentoringController.getSchedules);
router.post('/schedules', mentoringController.createSchedule);
router.patch('/schedules/:id', mentoringController.updateSchedule);
router.patch('/schedules/:id/status', mentoringController.updateScheduleStatus);
router.patch('/schedules/:id/override', requireRole('ADMIN'), mentoringController.overrideScheduleStatus);
router.get('/recaps', mentoringController.getRecaps);
router.post('/recaps', mentoringController.createRecap);
router.patch('/recaps/:id/approve', requireRole('ADMIN'), mentoringController.approveRecap);
router.patch('/recaps/:id/reject', requireRole('ADMIN'), mentoringController.rejectRecap);
router.patch('/recaps/:id/status', requireRole('ADMIN'), mentoringController.updateRecapStatus);
router.get('/pairs/status', requireRole('ADMIN'), mentoringController.getPairsStatus);
router.get('/quarterly-report/:year/:quarter/export.xlsx', requireRole('ADMIN'), mentoringController.exportQuarterlyReport);

module.exports = router;
`;

fs.writeFileSync('routes/mentoring.routes.js', routesContent);

// Remove extracted lines from index.js
const newLines = [];
let i = 1;
while (i <= lines.length) {
  let skip = false;
  for (const route of routes) {
    if (i >= route.start && i <= route.end) {
      skip = true;
      break;
    }
  }
  // Skip the two single line routes
  if (i === 1995 || i === 1996) {
    skip = true;
  }
  // Skip formatMentoringPairCode and lastFiveUserDigits and quarterKey and isCycleVisibleToMember
  // We'll leave quarterKey and isCycleVisibleToMember since they are still used in index.js
  if (i >= 71 && i <= 79) { // lastFiveUserDigits and formatMentoringPairCode
    skip = true;
  }
  if (!skip) {
    newLines.push(lines[i - 1]);
  }
  i++;
}

fs.writeFileSync('index.js', newLines.join('\n'));
console.log('Mentoring controller and routes extracted successfully.');
