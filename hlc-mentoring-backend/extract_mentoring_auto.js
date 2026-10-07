const fs = require('fs');

function extractBlock(code, prefix, method) {
  let idx = -1;
  if (method) {
    const signature = "app." + method + "('" + prefix;
    idx = code.indexOf(signature);
  } else {
    idx = code.indexOf(prefix);
  }
  
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
        if (code.slice(j + 1, j + 3) === ');') {
          endIndex = j + 3;
        }
        break;
      }
    }
  }
  
  if (endIndex !== -1) {
    return code.slice(idx, endIndex);
  }
  return null;
}

const code = fs.readFileSync('index.js', 'utf8');

const routesToExtract = [
  { prefix: '/api/mentoring/member-quarterly-report', method: 'get', name: 'getMemberQuarterlyReport' },
  { prefix: '/api/mentoring/timeline', method: 'get', name: 'getTimeline' },
  { prefix: '/api/mentoring/preferences/mentors', method: 'get', name: 'getMentorPreferences' },
  { prefix: '/api/mentoring/pairs/inherit', method: 'post', name: 'inheritPairs' },
  { prefix: '/api/mentoring/quarter-lock', method: 'put', name: 'quarterLock' },
  { prefix: '/api/mentoring/import-pairs', method: 'post', name: 'importPairs' },
  { prefix: '/api/mentoring/pairs', method: 'get', name: 'getPairs' },
  { prefix: '/api/mentoring/pairs', method: 'post', name: 'createPairs' }, // wait, this will match the GET one if we don't index properly, but we use indexOf so we might match the first. Let's use lastIndexOf for POST since it comes after GET? No, indexOf(signature) is exact! \`app.post('/api/mentoring/pairs'\`
  { prefix: '/api/mentoring/pairs/:monthlyId', method: 'patch', name: 'updatePair' },
  { prefix: '/api/mentoring/pairs/:monthlyId', method: 'delete', name: 'deletePair' },
  { prefix: '/api/mentoring/schedules', method: 'get', name: 'getSchedules' },
  { prefix: '/api/mentoring/schedules', method: 'post', name: 'createSchedule' },
  { prefix: '/api/mentoring/schedules/:id', method: 'patch', name: 'updateSchedule' },
  { prefix: '/api/mentoring/schedules/:id/status', method: 'patch', name: 'updateScheduleStatus' },
  { prefix: '/api/mentoring/schedules/:id/override', method: 'patch', name: 'overrideScheduleStatus' },
  { prefix: '/api/mentoring/recaps', method: 'get', name: 'getRecaps' },
  { prefix: '/api/mentoring/recaps', method: 'post', name: 'createRecap' },
  { prefix: '/api/mentoring/recaps/:id/approve', method: 'patch', name: 'approveRecap' },
  { prefix: '/api/mentoring/recaps/:id/reject', method: 'patch', name: 'rejectRecap' },
  { prefix: '/api/mentoring/recaps/:id/status', method: 'patch', name: 'updateRecapStatus' },
  { prefix: '/api/mentoring/pairs/status', method: 'get', name: 'getPairsStatus' },
  { prefix: '/api/mentoring/quarterly-report/:year/:quarter/export.xlsx', method: 'get', name: 'exportQuarterlyReport' }
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
  return \\\`\\\${String(month).padStart(2, '0')}/\\\${year}-\\\${lastFiveUserDigits(mentorId)}-\\\${lastFiveUserDigits(menteeId)}\\\`;
}

function quarterKey(date) {
  const value = new Date(date);
  return value.getUTCFullYear() * 4 + Math.floor(value.getUTCMonth() / 3);
}

function isCycleVisibleToMember(cycle, now = getCurrentTime()) {
  const distance = quarterKey(cycle.startDate) - quarterKey(now);
  return distance <= 0 || (distance === 1 && canViewPairing(cycle, now));
}

\`;

const names = [];

for (const route of routesToExtract) {
  let block = extractBlock(code, route.prefix, route.method);
  if (!block) {
    console.error('Could not find block for', route.prefix);
    continue;
  }
  
  if (route.name === 'approveRecap' || route.name === 'rejectRecap') {
    // These are 1-liners, skip transformation
  } else {
    const firstLine = block.split('\\n')[0];
    const arrowFuncMatch = firstLine.match(/(?:async\\s*)?\\(req,\\s*res\\)\\s*=>\\s*\\{/);
    if (arrowFuncMatch) {
      block = block.replace(firstLine, \`const \${route.name} = \${arrowFuncMatch[0]}\`);
    }
    block = block.replace(/^\\}\\);?\\s*$/gm, '};');
  }
  
  controllerContent += \`\${block}\\n\\n\`;
  names.push(route.name);
}

// Also extract reviewMentoringRecap helper
let reviewBlock = extractBlock(code, 'async function reviewMentoringRecap(req, res, status)');
if (reviewBlock) {
  controllerContent += \`\${reviewBlock}\\n\\n\`;
}

// Convert 1 liners
controllerContent = controllerContent.replace(/app\\.patch\\('\\/api\\/mentoring\\/recaps\\/:id\\/approve'.*/g, "const approveRecap = (req, res) => reviewMentoringRecap(req, res, 'APPROVED');");
controllerContent = controllerContent.replace(/app\\.patch\\('\\/api\\/mentoring\\/recaps\\/:id\\/reject'.*/g, "const rejectRecap = (req, res) => reviewMentoringRecap(req, res, 'REJECTED');");

controllerContent += \`module.exports = {
  \${names.join(',\\n  ')}
};\n\`;

fs.writeFileSync('controllers/mentoring.controller.js', controllerContent);

const routesContent = \`const express = require('express');
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
\`;

fs.writeFileSync('routes/mentoring.routes.js', routesContent);
console.log('Mentoring extraction ready');
