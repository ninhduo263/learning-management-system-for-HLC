const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireRole, authenticate } = require('../middlewares/auth.middleware');
const { importUpload } = require('../middlewares/upload.middleware');

router.get('/init-data', userController.getInitData);

router.use(authenticate);
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
