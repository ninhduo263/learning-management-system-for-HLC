const express = require('express');
const router = express.Router();
const mentoringController = require('../controllers/mentoring.controller');
const { requireRole, authenticate } = require('../middlewares/auth.middleware');
const { importUpload } = require('../middlewares/upload.middleware');

router.use(authenticate);

router.get('/member-quarterly-report', requireRole('MENTOR', 'MENTEE'), mentoringController.getMemberQuarterlyReport);
router.get('/preferences', mentoringController.getPreferences);
router.post('/preferences', mentoringController.savePreferences);
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
