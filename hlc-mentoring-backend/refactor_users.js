const fs = require('fs');
const lines = fs.readFileSync('index.js', 'utf8').split('\n');

const getLines = (start, end) => lines.slice(start - 1, end).join('\n');

const controllerContent = `const User = require('../models/user.model');
const MentoringPair = require('../models/mentoringPair.model');
const MentoringCycle = require('../models/mentoringCycle.model');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { authConfig } = require('../config/config');
const { ACTIVE_USER_QUERY, mentorUserFilter, formatBirthDatePassword } = require('../utils/userConstants');
const { quarterKey, canViewPairing, getCurrentTime } = require('../utils/time');

${getLines(806, 850)}

const getInitData = ${getLines(714, 740).replace("app.get('/api/users/init-data', async (req, res) => {", "async (req, res) => {")}

const getMentors = ${getLines(742, 752).replace("app.get('/api/users/mentors', async (req, res) => {", "async (req, res) => {")}

const getMentees = ${getLines(754, 765).replace("app.get('/api/users/mentees', async (req, res) => {", "async (req, res) => {")}

const generateMentorAccounts = ${getLines(854, 903).replace("app.post('/api/users/generate-mentor-accounts', requireRole('ADMIN'), async (req, res) => {", "async (req, res) => {")}

const downloadImportTemplate = ${getLines(905, 927).replace("app.get('/api/users/import-template.xlsx', requireRole('ADMIN'), (req, res) => {", "(req, res) => {")}

const importUsers = ${getLines(929, 1104).replace("app.post('/api/users/import', requireRole('ADMIN'), importUpload.single('file'), async (req, res) => {", "async (req, res) => {")}

const importMentors = ${getLines(1106, 1215).replace("app.post('/api/users/import-mentor', requireRole('ADMIN'), importUpload.single('file'), async (req, res) => {", "async (req, res) => {")}

const assignTeam = ${getLines(1509, 1525).replace("app.patch('/api/users/mentees/:id/assign', requireRole('ADMIN'), async (req, res) => {", "async (req, res) => {")}

const createUser = ${getLines(1527, 1554).replace("app.post('/api/users', requireRole('ADMIN'), async (req, res) => {", "async (req, res) => {")}

const changePassword = ${getLines(1556, 1576).replace("app.patch('/api/users/:id/password', requireRole('ADMIN'), async (req, res) => {", "async (req, res) => {")}

module.exports = {
  getInitData,
  getMentors,
  getMentees,
  generateMenteeAccounts,
  generateMentorAccounts,
  downloadImportTemplate,
  importUsers,
  importMentors,
  assignTeam,
  createUser,
  changePassword
};
`;

fs.writeFileSync('controllers/user.controller.js', controllerContent);

const routesContent = `const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireRole } = require('../middlewares/auth.middleware');
const { importUpload } = require('../middlewares/upload.middleware');

router.get('/init-data', userController.getInitData);
router.get('/mentors', userController.getMentors);
router.get('/mentees', userController.getMentees);
router.post('/generate-mentee-accounts', requireRole('ADMIN'), userController.generateMenteeAccounts);
router.post('/generate-accounts', requireRole('ADMIN'), userController.generateMenteeAccounts);
router.post('/generate-mentor-accounts', requireRole('ADMIN'), userController.generateMentorAccounts);
router.get('/import-template.xlsx', requireRole('ADMIN'), userController.downloadImportTemplate);
router.post('/import', requireRole('ADMIN'), importUpload.single('file'), userController.importUsers);
router.post('/import-mentor', requireRole('ADMIN'), importUpload.single('file'), userController.importMentors);
router.patch('/mentees/:id/assign', requireRole('ADMIN'), userController.assignTeam);
router.post('/', requireRole('ADMIN'), userController.createUser);
router.patch('/:id/password', requireRole('ADMIN'), userController.changePassword);

module.exports = router;
`;

fs.writeFileSync('routes/user.routes.js', routesContent);

// Remove extracted lines from index.js
const newLines = [];
let i = 1;
while (i <= lines.length) {
  if (i >= 714 && i <= 1215) {
    i++;
    continue;
  }
  if (i >= 1509 && i <= 1576) {
    i++;
    continue;
  }
  newLines.push(lines[i - 1]);
  i++;
}

fs.writeFileSync('index.js', newLines.join('\n'));
console.log('User controller and routes extracted successfully.');

