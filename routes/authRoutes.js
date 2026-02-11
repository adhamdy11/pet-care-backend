var express = require('express');
var router = express.Router();

var authController = require('../controllers/authController');
var verifyToken = require('../middleware/authMiddleware').verifyToken;

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.me);

module.exports = router;
