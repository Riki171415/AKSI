const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const analysisController = require('../controllers/analysisController');
const auth = require('../middleware/auth');

router.post('/login', authController.login);

router.get('/settings', auth, authController.getSettings);
router.post('/settings', auth, authController.saveSettings);

router.post('/analyze', auth, analysisController.uploadMiddleware, analysisController.analyzeTxt);

module.exports = router;
