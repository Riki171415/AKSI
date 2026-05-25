const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const analysisController = require('../controllers/analysisController');
const userController = require('../controllers/userController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.post('/login', authController.login);

router.get('/settings', verifyToken, authController.getSettings);
router.post('/settings', verifyToken, authController.saveSettings);

router.post('/analyze', verifyToken, analysisController.uploadMiddleware, analysisController.analyzeTxt);

// User Management Routes (Admin only)
router.get('/users', verifyToken, requireAdmin, userController.getAllUsers);
router.post('/users', verifyToken, requireAdmin, userController.createUser);
router.put('/users/:id', verifyToken, requireAdmin, userController.updateUser);
router.delete('/users/:id', verifyToken, requireAdmin, userController.deleteUser);

module.exports = router;
