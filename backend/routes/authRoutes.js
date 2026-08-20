const express = require('express');
const router = express.Router();
const { register, login, getMe, changePassword } = require('../controllers/authController');
const { registerRules, loginRules, changePasswordRules } = require('../middleware/validation');
const { protect } = require('../middleware/auth');

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePasswordRules, changePassword);

module.exports = router;
