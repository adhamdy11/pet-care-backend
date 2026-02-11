var express = require('express');
var router = express.Router();

var reminderController = require('../controllers/reminderController');
var verifyToken = require('../middleware/authMiddleware').verifyToken;

router.post('/', verifyToken, reminderController.createReminder);
router.get('/pet/:petId', verifyToken, reminderController.getRemindersByPet);

module.exports = router;
