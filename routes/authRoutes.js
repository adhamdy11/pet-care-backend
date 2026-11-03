const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const loginRateLimit = require('../middleware/loginRateLimit');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', loginRateLimit, authController.login);
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.me);

module.exports = router;
