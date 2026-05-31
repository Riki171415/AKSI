const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Auth routes
router.post('/login', authController.login);
router.post('/auth/mfa/verify-login', authController.verifyMfaLogin);

// Settings routes
router.get('/settings', verifyToken, authController.getSettings);
router.post('/settings', verifyToken, authController.saveSettings);

// MFA routes (authenticated user)
router.get('/auth/mfa/status', verifyToken, authController.getMfaStatus);
router.post('/auth/mfa/setup', verifyToken, authController.generateMfaSetup);
router.post('/auth/mfa/verify-setup', verifyToken, authController.verifyMfaSetup);
router.post('/auth/mfa/disable', verifyToken, authController.disableMfa);

// MFA admin reset
router.post('/auth/mfa/admin-reset/:userId', verifyToken, requireAdmin, authController.adminResetMfa);

// User Management Routes (Admin only)
router.get('/users', verifyToken, requireAdmin, userController.getAllUsers);
router.post('/users', verifyToken, requireAdmin, userController.createUser);
router.put('/users/:id', verifyToken, requireAdmin, userController.updateUser);
router.delete('/users/:id', verifyToken, requireAdmin, userController.deleteUser);

module.exports = router;
